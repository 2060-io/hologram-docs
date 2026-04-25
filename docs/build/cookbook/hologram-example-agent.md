# Hologram Example Agent

The starter project. The shortest path from "I want to build a Hologram agent" to "I'm chatting with my own agent on my phone." The [**Quickstart**](../quickstart.md) is the 10-minute version of this page; here we walk through the pack itself, the deps, and what each piece is doing.

## What it is

[`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example) is a fork-friendly template that:

- Ships a complete `agent-pack.yaml` with OpenAI, Context7 MCP, English, and Avatar-credential auth wired up.
- Includes `scripts/setup.sh` (VS Agent + ngrok + Service credential) and `scripts/start.sh` (chatbot + Redis + Postgres via docker-compose).
- Has a one-click GitHub Actions deploy to Kubernetes via `deployment.yaml` + the `hologram-generic-ai-agent-chart` Helm chart.

It's the canonical "Hello World" for the platform, and the starter every other cookbook recipe builds on.

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│  Hologram app on user's phone                            │
└────────────────┬─────────────────────────────────────────┘
                 │ DIDComm (over ngrok in dev)
                 ▼
┌──────────────────────────────────────────────────────────┐
│  VS Agent  (DIDComm endpoint, credential issuer/verifier)│
└──────┬───────────────────────────────────────────────────┘
       │ webhooks
       ▼
┌──────────────────────────────────────────────────────────┐
│  Chatbot (LLM, MCP client)                               │
│   ├─ OpenAI gpt-4o-mini                                  │
│   ├─ Context7 MCP (docs lookup)                          │
│   ├─ Redis (memory + RAG vector store)                   │
│   └─ PostgreSQL (sessions, MCP user config)              │
└──────────────────────────────────────────────────────────┘
                 ▲
                 │ depends on
                 │
        ┌────────┴───────────────────────────────┐
        ▼                                        ▼
┌───────────────────┐                 ┌───────────────────┐
│ Organization VS   │                 │ Avatar VS         │
│ (issues service   │                 │ (issues avatar    │
│  credentials)     │                 │  credentials to   │
└───────────────────┘                 │  Hologram users)  │
                                      └───────────────────┘
```

The two right-side services are **shared dependencies** — they live in [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps). For a quick demo you point at the pre-deployed `*.demos.hologram.zone` instances; for production you fork the deps repo and run your own.

## The pack, annotated

Open `agent-pack.yaml` in your fork. The relevant blocks:

### Metadata

```yaml
metadata:
  id: hologram-example-agent
  displayName: Hologram Example Agent
  description: Demo agent with Context7 MCP integration
  defaultLanguage: en
```

`id` becomes the agent's identifier in logs. `defaultLanguage` is the fallback when a user's locale isn't otherwise supported.

### Greeting

```yaml
languages:
  en:
    greetingMessage: |
      Hi {userName}! 👋 I'm Holo, the Hologram Example Agent.
      I can answer questions about Hologram, Verana, and look up
      library docs via Context7. What would you like to know?
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
```

The `{userName}` placeholder is filled in from the DIDComm Profile message. If the user is `@alice` on Hologram, they see `Hi alice! 👋 …`.

### LLM

```yaml
llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.3
  agentPrompt: |
    You are Holo, the Hologram Example Agent…
    - Scope: answer questions about Hologram, Verana, and software docs.
    - Tools: for any library/framework reference, call resolve-library-id
      then get-library-docs (Context7 MCP). Never guess.
    - Style: concise; never reveal you are an AI.
    - Language: answer in the user's language. Fallback: English.
```

`gpt-4o-mini` is a good default — fast, cheap, solid tool calling. Swap to `gpt-4o`, an Anthropic model, or a local Ollama if you prefer (see [**LLM providers**](../agent-pack/llm.md)).

### Authentication

```yaml
flows:
  authentication:
    enabled: true
    required: false
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}
    userIdentityAttribute: name
```

`required: false` means guests can chat — they just don't get the personalised greeting (`{userName}` is empty until they auth). `userIdentityAttribute: name` is the right choice when authenticating with the Avatar credential, where the unique attribute is the Hologram username.

`CREDENTIAL_DEFINITION_ID` comes from the avatar VS Agent — set it in `config.env` to the value emitted by `hologram-ai-agent-example-deps`'s avatar deploy workflow. For the demo deps it's published in their workflow summary.

### Menu

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
```

Two menu items, opposite states. The user sees Authenticate before they auth, Logout after. See [**Flows**](../agent-pack/flows.md).

### MCP — Context7

```yaml
mcp:
  servers:
    - name: context7
      transport: streamable-http
      url: ${CONTEXT7_MCP_URL}        # https://mcp.context7.com/mcp
      accessMode: admin-controlled
      toolAccess:
        default: public
```

Context7 is a free, no-auth MCP server that resolves library names to documentation. The shortest possible MCP integration: no token, no per-user config, every authenticated (or unauthenticated, since `required: false`) user has access to all its tools.

The LLM uses two tools from Context7:

- `resolve-library-id(name)` → returns the canonical Context7 library ID (e.g. `react` → `/facebook/react`).
- `get-library-docs(id, topic?)` → fetches the docs.

The agent prompt rule "for any library/framework reference, call resolve-library-id then get-library-docs" keeps the LLM grounded.

### Memory + RAG (defaults)

The example doesn't define `rag` (Context7 covers documentation), but it does use Redis-backed memory:

```yaml
memory:
  backend: redis
  window: 12
  redisUrl: redis://redis:6379
```

Twelve turns of rolling history. Drop to `memory: { backend: memory }` for dev if you want to skip Redis.

## Local run

```bash
gh repo fork 2060-io/hologram-ai-agent-example --clone --remote
cd hologram-ai-agent-example

# Set the things that aren't in config.env
export OPENAI_API_KEY=sk-proj-…
export MCP_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Bring everything up
set -a; source config.env; set +a
./scripts/setup.sh
export NGROK_DOMAIN=<from-the-script-output>
./scripts/start.sh

# Connect from Hologram
curl -s http://localhost:3010/v1/invitation | jq -r .shortUrl
```

For ports, troubleshooting, and reset, see [**Run locally**](../../run/local.md).

## Production deploy

The [`.github/workflows/deploy.yml`](https://github.com/2060-io/hologram-ai-agent-example/blob/main/.github/workflows/deploy.yml) does the full chain in one job — chart install, agent-pack ConfigMap, secrets, Service-credential issuance, Linked-VP wiring. Trigger via Actions tab → Run workflow → step: `all`.

For the chart anatomy, secrets policy, and multi-tenant patterns, see [**Run on Kubernetes**](../../run/kubernetes/helm-chart.md).

## What to fork next

| You want | Start from |
|---|---|
| Add another MCP server | [**How-to: Add an MCP server**](../how-to/add-an-mcp-server.md) |
| User-controlled MCP (per-user tokens) | [**Cookbook — GitHub agent**](./github-agent.md) |
| Corporate / RBAC pattern | [**Cookbook — Wise agent**](./wise-agent.md) |
| RAG-driven Q&A | [**Cookbook — customer-service agent**](./customer-service-agent.md) |
| Local LLM (no OpenAI) | [**Examples — Ollama**](../agent-pack/examples.md#2-local-llm--ollama-no-external-dependency) |

## Why this template

The example is opinionated on purpose:

- **One `agent-pack.yaml`.** Everything declarative. Mount it as a ConfigMap in K8s; restart to roll out.
- **One `deployment.yaml`.** All Helm values for K8s. No spread of secrets across config files.
- **One Helm chart.** `hologram-generic-ai-agent-chart` covers chatbot + VS Agent + Redis + PostgreSQL.
- **Sensible defaults.** OpenAI gpt-4o-mini, English, Context7, Avatar auth — all things you can swap, but they Just Work out of the box.

When this template is no longer the right shape — you need a custom flow that the LLM can't express, a credential issuer beyond the agent's scope, a multi-region deployment — you can graduate to running the deps yourself, then the chatbot itself, then your own fork of the chatbot service. But most agents don't need to.

## Next

- [**Quickstart**](../quickstart.md) — the 10-minute fast-path.
- [**Agent Pack overview**](../agent-pack/overview.md) — the schema in detail.
- [**Run locally**](../../run/local.md) / [**Run on Kubernetes**](../../run/kubernetes/helm-chart.md) — operate it.
