# Run locally

Bring up the whole agent stack on your laptop: chatbot + VS Agent + Redis + PostgreSQL, plus an ngrok tunnel so the Hologram app on your phone can reach your VS Agent over DIDComm.

The [quickstart](../build/quickstart.md) is the 10-minute version. This page is the reference — what each script does, what ports it uses, how to reset state, and how to troubleshoot.

## Prerequisites

- **Docker** + **Docker Compose** v2 (`docker compose`)
- **[ngrok](https://ngrok.com)** authenticated with a free account (`ngrok config add-authtoken …`)
- **`curl`** and **`jq`**
- An **LLM API key** (typically `OPENAI_API_KEY`)
- A fork of [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example)

## The two scripts

The starter ships with two bash scripts that encapsulate the setup:

| Script | What it does |
|---|---|
| `scripts/setup.sh` | Starts a VS Agent Docker container with an ngrok tunnel, sets up a `veranad` CLI account, obtains a Service credential from the organization-vs, optionally creates an AnonCreds credential definition. One-shot. |
| `scripts/start.sh` | Runs `docker compose -f docker/docker-compose.yml up` against the running VS Agent, bringing up chatbot + Redis + PostgreSQL. Long-running. |

## What runs where

```text
┌───────────────────────────────────────────┐
│ Your laptop                               │
│                                           │
│  ┌─────────────────┐                      │
│  │   ngrok tunnel  │ ← public DIDComm URL │
│  └────────┬────────┘                      │
│           │                               │
│  ┌────────▼────────────┐                  │
│  │ VS Agent container  │ :3010 admin API  │
│  │ (Docker, detached)  │ :3011 public     │
│  └────────┬────────────┘                  │
│           │ webhooks                      │
│  ┌────────▼────────────┐                  │
│  │ Chatbot container   │ :3003            │
│  │ (docker-compose)    │                  │
│  └───┬─────────────┬───┘                  │
│      │             │                      │
│  ┌───▼──────┐  ┌──▼─────────┐             │
│  │ Redis    │  │ PostgreSQL │             │
│  │ :6379    │  │ :5432      │             │
│  └──────────┘  └────────────┘             │
│                                           │
└───────────────────────────────────────────┘
```

All ports are configurable through `config.env`:

| Variable | Default | What it is |
|---|---|---|
| `VS_AGENT_ADMIN_PORT` | `3010` | VS Agent admin API (used by the chatbot and you) |
| `VS_AGENT_PUBLIC_PORT` | `3011` | VS Agent public DIDComm endpoint (tunneled by ngrok) |
| `CHATBOT_PORT` | `3003` | Chatbot HTTP port |

`docker-compose.yml` also exposes Redis on `6379` and PostgreSQL on `5432` — change the host mapping in the compose file if those conflict.

## Step-by-step

### 1. Clone and configure

```bash
gh repo fork 2060-io/hologram-ai-agent-example --clone --remote
cd hologram-ai-agent-example
```

Open `config.env`. For the first run with the pre-deployed demo deps, the defaults work. If you forked [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps) and deployed your own organization / avatar, update `ORG_VS_PUBLIC_URL`, `ORG_VS_ADMIN_URL`, `CREDENTIAL_DEFINITION_ID` to your values.

### 2. Set runtime secrets

```bash
export OPENAI_API_KEY=sk-proj-…
export MCP_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

`MCP_CONFIG_ENCRYPTION_KEY` is required even if you don't use user-controlled MCP today — the chatbot won't start without it.

### 3. Load the config env and run setup

```bash
set -a
source config.env
set +a
./scripts/setup.sh
```

What the script does, in order:

1. **Ensures `veranad` is installed.** Downloads the `veranad` CLI binary for your platform/arch into `~/.local/bin` if missing.
2. **Kills any previous VS Agent container** with the same name and wipes its wallet.
3. **Starts an ngrok HTTP tunnel** on the VS Agent's public port, parses the public URL, sets `AGENT_PUBLIC_DID=did:webvh:<domain>`.
4. **Starts the VS Agent Docker container** with the ngrok DID as its public identifier.
5. **Waits up to 90s** for the VS Agent to initialize (polls `/v1/agent`).
6. **Sets up a `veranad` account** funded from the testnet faucet.
7. **Requests a Service credential** from the organization's admin API. The organization issues it W3C-style using VPR-discovered schemas and the local agent receives + links it on its DID document.
8. **Writes `ids.env`** with the agent DID, ngrok URL, and other identifiers for the next step.

At the end you'll see:

```text
Agent DID         : did:webvh:<...>.ngrok-free.app
Public URL        : https://<...>.ngrok-free.app
Admin API         : http://localhost:3010

Start the full stack with Docker Compose:
  export NGROK_DOMAIN=<domain>
  export OPENAI_API_KEY=sk-...
  docker compose -f docker/docker-compose.yml up
```

### 4. Start the chatbot stack

```bash
export NGROK_DOMAIN=<your-domain>.ngrok-free.app
./scripts/start.sh
```

This runs `docker compose up` in the foreground against `docker/docker-compose.yml`, bringing up:

- `chatbot` — the Hologram generic AI agent image
- `redis` — vector store + memory
- `postgres` — sessions + MCP user config

The chatbot mounts your fork's `agent-pack.yaml` read-only into `/app/agent-packs/example-agent/agent-pack.yaml`, so edits to the pack require a `docker compose restart chatbot` to pick up.

### 5. Connect from Hologram

```bash
curl -s http://localhost:3010/v1/invitation | jq -r .shortUrl
```

Paste the URL into Hologram Messaging (or render as QR and scan). The agent greets you.

## Resetting state

Everything about the local agent is in Docker volumes + the `./data` directory:

```bash
# Kill the running stack
docker compose -f docker/docker-compose.yml down -v

# Wipe the VS Agent wallet (forces a fresh DID on next setup.sh)
docker rm -f example-agent 2>/dev/null
rm -rf ./data

# Kill ngrok
pkill -f "ngrok http"

# Optionally wipe the derived IDs
rm -f ids.env
```

Then re-run `./scripts/setup.sh` and `./scripts/start.sh`.

## Hot-reloading the agent pack

`agent-pack.yaml` is mounted into the chatbot read-only. Edit it, then:

```bash
docker compose -f docker/docker-compose.yml restart chatbot
```

The chatbot reloads the pack and rebuilds the LangChain agent. Sessions survive (they're in Postgres), memory survives (Redis).

## Troubleshooting

| Symptom | What to try |
|---|---|
| `ngrok URL is empty` | `ngrok config add-authtoken <token>` then rerun `setup.sh`. |
| `VS Agent did not start within timeout` | Check `docker logs example-agent` — usually it's a wallet-init issue; `rm -rf data/wallet` and rerun. |
| Chatbot logs `postgres connection refused` at startup | Postgres container hasn't finished init yet — `docker compose logs postgres`, wait, the chatbot retries. |
| Hologram app shows "connection refused" | ngrok tunnel dropped. Rerun `setup.sh`. |
| Auth menu doesn't work | `CREDENTIAL_DEFINITION_ID` unset. Either deploy the deps repo, or point at the demo deps (`avatar.demos.hologram.zone`) and copy the `CREDENTIAL_DEFINITION_ID` from its workflow summary into `config.env`. |
| LLM errors on every message | Check `docker compose logs chatbot` — most common is a wrong `OPENAI_API_KEY` or over-quota. |
| MCP tool "not available" | See [MCP debugging](../build/agent-pack/mcp.md#debugging). |

## When you're ready for prod

See [**Run on Kubernetes**](./kubernetes/helm-chart.md).
