# Memory

A Hologram agent has two distinct kinds of state:

- **Conversation memory** — the recent chat turns the LLM should see in its context window. Configured by the `memory` block. *This page.*
- **Long-term knowledge** — documents the agent searches via `rag_retriever`. Configured by the `rag` block. See [**RAG**](./rag.md).

Don't confuse them. Memory is "what was just said in this conversation"; RAG is "what's in our knowledge base".

## Backends

```yaml
memory:
  backend: redis           # or 'memory'
  window: 12               # turns to keep in the prompt context
  redisUrl: ${REDIS_URL}   # only when backend: redis
```

| Backend | Description | Use case |
|---|---|---|
| `memory` | In-process `Map`, volatile, per-instance | Local dev, ephemeral demos |
| `redis` | Redis-backed, persistent across restarts, shared across replicas | Production, horizontal scaling |

### `memory` — in-process

Each chatbot pod keeps its own session map in RAM. If the pod restarts, all conversations forget their history. If you scale beyond one replica, users hitting different pods see different histories.

Fine for development. Avoid for anything user-facing.

### `redis` — persistent, shared

All chatbot replicas read/write to the same Redis. A user disconnecting and reconnecting picks up where they left off. A pod crash doesn't lose history.

This is the default for K8s deployments. The Helm chart wires up Redis automatically.

## The window

`window` is the number of (user, assistant) message pairs the runtime stuffs into the LLM context on each turn. Larger windows give the LLM more conversational continuity but cost more tokens per request.

| `window` value | Trade-off |
|---|---|
| 4 – 8 | Cheap and snappy. Good for chitchat agents and tool-heavy agents that can re-derive state from the prompt. |
| 12 – 20 | The reference packs default to 8–20. Good general-purpose range. |
| 30+ | Long, multi-step intake flows where the model needs to remember earlier user answers. Expensive. |

The window is **rolling** — only the most recent N pairs are kept; older messages drop out. Persistent storage is unbounded (every message is logged), but the LLM only sees the window.

## Schema

```yaml
memory:
  backend: redis
  window: 12
  redisUrl: redis://redis:6379
```

| Field | Default | Description |
|---|---|---|
| `backend` | `memory` | `memory` or `redis`. |
| `window` | `8` | Turn pairs surfaced to the LLM. |
| `redisUrl` | `redis://localhost:6379` | Redis connection. Only used when `backend: redis`. |

## Required env vars

| Variable | Overrides |
|---|---|
| `AGENT_MEMORY_BACKEND` | `memory.backend` |
| `AGENT_MEMORY_WINDOW` | `memory.window` |
| `REDIS_URL` | `memory.redisUrl` |

## Implementation note (LangChain)

The memory layer is wired into LangChain via a `LangchainSessionMemory` adapter that reads from / writes to whichever backend is selected. The session key is the DIDComm `connectionId`, so each user's history is isolated automatically — there's no risk of cross-talk.

The agent prompt template uses `MessagesPlaceholder("chat_history")`, which the adapter populates with the rolling window before each LLM call.

You don't need to touch any of this — it's set up by `flows.welcome` + `memory.*` in the pack.

## Worked example

Production-grade settings, drop into `agent-pack.yaml`:

```yaml
memory:
  backend: redis
  window: 12
  redisUrl: ${REDIS_URL}

# Pair with a Redis stack container in docker-compose:
#
# redis:
#   image: redis/redis-stack-server:latest
#   volumes:
#     - redis-data:/data
#   ports:
#     - '6379:6379'
```

Dev-only, no Redis dependency:

```yaml
memory:
  backend: memory
  window: 8
```

## Operating notes

- **Memory is per-`connectionId`.** Logging out and reconnecting from the same Hologram username typically gets a new `connectionId`, so memory is reset. To persist *across* connections, you'd persist by `userIdentityAttribute` instead — not currently supported in the schema.
- **No automatic pruning.** Redis stores every message; only the window is exposed to the LLM. Set Redis-level eviction (e.g. `maxmemory-policy allkeys-lru`) if you want to bound storage.
- **Encryption.** Conversation history in Redis is not encrypted at rest by default. Use a Redis instance with TLS + at-rest encryption if your conversations include sensitive data.
- **Multi-tenant.** Multiple Hologram agents on the same Redis don't collide — each session key namespaces by agent + connectionId.

## Next

- [**RAG**](./rag.md) — the other kind of state.
- [**Run on Kubernetes**](../../run/kubernetes/helm-chart.md) — the Helm chart wires up Redis for you.
- Source of truth: [`how-to-use-memory-service.md` upstream](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/how-to-use-memory-service.md).
