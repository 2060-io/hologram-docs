# Contributing to Hologram Docs

Thanks for helping improve the docs. This file covers the practical bits of working on the source — local setup, build/lint, content conventions, and the guardrails that keep the published site building cleanly.

For *what* to write, see [`update.md`](./update.md) — the rolling content plan that tracks gaps, sources of truth, and open questions.

## Local development

```bash
git clone git@github.com:2060-io/hologram-docs.git
cd hologram-docs
npm install
npm run start          # http://localhost:3000, hot reload
```

Node **20 or newer** is required (matches the CI gate). Use `nvm use 20` or your platform equivalent.

## Build verification

Before opening a PR, the docs must build cleanly:

```bash
npm run build
```

This runs Docusaurus with `onBrokenLinks: 'throw'` and `onBrokenAnchors: 'throw'`. Any broken cross-link or fragment fails the build. The same command runs as a PR gate via [`.github/workflows/build.yml`](./.github/workflows/build.yml) — your PR cannot merge until it passes.

If the build fails locally, the most common causes are:

- A relative link to a moved page → fix the path.
- An anchor that no longer exists → fix the heading or update the anchor.
- An MDX parse error from un-escaped `<` or `>` in code-adjacent text → wrap in backticks or fence as a code block.

## Content conventions

### Information architecture

The site has four top-level sections, each with its own sidebar:

- **`/learn`** — concepts. Read once, understand the model.
- **`/build`** — hands-on. Quickstart, agent-pack reference, how-tos, cookbook.
- **`/run`** — deploy and operate. Local, Kubernetes, CI/CD.
- **`/reference`** — exhaustive lookups. Schemas, env vars, APIs, glossary.

A new page belongs in **`/build/how-to`** if it answers "how do I X?", **`/build/cookbook`** if it walks through a complete real agent end-to-end, and **`/build/agent-pack/<topic>.md`** if it documents one block of the agent-pack manifest.

### Style

