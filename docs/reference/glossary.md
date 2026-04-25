# Glossary

Controlled vocabulary for Hologram, Verana, and the wider verifiable-credential / DIDComm stack. Linked from across the docs whenever a term appears in a new context.

## Core Hologram terms

### Agent (Hologram agent)

A **DIDComm-reachable peer** with a verifiable identity, presented to users as a chat. Concretely: a [VS Agent](#vs-agent-verifiable-service-agent) running an [Agent Pack](#agent-pack), reachable at a stable [DID](#did-decentralised-identifier). Users connect to it from the [Hologram app](#hologram-app) and exchange messages, credentials, and tool calls over [DIDComm](#didcomm).

See [**Agents**](../learn/agents.md).

### Agent Pack

A **single-file YAML manifest** (`agent-pack.yaml`) declaring an agent's entire configuration: which LLM, which MCP servers, which credentials it accepts for authentication, which roles map to which tools, language strings, RAG sources. The chatbot reads the pack at startup; nothing about the agent's *behaviour* lives in code.

See [**Agent Pack overview**](../build/agent-pack/overview.md), [**Schema reference**](./agent-pack-schema.md).

### Approval (workflow)

A **two-party authorisation** policy in [RBAC](#rbac-role-based-access-control). Some tools (e.g. `send_money`) are configured with a list of approver roles + a timeout; calls submitted by users without those roles are queued, the approvers are notified in their chat, and the tool only executes after one of them taps `Approve`. If no approver acts within the timeout, the request expires.

See [**RBAC → Approval lifecycle**](../build/agent-pack/rbac.md#approval-lifecycle).

### Bundled tool

A tool that ships with the chatbot itself rather than being supplied by an external [MCP server](#mcp-model-context-protocol). Examples: `statisticsFetcher`, `rag_retriever`, `image_generator`. Configured under `tools.bundled` in the agent pack.

### Chatbot (Hologram chatbot)

The **engine container** that reads an Agent Pack, holds the conversation state for each connected user, dispatches LLM calls, runs MCP tool calls, applies RBAC, and forwards messages to/from a [VS Agent](#vs-agent-verifiable-service-agent). Published as `io2060/hologram-generic-ai-agent`. Source: [`hologram-generic-ai-agent-vs`](https://github.com/2060-io/hologram-generic-ai-agent-vs).

### Controller

The **agent's logic side** — anything that drives a [VS Agent](#vs-agent-verifiable-service-agent) over its admin API. The chatbot is one controller. You can write your own — see [**Advanced — bare VS Agent**](../build/advanced/bare-vs-agent.md).

### Hologram app

The **end-user mobile app** ([hologram.zone/apps](https://hologram.zone/apps)). Holds the user's Avatar credential, surfaces the agents they've connected to as chats, lets them issue/receive/present credentials. iOS + Android + Web.

### Verifiable Service / VS

A specific kind of [agent](#agent-hologram-agent) registered as a discoverable, trust-resolvable service on the [Verana](#verana) network. Distinct from a private bilateral agent in that anyone resolving its [DID](#did-decentralised-identifier) gets back a signed Linked-VP confirming what kind of service it is and who endorsed it.

### VS Agent (Verifiable-Service Agent)

The **DIDComm endpoint container** that holds the agent's wallet, public DID, and connections. Exposes a REST admin API (port 3000) for the controller and a public DIDComm port (3001) for peers. Published as `io2060/vs-agent`. Source: [`vs-agent`](https://github.com/2060-io/vs-agent).

In docs: when we say "VS Agent" without "Hologram" we mean the container; when we say "agent" we usually mean "the whole thing" (VS Agent + chatbot + agent pack).

See [**Admin API**](./admin-api.md), [**Webhook events**](./webhook-events.md).

### Verifiable User Agent / VUA

The **user-side counterpart** to a VS — the Hologram app, treated as an agent in its own right. Holds the user's wallet, presents credentials on the user's behalf. Conceptually distinct from a Verifiable Service so the trust model can talk about user-side and service-side agents separately.

### Verifiable Public Registry / VPR

The **chain-of-trust registry** that makes verifiable services discoverable. Concretely instantiated on [Verana](#verana). Stores: which DIDs are recognised organizations, which credential schemas are canonical, which services are registered against which schemas.

## Trust + credential primitives

### AnonCreds

The **default credential format** in the Hologram stack. Privacy-preserving (selective disclosure, predicates, unlinkable presentations). The credentialDefinitionId you see throughout the docs is an AnonCreds primary identifier.

W3C JSON-LD credentials are also supported but currently less ergonomic.

### Credential definition (credDef)

The **public artefact** an issuer publishes that defines the schema + revocation registry of a particular credential type. Every issued credential references a `credentialDefinitionId`. In Hologram these are published on the issuer's DID document under the `verifiableCredential` array.

### DID (Decentralised Identifier)

A **W3C URI** that resolves to a DID document containing public keys, service endpoints, and (in the Hologram stack) Linked Verifiable Presentations. `did:web` is the default for VS Agents (`did:web:my-agent.demos.hologram.zone`); `did:webvh` is supported for verifiable-history use cases.

### DIDComm

The **DID-secured messaging protocol**. Asynchronous, encrypted, peer-to-peer. Every message between a Hologram user and an agent — text, credential offer, presentation request — is a DIDComm message under the hood. Spec: [didcomm.org](https://didcomm.org).

### ECS credential

A credential issued by **Verana's Ecosystem Credential Service**. Two types in routine use: **Organization** (proves an entity is a registered organization) and **Service** (proves an organization-issued service is what it claims to be). Service credentials are what give a Hologram agent its blue-check on the Verana trust resolver.

### Holder

The **party in possession** of a credential. Usually a user (their Hologram app), occasionally an agent (an agent holding a Service credential issued by its parent organization).

### Issuer

The **party that signs and emits** a credential. Hologram issuers are typically `vs-agent`-only services like `avatar.vs.hologram.zone` or `passport.vs.hologram.zone`.

### Linked VP / Linked Verifiable Presentation

A **signed VP attached to a DID document** as proof of an attribute about the DID itself. The mechanism by which an agent proves "I'm a registered Service of organization X" without requiring a runtime presentation — the proof is sitting on the DID doc.

### Presentation / Verifiable Presentation (VP)

A **proof a holder constructs** showing they hold one or more credentials matching a verifier's request, optionally with selective disclosure or predicates ("I'm over 18" without revealing date of birth).

### Proof of Trust

The **chain of credentials** an agent shows on first contact: my DID → I hold a Service credential issued by org X → org X holds an Organization credential issued by Verana. The Hologram app verifies this chain before letting the user message the agent.

### Schema

The **shape of a credential** — list of attribute names + types. Distinct from a credential definition (which binds a schema to a particular issuer's keys + revocation registry). Schemas are typically published on Verana so multiple issuers can issue against the same schema.

### Trust Registry

A **named set of trusted DIDs + credential definitions** published on Verana. An agent points at one or more trust registries to declare "I trust credentials issued by any of these issuers, no further checks needed".

### Trust Resolver

The **lookup component** that, given a DID, returns its current Linked VPs and resolves the chain of trust back to a recognised root. Hologram apps run a built-in trust resolver against Verana; you can also run a standalone instance — see [`verana-resolver`](https://github.com/verana-labs/verana-resolver).

### VC (Verifiable Credential)

The W3C-spec **signed claim** about a subject (usually a holder). Issued by an issuer, held by the holder, optionally presented to verifiers. Hologram uses AnonCreds-format VCs by default.

### Verana

The **public chain + trust-registry network** Hologram builds on. Provides the VPR primitives, the ECS credentials, and the trust-resolver protocol. See [verana.io](https://verana.io).

### Verifier

The **party that requests and validates** a presentation. An AI agent that requires authentication is a verifier in this sense — see [**Authentication**](../build/agent-pack/authentication.md).

## Build / config primitives

### accessMode

The MCP-server config field that picks **who supplies credentials** to the server: `admin-controlled` (one set of credentials in env vars, shared across all users) vs `user-controlled` (each user supplies their own through an in-chat config flow). See [**MCP**](../build/agent-pack/mcp.md).

### approver

A **role** listed in an `approval` block. Users holding any approver role can approve queued tool calls from users without sufficient role. See [**RBAC → Approval lifecycle**](../build/agent-pack/rbac.md#approval-lifecycle).

### Authentication flow

The agent-pack block (`flows.authentication`) that requires users to present a credential before chatting. See [**Authentication**](../build/agent-pack/authentication.md).

### MCP (Model Context Protocol)

The **standard for exposing tools to LLMs** introduced by Anthropic. A black-box server exposes `list_tools` + `call_tool`; the LLM gets a typed tool catalogue. Hologram agents declare MCP servers in `mcp.servers`; the chatbot wires them into the LLM's tool list at runtime. Spec: [modelcontextprotocol.io](https://modelcontextprotocol.io).

### MCP_CONFIG_ENCRYPTION_KEY

The **AES-256-GCM key** the chatbot uses to encrypt user-supplied MCP credentials at rest in Postgres. Generated once with `openssl rand -hex 32`. **Rotation = data loss** — every user has to reconfigure their MCP servers. Treat as permanent.

### RAG (Retrieval-Augmented Generation)

The **pattern of grounding LLM answers** on a corpus of documents. The chatbot includes a RAG layer with Redis or Pinecone vector stores; configured under `rag` in the agent pack. See [**RAG**](../build/agent-pack/rag.md).

### RBAC (Role-Based Access Control)

The **mechanism for gating MCP tools** by user role. Roles come from the verified credential's `rolesAttribute`; tool sets per role are declared in `mcp.servers[].toolAccess.roles`. Includes optional approval workflows for sensitive tools. See [**RBAC**](../build/agent-pack/rbac.md).

### rolesAttribute

The **credential attribute name** the chatbot reads to resolve a user's roles. Typically `roles` (a comma-separated string or array). Configured under `flows.authentication.rolesAttribute`.

### toolAccess

The MCP-server config block that declares **per-role tool visibility** + approval policies. See [**MCP**](../build/agent-pack/mcp.md) and [**RBAC**](../build/agent-pack/rbac.md).

### userConfig

The MCP-server config block (only meaningful with `accessMode: user-controlled`) that declares **per-user fields** the user must fill in: name, type (`secret` / `string`), label (i18n key), header template. See [**MCP**](../build/agent-pack/mcp.md).

## Operational / infra

### Helm chart (`hologram-generic-ai-agent-chart`)

The **Kubernetes deployment unit** for an AI agent. Bundles VS Agent (via the `vs-agent-chart` dependency), the chatbot, Postgres, Redis. Configured by a per-deployment `values.yaml` (see `deployment.yaml` in the demo repos). See [**Helm chart**](../run/kubernetes/helm-chart.md).

### nameOverride

The Helm value used to **run multiple agents in one namespace** without resource collisions. Standard pattern across `vs.hologram.zone`. See [**Helm chart**](../run/kubernetes/helm-chart.md).

### ngrok

The **localhost-tunnelling tool** the local dev flow uses to expose the VS Agent at a public DID-resolvable URL. Required because `did:web:localhost` won't trust-resolve. See [**Run locally**](../run/local.md).

### Service credential

The ECS credential a child agent receives from its parent organization, attached as a Linked VP to its DID document, allowing the Verana trust resolver to confirm "this DID is a registered service of organization X". The CI/CD `get-credentials` step issues this. See [**CI/CD**](../run/ci-cd.md).

### Trust anchor

The **organization at the top of an agent's chain of trust**. Typically a `vs-agent`-only deployment with no chatbot. Public examples: `organization.vs.hologram.zone`, `organization.demos.hologram.zone`. See [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps).

### Webhook events

The **POST callbacks** the VS Agent makes to its controller (the chatbot) when something happens — connection state changes, message received, message delivered. See [**Webhook events**](./webhook-events.md).

## Common acronyms

| Acronym | Expansion | Section |
|---|---|---|
| AI | Artificial Intelligence | n/a |
| AnonCreds | Anonymous Credentials | [link](#anoncreds) |
| API | Application Programming Interface | n/a |
| credDef | Credential Definition | [link](#credential-definition-creddef) |
| DID | Decentralised Identifier | [link](#did-decentralised-identifier) |
| DIDComm | DID Communication | [link](#didcomm) |
| ECS | Ecosystem Credential Service | [link](#ecs-credential) |
| LLM | Large Language Model | n/a |
| MCP | Model Context Protocol | [link](#mcp-model-context-protocol) |
| OOB | Out-of-Band (DIDComm protocol) | n/a |
| PAT | Personal Access Token | n/a |
| RBAC | Role-Based Access Control | [link](#rbac-role-based-access-control) |
| RAG | Retrieval-Augmented Generation | [link](#rag-retrieval-augmented-generation) |
| VC | Verifiable Credential | [link](#vc-verifiable-credential) |
| VP | Verifiable Presentation | [link](#presentation--verifiable-presentation-vp) |
| VPR | Verifiable Public Registry | [link](#verifiable-public-registry--vpr) |
| VS | Verifiable Service | [link](#verifiable-service--vs) |
| VUA | Verifiable User Agent | [link](#verifiable-user-agent--vua) |
| VT | Verifiable Trust | n/a |
