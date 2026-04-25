# Quickstart

Your first verifiable AI agent, running and talking to you, in about **10 minutes**. We'll fork a ready-made starter repo, set one API key, bring it up locally, scan a QR code, and chat.

## What you'll end up with

A forked repo under your GitHub account containing:

- An **Agent Pack** — the YAML manifest that declares your agent's identity, persona, LLM, tools, and authentication.
- A **Docker Compose** stack for local development (chatbot + VS Agent + Redis + PostgreSQL).
- A **GitHub Actions** workflow that deploys to Kubernetes via a Helm chart when you're ready.

The starter has **[Context7 MCP](https://context7.com)** plugged in — a public, zero-auth MCP server that lets the agent look up library documentation in real time. Swap it for any other MCP server later.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [ngrok](https://ngrok.com) with a free account (the VS Agent needs a publicly reachable DIDComm endpoint)
- `curl` and `jq`
- An **OpenAI API key** (or any other supported LLM — see [LLM providers](./agent-pack/llm.md))
- **[Hologram Messaging](https://hologram.zone)** installed on your phone

## Step 1 — Fork the starter

```bash
# Use the GitHub UI to fork https://github.com/2060-io/hologram-ai-agent-example
# or the gh CLI:
gh repo fork 2060-io/hologram-ai-agent-example --clone --remote
cd hologram-ai-agent-example
```

The starter depends on two auxiliary Verifiable Services (an Organization + an Avatar Issuer). A pre-deployed demo instance already exists at `organization.demos.hologram.zone` and `avatar.demos.hologram.zone` — the starter is wired to use it by default, so you don't have to deploy anything else to get going.

:::tip
If you want your own trust anchor instead of pointing at the shared demo, fork [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps) and deploy it (two GHA workflow clicks). Come back here afterwards with your own `ORG_VS_PUBLIC_URL` / `ORG_VS_ADMIN_URL`.
:::

## Step 2 — Get an Avatar credential

Your agent will authenticate users against a **Hologram Demo Avatar** credential. Grab one for yourself first:

1. Open Hologram Messaging on your phone.
2. Visit `https://avatar.demos.hologram.zone/` in a browser and scan the QR.
3. Pick a display name and accept the credential offer.

Your phone now holds an AnonCreds Avatar credential — that's what the agent will ask for when you authenticate.

## Step 3 — Set your API key

```bash
export OPENAI_API_KEY=sk-proj-...
export MCP_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

`MCP_CONFIG_ENCRYPTION_KEY` is only needed if you later add a user-controlled MCP server (per-user tokens). The Context7 server the starter ships with is zero-auth, but the chatbot expects the variable to be present.

## Step 4 — Bring up the VS Agent

```bash
set -a
source config.env
set +a
./scripts/setup.sh
```

This will:

1. Pull `verana-labs/vs-agent:latest`.
2. Start an ngrok tunnel on the VS Agent's public port and use it as the agent's public DID (`did:webvh:<your-ngrok-domain>`).
3. Set up the `veranad` CLI account on Verana testnet.
4. Request a **Service credential** from the demo organization, which legitimates your agent on the trust network.

At the end you'll see:

```text
Agent DID         : did:webvh:...ngrok-free.app
Public URL        : https://...ngrok-free.app
Admin API         : http://localhost:3010
```

Copy the `NGROK_DOMAIN` value from the final lines — you'll need it in the next step.

## Step 5 — Start the chatbot

```bash
export NGROK_DOMAIN=<your-domain>.ngrok-free.app
./scripts/start.sh
```

This runs `docker compose -f docker/docker-compose.yml up` with everything wired together: chatbot, Redis, PostgreSQL. The chatbot talks to the already-running VS Agent over `host.docker.internal:3010`.

When you see lines like `Chatbot listening on :3003` and `Connected to VS Agent admin API`, you're ready.

## Step 6 — Connect and chat

Pull up your agent's connection invitation:

```bash
curl -s http://localhost:3010/v1/invitation | jq -r .shortUrl
```

Copy the URL, open it on your phone (or turn it into a QR and scan). Hologram Messaging will ask you to accept the connection. Your agent will greet you. Try things like:

- "What is a Verifiable Service?"
- "Show me the Next.js routing docs"
- "How do I use `useEffect` in React?"

The Context7 MCP tool will be called under the hood and your agent will respond with fresh, sourced documentation.

## Step 7 — Authenticate (optional)

Open the contextual menu (hamburger icon) in the chat and tap **Authenticate**. Your agent will send a proof request for your Avatar credential. Accept it. Once verified, the agent will greet you by name and (if you add RBAC in the agent pack) surface role-specific tools.

## You shipped an agent

The things you just did — forked a repo, set a key, connected a user — are the skeleton of a real product. The rest of these docs is about making the agent yours:

- [**Agent Pack**](./agent-pack/overview.md) — change the persona, the LLM, the languages, the flows.
- [**Add an MCP server**](./how-to/add-an-mcp-server.md) — plug in GitHub, Wise, or your internal APIs.
- [**LLM providers**](./agent-pack/llm.md) — swap OpenAI for Anthropic, Ollama, Kimi, DeepSeek, Groq, Together AI.
- [**Run on Kubernetes**](../run/kubernetes/helm-chart.md) — when you're past localhost.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ngrok` URL is empty | Not authenticated. Run `ngrok config add-authtoken <token>` first. |
| `setup.sh` hangs at "Waiting for VS Agent" | Your ngrok URL is rate-limited or the wallet DB is corrupt. `docker logs -f example-agent` and `rm -rf data/wallet` to reset. |
| Hologram app says "connection refused" | Your ngrok tunnel dropped. Re-run `setup.sh` (it kills and restarts the tunnel). |
| Agent authenticates but doesn't greet | `CREDENTIAL_DEFINITION_ID` unset. Check `config.env` and restart the chatbot. |
| LLM error on every message | Invalid `OPENAI_API_KEY` or over quota. Check `docker compose logs chatbot`. |
