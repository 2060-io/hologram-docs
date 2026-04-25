# The Hologram ecosystem

Beyond the docs, Hologram is a network of running agents on the public internet. This page is the **map**. It points at the canonical reference deployments, the source repos behind them, and what each one demonstrates — useful when you're picking a starter to fork or trying to understand "what's possible".

There are two public umbrellas:

- **[`vs.hologram.zone`](https://vs.hologram.zone)** — the production-grade verifiable-services demos. Long-running, Verana trust-resolved, the agents that ship with the platform.
- **[`demos.hologram.zone`](https://demos.hologram.zone)** — short-lived demos and reference deployments built off [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example) so you can fork-and-go.

## Recommended starting point

If you're new and want to ship a verifiable AI agent of your own, the path is:

1. **Fork [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example)** — a complete starter agent with Context7 MCP wired up, Avatar-credential authentication, a Helm chart, and a GHA deploy workflow.
2. **(Optionally) Fork [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps)** — the trust-anchor + Avatar credential issuer that the example agent depends on. Most builders won't need to redeploy these — `demos.hologram.zone` already runs them — but the repo exists if you want to operate your own trust hierarchy.
3. Walk the [**Quickstart**](../build/quickstart.md), then [**Cookbook → Hologram example agent**](../build/cookbook/hologram-example-agent.md).

That's it. Everything below is context — useful background but not gating.

## Core repos

| Repo | What it is | Read it when |
|---|---|---|
| [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example) | The canonical fork-and-ship starter for an AI agent. Single agent pack, Helm chart, GHA workflow. | You want to build an agent from scratch. |
| [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps) | The Organization + Avatar issuers that the example agent trusts. Deployed at `{organization,avatar}.demos.hologram.zone`. | You need your own trust-anchor / avatar issuer instead of leaning on the public demos. |
| [`hologram-generic-ai-agent-vs`](https://github.com/2060-io/hologram-generic-ai-agent-vs) | The **engine**. The chatbot container that reads an agent pack, talks to a VS Agent, runs the LLM, dispatches MCP tools. Published as `io2060/hologram-generic-ai-agent`. | You want to understand internals, contribute, or fork the chatbot itself. |
| [`hologram-verifiable-services`](https://github.com/2060-io/hologram-verifiable-services) | The reference deployments behind `vs.hologram.zone`. One folder per service, GHA workflow per service. | You want production-grade examples — RBAC, multi-tenant ingress, layered trust deps. |
| [`vs-agent`](https://github.com/verana-labs/vs-agent) | The DIDComm endpoint + wallet. Published as `verana-labs/vs-agent`. | You want to use the VS Agent primitives directly without the chatbot — see [Advanced — bare VS Agent](../build/advanced/bare-vs-agent.md). |

## What each demo demonstrates

### `vs.hologram.zone` — production-grade verifiable services

| Service | Domain | What's interesting |
|---|---|---|
| **Organization** | `organization.vs.hologram.zone` | The trust anchor. Holds Organization + Service ECS credentials from Verana, runs its own trust registry, issues Service credentials to the other agents. Pure VS Agent — no chatbot. |
| **Avatar** | `avatar.vs.hologram.zone` | A DIDComm chatbot whose only job is to issue Avatar credentials to new Hologram users. Pattern for any credential-issuing chatbot. |
| **Passport** | `passport.vs.hologram.zone` | NFC ePassport reader + liveness check, issues an identity credential. Pattern for hardware-backed identity flows. |
| **GitHub agent** | `github-agent.vs.hologram.zone` | An AI agent with **user-controlled MCP**. Each user supplies their own GitHub PAT; the agent only ever sees that user's repos. See [**Cookbook — GitHub agent**](../build/cookbook/github-agent.md). |
| **Wise agent** | `wise-agent.vs.hologram.zone` | An AI agent with **admin-controlled MCP + RBAC + approvals**. One company Wise sandbox, role-gated tool access, two-party approval on `send_money`. See [**Cookbook — Wise agent**](../build/cookbook/wise-agent.md). |
| **Playground** | `vs.hologram.zone` | The landing page that links to all of the above. |

Source: [`hologram-verifiable-services`](https://github.com/2060-io/hologram-verifiable-services). Each service is one folder with `config.env`, `deployment.yaml`, an `agent-pack.yaml` if it's an AI agent, and a per-service GHA workflow.

### `demos.hologram.zone` — fork-and-go reference

| Service | Domain | What's interesting |
|---|---|---|
| **Example agent** | `example.demos.hologram.zone` | The agent built from `hologram-ai-agent-example`. Context7 MCP, Avatar auth, no RBAC. Mirror of what the quickstart deploys. |
| **Organization (demo)** | `organization.demos.hologram.zone` | The example's trust anchor. Built from `hologram-ai-agent-example-deps`. |
| **Avatar (demo)** | `avatar.demos.hologram.zone` | The example's Avatar issuer. Built from `hologram-ai-agent-example-deps`. |

These exist so you can run the quickstart against living, accessible dependencies — no need to deploy your own trust anchor on day one.

## How they relate

```text
                        ┌──────────────────────────────────┐
                        │          Verana network          │
                        │     (public trust registry)      │
                        └────────────────┬─────────────────┘
                                         │ ECS credentials
                                         │ (Organization, Service)
                                         ▼
       ┌─────────────────────────┐   ┌─────────────────────────┐
       │ organization.vs.hologr… │   │ organization.demos.holo…│
       │   (production trust     │   │  (demo trust anchor)    │
       │    anchor)              │   │                         │
       └───────┬─────────────────┘   └───────┬─────────────────┘
               │ issues Service cred         │ issues Service cred
               │                             │
   ┌───────────┼───────────┐         ┌───────┴───────┐
   ▼           ▼           ▼         ▼               ▼
 avatar    github-agent  wise…   avatar.demos…   example.demos…
 passport                                            (your fork
                                                     deploys here)
```

The example agent on `demos.hologram.zone` and the production agents on `vs.hologram.zone` are **operationally identical** — same chart, same GHA pattern. The only difference is which trust anchor they chain back to.

## Where to go next

| You want to | Go to |
|---|---|
| Build your first agent | [**Quickstart**](../build/quickstart.md) |
| Understand what a Hologram agent is | [**Agents**](./agents.md) |
| Understand the trust model | [**Trust**](./trust.md) |
| Pick a cookbook walkthrough | [**Cookbook**](../build/cookbook/hologram-example-agent.md) |
| Deploy your own trust anchor | [`hologram-ai-agent-example-deps` README](https://github.com/2060-io/hologram-ai-agent-example-deps) |
