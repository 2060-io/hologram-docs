# Wise agent

A finance agent for managing a **Wise** (formerly TransferWise) account through Hologram Messaging. Two flavors of the same pack:

- **Personal mode** — `accessMode: user-controlled`. Each user supplies their own Wise API token. Their LLM only sees *their* account. Same shape as the [GitHub agent](./github-agent.md).
- **Corporate mode** — `accessMode: admin-controlled` + RBAC. One company account, many employees, role-gated tool access, optional approval for sensitive operations like `send_money`.

Use this cookbook for the corporate pattern — it's the canonical RBAC + approval reference. The personal pattern is identical to the GitHub recipe with the variable names swapped.

## Source

- Pack (personal): [`hologram-verifiable-services/wise-agent/agent-pack.yaml`](https://github.com/2060-io/hologram-verifiable-services/blob/main/wise-agent/agent-pack.yaml)
- Deploy workflow: [`4_deploy-wise-agent.yml`](https://github.com/2060-io/hologram-verifiable-services/blob/main/.github/workflows/4_deploy-wise-agent.yml) — also sets up an MCP-Wise sidecar container alongside the chatbot.
- Live demo: [`wise-agent.demos.hologram.zone`](https://wise-agent.demos.hologram.zone)
- Spec: [**RBAC and approvals**](../agent-pack/rbac.md)

## What it does

A finance team uses one shared Wise sandbox account through their company badge:

- A **junior employee** holds an `employee` role on their badge → can list profiles, view balances, list transfers. Cannot send money.
- A **finance ops** member holds `employee, finance` → can additionally see recipients, send money, create invoices — but `send_money` triggers an approval request.
- A **finance manager** (`employee, finance, finance-manager`) → same plus *self-approves* `send_money` and `create_invoice` instantly. Receives approval requests from others.
- An **auditor** (`auditor`) → read-only on transfers and balances. Can't send anything.

The chatbot reads the role list off the verified credential, filters tools accordingly, and rebuilds the LangChain agent per user. The LLM literally cannot offer a tool the user can't call.

## Architecture

```text
                                       roles claim:
                                        ["employee","finance"]
                          presents
       Hologram user ─────────────▶ Hologram agent
                                         │
                                         │ checks roles → resolves tool set
                                         │ rebuilds LangChain agent
                                         ▼
                          ┌──────────────────────────────┐
                          │  ALLOW   list_transfers      │
                          │  ALLOW   get_balances        │
                          │  APPROVAL  send_money     ◀──┼─ queued for managers
                          │  DENY    create_invoice  ◀──┼─ not even visible
                          └──────────────────────────────┘
                                         │ shared admin token
                                         ▼
                                ┌──────────────────────┐
                                │  Wise MCP server     │
                                │  (one company        │
                                │   sandbox account)   │
                                └──────────────────────┘
```

## The pack — corporate mode

```yaml
metadata:
  id: wise-corporate
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi {userName}! I'm the corporate Wise assistant."
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
      MY_APPROVAL_REQUESTS: "Approval requests"
      PENDING_APPROVALS: "Pending approvals"

llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.2
  agentPrompt: |
    You are the corporate Wise assistant.
    - Default assumption: every request is about the corporate Wise account.
    - Always try a Wise MCP tool before saying you cannot help.
    - Parse tool output and present clean tables (no raw JSON).
    - On a tool error, show the details and suggest a concrete next step.
    - Style: clear, concise, friendly. Don't reveal you are an AI.

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

memory:
  backend: redis
  window: 12
  redisUrl: ${REDIS_URL}

integrations:
  vsAgent:
    adminUrl: http://vs-agent:3000
  postgres:
    host: postgres
    user: wise_corporate_db
    password: ${POSTGRES_PASSWORD}
    dbName: wise-corporate
```

## How a sensitive operation flows

The user is `alice@acme.corp` with `roles = ["employee","finance"]`. She asks: *"Send 500 EUR to John Doe."*

1. **LLM picks `send_money`.** It's in the `finance` role's tool list, so it's offered.
2. **`ToolCallInterceptor` checks RBAC.** Decision: `APPROVAL`. Alice doesn't hold `finance-manager` or `cfo`, so no self-approve.
3. **Agent prompts Alice.** *"Sending 500 EUR to John requires approval from a finance-manager or cfo. Submit approval request?"* with `[Yes] [No]` buttons.
4. **Alice taps Yes.** Pending request created in Postgres.
5. **Bob (`finance-manager`) gets notified.** His menu badge shows `(1) pending approvals`. He gets a chat message: *"New approval request from alice@acme.corp: send 500 EUR to John Doe."*
6. **Bob reviews.** Taps `Pending approvals` → picks the request → sees the args → taps `Approve`.
7. **Tool executes.** Chatbot calls Wise MCP's `send_money` with the original args, on the shared admin connection.
8. **Alice gets the result.** *"Your request was approved. Result: transfer #12345 created, status: outgoing."*
9. **Menus update.** Alice's `Approval requests` count decrements; Bob's `Pending approvals` count decrements.

If Alice were also `finance-manager` (so her roles were `["employee","finance","finance-manager"]`), step 3 would be skipped — the system detects she could approve her own request and just runs it.

## Required env vars

| Variable | Source |
|---|---|
| `OPENAI_API_KEY` | OpenAI dashboard |
| `MCP_CONFIG_ENCRYPTION_KEY` | `openssl rand -hex 32` (required even though we're admin-controlled, because the chatbot infrastructure assumes it) |
| `WISE_MCP_URL` | URL of the Wise MCP server. The deploy workflow ships an [`mcp-wise`](https://github.com/2060-io/mcp-wise) sidecar container that talks to Wise's REST API. |
| `WISE_API_TOKEN` | Wise sandbox token tied to the corporate account |
| `CORP_BADGE_DEFINITION_ID` | The credential definition for your corporate badge; see [**Authentication**](../agent-pack/authentication.md#common-credential-definitions) |
| `POSTGRES_PASSWORD` | Generated per-deploy |

## Wise MCP sidecar

The agent never talks to Wise's REST API directly — it goes through an MCP shim that translates LLM-friendly tool calls into Wise's API. The deploy workflow brings up a [`mcp-wise`](https://github.com/2060-io/mcp-wise) container alongside the chatbot:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wise-agent-mcp-wise
spec:
  template:
    spec:
      containers:
        - name: mcp-wise
          image: io2060/mcp-wise:latest
          ports:
            - containerPort: 14101
          env:
            - name: MODE
              value: "http"
            - name: WISE_IS_SANDBOX
              value: "true"
            - name: WISE_ALLOWED_PROFILE_TYPES
              value: "personal"   # or "business"
```

The chatbot's `WISE_MCP_URL` then points at `http://wise-agent-mcp-wise:14101/mcp/`.

## Backward compatibility — personal mode

If you don't want RBAC, the personal-mode pack is a one-line change: drop the `flows.authentication.rolesAttribute` + `toolAccess.roles` blocks and use `accessMode: user-controlled` so each user supplies their own token. Same shape as the [GitHub agent](./github-agent.md).

## When to choose which mode

| You have | Use |
|---|---|
| One company Wise account, many employees | **Corporate mode** (this page) |
| One personal account per user | [**Personal mode**](./github-agent.md), with `name: wise` |
| External developer demoing on their own sandbox | Personal mode |
| Regulated finance team where every transfer must be auditable | Corporate mode + `approval` policy on every write tool |

## Patterns to copy

The corporate pattern transfers directly to:

- **Stripe** for payment ops
- **Salesforce** for sales-team CRM where per-rep tokens would be operationally messy
- **AWS** for SRE access (with `approval` on `terminate_instance`, `delete_bucket`, etc.)
- **Internal company APIs** secured by a single service token

Replace `wise` with your tool, `WISE_API_TOKEN` with the relevant secret, and tune the `roles` map to your org chart.

## Where to look next

| Question | Page |
|---|---|
| Full RBAC mental model | [**RBAC**](../agent-pack/rbac.md) |
| The credential issuer side (how do employees get the badge?) | [**Authentication**](../agent-pack/authentication.md) |
| Why approval requires admin-controlled MCP | [**MCP — accessMode**](../agent-pack/mcp.md#the-two-access-modes) |
| Deploying the sidecar in K8s | [**CI/CD**](../../run/ci-cd.md) |
