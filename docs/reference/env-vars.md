# Environment variables

Canonical index of every environment variable the Hologram generic AI agent container recognises. Anything declared in the agent pack can also be driven from an env variable — useful for deployment-time overrides that shouldn't live in source-controlled YAML.

:::tip
These are the variables consumed by **the chatbot process**. The VS Agent is a separate container with its own variables (`AGENT_PUBLIC_DID`, `AGENT_LABEL`, `AGENT_INVITATION_IMAGE_URL`, `USE_CORS`, `EVENTS_BASE_URL`, wallet keys, …). See the [VS Agent README upstream](https://github.com/verana-labs/vs-agent) for those.
:::

## Application

| Variable | Description | Default |
|---|---|---|
| `APP_PORT` | Application port | `3000` |
| `LOG_LEVEL` | Log level (1=error, 2=warn, 3=info, 4=debug) | `3` |
| `AGENT_PACK_PATH` | Path to agent pack directory | `./agent-packs/hologram-welcome` |

## LLM

| Variable | Description | Default |
|---|---|---|
| `LLM_PROVIDER` | LLM backend: `openai`, `ollama`, `anthropic` | `ollama` |
| `OPENAI_API_KEY` | OpenAI (or compat-provider) API key | |
| `OPENAI_MODEL` | OpenAI model | `gpt-5.4-mini` |
| `OPENAI_TEMPERATURE` | Temperature (0–1) | `0.3` |
| `OPENAI_MAX_TOKENS` | Max tokens per completion | `512` |
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible APIs (Kimi, DeepSeek, Groq, Together AI, …) | |
| `OLLAMA_ENDPOINT` | Ollama endpoint | `http://ollama:11434` |
| `OLLAMA_MODEL` | Ollama model | `llama3.3` |
| `ANTHROPIC_API_KEY` | Anthropic API key | |
| `AGENT_PROMPT` | Override `llm.agentPrompt` at runtime | |

See [**LLM providers**](../build/agent-pack/llm.md) for how to combine these for each backend.

## RAG

| Variable | Description | Default |
|---|---|---|
| `RAG_PROVIDER` | RAG backend: `vectorstore` or `langchain` | `vectorstore` |
| `RAG_DOCS_PATH` | RAG documents directory | `/app/rag/docs` |
| `RAG_CHUNK_SIZE` | Max chars per chunk | `1000` |
| `RAG_CHUNK_OVERLAP` | Overlap between chunks | `200` |
| `RAG_REMOTE_URLS` | Remote document URLs (CSV or JSON array) | |
| `VECTOR_STORE` | Vector store: `pinecone` or `redis` | `redis` |
| `VECTOR_INDEX_NAME` | Vector index name | `hologram-ia` |
| `PINECONE_API_KEY` | Pinecone API key | |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |

## Memory

| Variable | Description | Default |
|---|---|---|
| `AGENT_MEMORY_BACKEND` | Memory backend: `memory` or `redis` | `redis` |
| `AGENT_MEMORY_WINDOW` | Chat memory window size (turns) | `8` |

## PostgreSQL (sessions + MCP user config)

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_HOST` | PostgreSQL host | `postgres` |
| `POSTGRES_USER` | PostgreSQL user | `2060demo` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `2060demo` |
| `POSTGRES_DB_NAME` | PostgreSQL database name | `test-service-agent` |

## Authentication & RBAC

| Variable | Description | Default |
|---|---|---|
| `CREDENTIAL_DEFINITION_ID` | VC definition ID for authentication (omit to hide auth menu) | |
| `AUTH_REQUIRED` | Require auth before chat (blocks guests) | `false` |
| `USER_IDENTITY_ATTRIBUTE` | Credential attribute for user identity | `name` |
| `ROLES_ATTRIBUTE` | Credential attribute containing user roles | |
| `DEFAULT_ROLE` | Fallback role when credential lacks roles | `user` |
| `ADMIN_USERS` | Comma-separated list of admin user identities | |
| `ADMIN_AVATARS` | (Legacy) Comma-separated admin avatar names | |

## Integrations

| Variable | Description | Default |
|---|---|---|
| `VS_AGENT_ADMIN_URL` | VS Agent admin API URL | |
| `LLM_TOOLS_CONFIG` | External HTTP tools (JSON array) | `[]` |
| `STATISTICS_API_URL` | Statistics API URL | |
| `STATISTICS_REQUIRE_AUTH` | Require auth for statistics | `false` |

## MCP

| Variable | Description | Default |
|---|---|---|
| `MCP_CONFIG_ENCRYPTION_KEY` | AES-256-GCM key for per-user MCP config (64 hex chars — `openssl rand -hex 32`) | |
| `MCP_SERVERS_CONFIG` | JSON array string that overrides `mcp.servers` from the pack | |

Plus any `${VAR}` that your `mcp.servers[*].url` or `mcp.servers[*].headers` references (e.g. `GITHUB_MCP_URL`, `WISE_MCP_URL`, `WISE_API_TOKEN`). Convention: one env var per MCP server URL, one per shared admin token.

### Rotation semantics

`MCP_CONFIG_ENCRYPTION_KEY` is effectively a one-way trapdoor. If you rotate it, **all stored per-user MCP configs become unreadable** and every user must reconfigure. There is currently no re-encrypt migration path. Keep the key stable; store it in a Kubernetes Secret or your secrets manager.

## Where these are typically set

| Environment | How |
|---|---|
| Local dev | `config.env` in your agent repo, `source`d before `./scripts/setup.sh` |
| Docker Compose | Passed as `environment:` entries in `docker-compose.yml` |
| Kubernetes | `chatbot.extraEnv[]` in the Helm values, plus `chatbot.secret.*` for sensitive values injected via `--set chatbot.secret.X=<value>` at `helm upgrade` time |

## Related

- [**LLM providers**](../build/agent-pack/llm.md)
- [**MCP**](../build/agent-pack/mcp.md)
- [**Agent Pack schema**](./agent-pack-schema.md)
- Source of truth: [`hologram-generic-ai-agent-vs/README.md` §Environment Variables](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/README.md#-environment-variables)
