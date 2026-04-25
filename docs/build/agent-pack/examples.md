# Examples

Copy-pasteable Agent Pack snippets. Each is a complete, working `agent-pack.yaml` for one specific scenario — drop it into your fork of [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example), set the listed env vars, and you have an agent.

For the full schema, see [**Agent Pack schema**](../../reference/agent-pack-schema.md).

## 1. Minimal — OpenAI, English only

The smallest pack that does something useful. No auth, no MCP, no RAG. Just a polite OpenAI-backed assistant.

```yaml
metadata:
  id: minimal
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi {userName}, what can I help you with?"

llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.3
  agentPrompt: |
    You are a polite, concise assistant.
    Answer in the user's language. Fallback: English.
```

Env: `OPENAI_API_KEY`.

## 2. Local LLM — Ollama, no external dependency

Privacy-first. The whole stack runs on your machine; nothing leaves the host.

```yaml
metadata:
  id: ollama-local
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi {userName}, I run entirely on this machine."

llm:
  provider: ollama
  model: llama3
  temperature: 0.3
  agentPrompt: |
    You are a helpful local assistant. Be concise and clear.
```

Env: `OLLAMA_ENDPOINT=http://ollama:11434`, `OLLAMA_MODEL=llama3`.

Bring up Ollama alongside the agent:

```bash
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
docker exec ollama ollama pull llama3
```

## 3. OpenAI-compatible endpoint — Kimi / DeepSeek / Groq

Any provider speaking the OpenAI `/v1/chat/completions` protocol. Just override the base URL.

```yaml
metadata:
  id: kimi-agent
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi! I'm powered by Moonshot Kimi."

llm:
  provider: openai
  model: moonshot-v1-8k
  baseUrl: https://api.moonshot.cn/v1
  temperature: 0.3
  agentPrompt: |
    You are a helpful assistant.
```

Env: `OPENAI_API_KEY=<your-moonshot-key>`. Swap `model` + `baseUrl` for DeepSeek (`https://api.deepseek.com`), Groq (`https://api.groq.com/openai/v1`), or Together AI (`https://api.together.xyz/v1`).

## 4. Multi-language — en/es/fr/pt with localized prompts

Hologram clients send each user's locale on connection; the runtime picks the matching language block.

```yaml
metadata:
  id: multilang
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi {userName}! I'm your multilingual assistant."
    systemPrompt: "You are friendly, helpful, and concise."
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
  es:
    greetingMessage: "¡Hola {userName}! Soy tu asistente multilingüe."
    systemPrompt: "Eres amable, servicial y conciso."
    strings:
      CREDENTIAL: "Autenticar"
      LOGOUT: "Cerrar sesión"
  fr:
    greetingMessage: "Bonjour {userName} ! Je suis votre assistant multilingue."
    systemPrompt: "Vous êtes aimable, serviable et concis."
    strings:
      CREDENTIAL: "Authentifier"
      LOGOUT: "Déconnexion"
  pt:
    greetingMessage: "Olá {userName}! Sou seu assistente multilíngue."
    systemPrompt: "Você é amigável, prestativo e conciso."
    strings:
      CREDENTIAL: "Autenticar"
      LOGOUT: "Sair"

llm:
  provider: openai
  model: gpt-4o-mini
  agentPrompt: |
    Always answer in the user's language. Fallback: English.
```

See [**i18n**](./i18n.md) for the full string-key list.

## 5. RAG — vectorstore + Redis + local docs

Drop your `.md`/`.pdf`/`.txt` files in `./rag/docs`, restart, the LLM gains a `rag_retriever` tool grounded on them.

```yaml
metadata:
  id: rag-agent
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi! Ask me about our product docs."

llm:
  provider: openai
  model: gpt-4o-mini
  agentPrompt: |
    You answer questions about our product. For any procedural or policy
    question, ALWAYS call rag_retriever first and ground your answer in
    the returned snippets. If rag_retriever returns nothing relevant,
    say "I don't know" rather than guess.

rag:
  provider: langchain
  docsPath: /app/rag/docs
  remoteUrls:
    - https://raw.githubusercontent.com/acme/handbook/main/README.md
  chunkSize: 1000
  chunkOverlap: 200
  vectorStore:
    type: redis
    indexName: my-product-docs

memory:
  backend: redis
  window: 12
  redisUrl: ${REDIS_URL}
```

