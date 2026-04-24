# MCP — Model Context Protocol

The **Model Context Protocol** ([spec](https://modelcontextprotocol.io)) is a standard for letting an LLM call tools exposed by a remote server. Hologram agents are first-class MCP clients — you declare MCP servers in `agent-pack.yaml` and the chatbot connects, discovers tools, and makes them available to the LLM automatically.

This page covers the declarative surface. For a task-focused walkthrough, see [**How to add an MCP server**](../how-to/add-an-mcp-server.md).

## Anatomy

```yaml
mcp:
  servers:
    - name: <unique-name>
      transport: streamable-http   # or 'sse' or 'stdio'
      url: <server URL>             # for http/sse
      headers:
        Authorization: "Bearer ${TOKEN}"
      accessMode: admin-controlled  # or user-controlled
      userConfig:                   # only with user-controlled
        fields: [...]
      toolAccess:
        default: public             # or admin / none
        public: [...]                # legacy: tools available to all
        roles:                       # RBAC: role → tools
          employee: [...]
        approval:                    # tools requiring managerial approval
          - tools: [...]
            approvers: [finance-manager]
            timeoutMinutes: 60
```

- **`name`** — unique within the pack. Used for logging and to reference the server from RBAC rules.
- **`transport`** — `streamable-http` (recommended, keep-alive), `sse`, or `stdio` (launches a local subprocess — rarely used in production).
- **`url`** — for HTTP transports.
- **`headers`** — sent with every request. Env-var interpolation is the standard way to inject secrets.
- **`accessMode`** — `admin-controlled` (default) or `user-controlled`. See below.
- **`userConfig`** — shape of the per-user configuration flow, only when `accessMode: user-controlled`.
- **`toolAccess`** — who can call which tools.

## The two access modes

The choice between `admin-controlled` and `user-controlled` is the most consequential decision when wiring an MCP server. Think of it as **whose credentials does the MCP server see?**

### `admin-controlled` — shared server token

The agent connects once at startup using a token from an env variable. **All users share the same connection.** The MCP server sees "the agent" as the caller; it has no idea there are different Hologram users behind it.

Use this when:

- The MCP server has a single operator account that's meant to be shared (Wise business API, your internal REST proxy, Context7 — anywhere the token represents the *organization*, not the user).
- You want RBAC — you gate who can call which tools via verified user roles, not via distinct tokens.
- You want zero onboarding friction — users don't need to do anything to use the tools.

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
          guest: [get_exchange_rate]
          employee: [list_profiles, get_balances]
          finance: [send_money, create_invoice]
```

### `user-controlled` — per-user tokens

Each user must supply their own credentials through an in-chat configuration flow. The chatbot encrypts the credentials with AES-256-GCM, stores them in PostgreSQL, and uses them when *that* user calls a tool on *that* server.

Use this when:

- The MCP server's access is tied to personal accounts that the user owns (GitHub, Notion, Linear, personal Gmail).
- The MCP server exposes data that differs per user and should never be pooled (each user sees their own repos / issues / tasks).

```yaml
mcp:
  servers:
    - name: github
      transport: streamable-http
      url: https://api.githubcopilot.com/mcp/
      accessMode: user-controlled
      userConfig:
        fields:
          - name: token
            type: secret
            label:
              en: "Please enter your GitHub Personal Access Token:"
              es: "Por favor, ingresa tu Token de Acceso Personal de GitHub:"
            headerTemplate: "Bearer {value}"
      toolAccess:
        default: admin
        public:
          - search_repositories
          - list_pull_requests
          - get_file_contents
```

**Per-user config flow**, when a user taps the *MCP Server Config* menu item:

1. They see a list of user-controlled servers — ✅ configured / ⚠️ not configured.
2. They pick one and get prompted for each `userConfig.fields[]` entry in their language.
3. Credentials are encrypted with `MCP_CONFIG_ENCRYPTION_KEY` and stored in Postgres.
4. The agent immediately tests the connection — ✅ on success / ⚠️ on failure (stored config is deleted so they can retry).
5. Tools become available to that user's LLM. **Lazy discovery** — the first successful connect per user triggers tool discovery, after which the tool set is cached.

:::warning `MCP_CONFIG_ENCRYPTION_KEY` is a one-way trapdoor
Generate with `openssl rand -hex 32`. If you **rotate** it, every stored user credential becomes unreadable and every user must reconfigure. There is currently no re-encrypt migration path.
:::

## Tool access control

Two models cohabit — the agent picks by inspecting the `toolAccess` block.

### Legacy (binary) model

When `toolAccess.roles` is absent:

```yaml
toolAccess:
  default: admin       # or 'public'
  public:              # only used when default: admin
    - tool_name_one
    - tool_name_two
```

- `default: public` — every tool is available to every user.
- `default: admin` — only admins (listed in `flows.authentication.adminUsers`) see all tools; everyone else sees only tools in `public`.

Simple, good for personal agents.

### RBAC model

When `toolAccess.roles` is defined:

```yaml
toolAccess:
  default: none        # implicit DENY for tools not listed
  roles:
    guest: [get_exchange_rate]
    employee: [list_profiles, get_balances, list_transfers]
    finance: [send_money, create_invoice, list_recipients]
  approval:
    - tools: [send_money]
      approvers: [finance-manager, cfo]
      timeoutMinutes: 60
    - tools: [create_invoice]
      approvers: [finance-manager]
      timeoutMinutes: 120
```

How it works:

- **Roles come from the user's credential.** Configure `flows.authentication.rolesAttribute` — the chatbot reads that credential attribute (string, CSV, or JSON array) and intersects it with the `roles` map.
- **The LLM only sees tools the user can call.** Denied tools are not in the user's LLM agent at all — there's nothing to attempt, no leakage.
- **`default: none`** means "deny any tool not explicitly listed under a role". Use `default: all` to flip the default.
- **Approval policies.** Tools listed under `approval[].tools` require managerial approval. When the LLM calls one:
  - If the user holds both the tool role **and** an approver role → **self-approval**, instant execution.
  - Otherwise → a pending request is queued. Approvers get a notification + menu badge; they approve or reject from the menu. Result is delivered to the requesting user as a message.
  - Requests expire after `timeoutMinutes`.
- **`adminUsers`** (listed in `flows.authentication.adminUsers`) bypass all RBAC and see every tool.

Users can always ask the agent *"What tools can I use?"* and the LLM lists its available tools grouped by MCP server — useful for verifying RBAC is wired correctly.

See the full [RBAC & approval spec](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/rbac-approval-spec.md) for the design details.

## Lazy discovery

MCP servers with `accessMode: user-controlled` and no admin token **do not connect at startup**. The chatbot can't know what tools they expose until someone authenticates. The first successful per-user connection triggers tool discovery and caches the tool definitions; the LangChain agent is rebuilt dynamically when new tools appear.

This means:

- A pack with a user-controlled GitHub MCP entry boots with zero tools for unauthenticated users.
- A user who configures their token sees GitHub tools immediately.
- Another user configuring their token later doesn't re-trigger discovery — the tool set is cached.

## Debugging

| Symptom | What to check |
|---|---|
| Tool doesn't show up in the LLM | User's credential doesn't grant access (check `rolesAttribute` → `toolAccess.roles`). Or: user-controlled server and user hasn't configured yet. |
| "Tool returned error" every time | Admin token invalid or expired, or user's own token rejected. The agent now deletes invalid user configs so the user can retry. |
| User config flow finishes with ⚠️ | Connection test failed. Usually a bad token or wrong `headerTemplate`. |
| `MCP_CONFIG_ENCRYPTION_KEY` missing warning | Set it or per-user configs can't be saved. `openssl rand -hex 32`. |

For lower-level MCP debugging (is the server reachable? what tools does it expose?), use the `mcp-smoke.mjs` script shipped in the agent container.

## Required env vars

| Variable | Required for | Description |
|---|---|---|
| `MCP_CONFIG_ENCRYPTION_KEY` | Any user-controlled MCP server | 32-byte hex key for encrypting per-user credentials |
| `MCP_SERVERS_CONFIG` | n/a (override) | JSON array that overrides `mcp.servers` from the pack — useful in K8s to keep secrets out of the pack file |

## Next

- [**How to add an MCP server**](../how-to/add-an-mcp-server.md) — step-by-step wiring.
- [**Schema reference**](../../reference/agent-pack-schema.md#mcp) — every field, every default.
