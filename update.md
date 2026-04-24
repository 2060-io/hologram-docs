# Hologram Docs — Update Plan

> Purpose: bring `docs.hologram.zone` in line with the current stack
> (Agent Packs, MCP, RBAC + approvals, Helm-chart deployment, verifiable
> services ecosystem on `vs.hologram.zone`) and make it the canonical
> entry point for developers wanting to ship a verifiable AI agent.

---

## 1. Diagnostic — what's stale today

> **As of Apr 2026**, two reference repos were scaffolded that change the
> picture: [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example)
> and its companion [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps).
> They are the canonical fork-and-ship starter for a verifiable AI agent
> and its Organization + Avatar dependencies. The docs should lean on them
> rather than re-derive setup from the underlying `hologram-generic-ai-agent-vs`.
> See §10 for how they fit into content sourcing.

### Content gaps (`docs/`)

- **No mention of Agent Packs.** The entire "Build" section still teaches a bare `io2060/vs-agent:dev` container driven by `AGENT_PUBLIC_DID` env vars and a hand-rolled Express webhook listener. That path is still technically valid for pure VS Agent primitives, but **~90% of agents now live inside `hologram-generic-ai-agent-vs` and are driven by a single `agent-pack.yaml` manifest**.
- **No MCP docs** (`mcp.servers`, `admin-controlled` vs `user-controlled`, per-user token flow, lazy discovery, encryption).
- **No RBAC / approval workflow docs** (`toolAccess.roles`, `approval:`, approvers, self-approval, approval menu items).
- **No LLM provider docs** (OpenAI / Anthropic / Ollama / OpenAI-compatible — Kimi, DeepSeek, Groq, Together AI).
- **No RAG docs** even though `docs/` already has three finished how-tos in `hologram-generic-ai-agent-vs/docs/how-to-use-rag-service.md`, `how-to-use-memory-service.md`, `how-to-use-ollama.md`.
- **No deployment docs.** Neither `docker-compose` (infra services) nor Helm chart (`hologram-generic-ai-agent-vs/charts`, `vs-agent-chart`) is covered. The `hologram-verifiable-services` repo and its GHA workflow pattern is not mentioned either.
- **No reference material.** No env var index, no agent-pack schema reference page, no admin-API reference (only a link out to the Swagger UI), no webhook event catalog.
- **No "Run" section** — observability, secrets, scaling, image-pull policy, `nameOverride`, multi-tenant patterns, `ORG_VS_PUBLIC_URL` chaining, etc.
- `docs/learn/10-architecture.md` covers the **conceptual** topology (VS / VUA / VPR) very well but dead-ends — nothing links "so here's how I actually ship this".
- `docs/build/getting-started/30-verifier.md` still points to the old `dm.chatbot.demos.2060.io` and an unfinished opening sentence ("_introduce a powerful and_").
- `docs/learn/05-hologram-app.md` has valid end-user positioning but duplicates content now owned by `hologram.zone/apps` — should be a short redirect-ish page, not the canonical source.

### Site-infrastructure gaps

- `README.md` is still the verbatim Docusaurus template ("Created verana-docs", `cd my-website`, etc.). No repo-specific content.
- `blog/` contains the four Docusaurus template posts from 2019-2021. Either purge or repurpose.
- `docusaurus.config.ts`:
  - Title `"Hologram SDK"` no longer matches product branding (should be `"Hologram Docs"` or just `"Hologram"`).
  - Tagline mentions "Open source solution for building chat-based verifiable services and verifiable AI agents" — fine but dated phrasing vs. hologram.zone pillars.
  - `docsVersionDropdown` is enabled but there's only a single version labelled `"Next"` at `/next/` — either remove the dropdown or actually cut a `1.0` version.
  - Sidebar has a commented-out "Verifiable Trust" category that was never enabled.
  - No Algolia / local search configured.
  - OG card `hologram-docs-og.jpg` — verify it exists in `static/img/`.
