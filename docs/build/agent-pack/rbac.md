# RBAC and approvals

Once a Hologram agent has more than a handful of tools and more than one kind of user, you need real authorization. The Agent Pack ships with a credential-driven Role-Based Access Control (RBAC) layer plus an optional approval workflow for sensitive operations.

This page explains the **mental model**, the **schema**, and the **runtime semantics**. The full design spec lives in [`hologram-generic-ai-agent-vs/docs/rbac-approval-spec.md`](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/rbac-approval-spec.md).

## Mental model

Three ideas. Internalise them and the rest follows.

1. **Roles come from credentials.** A user authenticates by presenting a verifiable credential (typically a corporate badge). One of the credential's attributes is a list of role names. The agent never invents roles; it only reads what's signed in the VC.
2. **Tool access is per role, per MCP server.** In `agent-pack.yaml` you map role names → tool names. The LLM only sees tools the user's roles grant. Denied tools don't even appear in the prompt.
3. **Some tools require approval before they run.** The `approval` block lists which tools and which roles can approve them. The requesting user submits a request; an approver picks it up; the tool executes on behalf of the requester.

There is **no hardcoded admin role**. Everything is deployer-defined. The only special case is `adminUsers` — a small allow-list of usernames that bypass RBAC entirely (intended for bootstrap before role credentials exist).

## When to use it