Env: `OPENAI_API_KEY`, `REDIS_URL=redis://redis:6379`. Redis must be the **Redis Stack** image (`redis/redis-stack-server:latest`) for RediSearch.

## 6. Admin-controlled MCP — Wise with shared org token

Whole organization shares one Wise account through a shared API token. Every authenticated user sees the same data.

```yaml
metadata:
  id: wise-shared
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi! I help you manage the company Wise account."

llm:
  provider: openai
  model: gpt-4o-mini
  agentPrompt: |
    You are a Wise assistant. Use Wise MCP tools to answer questions
    about balances, transfers, and exchange rates.

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

Env: `OPENAI_API_KEY`, `WISE_MCP_URL`, `WISE_API_TOKEN`.

## 7. User-controlled MCP — GitHub with per-user PAT

Each user supplies their own GitHub Personal Access Token through the in-chat config flow. They see only *their* repos.

```yaml
metadata:
  id: github-personal
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi! I'm your personal GitHub assistant."
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
      MCP_CONFIG_MENU: "MCP Server Config"
      MCP_CONFIG_ABORT: "Abort Configuration"
      MCP_CONFIG_SELECT_SERVER: "Select an MCP server to configure:"
      MCP_CONFIG_SAVED: "✅ Configuration for {server} saved and verified."
      MCP_CONFIG_INVALID: "⚠️ Connection test failed for {server}."
      MCP_CONFIG_ERROR: "Save error. Please retry."
      MCP_CONFIG_ABORTED: "Configuration cancelled."

llm:
  provider: openai
  model: gpt-4o-mini
  agentPrompt: |
    You are a GitHub assistant. Use the GitHub MCP tools.

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
            headerTemplate: "Bearer {value}"
      toolAccess:
        default: public
```

Env: `OPENAI_API_KEY`, `MCP_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)`.

## 8. RBAC — corporate Wise with three roles + approval

Single Wise account, three employee tiers, sensitive operations require manager sign-off.

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
  agentPrompt: |
    You are the corporate Wise assistant. Use Wise MCP tools.

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

Env: `OPENAI_API_KEY`, `WISE_MCP_URL`, `WISE_API_TOKEN`, `CORP_BADGE_DEFINITION_ID`.

See [**RBAC**](./rbac.md) for the full mental model.

## 9. Authentication required — gov-id-issued credential

Strict mode: unauthenticated users get the welcome and an auth prompt only. Chat is blocked until they present a credential.

```yaml
metadata:
  id: gov-service
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Welcome. Please authenticate to access the service."
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
      AUTH_REQUIRED: "Please authenticate to use this service."
      AUTH_SUCCESS_NAME: "Welcome, {name}. How can I help?"
      WAITING_CREDENTIAL: "Waiting for you to complete authentication..."

llm:
  provider: openai
  model: gpt-4o-mini
  agentPrompt: |
    You are an official assistant for citizens of Examplestan.
    Only respond to authenticated users.

flows:
  authentication:
    enabled: true
    required: true
    credentialDefinitionId: ${GOV_ID_DEFINITION_ID}
    userIdentityAttribute: nationalId
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
```

Env: `OPENAI_API_KEY`, `GOV_ID_DEFINITION_ID` (from your gov-id issuer's VS Agent).

## More

- [**Cookbook**](../cookbook/hologram-example-agent.md) — full walk-throughs of the reference packs.
- [**Schema reference**](../../reference/agent-pack-schema.md) — every field, every default.
- Source of truth: the agent-packs in [`hologram-generic-ai-agent-vs/agent-packs/`](https://github.com/2060-io/hologram-generic-ai-agent-vs/tree/main/agent-packs).
