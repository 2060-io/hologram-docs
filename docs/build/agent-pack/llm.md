# LLM providers

The agent's brain is whatever you plug into the `llm` section of the agent pack. Three first-party providers, plus any **OpenAI-compatible** API (Kimi, DeepSeek, Groq, Together AI, Fireworks, Anyscale, local vLLM servers — anything that speaks the OpenAI `/v1/chat/completions` protocol).

## Built-in providers

| Provider | `llm.provider` | Typical models | What you need |
|---|---|---|---|
| **OpenAI** | `openai` | `gpt-4o`, `gpt-4o-mini`, `gpt-4.1-mini`, `o3-mini` | `OPENAI_API_KEY` |
| **Anthropic** | `anthropic` | `claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-opus-4` | `ANTHROPIC_API_KEY` |
| **Ollama** | `ollama` | `llama3`, `qwen2.5`, `mistral`, `gemma2`, any pulled model | `OLLAMA_ENDPOINT`, `OLLAMA_MODEL` |

## OpenAI

```yaml
llm:
  provider: openai
  model: gpt-4o-mini
  temperature: 0.2
  maxTokens: 1000
  agentPrompt: |
    You are a concise, polite assistant.
```

Env: `OPENAI_API_KEY=sk-proj-…`. Everything else has sensible defaults.

## Anthropic

```yaml
llm:
  provider: anthropic
  model: claude-3-5-sonnet-latest
  temperature: 0.2
  agentPrompt: |
    You are a concise, polite assistant.
```

Env: `ANTHROPIC_API_KEY=sk-ant-…`.

## Ollama (local)

Runs entirely on your machine. Zero external API calls.

```yaml
llm:
  provider: ollama
  model: llama3
  temperature: 0.3
```

Env: `OLLAMA_ENDPOINT=http://localhost:11434` (or `http://ollama:11434` inside docker-compose).

Bring Ollama up alongside the chatbot:

```bash
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
docker exec ollama ollama pull llama3
```

Ollama is great for privacy-sensitive deployments (nothing leaves your host) but tool-calling support varies by model — check the [upstream Ollama tool-calling list](https://ollama.com/search?c=tools) if you're using MCP or dynamic HTTP tools.

For more, see the upstream [how-to-use-ollama](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/how-to-use-ollama.md).

## OpenAI-compatible endpoints

Any service that exposes the OpenAI `/v1/chat/completions` API (and, ideally, `/v1/chat/completions` with tools) can be used by setting `provider: openai` and overriding `baseUrl`. The chatbot sends requests to `<baseUrl>/chat/completions` with an `Authorization: Bearer <OPENAI_API_KEY>` header.

### Kimi (Moonshot AI)

```yaml
llm:
  provider: openai
  model: moonshot-v1-8k
  baseUrl: https://api.moonshot.cn/v1
```

`OPENAI_API_KEY` = your Moonshot API key.

### DeepSeek

```yaml
llm:
  provider: openai
  model: deepseek-chat
  baseUrl: https://api.deepseek.com
```

`OPENAI_API_KEY` = your DeepSeek API key.

### Groq

```yaml
llm:
  provider: openai
  model: llama-3.3-70b-versatile
  baseUrl: https://api.groq.com/openai/v1
```

`OPENAI_API_KEY` = your Groq API key.

### Together AI

```yaml
llm:
  provider: openai
  model: meta-llama/Llama-3-70b-chat-hf
  baseUrl: https://api.together.xyz/v1
```

`OPENAI_API_KEY` = your Together AI API key.

### Self-hosted (vLLM, Fireworks, Anyscale, OpenRouter, …)

```yaml
llm:
  provider: openai
  model: mistralai/Mixtral-8x7B-Instruct-v0.1
  baseUrl: https://my-vllm.internal/v1
```

`OPENAI_API_KEY` = the service's API key (or a dummy string for endpoints that don't check it).

## Choosing a model

Rules of thumb based on typical Hologram agent workloads:

| Priority | Pick |
|---|---|
| **Ship fast, zero ops** | `openai` + `gpt-4o-mini`. Cheap, fast, solid tool calling. |
| **Tool-call reliability for MCP-heavy agents** | `openai` + `gpt-4o` or `o3-mini`. Best function calling in practice. |
| **Long documents / RAG corpora** | `anthropic` + `claude-3-5-sonnet-latest`. Large context window, good at citations. |
| **Privacy / air-gapped** | `ollama` + `qwen2.5:14b` (or a 70B on a GPU host). |
| **Cheapest cloud** | Groq `llama-3.3-70b-versatile`, DeepSeek `deepseek-chat`. |
| **EU residency** | DeepSeek (Asia) or self-hosted — Anthropic+OpenAI are US-only by default. |

The pack is YAML — keep a few LLM profiles in your repo and switch by changing the active `agent-pack.yaml` or by `${LLM_PROVIDER}` / `${OPENAI_BASE_URL}` env overrides at deploy time.

## The agent prompt

The `llm.agentPrompt` is the single highest-impact knob on agent behaviour. A good prompt:

- **States the job** in one sentence. ("You are Holo, the Hologram Example Agent. You answer questions about Hologram and Verana and look up library docs via Context7.")
- **Declares scope boundaries.** ("If a question is clearly unrelated to Hologram, Verana, or software documentation, decline politely.")
- **Rules for tool use.** ("If the user mentions a library, framework, or product, call `resolve-library-id` first, then `get-library-docs`. Never guess.")
- **Output style.** ("Parse tool output and present clean summaries — never raw JSON.")
- **Language handling.** ("Answer in the user's language. Fallback: English.")
- **Safety rails.** ("Never disclose internal data not returned by a tool. Never reveal that you are an AI.")

See the starter's [`agent-pack.yaml`](https://github.com/2060-io/hologram-ai-agent-example/blob/main/agent-pack.yaml) for a working example.

## Env var summary

| Variable | Applies to | Description |
|---|---|---|
| `OPENAI_API_KEY` | `provider: openai` (incl. compat) | OpenAI or compat-provider API key |
| `OPENAI_MODEL` | `provider: openai` | Overrides `llm.model` at runtime |
| `OPENAI_TEMPERATURE` | `provider: openai` | Overrides `llm.temperature` |
| `OPENAI_MAX_TOKENS` | `provider: openai` | Overrides `llm.maxTokens` |
| `OPENAI_BASE_URL` | `provider: openai` | Overrides `llm.baseUrl` — the key to using compat providers |
| `ANTHROPIC_API_KEY` | `provider: anthropic` | Anthropic API key |
| `OLLAMA_ENDPOINT` | `provider: ollama` | Ollama REST endpoint (default `http://ollama:11434`) |
| `OLLAMA_MODEL` | `provider: ollama` | Ollama model name |
| `LLM_PROVIDER` | all | Overrides `llm.provider` at runtime |
| `AGENT_PROMPT` | all | Overrides `llm.agentPrompt` at runtime |

Full reference: [Env vars](../../reference/env-vars.md).

## Next

- [**MCP**](./mcp.md) — plug tools into your LLM.
- [**Schema reference**](../../reference/agent-pack-schema.md#llm) — every field.