| You have | Use |
|---|---|
| One user role, all tools available to all authenticated users | Skip RBAC. Use `toolAccess.default: public` (legacy binary model). |
| Personal agent — every user authenticates with their own personal credential and uses their own tools | Skip RBAC; use [user-controlled MCP](./mcp.md#user-controlled--per-user-tokens). |
| Multi-role corporate agent with a single backend account (e.g. company Wise account) | RBAC. This page. |
| Tools that should require managerial sign-off | RBAC + `approval` policies. This page. |

## Schema

Two blocks work together: `flows.authentication` (where roles come from) and `mcp.servers[].toolAccess` (what each role can do).

### `flows.authentication`

```yaml
flows:
  authentication:
    enabled: true
    required: true                         # block guests
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}
    userIdentityAttribute: employeeLogin   # which VC attribute is the unique user id
    rolesAttribute: roles                  # which VC attribute holds the role list
    defaultRole: employee                  # if rolesAttribute is empty, use this
    adminUsers:
      - cto@acme.corp                      # bypass RBAC entirely
```

| Field | Required | Description |
|---|---|---|
| `enabled` | yes | Turn the auth flow on. |
| `required` | no, default `false` | When `true`, unauthenticated users get only the welcome + auth prompt — chat is blocked. |
| `credentialDefinitionId` | yes | The VC definition to request via DIDComm. |
| `userIdentityAttribute` | yes | Credential attribute used as the unique user identity. Often `email`, `name`, `employeeLogin`. |
| `rolesAttribute` | no | Attribute holding the user's roles. Accepts string, comma-separated list, or JSON array. If absent, every authenticated user gets `defaultRole`. |
| `defaultRole` | no, default `user` | Role assigned when `rolesAttribute` is absent or empty. |
| `adminUsers` | no | Identities (matched against `userIdentityAttribute`) that bypass RBAC and see every tool. Use sparingly — for initial bootstrap only. Replaces the legacy `adminAvatars` field. |

### `mcp.servers[].toolAccess`

```yaml
mcp:
  servers:
    - name: wise
      transport: streamable-http
      url: ${WISE_MCP_URL}
      accessMode: admin-controlled
      headers:
        Authorization: "Bearer ${WISE_API_TOKEN}"
      toolAccess:
        default: none
        roles:
          guest:    [get_exchange_rate]
          employee: [list_profiles, get_balances, list_transfers]
          finance:  [send_money, create_invoice, list_recipients]
          auditor:  [list_transfers, get_transfer_status, get_balances]
        approval:
          - tools: [send_money]
            approvers: [finance-manager, cfo]
            timeoutMinutes: 60
          - tools: [create_invoice]
            approvers: [finance-manager]
            timeoutMinutes: 120
```

| Field | Description |
|---|---|
| `default` | `none` (deny everything not in `roles`) or `all` (allow unlisted tools to any authenticated user). |
| `roles` | Map of role name → tool list. The special role `guest` applies to unauthenticated users when `flows.authentication.required` is `false`. |
| `approval` | Optional list of approval policies. Each declares the gated tools, the approver roles, and the request timeout. |

:::note Approval requires admin-controlled MCP
Approval policies only make sense on `accessMode: admin-controlled` servers — the server runs the tool with a single shared token, so it doesn't matter who in your org holds the credential. With `user-controlled` MCP each user has their own token, and approval would mean executing the tool against the *approver's* account, not the requester's, which is rarely what you want.
:::

## Resolution semantics

When a user sends a message, the agent computes:

1. **User roles.** Fetch the verified credential, parse `rolesAttribute`. If empty → `defaultRole`. If user is in `adminUsers` → all roles, all tools, no approval.
2. **Effective tool set.** Union of every `roles[role]` list for the user's roles. Plus the unlisted tools if `default: all`.
3. **LLM prompt filter.** The agent rebuilds its LangChain agent with only the effective tool set. Tools the user can't access are *invisible* to the LLM — no leakage, no failed calls.

When the LLM decides to call a tool:

- Tool not in effective set → would never have been offered. Cannot happen.
- Tool in effective set, no approval policy → executes immediately.
- Tool in effective set, has approval policy:
  - User holds **both** an access role **and** an approver role for that tool → **self-approval**, executes immediately.
  - Otherwise → request queued (`PENDING`), approvers notified, requester gets _"Request submitted, I'll let you know"_.

## Approval lifecycle

```text
PENDING ──→ APPROVED ──→ tool executes, result delivered to requester
   │
   ├──→ REJECTED  (by an approver)
   ├──→ CANCELLED (by the requester)
   └──→ EXPIRED   (timeout)
```

Each transition triggers two side effects:

- **Menu badge update** for both requester and approvers (`(n) approval requests` / `(n) pending approvals`).
- **Notification message** to all related parties.

Requests are persisted in PostgreSQL — they survive a chatbot restart.

## Menu items

The badge-driven menu items are part of the standard menu schema. Add them to your pack's `flows.menu.items`:

```yaml
flows:
  menu:
    items:
      - id: my-approval-requests
        labelKey: MY_APPROVAL_REQUESTS
        action: my-approval-requests
        visibleWhen: hasApprovalRequests
        badge: approvalRequestCount

      - id: pending-approvals
        labelKey: PENDING_APPROVALS
        action: pending-approvals
        visibleWhen: hasPendingApprovals
        badge: pendingApprovalCount
```

`visibleWhen` and `badge` are dynamic — the agent updates them as requests are created and resolved.

| `visibleWhen` value | Shown when |
|---|---|
| `hasApprovalRequests` | The user has at least one open request they submitted. |
| `hasPendingApprovals` | The user holds an approver role and there's at least one pending request they can act on. |

### i18n strings

```yaml
languages:
  en:
    strings:
      MY_APPROVAL_REQUESTS: "Approval requests"
      PENDING_APPROVALS: "Pending approvals"
  es:
    strings:
      MY_APPROVAL_REQUESTS: "Solicitudes de aprobación"
      PENDING_APPROVALS: "Aprobaciones pendientes"
```

## Worked example — corporate Wise agent

The full pack:

```yaml
flows:
  authentication:
    enabled: true
    required: true
    credentialDefinitionId: ${CORP_BADGE_DEFINITION_ID}
    userIdentityAttribute: employeeLogin
    rolesAttribute: roles
    defaultRole: employee
    adminUsers:
      - cto@acme.corp

  welcome:
    enabled: true
    sendOnProfile: true
    templateKey: greetingMessage

  menu:
    items:
      - id: authenticate
        labelKey: CREDENTIAL
        action: authenticate
        visibleWhen: unauthenticated
      - id: logout
        labelKey: LOGOUT
        action: logout
        visibleWhen: authenticated
      - id: my-approval-requests
        labelKey: MY_APPROVAL_REQUESTS
        action: my-approval-requests
        visibleWhen: hasApprovalRequests
        badge: approvalRequestCount
      - id: pending-approvals
        labelKey: PENDING_APPROVALS
        action: pending-approvals
        visibleWhen: hasPendingApprovals
        badge: pendingApprovalCount

mcp:
  servers:
    - name: wise
      transport: streamable-http
      url: ${WISE_MCP_URL}
      accessMode: admin-controlled
      headers:
        Authorization: "Bearer ${WISE_API_TOKEN}"
      toolAccess:
        default: none
        roles:
          guest:    [get_exchange_rate]
          employee: [list_profiles, get_balances, list_transfers]
          finance:  [send_money, create_invoice, list_recipients]
          auditor:  [list_transfers, get_transfer_status, get_balances]
        approval:
          - tools: [send_money]
            approvers: [finance-manager, cfo]
            timeoutMinutes: 60
          - tools: [create_invoice]
            approvers: [finance-manager]
            timeoutMinutes: 120
```

What different employees see:

| User role(s) in their VC | Tools the LLM offers | Notes |
|---|---|---|
| `employee` | `list_profiles`, `get_balances`, `list_transfers` | Cannot send money. |
| `employee, finance` | All employee + finance tools | `send_money` works but goes to approval queue (no approver role). |
| `employee, finance, finance-manager` | Same set | `send_money` self-approves and runs immediately. |
| `auditor` | `list_transfers`, `get_transfer_status`, `get_balances` | Read-only audit. |
| `cto@acme.corp` (in `adminUsers`) | Every tool | Bypasses RBAC; for bootstrap. |

## Backward compatibility

When `toolAccess.roles` is absent the agent falls back to the **legacy binary model**:

```yaml
toolAccess:
  default: admin       # or 'public'
  public:              # only meaningful when default: admin
    - tool_a
    - tool_b
```

- `default: public` → every tool is available to every user.
- `default: admin` → only `adminUsers` see all tools; everyone else sees the `public` list.

This is fine for personal agents. Use the RBAC model the moment you have more than one role or any approval requirement.

## Operating notes

- **Persistence.** Approval requests live in the chatbot's PostgreSQL database. Rotating PG credentials is fine; deleting the database wipes all open requests (they expire silently).
- **Connection state.** A request is created against a (requester, server, tool, args) tuple. If the requester disconnects before resolution, they still receive the result the next time they connect.
- **First-approver-wins.** Once one approver acts on a request, the others see it disappear from their queue.
- **Default role bootstrap.** When you first roll out the credential issuer, no employee has the `roles` attribute filled in. They all get `defaultRole`. Pick something safe (e.g. `employee` with read-only access).
- **`adminUsers` is a hatch, not a tier.** Don't list whole departments. Use it for the deployer / on-call engineer until role credentials are issued.

## Next

- [**Authentication**](./authentication.md) — the VC flow that produces the credential RBAC reads.
- [**MCP**](./mcp.md#tool-access-control) — where `toolAccess` lives.
- [**Cookbook — Wise agent**](../cookbook/wise-agent.md) — full worked corporate-mode pack.
