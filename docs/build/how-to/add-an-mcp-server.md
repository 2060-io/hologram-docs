# Add an MCP server

Task-focused recipe for giving your agent a new tool.

## What you need

- An Agent Pack you control (from the [quickstart](../quickstart.md) or your own fork).
- An MCP server you want to plug in. It must speak either `streamable-http` (recommended), `sse`, or `stdio`. Examples used here: **Context7**, **GitHub MCP**, **Wise MCP**.

## Decide which access mode

The single most important choice. See [MCP](../agent-pack/mcp.md#the-two-access-modes) for the full decision rubric; the TL;DR:

| Situation | `accessMode` |
|---|---|
| The MCP server has one shared operator account | `admin-controlled` |
| Each user needs to use their own personal account | `user-controlled` |

## Recipe 1 — Admin-controlled, zero-auth (Context7)

Shortest possible integration. No tokens, no config, every user sees all tools.

```yaml
mcp:
  servers:
    - name: context7
      transport: streamable-http
      url: https://mcp.context7.com/mcp
      accessMode: admin-controlled
      toolAccess:
        default: public
```

Add this block to `agent-pack.yaml`, restart the chatbot, and every user can now ask the agent to resolve library names and fetch docs.

## Recipe 2 — Admin-controlled, shared token (Wise)

Used when the MCP server represents the *organization*, not the user. Token comes from an env variable that you supply through Kubernetes Secrets / your secrets manager.

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
        default: public
```

Set `WISE_MCP_URL` and `WISE_API_TOKEN` in the chatbot's environment. Every user's LLM gets the same tool set, calling Wise with the same account.

### With RBAC

For a "corporate" deployment where different employees get different tool sets based on verified credentials:

```yaml
flows:
  authentication:
    enabled: true
    required: true
    credentialDefinitionId: ${CORP_CREDENTIAL_DEFINITION_ID}
    userIdentityAttribute: employeeLogin
    rolesAttribute: roles
    defaultRole: employee
    adminUsers:
      - cto@acme.corp

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
          employee: [list_profiles, get_balances, list_transfers]
          finance: [send_money, create_invoice, list_recipients]
        approval:
          - tools: [send_money]
            approvers: [finance-manager, cfo]
            timeoutMinutes: 60
```

Users authenticate with a corporate credential whose `roles` claim is a JSON array like `["employee","finance"]`. The LLM is built per user, filtered to just the tools their roles grant. `send_money` requires approval from a user holding `finance-manager` or `cfo`.

## Recipe 3 — User-controlled (GitHub)

Each user supplies their own GitHub Personal Access Token. Their LLM only sees *their* repositories, *their* issues.

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
              en: "Please paste your GitHub Personal Access Token:"
              es: "Por favor pega tu Token de Acceso Personal de GitHub:"
              fr: "Veuillez coller votre jeton d'accès personnel GitHub :"
            headerTemplate: "Bearer {value}"
      toolAccess:
        default: admin
        public:
          - search_repositories
          - search_code
          - search_issues
          - list_pull_requests
          - get_file_contents
          - get_me
```

You **must** set the encryption key in the chatbot's env:

```bash
export MCP_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

Add the `mcp-config` menu item so users can open the configuration flow:

```yaml
flows:
  menu:
    items:
      - id: mcp-config
        labelKey: MCP_CONFIG_MENU
        action: mcp-config
        visibleWhen: notConfiguring
      - id: abort-config
        labelKey: MCP_CONFIG_ABORT
        action: abort-config
        visibleWhen: configuring
```

And the i18n strings for the MCP config flow:

```yaml
languages:
  en:
    strings:
      MCP_CONFIG_MENU: "MCP Server Config"
      MCP_CONFIG_ABORT: "Abort Configuration"
      MCP_CONFIG_SELECT_SERVER: "Select an MCP server to configure:"
      MCP_CONFIG_SAVED: "✅ Configuration for {server} saved and verified."
      MCP_CONFIG_INVALID: "⚠️ Connection test failed for {server}. Please re-enter your credentials."
      MCP_CONFIG_ERROR: "An error occurred saving your config. Please try again."
      MCP_CONFIG_ABORTED: "Configuration cancelled."
```

## Testing it works

1. **Reload the chatbot.** Locally: `docker compose restart chatbot`. K8s: `kubectl rollout restart statefulset/<chart-release>-chatbot`.
2. **Tail the logs.** Look for `MCP server connected: <name>` for admin-controlled servers. For user-controlled, connections only happen after user config.
3. **Ask the agent "what tools can you use?"** The LLM lists them. If you're authenticated with roles, you'll only see tools your roles grant.
4. **Try a real tool call.** `"Show me open issues labeled bug in facebook/react"` — the LLM picks the right tool (or the right MCP server's tool), calls it, and parses the response.
5. **If it doesn't work,** see [MCP — Debugging](../agent-pack/mcp.md#debugging).

## Common gotchas

- **Invalid `headerTemplate`.** Must include `{value}` literally. The runtime replaces it with the user's secret.
- **Missing `MCP_CONFIG_ENCRYPTION_KEY`.** User-controlled configs silently fail to save. Check the chatbot startup logs for the warning.
- **Token scope too narrow.** For GitHub, `repo` + `read:user` + `read:org` are a good starting set. The token must have scopes for the tools your users will invoke.
- **CORS or DNS.** MCP servers run over HTTPS; if you're behind a corporate proxy, make sure the chatbot can reach the server's URL. Wildcard block rules often kill `/mcp/` paths.
- **Wrong access mode.** If a user-controlled MCP never shows tools, double-check `accessMode` is actually `user-controlled` and the user has completed the flow — you should see ✅ in their MCP config menu.

## Going deeper

- [**MCP section**](../agent-pack/mcp.md) — the full declarative surface.
- [**Schema reference — mcp**](../../reference/agent-pack-schema.md#mcp) — every field.
- [**Env vars — MCP_CONFIG_ENCRYPTION_KEY**](../../reference/env-vars.md) — rotation semantics.
