# Introduction

**Hologram is infrastructure for verifiable AI agents.** Your users reach your agent through a single mobile app ([Hologram Messaging](https://hologram.zone)); your agent runs as a **Verifiable Service** on infrastructure *you* control; both ends cryptographically prove who they are before a single message is exchanged.

These docs are for the builder side — the agent. If you're here for the user-facing story (privacy, end-to-end encryption, why Hologram over WhatsApp or Signal), head to [hologram.zone](https://hologram.zone).

## The Four Pillars

Hologram is built around four principles. Keep them in mind as you read — every concept in these docs maps back to one of them.

### Pillar 1 · Own

**Own your agents.**

Your agent is a container you deploy. Self-host it, run it on your own Kubernetes cluster, or hand it to any hosting provider. The source is Apache-2.0, the protocol is open ([DIDComm](https://identity.foundation/didcomm-messaging/spec/) + [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/)), the keys are yours. No vendor can block, censor, rate-limit, or subpoena your agent's users out from under you.

### Pillar 2 · Verify

**Verify every connection, in both directions.**

Before any user-visible message is sent, credentials are exchanged:

1. **The receiving agent goes first.** Your agent presents its own W3C Verifiable Credentials up-front — identity, operator, service, governance. The connecting party (usually a user's Hologram app) reviews them as a **Proof-of-Trust** card.
2. **Trust is resolved, end-to-end.** Signatures are checked, issuers walked, trust registries traversed — all the way to a public, auditable [Verifiable Public Registry](https://verana-labs.github.io/verifiable-trust-vpr-spec/) on the [Verana](https://verana.io) network.
3. **The agent decides.** Accept the connection, refuse it, or accept with limited features. The policy is declared in your [Agent Pack](../build/agent-pack/overview.md) and enforced by the runtime.

### Pillar 3 · Discover

**Discover trusted agents.**

Every agent publishes a DID (`did:webvh:…`) that resolves to its credentials, its endpoints, and its Linked Verifiable Presentations. Anyone can crawl these public DIDs, filter by ecosystem or credential type, and list only agents they trust. The Hologram app uses this to surface services to users; ecosystem governors use it to list recognized services; search engines can use it to rank by verifiable metadata rather than by marketing budget.

### Pillar 4 · Govern

**Credentials gate everything.**

Roles, permissions, tool access, approval policies — they're all driven by verifiable credential claims. A user who presents an `employee` credential from `acme.corp` sees the `employee` toolset. A user who presents a `finance` credential sees an additional `send_money` tool that also requires managerial approval before executing. All of it lives in the [Agent Pack](../build/agent-pack/mcp.md), none of it needs code changes.

## Three kinds of peers

Everything in Hologram is one of three things:

| Peer | What it is | Examples |
|---|---|---|
| **Verifiable Service (VS)** | An agent — credential-bound, DIDComm-addressable. Chatbots, AI agents, credential issuers, credential verifiers. | The example agent at `example-agent.demos.hologram.zone`, bank agents, mobile-operator agents, government ID services. |
| **Verifiable User Agent (VUA)** | A user-facing client that connects to VSs on a user's behalf. | [Hologram Messaging](https://hologram.zone) is the first known VUA. |
| **Verifiable Public Registry (VPR)** | A permissionless public service for declaring who may issue or verify what. The "phone book for trust". | The [Verana testnet](https://verana.io), the anchor that resolves every credential back to an authorized issuer. |

Read [The trust model](./trust.md) for the full picture.

## Where to go next

- [**The Hologram app**](./hologram-app.md) — where your users come from.
- [**The trust model**](./trust.md) — VS, VUA, VPR, and how they compose.
- [**Quickstart**](../build/quickstart.md) — fork a working agent and connect it to your phone in 10 minutes.
- [**Agent Pack**](../build/agent-pack/overview.md) — the single YAML manifest that declares persona, LLM, tools, and policies.



