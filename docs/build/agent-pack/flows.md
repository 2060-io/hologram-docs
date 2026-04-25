# Flows

The `flows` block in `agent-pack.yaml` declares the **non-LLM behaviours** of the agent — what it says when a user connects, what menu items it shows, when those items appear, and which built-in actions they trigger.

It's the part of the pack that doesn't reach the LLM at all: the welcome message goes out before the model sees the conversation, and menu actions run as deterministic flows.

## Sub-blocks

```yaml
flows:
  welcome:        # what the agent does on connect
    enabled: true
    sendOnProfile: true
    templateKey: greetingMessage

  authentication: # see ./authentication.md
    enabled: true
    required: true
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}
    userIdentityAttribute: name

  menu:           # contextual menu items
    items:
      - id: authenticate
        labelKey: CREDENTIAL
        action: authenticate
        visibleWhen: unauthenticated
      ...
```

## `flows.welcome`

```yaml
flows:
  welcome:
    enabled: true            # send a welcome message on connection
    sendOnProfile: true      # wait for the user's profile (locale) before sending
    templateKey: greetingMessage   # which language string to use
```

| Field | Default | Description |
|---|---|---|
| `enabled` | `true` | Send a welcome on connection. |
| `sendOnProfile` | `true` | If `true`, wait for the user's DIDComm Profile message (which carries their locale) and reply in their language. If `false`, send immediately in `metadata.defaultLanguage`. |
| `templateKey` | `greetingMessage` | Which key to look up in `languages[*]`. |

The looked-up template can include `{userName}` (from DIDComm profile) which is substituted before sending.

## `flows.menu`

A **contextual menu** is the dropdown the user can open from the chat header in Hologram. It's the agent's UI for verbs that don't fit chat ("authenticate", "log out", "configure MCP", "view approvals"). Each entry is a deterministic action — the LLM doesn't see them, doesn't choose them.

```yaml
flows:
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

      - id: mcp-config
        labelKey: MCP_CONFIG_MENU
        action: mcp-config
        visibleWhen: notConfiguring

      - id: abort-config
        labelKey: MCP_CONFIG_ABORT
        action: abort-config
        visibleWhen: configuring

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

### Per-item fields

| Field | Required | Description |
|---|---|---|
| `id` | yes | Stable identifier; appears in logs. |
| `labelKey` | yes | Key into `languages[*].strings` — the displayed label. |
| `action` | yes | Built-in action this item triggers. See below. |
| `visibleWhen` | no | When this item is shown. Defaults to `always`. |
| `badge` | no | Dynamic badge value (e.g. unread count). Currently used for approval items. |

### Built-in actions

| `action` | Triggers | Used with |
|---|---|---|
| `authenticate` | DIDComm presentation request for `credentialDefinitionId` | `visibleWhen: unauthenticated` |
| `logout` | Drop the user's session | `visibleWhen: authenticated` |
| `mcp-config` | Per-user MCP configuration flow (selects a server, prompts for fields, encrypts and stores) | `visibleWhen: notConfiguring` |
| `abort-config` | Cancel the in-progress MCP config flow | `visibleWhen: configuring` |
| `my-approval-requests` | List the user's pending approval requests; pick one to cancel | `visibleWhen: hasApprovalRequests` |
| `pending-approvals` | List approval requests the user can approve; pick one to approve / reject | `visibleWhen: hasPendingApprovals` |

### `visibleWhen` states

The agent maintains a simple state machine per user. Each menu item lists the states in which it appears.

| State | True when |
|---|---|
| `always` | Always (default if `visibleWhen` omitted). |
| `authenticated` | The user has presented a valid credential. |
| `unauthenticated` | The user has not authenticated yet. Always true if `flows.authentication.enabled: false`. |
| `configuring` | The user is in the middle of an MCP config flow. |
| `notConfiguring` | Inverse of `configuring`. |
| `hasApprovalRequests` | At least one open approval request submitted by this user. |
| `hasPendingApprovals` | The user holds an approver role and has at least one pending request to act on. |

The states are mutually-aware — `authenticated` implies `notConfiguring` (can't auth and configure at the same time), but most others compose freely.

### `badge`

Some items show a count badge — a small number next to the label.

| `badge` value | Meaning |
|---|---|
| `approvalRequestCount` | Number of open approval requests the user submitted. |
| `pendingApprovalCount` | Number of approval requests the user can act on. |

The runtime updates the badge in real time as state changes; the menu re-renders without the user reopening it.

## Statistics

Statistics are not strictly part of `flows`, but they're emitted as the user moves through these flows. If you wire up a JMS broker (Apache ActiveMQ Artemis), the agent emits per-user events you can consume downstream.

```yaml
integrations:
  vsAgent:
    stats:
      enabled: ${VS_AGENT_STATS_ENABLED}   # "true" / "false"
      host: ${VS_AGENT_STATS_HOST}
      port: ${VS_AGENT_STATS_PORT}
      queue: ${VS_AGENT_STATS_QUEUE}
      username: ${VS_AGENT_STATS_USER}
      password: ${VS_AGENT_STATS_PASSWORD}
```

The bundled `statisticsFetcher` tool also lets the LLM ask the stats backend questions ("how many users connected today?"). It's enabled in `tools.bundled`:

```yaml
tools:
  bundled:
    statisticsFetcher:
      enabled: true
      endpoint: ${STATISTICS_API_URL}
      requiresAuth: true
      defaultStatClass: USER_CONNECTED
```

For the full JMS integration, see [**JMS integration upstream**](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/hologram-generic-jms-integration.md).

## Custom flows

The flow system is currently **closed** — you can't define your own actions in YAML. If you need a flow the built-ins don't cover (a fixed-question intake form, an outbound credential issuance trigger, etc.), the supported pattern is:

1. **Express the deterministic part as an LLM rule** in `agentPrompt`, with explicit step-by-step instructions. See the customer-service [PQRSD pack](../cookbook/customer-service-agent.md) — its system prompt contains an 8-step flow the LLM follows verbatim.
2. **Or fork the chatbot.** The `hologram-generic-ai-agent-vs` repo is open source; new actions live under `src/chatbot/`.

We expect to expose a wider set of declarative flow primitives in a future schema version.

## Worked example — minimal multilingual menu

```yaml
flows:
  welcome:
    enabled: true
    sendOnProfile: true
    templateKey: greetingMessage

  authentication:
    enabled: true
    required: false
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}

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

languages:
  en:
    greetingMessage: "Hi {userName}, what can I help you with?"
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
  es:
    greetingMessage: "Hola {userName}, ¿en qué puedo ayudarte?"
    strings:
      CREDENTIAL: "Autenticar"
      LOGOUT: "Cerrar sesión"
```

## Next

- [**Authentication**](./authentication.md) — what `action: authenticate` actually does.
- [**MCP**](./mcp.md) — what `action: mcp-config` does.
- [**RBAC**](./rbac.md) — the approval menu items.
- [**i18n**](./i18n.md) — string declarations.
