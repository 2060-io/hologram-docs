# GitHub agent

A Hologram AI agent that gives every user access to *their own* GitHub — repos, issues, PRs, code search — over Hologram Messaging. The agent never holds a single shared GitHub token; each user supplies their own Personal Access Token through an in-chat configuration flow, and the chatbot encrypts and stores it.

This is the canonical pattern for **user-controlled MCP**: the MCP server is shared infrastructure, but the credentials it sees are per-user.

## Source

- Pack: [`hologram-verifiable-services/github-agent/agent-pack.yaml`](https://github.com/2060-io/hologram-verifiable-services/blob/main/github-agent/agent-pack.yaml)
- Deploy workflow: [`3_deploy-github-agent.yml`](https://github.com/2060-io/hologram-verifiable-services/blob/main/.github/workflows/3_deploy-github-agent.yml)
- Live demo: [`github-agent.demos.hologram.zone`](https://github-agent.demos.hologram.zone) (or the QR-code on the site)

## What it does

A user opens the agent from Hologram and sees a greeting plus an MCP-config menu item. They tap it, paste their GitHub PAT, the agent verifies the connection, and now they can ask things like:

- "What are my open pull requests in the verana-labs org?"
- "Show me issues labeled `bug` in `facebook/react` opened in the last week."
- "Find all uses of `Skill` in `2060-io/hologram-generic-ai-agent-vs`."

The LLM picks the right GitHub MCP tool, calls it with the user's token, parses the response, and replies in clean prose / tables — never raw JSON.

## Architecture

```text
                 ┌──────────────────────────┐
                 │  Hologram app, user A    │
                 │  PAT(A): ghp_aaa...      │
                 └────────────┬─────────────┘
                              │ DIDComm
                 ┌────────────▼─────────────┐
                 │  VS Agent + chatbot      │
                 │  (encrypts + stores      │
                 │   PAT(A) per session)    │
                 └────────────┬─────────────┘
                              │ HTTPS, Bearer ${PAT(A)}
                              ▼
                 ┌──────────────────────────┐
                 │ api.githubcopilot.com/   │
                 │   mcp/  (GitHub MCP)     │
                 └──────────────────────────┘
```

User B does the same with `PAT(B)` and sees only their own repos. The chatbot never holds a shared token; the GitHub MCP server sees a different token for every user.

## The pack — key blocks

### `accessMode: user-controlled`

```yaml
mcp:
  servers:
    - name: github
      transport: streamable-http
      url: https://api.githubcopilot.com/mcp/
      accessMode: user-controlled
      headers:
        Authorization: "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      userConfig:
        fields:
          - name: token
            type: secret
            label:
              en: "Please enter your GitHub Personal Access Token:"
              es: "Por favor, ingresa tu Token de Acceso Personal de GitHub:"
              fr: "Veuillez entrer votre jeton d'accès personnel GitHub :"
            headerTemplate: "Bearer {value}"
      toolAccess:
        default: public
```

The important fields:

- **`accessMode: user-controlled`** — every user must supply their own token; the server is not connected at startup.
- **`userConfig.fields[]`** — what the user is prompted for. `type: secret` masks the input and stops it appearing in logs. The `label` is localized.
- **`headerTemplate: "Bearer {value}"`** — the user's secret is substituted into `{value}` and used as the `Authorization` header. The literal `${GITHUB_PERSONAL_ACCESS_TOKEN}` env-var fallback at the top is harmless when `accessMode: user-controlled`; the per-user template wins.
- **`toolAccess.default: public`** — every authenticated user sees every GitHub tool. To restrict, switch to `default: admin` and list the tools to expose, or use [**RBAC**](../agent-pack/rbac.md).

### Menu items for MCP config

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
```

The `mcp-config` and `abort-config` items together drive the per-user config flow. Without them, users have no way to register their token.

The `i18n` strings:

```yaml
languages:
  en:
    strings:
      MCP_CONFIG_MENU: "MCP Server Config"
      MCP_CONFIG_ABORT: "Abort Configuration"
      MCP_CONFIG_SELECT_SERVER: "Select an MCP server to configure:"
      MCP_CONFIG_SAVED: "✅ Configuration for {server} saved and verified."
      MCP_CONFIG_INVALID: "⚠️ Connection test failed for {server}."
      MCP_CONFIG_ERROR: "An error occurred saving your config. Please retry."
      MCP_CONFIG_ABORTED: "Configuration cancelled."
```

### LLM rules

```yaml
llm:
  provider: openai
  model: gpt-5.4-mini
  temperature: 0.2
  agentPrompt: |
    You are a GitHub assistant agent.
    - Default assumption: every user request is about GitHub. When the
      user mentions repos, issues, PRs, code, branches, commits, users
      or organizations, immediately use the matching GitHub MCP tool.
    - Tool rules:
      1. Always try a GitHub MCP tool first.
      2. Convert time ranges to ISO-8601; never invent dates.
      3. Parse tool output and present clean tables/lists (no raw JSON).
    - Error handling: when a tool returns an error, share the details.
      Common causes: expired token (reconfigure via MCP Server Config),
      missing scope (e.g. repo or read:org), private repo without access.
    - Style: clear, concise, friendly. Don't reveal you are an AI.
```

The "always try a tool first" rule is critical — without it, the LLM tries to answer from training data and gets stale repo state.

## Per-user flow, end to end

1. **Connect.** User scans the agent's invitation in Hologram. Sees the greeting; menu has `Authenticate`, `MCP Server Config`.
2. **Authenticate.** User taps Authenticate, presents the credential. Now `LOGOUT` replaces `Authenticate`. (If `flows.authentication.required: false`, this step is optional — the user can skip and still configure MCP, but the agent has no identity to bind the config to. In practice every deploy of this pattern requires auth.)
3. **MCP Server Config.** User taps the menu item. Agent prompts: *"Select an MCP server to configure"*; the user picks `github`.
4. **Token entry.** Agent prompts: *"Please enter your GitHub Personal Access Token"*. User pastes it (it's masked).
5. **Verification.** Chatbot:
   - Encrypts the token with `MCP_CONFIG_ENCRYPTION_KEY` (AES-256-GCM).
   - Stores the encrypted blob in PostgreSQL keyed by user identity + server name.
   - Connects to GitHub MCP using the token, calls a low-stakes tool (`get_me`) to verify.
6. **✅ or ⚠️.** On success, the agent rebuilds the user's LangChain agent with the discovered GitHub tools available. On failure, deletes the bad config and asks the user to retry.
7. **Use.** User asks anything GitHub-related. The LLM has tools, calls them with the user's token, replies.

User B repeats the flow with their token. They never see User A's data.

## Token scope

For the example pack's tool list, the PAT needs:

- `repo` — read repositories, issues, PRs.
- `read:user` — for `get_me`.
- `read:org` — for org-level searches.

Tighter scope = more "tool returned 403" errors; the LLM apologizes and asks the user to reconfigure with broader scope.

## Production deploy

[`3_deploy-github-agent.yml`](https://github.com/2060-io/hologram-verifiable-services/blob/main/.github/workflows/3_deploy-github-agent.yml) follows the same pattern as the example agent's deploy: agent-pack ConfigMap → Helm release of `hologram-generic-ai-agent-chart` → Service-credential issuance via the organization VS.

The K8s `deployment.yaml` is short — most of the configuration is in `agent-pack.yaml`. The two extra secrets to set are:

- `MCP_CONFIG_ENCRYPTION_KEY` — `openssl rand -hex 32`. **Don't rotate** without re-asking every user to reconfigure.
- (Optionally) GitHub MCP server URL — most deploys hit `https://api.githubcopilot.com/mcp/` directly; you only override if you've self-hosted a GitHub MCP server.

## Patterns to copy

This pack is the template for **any per-user MCP integration**:

- Notion ([their MCP](https://github.com/makenotion/notion-mcp-server))
- Linear ([Linear MCP](https://github.com/AhmedDevHQ/linear-mcp))
- Personal Gmail / Calendar (community MCPs)
- Self-hosted internal tools where each employee has a personal account

Replace the `name`, `url`, and `userConfig.fields[].label` — the rest stays.

## Where to look next

| Question | Page |
|---|---|
| How does encryption / storage work? | [**MCP — user-controlled**](../agent-pack/mcp.md#user-controlled--per-user-tokens) |
| How do I add a second user-controlled MCP server to the same agent? | [**How-to: Add an MCP server**](../how-to/add-an-mcp-server.md) |
| What if I want admin-controlled instead? | [**Cookbook — Wise agent**](./wise-agent.md) |
| Full schema for `userConfig` | [**Schema reference**](../../reference/agent-pack-schema.md#mcp) |
