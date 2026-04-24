# Agent Pack — overview

An **Agent Pack** is a single YAML file that declares everything a Hologram agent needs to run: identity, persona, languages, LLM, RAG, memory, conversation flows, tools, MCP servers, RBAC policies, credential authentication. Change the file, restart the container, you have a new agent.

The canonical, field-by-field schema reference lives at [**Agent Pack schema**](../../reference/agent-pack-schema.md). This page is the tour.

## Location and loading

The chatbot container (`io2060/hologram-generic-ai-agent-app`) picks up its pack from the path in `AGENT_PACK_PATH` (defaults to `agent-packs/`). The directory must contain one of:

```text
agent-pack.yaml    # preferred
agent-pack.yml
agent-pack.json
```

In Kubernetes this is typically mounted from a ConfigMap. Locally it's bind-mounted from the repo root into the container at `/app/agent-packs/<id>/agent-pack.yaml`.

If the file is missing or invalid, the chatbot logs a warning and falls back to legacy env-var-based configuration. You'll know you're in a good state when you see `Agent pack loaded: <id> (<displayName>)` in the startup logs.

## The nine top-level sections

```yaml
metadata:          # agent id, display name, description, tags
languages:         # per-language greetings, system prompts, i18n strings
llm:               # provider, model, temperature, agent prompt
rag:               # RAG provider, docs path, vector store
memory:            # memory backend + window size
flows:             # welcome, authentication, menu
tools:             # dynamic HTTP tools, bundled tools
mcp:               # MCP server connections
integrations:      # VS Agent admin URL, Postgres, stats
```

All nine are optional. A minimal pack with just `metadata` and `languages.en.greetingMessage` is enough for an agent that says hi and echoes. Everything else fills in smart defaults or is gated behind an env variable.

Two more advanced sections exist for media:

- `imageGeneration` — OpenAI DALL-E / gpt-image provider config, MinIO upload bridge.
- `speechToText` — voice-note transcription via Whisper or compatible endpoint.
- `vision` — image-to-text description via a vision-capable LLM.

See the [schema reference](../../reference/agent-pack-schema.md) for these.

## Environment variable interpolation

Any string value can reference environment variables with `${VAR}` syntax. The agent-pack loader resolves these at startup:

```yaml
llm:
  provider: openai
  model: ${OPENAI_MODEL:-gpt-4o-mini}
  temperature: 0.2

mcp:
  servers:
    - name: wise
      url: ${WISE_MCP_URL}
      headers:
        Authorization: "Bearer ${WISE_API_TOKEN}"

flows:
  authentication:
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}
```

This is how the same agent-pack file works locally (env from `config.env`), on staging, and in production (env from Kubernetes Secrets) — the YAML is source-controlled, secrets never are.

`${VAR:-default}` provides a fallback when the variable isn't set. Use it for non-secret config that's usually the same across environments.

## A complete minimal pack

The smallest useful pack — a multilingual greeter with LLM chat and no auth:

```yaml
metadata:
  id: hello-agent
  displayName: Hello Agent
  defaultLanguage: en

languages:
  en:
    greetingMessage: "Hi {userName}! How can I help?"
    systemPrompt: "You are a friendly assistant. Be brief."
  es:
    greetingMessage: "¡Hola {userName}! ¿En qué puedo ayudarte?"
    systemPrompt: "Eres un asistente amable. Sé conciso."

llm:
  provider: openai
  model: gpt-4o-mini
```

Drop this at `agent-packs/hello-agent/agent-pack.yaml`, set `AGENT_PACK_PATH=./agent-packs/hello-agent` and `OPENAI_API_KEY=…`, and you've got an agent.

## What each section controls

| Section | What it configures | Deeper doc |
|---|---|---|
| `metadata` | The agent's stable identifier, display name in the Hologram app, tags for discovery. | [Schema — metadata](../../reference/agent-pack-schema.md#metadata) |
| `languages` | Per-locale greeting message, system prompt, i18n strings for menu labels and status messages. | [Schema — languages](../../reference/agent-pack-schema.md#languages) |
| `llm` | Which LLM backend (OpenAI, Anthropic, Ollama, any OpenAI-compatible), model, temperature, system-level agent prompt. | [LLM providers](./llm.md) |
| `rag` | RAG provider (`vectorstore` or `langchain`), doc source path or remote URLs, vector store (Redis / Pinecone). | [Schema — rag](../../reference/agent-pack-schema.md#rag) |
| `memory` | Chat memory backend (`memory` or `redis`), how many turns of history to keep. | [Schema — memory](../../reference/agent-pack-schema.md#memory) |
| `flows.welcome` | Whether to send a greeting when a user connects, and which template to use. | [Schema — flows](../../reference/agent-pack-schema.md#flows) |
| `flows.authentication` | Credential-based login: which credential definition, which attribute is the user identity, which is the roles claim, who are admins. | [Schema — flows.authentication](../../reference/agent-pack-schema.md#flowsauthentication) |
| `flows.menu` | The in-chat contextual menu: which items appear and when. | [Schema — flows.menu](../../reference/agent-pack-schema.md#flowsmenu) |
| `tools` | Legacy external HTTP tools (`LLM_TOOLS_CONFIG`) and bundled tools (stats). | [Schema — tools](../../reference/agent-pack-schema.md#tools) |
| `mcp.servers` | MCP server connections — shared or per-user, with RBAC and approval policies. | [MCP](./mcp.md) |
| `integrations` | VS Agent admin URL, Postgres config, stats endpoint. | [Schema — integrations](../../reference/agent-pack-schema.md#integrations) |

## Customizing from the example

The [quickstart](../quickstart.md) ships with a complete, working [`agent-pack.yaml`](https://github.com/2060-io/hologram-ai-agent-example/blob/main/agent-pack.yaml). Typical customization path after you fork it:

1. **Identity.** Change `metadata.id`, `metadata.displayName`, `metadata.tags`.
2. **Persona.** Rewrite `languages.<lang>.greetingMessage` and `llm.agentPrompt`.
3. **LLM.** Swap the `llm.provider` / `llm.model` or point `llm.baseUrl` at a different OpenAI-compatible endpoint.
4. **Tools.** Replace the Context7 MCP entry under `mcp.servers` with your own MCP. Add `accessMode: user-controlled` and a `userConfig` block for per-user tokens.
5. **Auth.** Set `flows.authentication.required: true` and a `rolesAttribute` to gate chat on a specific credential and lift user roles from its claims.
6. **RBAC.** Add `mcp.servers[].toolAccess.roles` and `approval` policies to filter tools per user role.

Every change is in this one file. No NestJS modules to write, no schema migrations, no container rebuilds.

## Next

- [**LLM providers**](./llm.md) — OpenAI, Anthropic, Ollama, Kimi, DeepSeek, Groq.
- [**MCP**](./mcp.md) — admin-controlled, user-controlled, tool access.
- [**How to add an MCP server**](../how-to/add-an-mcp-server.md) — task-focused.
- [**Schema reference**](../../reference/agent-pack-schema.md) — every field, every default.
