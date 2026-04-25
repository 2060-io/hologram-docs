# RAG — retrieval-augmented generation

The Agent Pack ships with a modular **Retrieval-Augmented Generation** (RAG) layer. Drop documents in a folder (or list URLs in YAML), and the agent indexes them on startup, exposes a `rag_retriever` tool to the LLM, and grounds answers in your content instead of hallucinating.

You can switch storage backends, swap embedding models, or replace the entire retriever — all without code changes — by editing the `rag` block.

## When to use it

| Scenario | Use RAG? |
|---|---|
| Agent answers questions about a fixed corpus (your product docs, your wiki, a regulation) | Yes |
| Agent registers cases / forms with a fixed flow | Optional — RAG can ground the agent's chitchat between form steps |
| Agent calls APIs / MCP tools and reads structured data | No — use MCP, RAG is for unstructured docs |
| Personal agent / general assistant | No — the LLM's training data is fine |

The customer-service [PQRSD pack](../cookbook/customer-service-agent.md) is the canonical RAG example: the LLM follows a fixed intake flow, and uses the `rag_retriever` tool to answer ad-hoc clarifications grounded in policy docs.

## Schema

```yaml
rag:
  provider: langchain        # or 'vectorstore'
  docsPath: /app/rag/docs    # local folder for .txt/.md/.pdf/.csv
  remoteUrls:                # optional remote files fetched at startup
    - https://example.com/policy.pdf
    - https://raw.githubusercontent.com/acme/docs/main/handbook.md
  chunkSize: 1000            # chars per chunk
  chunkOverlap: 200          # overlap between chunks
  vectorStore:
    type: redis              # or 'pinecone'
    indexName: my-agent
```

| Field | Default | Description |
|---|---|---|
| `provider` | `vectorstore` | Backend: `vectorstore` (custom in-process) or `langchain` (Pinecone or Redis via LangChain). |
| `docsPath` | `/app/rag/docs` | Local folder with documents. Recursively scanned at startup. |
| `remoteUrls` | `[]` | List of URLs fetched at startup. Cached under `<docsPath>/docs/`. |
| `chunkSize` | `1000` | Characters per chunk passed to the embedder. |
| `chunkOverlap` | `200` | Characters of overlap between consecutive chunks. |
| `vectorStore.type` | `redis` | Vector store backend (when `provider: langchain`). |
| `vectorStore.indexName` | `hologram-ia` | Index / namespace name. Useful when multiple agents share a Redis. |

## Backends

### Redis (recommended for dev + small-prod)

Fast, simple, runs alongside the agent in the same compose stack. Just be sure to use the **Redis Stack** image — RediSearch is required.

```yaml
redis:
  image: redis/redis-stack-server:latest   # NOT 'redis:latest'
  ports:
    - '6379:6379'
```

```yaml
rag:
  provider: langchain
  vectorStore:
    type: redis
    indexName: my-agent
```

```bash
REDIS_URL=redis://redis:6379
```

### Pinecone (cloud, scalable)

```yaml
rag:
  provider: langchain
  vectorStore:
    type: pinecone
    indexName: my-agent
```

```bash
PINECONE_API_KEY=...
VECTOR_INDEX_NAME=my-agent
```

### Custom / self-managed

Set `provider: vectorstore` and run your own implementation. The runtime won't touch the LangChain layer; you wire up retrieval in code. Out of scope for this page; see the upstream [`how-to-use-rag-service.md`](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/how-to-use-rag-service.md).

## Embeddings

OpenAI embeddings are used by default — both the LLM-call path and the retriever share the same `OPENAI_API_KEY`. There's no current schema knob for swapping embedders; modify the source if you need (say) Cohere or a local embedding server. Embeddings are decoupled from the LLM, so you can use Anthropic for chat and OpenAI just for embeddings without conflict.

## Document loading

On startup the agent:

1. **Scans `docsPath` recursively** for `.txt`, `.md`, `.pdf`, `.csv`. Each file is split per `chunkSize` / `chunkOverlap` and embedded.
2. **Fetches every URL in `remoteUrls`**. Same supported extensions. Cached under `<docsPath>/docs/<basename>` — survive restarts.
3. **If no docs are found**, creates a tiny placeholder document so the index is non-empty.

Adding documents while the agent is running is **not** supported declaratively — restart the chatbot after changing the corpus.

## Exposed tool

The chatbot calls `LlmService.buildTools()` which always includes `createRagRetrieverTool(ragService)`. The LLM sees a tool with this signature:

```text
rag_retriever(query: string) → string
  Searches the agent's document store and returns the most relevant
  snippets for the given query.
```

For the LLM to actually call it, the `agentPrompt` should mention RAG explicitly. Otherwise the LLM might prefer answering from its own training data — even when it shouldn't.

```yaml
llm:
  agentPrompt: |
    You are the company FAQ assistant.
    - For any policy or procedural question, ALWAYS call rag_retriever
      first and ground your answer in the returned snippets.
    - If rag_retriever returns nothing relevant, say "I don't know" rather
      than guess.
```

## Worked example — PQRSD intake (customer-service pack)

The full `rag` block from the customer-service reference pack:

```yaml
rag:
  provider: ${RAG_PROVIDER}      # langchain
  docsPath: ./docs/pqrsd
  remoteUrls: []
  chunkSize: 1200
  chunkOverlap: 200
  vectorStore:
    type: ${VECTOR_STORE}        # redis
    indexName: pqrsd-agent
```

Drop your PQRSD policy PDFs in `./docs/pqrsd/` before building the chatbot image. The LLM is instructed (in `agentPrompt`) to look up procedural details via `rag_retriever` while sticking to the strict 8-step intake flow.

## Required env vars

| Variable | Description |
|---|---|
| `RAG_PROVIDER` | Overrides `rag.provider`. |
| `RAG_DOCS_PATH` | Overrides `rag.docsPath`. |
| `RAG_REMOTE_URLS` | Comma-separated or JSON-array string. |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` | Overrides chunk knobs. |
| `VECTOR_STORE` | `redis` or `pinecone`. |
| `VECTOR_INDEX_NAME` | Overrides `rag.vectorStore.indexName`. |
| `REDIS_URL` | Redis connection string. |
| `PINECONE_API_KEY` | Pinecone key. |
| `OPENAI_API_KEY` | Used for embeddings (and probably the LLM too). |

## Operating notes

- **Re-index on doc change.** Restarting the chatbot rebuilds the index from `docsPath` + `remoteUrls`. There's currently no incremental index API exposed at the YAML level.
- **Index isolation.** When two agents share a Redis instance, set distinct `indexName` values so they don't poison each other's vector spaces.
- **Embedding cost.** Every restart re-embeds the corpus. For small corpora (a few hundred chunks) this is pennies; for big ones, persist the index volume between restarts.
- **PDFs.** Text-based PDFs work well. Scanned PDFs need OCR pre-processing — the agent doesn't OCR for you.
- **Pinecone vs Redis.** Both work. Pinecone is more operationally robust at scale; Redis is one fewer external dependency.

## Next

- [**Memory**](./memory.md) — separate concept, also Redis-backed.
- [**Cookbook — customer-service**](../cookbook/customer-service-agent.md) — RAG-driven intake agent.
- Source of truth: [`how-to-use-rag-service.md` upstream](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/how-to-use-rag-service.md).