- `.github/workflows/deploy.yml` uses Node 18 — bump to Node 20 (LTS, aligned with the rest of the 2060-io repos and with Docusaurus 3's tested matrix).
- `sidebars.ts` comment at the top is misleading (`sidebars.js`), and the commented-out subsection suggests the structure was mid-refactor.

---

## 2. Target reader personas

Documentation should speak to three primary personas, in this priority order:

| # | Persona | Goal on the site | Dominant section |
|---|---|---|---|
| 1 | **Agent builder / developer** | Ship a verifiable AI agent to users on Hologram, locally then to K8s | `/build/`, `/run/`, `/reference/` |
| 2 | **Ecosystem architect** | Understand VS / VUA / VPR / Verana trust model and where Hologram sits | `/learn/` |
| 3 | **Ops / SRE** | Deploy, monitor, secure, and upgrade an agent in production | `/run/` |

End-users of the Hologram mobile app are **not** the target of this docs site — they're addressed on `hologram.zone` directly.

---

## 3. Proposed information architecture

```
/learn                  — concepts (read once, understand the model)
  /hologram             — what Hologram is, where it fits (short)
  /agents               — what a Hologram agent is (VS), how a conversation flows
  /trust                — VS, VUA, VPR, DIDComm, VCs, Verana — the trust model
  /ecosystem            — the wider ecosystem (existing demos on vs.hologram.zone)

/build                  — hands-on, from zero to a shipped agent
  /quickstart           — "your first agent in 10 minutes" using the generic AI agent
  /agent-pack           — the manifest, section by section
    /metadata
    /languages
    /llm                — OpenAI, Anthropic, Ollama, OpenAI-compatible endpoints
    /rag
    /memory
    /flows              — welcome, authentication, menu items
    /tools              — dynamic HTTP tools + bundled tools
    /mcp                — Model Context Protocol servers
    /rbac               — roles, tool access, approval workflow
    /image-generation
    /speech-to-text
    /integrations
  /how-to
    /add-an-mcp-server
    /authenticate-users-with-credentials
    /require-credential-roles
    /approval-workflow
    /use-ollama-locally
    /use-a-custom-llm-endpoint
    /ingest-rag-documents
    /multi-language-agent
    /issue-a-credential               (VS Agent primitive)
    /verify-a-credential              (VS Agent primitive)
  /cookbook
    /customer-service-agent
    /github-agent
    /wise-agent
    /internal-corporate-agent-with-rbac

/run                    — deploy & operate
  /local                — docker-compose (infra), `scripts/setup.sh`, ngrok
  /kubernetes
    /helm-chart         — values.yaml reference for hologram-generic-ai-agent-vs
    /vs-agent-chart     — dependency chart for VS Agent primitives
    /nameoverride       — running multiple agents in one namespace
    /secrets            — `MCP_CONFIG_ENCRYPTION_KEY`, LLM keys, DB creds
    /ingress            — pattern used by vs.hologram.zone
  /ci-cd                — GitHub Actions pattern from hologram-verifiable-services
  /observability        — logs, stats (Artemis / JMS), PostgreSQL session inspection
  /upgrading            — version pinning, migrations, rollback

/reference
  /agent-pack-schema    — full field-by-field reference (imported from hologram-generic-ai-agent-vs/docs/agent-pack-schema.md)
  /env-vars             — canonical index of every env var (from README of hologram-generic-ai-agent-vs)
  /admin-api            — VS Agent Admin API (connections, messages, credential-types, invitations) — either generated from Swagger or curated
  /webhook-events       — message-received, presentation, etc.
  /cli                  — any shell helpers in `common.sh` worth documenting
  /glossary             — DIDComm, DID, VC, AnonCreds, VPR, VUA, VS, VT, Proof-of-Trust, Agent Pack

/ecosystem              — (optional, could live under /learn)
  /demos                — existing demos on vs.hologram.zone with what each demonstrates
  /verana               — the underlying public registry
```

**Rationale:** Learn → Build → Run → Reference maps cleanly to user intent, matches patterns readers know from `docs.verana.io`, `nextjs.org/docs`, `docs.docker.com`. Keeps the Docusaurus `versions` concept ready if we ever cut a `1.0`.

---

## 4. Page-by-page task list

### Phase 1 — minimum viable rewrite (blockers for removing "outdated" perception)

> Goal: a dev landing on `docs.hologram.zone` can **build, run, and deploy** a real agent end-to-end without digging into four other repos' READMEs.

| # | Page | Action | Source of truth |
|---|------|--------|-----------------|
| 1.1 | `README.md` | Rewrite (not boilerplate). Explain what this repo publishes, where the site is served, how to run Docusaurus locally, and link to the live site | n/a |
| 1.2 | `docusaurus.config.ts` | `title`: "Hologram Docs". Either remove versions dropdown or commit to `1.0` + `next`. Verify OG image exists. Bump Node to 20 in `deploy.yml` | n/a |
| 1.3 | `sidebars.ts` | Rename to match new IA (learn, build, run, reference). Drop the commented-out block | n/a |
| 1.4 | `blog/` | Delete the Docusaurus template posts or disable the blog preset entirely (tagline space freed) | n/a |
| 1.5 | `docs/learn/00-introduction.md` | Keep table but **reframe around the three Hologram pillars** (Verifiable AI Agents / Verifiable User Agent / Verifiable Public Registry) to mirror `hologram.zone` | `hologram.zone-website/src/app/page.tsx` (Pillars section) |
| 1.6 | `docs/learn/agents.md` (new) | What a Hologram agent is: DIDComm endpoint, verifiable identity, conversation loop, where the LLM fits in, what an Agent Pack is. One PlantUML diagram tying it to VS/VUA. | `hologram-generic-ai-agent-vs/README.md` §Overview + `src/core` mental model |
| 1.7 | `docs/learn/trust.md` | Move & compress the current `10-architecture.md` content here, keep diagrams, **add a closing paragraph** "→ in practice, you don't wire this by hand, you declare it in an Agent Pack". | Current `10-architecture.md` |
| 1.8 | `docs/build/quickstart.md` (new) | **"Your first agent in 10 minutes."** Fork [`hologram-ai-agent-example`](https://github.com/2060-io/hologram-ai-agent-example), grab an Avatar credential from `avatar.demos.hologram.zone`, set `OPENAI_API_KEY`, then either `./scripts/setup.sh && ./scripts/start.sh` for local dev (VS Agent via Docker + ngrok + chatbot via docker-compose) **or** dispatch the repo's GHA `Deploy Example Agent` workflow for Kubernetes. Connect from the Hologram app, say hi. No `pnpm install`, no source build, no from-scratch trust-registry setup. | `hologram-ai-agent-example/README.md` + `docs/README.md` |
| 1.9 | `docs/build/agent-pack/overview.md` (new) | What an Agent Pack is, what directory structure, `${VAR}` interpolation, how `AGENT_PACK_PATH` is selected | `hologram-generic-ai-agent-vs/docs/agent-pack-schema.md` |
| 1.10 | `docs/build/agent-pack/llm.md` | Covering OpenAI, Anthropic, Ollama, and **OpenAI-compatible endpoints** (Kimi, DeepSeek, Groq, Together AI). Explicitly state the `OPENAI_BASE_URL` pattern. | README §Env vars + `src/llm/` |
| 1.11 | `docs/build/agent-pack/mcp.md` | The headline new feature. `admin-controlled` vs `user-controlled`, `toolAccess.default`, `toolAccess.public`, `toolAccess.roles`, `userConfig.fields` with `type: secret`, `headerTemplate`. | README §MCP + sample `github-agent/agent-pack.yaml` |
| 1.12 | `docs/build/how-to/add-an-mcp-server.md` | Task-focused: "I have an MCP server, how do I wire it?" with the GitHub and Wise examples. | `hologram-verifiable-services/wise-agent/agent-pack.yaml` + README |
| 1.13 | `docs/run/local.md` | docker-compose, ngrok, the three infra services (Redis, PostgreSQL, VS Agent). | `hologram-generic-ai-agent-vs/docker/docker-compose.yml` + `scripts/setup.sh` |
| 1.14 | `docs/run/kubernetes/helm-chart.md` | Full `values.yaml` tour: `nameOverride`, LLM secret refs, MCP secret refs, Postgres, Redis, ingress, `vs-agent-chart` dependency, `RELEASE_NAME` patterns. | `hologram-generic-ai-agent-vs/charts/README.md` + `charts/values.yaml` |
| 1.15 | `docs/reference/agent-pack-schema.md` | Import `hologram-generic-ai-agent-vs/docs/agent-pack-schema.md` in full, either as a mirror or by submodule/script. Flag as canonical. | Same file |
| 1.16 | `docs/reference/env-vars.md` | Canonical table of every env var the agent recognises. | README §Environment Variables |

### Phase 2 — depth on the advanced features

> Goal: cover everything that makes Hologram non-trivial vs. "yet another chatbot framework".

| # | Page | Action |
|---|------|--------|
| 2.1 | `docs/build/agent-pack/rbac.md` | Deep dive on `toolAccess.roles`, how roles are resolved from credentials (`rolesAttribute`, `defaultRole`, `adminUsers`). Worked example with `guest`, `employee`, `finance`. |
| 2.2 | `docs/build/agent-pack/flows.md` | welcome / authentication / menu — visibleWhen conditions, badges, `my-approval-requests`, `pending-approvals`. |
| 2.3 | `docs/build/how-to/authenticate-users-with-credentials.md` | End-to-end: credential definition → `flows.authentication` → the identity-proof-request → `userIdentityAttribute` matching → session handling. |
| 2.4 | `docs/build/how-to/approval-workflow.md` | Configure `toolAccess.approval`, pick `approvers` roles, set `timeoutMinutes`, add i18n strings, test end-to-end. |
| 2.5 | `docs/build/how-to/ingest-rag-documents.md` | `rag.docsPath`, `remoteUrls`, chunk size tuning, Redis vs Pinecone tradeoffs. |
| 2.6 | `docs/build/how-to/use-ollama-locally.md` | Port `hologram-generic-ai-agent-vs/docs/how-to-use-ollama.md`. |
| 2.7 | `docs/build/how-to/multi-language-agent.md` | `languages.<lang>`, `defaultLanguage`, i18n string keys, language detection. |
| 2.8 | `docs/build/agent-pack/image-generation.md` | New feature in agent-pack schema. Cover providers, MinIO, target spec inference. |
| 2.9 | `docs/build/agent-pack/speech-to-text.md` | Voice-note transcription config. |
| 2.9b | `docs/build/cookbook/hologram-example-agent.md` | Walk through the `hologram-ai-agent-example` pack: Context7 MCP (admin-controlled, zero-auth), Avatar credential authentication, no RBAC. The entry-level cookbook — mirrors the quickstart but goes deeper on the why of each section. |
| 2.10 | `docs/build/cookbook/github-agent.md` | Walk through the published `github-agent` Agent Pack end-to-end. |
| 2.11 | `docs/build/cookbook/wise-agent.md` | Same with Wise (RBAC + approvals). Emphasise "real production-like" agent. |
| 2.12 | `docs/build/cookbook/customer-service-agent.md` | The `customer-service` pack (knowledge-base + guest role). |
| 2.13 | `docs/run/kubernetes/nameoverride.md` | Pattern for running multiple agents in one namespace (vs.hologram.zone). |
| 2.14 | `docs/run/kubernetes/secrets.md` | `MCP_CONFIG_ENCRYPTION_KEY`, LLM API keys, DB creds — ExternalSecrets / SealedSecrets if applicable. |
| 2.15 | `docs/run/ci-cd.md` | The `hologram-verifiable-services` GHA pattern: one workflow per service, `deploy` / `get-credentials` / `deploy-chatbot` / `all`. |
| 2.16 | `docs/ecosystem/demos.md` | The existing `vs.hologram.zone` + `demos.hologram.zone` demos. Short intro per demo, link to source repo. Includes `hologram-ai-agent-example` + `-deps` as the recommended starting point for new builders. |

### Phase 3 — polish and reference completeness

| # | Page | Action |
|---|------|--------|
| 3.1 | `docs/reference/admin-api.md` | Either auto-generate from the VS Agent Swagger or curate the top endpoints we actually recommend (`/v1/connections`, `/v1/message`, `/v1/credential-types`, `/v1/invitation/*`). |
| 3.2 | `docs/reference/webhook-events.md` | Event catalog: `message-received`, presentation-flow status updates (`scanned`, `connected`, `ok`, `rejected`), connection events, with example payloads. |
| 3.3 | `docs/reference/glossary.md` | DID, DIDComm, VC, AnonCreds, VPR, VT, VUA, VS, Trust Resolver, Proof-of-Trust, ECS credential, Agent Pack, MCP. |
| 3.4 | `docs/build/getting-started/10-minimal-vs.md` (existing) | **Keep**, but move to `/build/advanced/bare-vs-agent.md` and add a banner at the top: "Most agents should use the Generic AI Agent + Agent Pack — see Quickstart. This page documents the underlying VS Agent primitives." Fix the `async fetch` typo on line 169 and the `--name` missing the image on line 78. |
| 3.5 | `docs/build/getting-started/20-issuer.md` (existing) | **Keep**, move to `/build/how-to/issue-a-credential.md`. Same banner. Fix `--name` missing image name (line 26). |
| 3.6 | `docs/build/getting-started/30-verifier.md` (existing) | **Keep**, move to `/build/how-to/verify-a-credential.md`. Same banner. Fix the unfinished sentence line 6, fix `async fetch` typo, update the demo DID to a still-live one. |
| 3.7 | `docs/learn/05-hologram-app.md` (existing) | Trim to a short "What is the Hologram app?" page that **links out** to `hologram.zone/apps` rather than duplicating the pitch. |
| 3.8 | `docs/learn/99-help.md` (existing) | Move to `CONTRIBUTING.md` at repo root. PlantUML + sidebar-autogeneration notes are internal, not user-facing. |
| 3.9 | Search | Configure Algolia DocSearch (or local-search-v2 as fallback) — needed for a site of this size. |
| 3.10 | Broken-link check | Run `npm run build` with `onBrokenLinks: 'throw'` (already set) as a CI gate on PRs, not just on deploy. |

---

## 5. Configuration examples we must have on the site

These are the examples the reader should be able to copy-paste. Each becomes a fenced code block inside the relevant how-to / reference page.

- **Minimal Agent Pack** — 10 lines, OpenAI + English only, no auth, no MCP. (Derive from `hologram-welcome` stripped down.)
- **Ollama agent** — local LLM only, no external dependency.
- **Custom OpenAI-compatible endpoint** (Kimi / DeepSeek) — `OPENAI_BASE_URL`.
- **Multi-language agent** — en/es/fr/pt with localized system prompts.
- **Agent with RAG** — `vectorstore` + Redis + local docs.
- **Agent with one admin-controlled MCP server** — Wise with admin token.
- **Agent with one user-controlled MCP server** — GitHub, per-user PAT flow, `headerTemplate: "Bearer {value}"`.
- **Agent with RBAC** — three roles + one approval policy.
- **Agent with authentication required** — `AUTH_REQUIRED=true`, `credentialDefinitionId`, `userIdentityAttribute`.
- **Agent that issues a credential** — VS Agent primitive, AnonCreds `credential-types`.
- **Agent that verifies a credential** — VS Agent primitive, presentation-request invitation.
- **Helm `values.yaml` — multi-tenant** — two `nameOverride`d deployments in one namespace behind different ingress hosts.
- **`.env` for a local quickstart** — the single block a new dev pastes.

---

## 6. Adding MCP services — the chapter's shape

This is explicitly called out in the request, so here's the minimum the "Add an MCP server" how-to must cover, as a checklist:

- [ ] What is MCP in one paragraph + a link to the Anthropic spec.
- [ ] Where the config lives (`mcp.servers` in `agent-pack.yaml`).
- [ ] The two `accessMode`s (`admin-controlled`, `user-controlled`) and **when to pick which**.
- [ ] Transports supported (`streamable-http`, others).
- [ ] Headers and `${ENV}` interpolation.
- [ ] `toolAccess` — `default`, `public`, `roles`, `approval`.
- [ ] `userConfig.fields` — `name`, `type: secret | string`, `label` (i18n), `headerTemplate`.
- [ ] What the end-user sees: the per-user MCP configuration flow in Hologram (menu item, prompts, ✅/⚠️ status).
- [ ] How to generate `MCP_CONFIG_ENCRYPTION_KEY` (`openssl rand -hex 32`) and what happens if you rotate it (all stored user creds become unreadable, users must reconfigure).
- [ ] Lazy discovery semantics: tools only appear after the first successful connection.
- [ ] Debugging: `mcp-smoke.mjs`, log lines to grep, what "tool not available" error paths mean.
- [ ] Worked example: Context7 (admin-controlled, zero-auth) — the simplest possible MCP wiring, copy-pasted from `hologram-ai-agent-example/agent-pack.yaml`.
- [ ] Worked example: GitHub (user-controlled, per-user PAT).
- [ ] Worked example: Wise (admin-controlled + RBAC + approval).

---

## 7. Testing locally — the chapter's shape

Minimum the "Run locally" how-to must cover:

- [ ] OS prerequisites (Node 22, pnpm via corepack, Docker, ngrok authenticated).
- [ ] Step-by-step: clone → `pnpm install` → `.env` → `docker compose up -d` → `./scripts/setup.sh` → `./scripts/start.sh`.
- [ ] What `./scripts/setup.sh` actually does (VS Agent + ngrok + `veranad` CLI + ECS credentials). Link to `hologram-verifiable-services` org flow for the "why".
- [ ] Ports used (3010 app, 3002/3003 VS Agent admin/public, 6379 Redis, 5432 Postgres) and how to change them.
- [ ] Connect from the Hologram mobile app: scan the QR from `http://localhost:3003/invitation`.
- [ ] Tailing logs (`pnpm start:dev` keeps the chatbot in the foreground; `docker compose logs -f vs-agent`).
- [ ] Resetting state (`docker compose down -v`, `rm ids.env`).
- [ ] Troubleshooting matrix (ngrok tunnel expired, Postgres migrations, Redis index conflicts, stale `AGENT_PUBLIC_DID`).

---

## 8. Deploying to Kubernetes — the chapter's shape

Minimum the "Deploy to K8s" how-to must cover:

- [ ] Which chart: `hologram-generic-ai-agent-vs/charts` for AI agents, `vs-agent-chart` for pure VS (credential issuer, verifier). Picking between them.
- [ ] `helm lint` → `helm template` → `helm install --dry-run` → `helm upgrade --install` loop.
- [ ] `nameOverride` pattern for multi-tenant namespaces (every demo on `vs.hologram.zone` follows this).
- [ ] Ingress host wiring (`*.vs.hologram.zone` wildcard + per-service subdomain).
- [ ] Secrets: LLM API key, `MCP_CONFIG_ENCRYPTION_KEY`, Postgres password — recommended to use Kubernetes Secret refs, not inline values.
- [ ] Pointing the chatbot at a pre-existing VS Agent (`ORG_VS_PUBLIC_URL` / `ORG_VS_ADMIN_URL`) vs bundling one.
- [ ] CI/CD: the `hologram-verifiable-services` pattern — one GHA workflow per service, `deploy` → `get-credentials` → `deploy-chatbot` → `all`.
- [ ] Upgrading: image tag pinning, `helm rollback`, what migrations exist.

---

## 9. Site infrastructure tasks

| # | Task | Priority |
|---|------|----------|
| I.1 | Rewrite `README.md` (repo-specific, not Docusaurus boilerplate) | P0 |
| I.2 | Decide: keep versions dropdown or drop it; if keeping, cut `v1.0` now | P1 |
| I.3 | Bump Node in `.github/workflows/deploy.yml` from 18 → 20 | P1 |
| I.4 | Add a `build.yml` PR-gate workflow that runs `npm run build` with `onBrokenLinks: 'throw'` on every PR (currently only on push to main) | P1 |
| I.5 | Configure Algolia DocSearch (free for OSS) or install `@easyops-cn/docusaurus-search-local` | P1 |
| I.6 | Delete `blog/` (or disable blog plugin in `docusaurus.config.ts`) until we have real posts | P2 |
| I.7 | Audit `static/img/` — drop unused assets, ensure `hologram-docs-og.jpg` exists and matches the current branding | P2 |
| I.8 | Wire `editUrl` in Docusaurus preset so each page has an "Edit this page" link pointing at the repo | P2 |
| I.9 | Add `showLastUpdateAuthor: true` and `showLastUpdateTime: true` once content stabilises | P3 |
| I.10 | Add a `CONTRIBUTING.md` (move the current `99-help.md` PlantUML/autogen notes there) | P2 |
| I.11 | Add a `llms.txt` / `llms-full.txt` at the site root (growing convention for LLM-friendly docs surfaces) | P3 |
| I.12 | Dark-mode check of PlantUML / Kroki diagrams (dracula Prism theme is set; diagrams render from `kroki.io` with no dark variant) | P3 |

---

## 10. Content sourcing — single source of truth per topic

When writing or updating pages, pull **canonical content** from these files rather than re-deriving:

| Topic | Canonical source |
|-------|------------------|
| Agent Pack schema | `hologram-generic-ai-agent-vs/docs/agent-pack-schema.md` |
| Env vars table | `hologram-generic-ai-agent-vs/README.md` §Environment Variables |
| RBAC + approval spec | `hologram-generic-ai-agent-vs/docs/rbac-approval-spec.md` |
| RAG how-to | `hologram-generic-ai-agent-vs/docs/how-to-use-rag-service.md` |
| Memory how-to | `hologram-generic-ai-agent-vs/docs/how-to-use-memory-service.md` |
| Ollama how-to | `hologram-generic-ai-agent-vs/docs/how-to-use-ollama.md` |
| JMS / stats integration | `hologram-generic-ai-agent-vs/docs/hologram-generic-jms-integration.md` |
| Helm chart | `hologram-generic-ai-agent-vs/charts/README.md` + `charts/values.yaml` |
| Example agent packs | `hologram-generic-ai-agent-vs/agent-packs/{hologram-welcome,github-agent,customer-service}` + `hologram-verifiable-services/{wise-agent,github-agent,x-agent}/agent-pack.yaml` |
| **Canonical starter agent (quickstart target)** | `hologram-ai-agent-example` — forkable example with Context7 MCP, avatar auth, Helm values, GHA deploy |
| **Organization + Avatar dependencies** | `hologram-ai-agent-example-deps` — trust anchor + Avatar credDef issuer, deployed to `{organization,avatar}.demos.hologram.zone` |
| Ecosystem deployment pattern | `hologram-verifiable-services/README.md` + GHA workflows |
| VS Agent primitives (issue / verify) | Current `hologram-docs/docs/build/getting-started/{10,20,30}-*.md` (needs cleanup, not rewrite) |
| Trust / VPR concepts | Current `hologram-docs/docs/learn/10-architecture.md` + `docs.verana.io` |
| Pillars / messaging | `hologram.zone-website/src/app/page.tsx` |

**Recommendation:** for anything that lives in another repo (e.g. `agent-pack-schema.md`), do not fork the content. Either:

- (a) vendor via a pre-build script that `curl`s the raw file at build time and writes to `docs/reference/agent-pack-schema.md` (simple, keeps history clean), or
- (b) add each source repo as a git submodule and symlink (heavier).

Option (a) is recommended — we already hit github.com for the `editUrl` link anyway.

---

## 11. Open questions / decisions needed

1. **Do we keep a `/next/` version path?** Currently every URL on the live site is under `/next/` because of `includeCurrentVersion: true` + `path: 'next'`. If we don't plan to cut stable versions, simplify URLs to `/docs/...` by removing `versions.current.path`.
2. **Blog or no blog?** If the Hologram announcement blog lives on `hologram.zone`, the `/blog` surface on the docs site is redundant. Recommendation: disable and redirect `/blog → hologram.zone/#news` (or wherever).
3. **Should VS Agent have its own docs site?** `vs-agent` is a reusable primitive used by both the generic AI agent and the verifiable services. It may deserve `docs.vs-agent.io` (or a top-level section here). Current stance in this plan: keep it inside `hologram-docs` as `/build/how-to/bare-vs-agent/*`.
4. **Auth for private tool calls** — is the per-tool `requiresAuth: true` flag in `LLM_TOOLS_CONFIG` the same check as `flows.authentication.required`? Doc needs to make that crisp.
5. **MCP transport matrix** — the schema hints at other transports besides `streamable-http`. What do we actually support and test? Needs a source-code audit before writing the MCP reference page.
6. **How do we recommend rotating `MCP_CONFIG_ENCRYPTION_KEY`?** Currently it's a one-way trapdoor (rotate = all users reconfigure). If there's a re-encrypt migration path, doc it; otherwise, state the limitation explicitly.
7. **Image generation + speech-to-text** — already in the agent-pack schema but not in the README. Confirm they're shipped and not gated behind a feature flag before writing reference pages.

---

## 12. Suggested execution order

Roughly two weeks of focused work if one person owns it, parallelisable across two.

**Week 1 — Phase 1 content (items 1.1 → 1.16) and site infra (I.1 → I.4).**
Ship: quickstart works, agent-pack + MCP + RBAC reachable from the nav, Helm chart documented, env-var index exists. Site builds cleanly on Node 20 with PR gating. Note: row 1.8 (quickstart) is now mostly a write-up of the existing `hologram-ai-agent-example` fork-and-go flow, not a from-scratch construction — the artifacts (agent pack, docker-compose, setup scripts, deploy workflow) already ship in that repo.

**Week 2 — Phase 2 how-tos + cookbook + CI/CD run page + search + contributing.**
Ship: a reader can reproduce each of the `vs.hologram.zone` demos from the docs alone. Search works. `onBrokenLinks` is a PR gate.

**Follow-up — Phase 3 reference completeness + polish.**
Ship: admin-API reference, webhook-event catalog, glossary, moved/renamed legacy pages with redirects, Algolia indexing.

---

## 13. Not in scope here

- Translating the docs (i18n the Docusaurus site itself). Agents are multi-language; docs are English-only for now.
- Reorganising or renaming repositories.
- Writing the `hologram.zone` marketing site content (owned by `hologram.zone-website`).
- Writing `docs.verana.io` or `docs.vs-agent.*` content.

---

*Draft for discussion. Nothing under `docs/` has been moved or modified yet — this file is purely the plan.*
