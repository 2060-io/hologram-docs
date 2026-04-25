# Customer-service agent

A multi-language customer-service agent that **registers cases through a fixed intake flow**. The user authenticates, the LLM walks them through a deterministic 8-step questionnaire, generates a case number, closes the conversation. RAG grounds the agent's answers when the user asks ad-hoc clarifications between steps.

This is the canonical pattern for **flow-driven agents** — when the LLM is the conductor of a strict business process, not a free-roaming assistant.

The reference is the [PQRSD](https://es.wikipedia.org/wiki/PQRSD) intake (Petitions, Complaints, Claims, Suggestions, Reports — a Latin-American customer-service category), but the shape applies to any structured intake: insurance claims, loan applications, support tickets.

## Source

- Pack: [`hologram-generic-ai-agent-vs/agent-packs/customer-service/agent-pack.yaml`](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/agent-packs/customer-service/agent-pack.yaml)
- Spec: [**RAG**](../agent-pack/rag.md), [**Authentication**](../agent-pack/authentication.md)

## What it does

The user connects, authenticates, and gets stepped through:

1. Welcome — the agent introduces itself, explains DEMO mode and what it'll ask.
2. Auth check — refuses to proceed if unauthenticated.
3. **Type of request** — Petition / Complaint / Claim / Suggestion / Report.
4. **Subject** — one-line summary.
5. **Message** — full description.
6. **Confirmation** — the agent shows a summary and lets the user revise.
7. **Case number generation** — `CASE-XXXXXXXX` (8 hex chars).
8. **Closure** — thanks the user, confirms intake.

The agent **does not** answer the case, solve it, or claim a resolution time. It only registers it. Out-of-scope queries are gently redirected back to the flow.

## How it works — flow-by-prompt

There's no flow engine in the YAML. The 8-step flow is encoded **in the LLM's `agentPrompt`** as explicit, numbered rules. The LLM follows the script literally because GPT-5.5 is more than capable of running deterministic dialogue when prompted that way.

Excerpt from the pack:

```yaml
llm:
  provider: openai
  model: gpt-5.5
  temperature: 0.2
  agentPrompt: |-
    ROLE OF THE AGENT
      You are a virtual customer service agent whose ONLY job is to
      register PQRSD cases (Petitions, Complaints, Claims, Suggestions,
      and Reports) in a simple DEMO flow.

    MANDATORY CONVERSATION FLOW
      You must ALWAYS follow this flow, in this exact order…

      1. WELCOME
         - Greet the user briefly and professionally.
         - State that you will help register a PQRSD request in DEMO mode.

      2. CHECK THAT THE USER IS AUTHENTICATED
         - If NOT authenticated, ask them to authenticate first…

      3. ASK FOR THE TYPE OF REQUEST (P, Q, R, S, or D)
         - Clearly explain the available options.
         - Accept variations ("I want to file a complaint" → Complaint).
         - Ask again if ambiguous.

      4. ASK FOR THE REQUEST (SHORT SUBJECT)
         - One-line summary, 1–2 sentences max.

      5. ASK FOR THE MESSAGE (DETAILED DESCRIPTION)
         - Full description. Don't ask for personal data.

      6. CASE CONFIRMATION
         - Show: Type / Subject / Description.
         - Allow edits to subject/description.

      7. CASE NUMBER GENERATION
         - Format: CASE-XXXXXXXX (8 hex chars).

      8. CONVERSATION CLOSURE
         - Communicate the case number. Thank the user. Close.

    SPECIAL BEHAVIORS
      - If the user starts with "I want to file a complaint…",
        auto-detect "Complaint" and skip step 3 if obvious.
      - For unrelated questions, redirect back to the flow.
```

The "you must always follow this flow, in this exact order" + numbered steps is the trick. Combined with `temperature: 0.2`, the LLM stays on-script.

## Why not a flow engine?

Two reasons:

1. **Natural language inputs.** "I'd like to complain about late delivery" is hard to capture in a fixed UI form, easy for the LLM. Same for the user's variation: *"the package, three weeks ago, never arrived"* mapped onto Subject + Message.
2. **Languages.** A YAML flow engine would need translated prompts per language. The LLM handles language detection and per-language tone for free.

The trade-off: the LLM occasionally veers (rarely with GPT-5.5 + low temperature). The fix is more rigorous prompting, not more code.

## RAG — for ad-hoc clarifications

Between steps, the user might ask *"What does Claim mean exactly?"* or *"Where do I find my contract number?"*. RAG covers those:

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

Drop your PQRSD policy docs in `./docs/pqrsd/` (or wherever `RAG_DOCS_PATH` points). The LLM has a `rag_retriever` tool and is told (in the prompt) to use it for clarifications without leaving the flow.

For RAG fundamentals see [**RAG**](../agent-pack/rag.md).

## Authentication

This pack requires authentication — case intake is a serious operation, the agent needs to know who's filing.

```yaml
flows:
  authentication:
    enabled: true
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}

  welcome:
    enabled: true
    sendOnProfile: true
    templateKey: greetingMessage

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

Pick whichever credential makes sense — your customer's avatar credential, a national-ID credential, a corporate badge. The intake flow is independent of the credential type.

## Multi-language

The PQRSD pack defaults to Spanish (`defaultLanguage: es`) and provides English strings as fallback:

```yaml
metadata:
  defaultLanguage: es

languages:
  es:
    greetingMessage: |
      Hola, soy tu asistente virtual para el registro de PQRSD…
    strings:
      ROOT_TITLE: 'Centro de Servicio PQRSD (DEMO)'
      ...
  en:
    greetingMessage: |
      Hello, I am your virtual assistant for PQRSD registration…
    strings:
      ROOT_TITLE: 'Customer Service PQRSD (DEMO)'
      ...
```

The LLM is told *"use always the language of the user"*, so the conversation stays in the user's locale even though the system strings (menu labels, error messages) come from these blocks.

See [**i18n**](../agent-pack/i18n.md) for the available string keys.

## Statistics — bundled tool

The pack enables the bundled `statisticsFetcher` tool so the agent can query a backend for past cases (in DEMO mode it returns nothing, but the tool's wired up):

```yaml
tools:
  bundled:
    statisticsFetcher:
      enabled: true
      endpoint: ''                    # set in real deploy
      requiresAuth: true
      defaultStatClass: PQRSD_CASES
      defaultStatEnums:
        - index: 0
          label: authenticated
          value: authenticated
          description: 'Authenticated access is required'
```

When `endpoint` is set, the LLM gains a tool that can fetch case-count time-series. Useful for dashboards or "how many cases did you submit this month?" queries.

## Required env vars

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI key |
| `CREDENTIAL_DEFINITION_ID` | The VC the user must present |
| `RAG_PROVIDER` | `langchain` |
| `VECTOR_STORE` | `redis` (with Redis Stack image) |
| `REDIS_URL` | Redis connection |
| `MCP_CONFIG_ENCRYPTION_KEY` | Required even without MCP servers |
| `VS_AGENT_ADMIN_URL` | The companion VS Agent admin URL |
| `POSTGRES_*` | Sessions backing store |

## Patterns to copy

The same shape works for any structured intake:

- **Loan application** — replace the 8 steps with collateral / amount / purpose / employment / etc.
- **Insurance claim** — incident type / date / parties involved / damages / supporting docs.
- **Helpdesk ticket** — category / severity / description / preferred contact.
- **HR request** — type (vacation / sick / equipment) / dates / reason.

The general recipe:

1. Write the deterministic flow in plain English in `agentPrompt`. Number steps. Forbid deviation.
2. Use a low `temperature` (`0.1`–`0.3`) so the LLM doesn't wander.
3. Add RAG for clarifications.
4. Require auth so you bind the case to a user identity.
5. Tighten with explicit out-of-scope rules ("if asked about X, redirect to Y").

## Limitations

- **No persistence beyond chat memory.** The agent generates a case number but doesn't write the case to a real ticketing system. In production, add a downstream tool (an MCP server, an HTTP tool via `tools.dynamicConfig`) that stores the case.
- **Case-number quality.** The LLM generates `CASE-XXXXXXXX` randomly; collisions are rare but possible. Production deployments should generate the ID server-side and inject it via a tool call.
- **No flow validation.** If the LLM ever skips a step, there's no "you must answer step 3 first" enforcement at the runtime layer. GPT-5.5 + the explicit prompt make this a non-issue in practice; for higher-stakes flows, expect to fork the chatbot and add a state machine.

## Where to look next

| Question | Page |
|---|---|
| RAG knobs and backends | [**RAG**](../agent-pack/rag.md) |
| Localizing the strings | [**i18n**](../agent-pack/i18n.md) |
| Adding a custom tool to *write* cases to a backend | [**MCP**](../agent-pack/mcp.md) or `tools.dynamicConfig` (HTTP tools) |
| The auth flow this pack relies on | [**Authentication**](../agent-pack/authentication.md) |
