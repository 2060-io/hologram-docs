# hologram-docs

Source for [docs.hologram.zone](https://docs.hologram.zone) — the documentation site for building, running, and operating Hologram Verifiable AI Agents.

Built with [Docusaurus 3](https://docusaurus.io/), served from GitHub Pages, deployed automatically on push to `main`.

## Content layout

```text
docs/
  learn/        Concepts — what Hologram is, agents, the trust model
  build/        Hands-on — quickstart, agent-pack reference, how-tos, cookbook
  run/          Deploy & operate — local, Kubernetes, CI/CD, observability
  reference/    Reference — agent-pack schema, env vars, admin API, glossary
```

See [`update.md`](./update.md) for the canonical content plan.

## Local development

Prerequisites: Node 20 (LTS) and npm.

```bash
npm ci
npm start              # http://localhost:3000/ with hot reload
npm run build          # production build into ./build
npm run serve          # serve the production build locally
```

The build is configured with `onBrokenLinks: 'throw'`, so any broken internal link fails CI.

## Content sourcing

Several reference pages mirror files from other 2060-io repos rather than re-deriving content. Canonical sources are tracked in [`update.md` §10](./update.md#10-content-sourcing--single-source-of-truth-per-topic) — if you touch one of those repos, refresh the mirror here as part of the same PR.

Key upstream repos:

- [`2060-io/hologram-ai-agent`](https://github.com/2060-io/hologram-ai-agent) — the agent container + Helm chart (source of truth for the agent-pack schema, env vars, RBAC spec).
- [`2060-io/hologram-sandbox-agent-example`](https://github.com/2060-io/hologram-sandbox-agent-example) — canonical forkable starter agent (source of truth for the quickstart).
- [`2060-io/hologram-sandbox-deps`](https://github.com/2060-io/hologram-sandbox-deps) — its organization + avatar dependencies.

## Contributing

- Write in `.md` (or `.mdx` when you need JSX). Use PlantUML inside `` ```plantuml `` fences — rendered via [Kroki](https://kroki.io).
- Every PR runs the Docusaurus build (`.github/workflows/build.yml`); broken links block the merge.
- Every page has an **Edit this page** link pointing back at `edit/main/<path>` — keep it accurate.

## Deployment

- `push` to `main` → GitHub Actions builds + publishes to GitHub Pages (`.github/workflows/deploy.yml`).
- Custom domain is set via `CNAME` (→ `docs.hologram.zone`).

## License

Apache-2.0 (see [`LICENSE`](./LICENSE)).
