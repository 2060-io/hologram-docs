# Deploy on Kubernetes — Helm chart

A Hologram agent in production is a Helm release. Two charts exist, and you pick one:

| Chart | When to use |
|---|---|
| **`hologram-ai-agent-chart`** | Full AI agent: chatbot + VS Agent + Redis + PostgreSQL. This is what the [quickstart](../../build/quickstart.md) uses. Ships as OCI at `oci://registry-1.docker.io/io2060/hologram-ai-agent-chart`. |
| **`vs-agent-chart`** | Pure VS Agent primitives — credential issuers, credential verifiers, DIDComm-only services. No chatbot, no LLM. Ships at `oci://registry-1.docker.io/veranalabs/vs-agent-chart`. Used by [`hologram-sandbox-deps`](https://github.com/2060-io/hologram-sandbox-deps) for the organization and avatar services. |

This page focuses on `hologram-ai-agent-chart`. For `vs-agent-chart`, the values structure is similar but narrower — see the [chart README upstream](https://github.com/2060-io/hologram-ai-agent/blob/main/charts/README.md).

## Shape of the deployment

One release deploys:

- **chatbot** — `StatefulSet`, `io2060/hologram-ai-agent:latest`, ingress optional
- **vs-agent** — `Deployment`, `veranalabs/vs-agent:latest`, ingress **required** (public DIDComm endpoint)
- **redis** — `StatefulSet`, `redis/redis-stack-server:latest`, ClusterIP
- **postgres** — `StatefulSet`, `postgres:16-alpine`, ClusterIP, PVC-backed

A typical `deployment.yaml` for the quickstart agent, with annotations:

```yaml
chartSource: oci://registry-1.docker.io/io2060/hologram-ai-agent-chart
chartVersion: v1.13.0

global:
  domain: sandbox.hologram.zone        # Used by all templated ingress hosts

nameOverride: example-agent-chart    # Release-unique prefix; see "Multi-tenant" below

credentialDefinitionId: ''            # Filled in by the workflow from config.env

# === Chatbot ===
chatbot:
  enabled: true
  replicaCount: 1
  image:
    repository: io2060/hologram-ai-agent
    tag: latest
  port: 3003
  extraEnv:
    - name: LLM_PROVIDER
      value: openai
    - name: OPENAI_MODEL
      value: gpt-5.4-mini
    - name: VS_AGENT_ADMIN_URL
      value: 'http://example-agent.{{ .Release.Namespace }}:3000'
    - name: CREDENTIAL_DEFINITION_ID
      value: '{{ .Values.credentialDefinitionId }}'
    - name: CONTEXT7_MCP_URL
      value: 'https://mcp.context7.com/mcp'
  agentPack:
    enabled: true
    name: example-agent
    mountPath: /app/agent-packs/example-agent
    fileName: agent-pack.yaml
    existingConfigMap: example-agent-agent-pack   # You create this outside the release
  secret:
    POSTGRES_PASSWORD: placeholder                # Overridden via --set from GHA

# === VS Agent ===
vs-agent-chart:
  enabled: true
  name: example-agent
  didcommLabel: 'Hologram Example Agent'
  didcommInvitationImageUrl: 'https://hologram.zone/images/ico-hologram.png'
  eventsBaseUrl: http://example-agent-chart-chatbot:3003
  ingress:
    host: 'example-agent.{{ .Values.global.domain }}'
    tlsSecret: 'example-agent.{{ .Values.global.domain }}-cert'
  extraEnv:
    - name: AGENT_LABEL
      value: "Hologram Example Agent"
    - name: SELF_ISSUED_VTC_ORG_COUNTRYCODE
      value: "EE"
    - name: SELF_ISSUED_VTC_SERVICE_DESCRIPTION
      value: "Example Hologram AI agent with Context7 MCP"

# === Infrastructure ===
redis:
  enabled: true
  port: 6379

postgres:
  enabled: true
  database: example-agent
  user: example_agent_db
```

## Key concepts

### `nameOverride` — multi-tenant agents per namespace

Every template is prefixed with `{{ .Values.nameOverride | default .Release.Name }}`. Two releases in the same namespace with different `nameOverride` don't collide. That's how `sandbox.hologram.zone` hosts multiple agents:

```text
namespace hologram-demo
├── example-agent-chart-chatbot-0
├── example-agent-chart-redis-0
├── example-agent-chart-postgres-0
├── example-agent  (VS Agent)
├── wise-agent-chart-chatbot-0
├── wise-agent-chart-redis-0
└── wise-agent  (VS Agent)
```

Set `nameOverride` to a unique value per release.

### `global.domain` + ingress hosts

Every ingress host is templated as `<subdomain>.{{ .Values.global.domain }}`. For `sandbox.hologram.zone`, the VS Agent gets `example-agent.sandbox.hologram.zone`. You manage the wildcard TLS cert (or per-host cert) outside the release.

### Secrets — what you **must** pass

Don't put these in `deployment.yaml`. Pass them at `helm upgrade --install` time from your CI:

| Secret | Used by | Generate with |
|---|---|---|
| `chatbot.secret.OPENAI_API_KEY` | chatbot | Your OpenAI dashboard |
| `chatbot.secret.MCP_CONFIG_ENCRYPTION_KEY` | chatbot | `openssl rand -hex 32` |
| `chatbot.secret.POSTGRES_PASSWORD` + `postgres.secret.POSTGRES_PASSWORD` | chatbot + postgres | `openssl rand -hex 16` — **must match** |
| `vs-agent-chart.extraEnv[].AGENT_WALLET_KEY` | vs-agent | `openssl rand -base64 32` |
| `vs-agent-chart.extraEnv[].AGENT_WALLET_ID` | vs-agent | any stable identifier |

### The agent pack ConfigMap

The chatbot expects its `agent-pack.yaml` to be mounted from a ConfigMap. The workflow creates it from the repo:

```bash
kubectl create configmap example-agent-agent-pack \
  --namespace $NAMESPACE \
  --from-file=agent-pack.yaml=agent-pack.yaml \
  --dry-run=client -o yaml | kubectl apply -f -
```

`deployment.yaml` points the chatbot at this ConfigMap via `chatbot.agentPack.existingConfigMap`. Update the ConfigMap + `kubectl rollout restart statefulset/<name>-chatbot` to push pack changes.

## Typical deploy flow (GHA)

From the [starter's deploy workflow](https://github.com/2060-io/hologram-sandbox-agent-example/blob/main/.github/workflows/deploy.yml):

1. **Create secrets** — Postgres password + any agent-specific secret.
2. **Create the agent-pack ConfigMap** from `agent-pack.yaml`.
3. **`helm upgrade --install`** with:
   - `deployment.yaml` as values
   - Secrets injected via `--set chatbot.secret.X=…`
   - Wallet key injected via `--set vs-agent-chart.extraEnv[1].value=…`
4. **Restart the chatbot StatefulSet** so it re-reads the ConfigMap.
5. **Port-forward** to the VS Agent + organization, and programmatically obtain + link a Service credential via `common/common.sh` helpers. After this step, Hologram trust-resolution of your agent's DID will succeed.

The workflow is one-click from the Actions tab — `workflow_dispatch` with `step: all` runs the whole sequence.

## Upgrading

1. Bump `chartVersion` in `deployment.yaml` to a newer chart release.
2. Bump the container images in your pack if you want to pick up upstream fixes (they're pinned as `:latest` by default; override with `chatbot.image.tag=v1.x.y` for reproducibility).
3. Re-run the workflow. `helm upgrade --install` is idempotent; non-matching fields cause a rolling restart.

For rollbacks:

```bash
helm rollback $RELEASE_NAME -n $NAMESPACE
```

## Observability

- **Logs.** `kubectl logs -f statefulset/<release>-chatbot` and `kubectl logs -f deploy/<agent-name>` (the VS Agent).
- **Credentials / DIDComm health.** `curl https://<agent-host>/.well-known/did.json` — must resolve to a valid DID document with Linked Verifiable Presentations.
- **Statistics.** If you wire up the Hologram JMS/Artemis stats module, per-user connection/messages are emitted to your broker. See upstream [JMS integration](https://github.com/2060-io/hologram-ai-agent/blob/main/docs/hologram-generic-jms-integration.md).

## Next

- [**Local development**](../local.md) — before you deploy.
- [**Env vars**](../../reference/env-vars.md) — every variable the chatbot recognises.
- [**Schema reference**](../../reference/agent-pack-schema.md) — the YAML it consumes.