- **Frontmatter** is optional. Pages without frontmatter use the H1 as title and inherit a position from the sidebars file. Add frontmatter only when you need a non-default title or sidebar position.
- **Heading levels** start at H1 (one per page) and never skip. Use sentence case for headings.
- **Code blocks** must declare a language (` ```yaml `, ` ```bash `, ` ```ts `) so syntax highlighting works.
- **Cross-links** are relative paths to `.md` files (Docusaurus rewrites them at build): `[**RBAC**](../agent-pack/rbac.md)`. Anchors use the auto-generated slug from the heading: `[**access modes**](./mcp.md#access-modes)`.
- **External links** open in the same tab unless they're explicitly an external service (DocSearch, GitHub deeply linked into a file → fine to leave default-target).
- **Tables** use the GFM pipe form. The MD060 lint warning about whitespace is ignored — Docusaurus renders both compact and padded tables identically.
- **Admonitions** (`:::note`, `:::tip`, `:::warning`, `:::danger`) are the supported callout style. Don't invent your own block format.

### Diagrams

Two options:

1. **Plain code-block ASCII** for sequence-style diagrams. Renders fine on every theme. Used in most pages.
2. **Kroki / PlantUML via the `remark-kroki` plugin** for anything that benefits from a real diagram. Wrap the source in a ` ```plantuml ` block and the build will fetch a rendered SVG from `kroki.io`.

PlantUML themes don't have a dark-mode variant (yet), so an SVG generated for the light theme will look slightly off in dark mode. Acceptable for now.

### Source-of-truth pages

A few pages are **vendored from upstream repos** (currently just `docs/reference/agent-pack-schema.md`, sourced from [`hologram-generic-ai-agent-vs/docs/agent-pack-schema.md`](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/agent-pack-schema.md)). When upstream changes:

1. Re-paste the file content.
2. Wrap any unquoted generics (`map<string,string>`) in backticks so MDX doesn't choke.
3. Bump the banner at the top to mention the new commit ref if you want pinning.

The same page **must not** be edited locally except for the MDX-safety wrapping in step 2 — locally-introduced drift breaks the source-of-truth invariant.

### What canonical sources to use

When writing a new page, prefer to base your content on:

- **Agent Pack schema** → [`hologram-generic-ai-agent-vs/docs/agent-pack-schema.md`](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/agent-pack-schema.md).
- **Env vars** → [`hologram-generic-ai-agent-vs/README.md`](https://github.com/2060-io/hologram-generic-ai-agent-vs#environment-variables) §Environment Variables.
- **RBAC + approval spec** → [`hologram-generic-ai-agent-vs/docs/rbac-approval-spec.md`](https://github.com/2060-io/hologram-generic-ai-agent-vs/blob/main/docs/rbac-approval-spec.md).
- **RAG / Memory / Ollama how-tos** → the matching files in [`hologram-generic-ai-agent-vs/docs/`](https://github.com/2060-io/hologram-generic-ai-agent-vs/tree/main/docs).
- **Helm chart** → [`hologram-generic-ai-agent-vs/charts/`](https://github.com/2060-io/hologram-generic-ai-agent-vs/tree/main/charts).
- **Per-agent CI/CD pattern** → [`hologram-verifiable-services`](https://github.com/2060-io/hologram-verifiable-services) workflows.
- **Admin API / webhook events** → [`vs-agent/doc/vs-agent-api.md`](https://github.com/2060-io/vs-agent/blob/main/doc/vs-agent-api.md).
- **Pillars / messaging** → [`hologram.zone-website/src/app/page.tsx`](https://github.com/2060-io/hologram.zone-website/blob/main/src/app/page.tsx) (the marketing site is the source for the four pillars).

If you find yourself re-deriving content that lives in one of these — stop and reference the canonical source instead. Drift between the docs and these repos is the most common kind of staleness.

## Proposing changes

The repo lives at <https://github.com/2060-io/hologram-docs>.

1. **Open an issue** before any non-trivial change — it's faster to align scope than to rewrite a PR.
2. **Branch from `main`** — `feat/<topic>` for new content, `fix/<topic>` for corrections, `chore/<topic>` for infra.
3. **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(docs): …`, `fix(docs): …`, `chore: …`. Multi-line messages are encouraged for content PRs — the first line goes into the changelog, the body explains the *why*.
4. **PR titles** mirror the commit subject. Body should describe the change in 2–5 lines and link the issue.
5. **Build must pass.** The CI gate runs `npm run build`; broken links or anchors fail.

## Repository layout

```text
hologram-docs/
├─ docs/                 # The site content. Four sidebars, one folder each.
│  ├─ learn/             # /learn — concepts.
│  ├─ build/             # /build — hands-on.
│  │  ├─ agent-pack/     # Agent-pack section reference.
│  │  ├─ how-to/         # Task-focused recipes.
│  │  ├─ cookbook/       # End-to-end agent walkthroughs.
│  │  └─ advanced/       # Bare VS Agent territory.
│  ├─ run/               # /run — deployment + ops.
│  └─ reference/         # /reference — exhaustive lookups.
├─ src/                  # Site components (homepage, custom React).
├─ static/               # Assets served verbatim.
│  ├─ img/               # Diagrams + screenshots.
│  └─ llms.txt           # LLM-friendly docs index.
├─ docusaurus.config.ts  # Site config.
├─ sidebars.ts           # Sidebar definitions (one per top-level section).
└─ update.md             # Rolling content plan.
```

The published site (build output) goes to `build/`, gitignored. Don't commit it.

## Deployment

The site is built and deployed to GitHub Pages by [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) on every push to `main`. There's no preview environment for PRs — the build gate (`build.yml`) is the substitute. If a PR build is green, the eventual production deploy will be too.

## Questions / discussion

Open an issue, tag the right folks, or jump in `#docs` on the Hologram Discord.
