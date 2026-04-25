# CI/CD

The reference deployment pattern for a Hologram agent on Kubernetes. Used by every agent on `demos.hologram.zone`. Lives in [`hologram-verifiable-services`](https://github.com/2060-io/hologram-verifiable-services), per-agent under `.github/workflows/`.

This page distils that pattern. The local-dev story is in [**Run locally**](./local.md); the chart anatomy is in [**Helm chart**](./kubernetes/helm-chart.md).

## What "deploy" actually means

A "deploy" of a Hologram agent is **not** just `helm upgrade`. The chart bring-up is one step; making the agent trust-resolvable on Hologram requires more. The full sequence:

1. **Bootstrap secrets.** Postgres password, OpenAI key, MCP encryption key, wallet key.
2. **Build agent-pack ConfigMap.** The chatbot reads `agent-pack.yaml` from a ConfigMap at runtime.
3. **(Optional) Deploy MCP sidecar.** For agents bringing their own MCP server (Wise, X), a sidecar `Deployment` + `Service` is created in the same namespace.
4. **Helm upgrade.** Install or upgrade `hologram-generic-ai-agent-chart` with secrets injected via `--set`.
5. **Restart chatbot.** Force a rollout so it picks up agent-pack ConfigMap changes.
6. **Issue Service credential.** Port-forward to both the agent's VS Agent and the organization VS Agent. The org issues a Service credential to the agent and the agent links it on its DID document. After this, Hologram trust-resolves the agent.
7. **Summary.** Print the public DID URL, chart version, network.

The whole thing runs as a `workflow_dispatch` GitHub Action with one input — `step` — that lets you run individual phases (`deploy`, `get-credentials`, or `all`).

## Anatomy of a deploy workflow

Every per-agent workflow follows this template (e.g. [`4_deploy-wise-agent.yml`](https://github.com/2060-io/hologram-verifiable-services/blob/main/.github/workflows/4_deploy-wise-agent.yml)):

### 1. Trigger

```yaml
on:
  workflow_dispatch:
    inputs:
      step:
        type: choice
        options: [deploy, get-credentials, all]
        default: all
```

`workflow_dispatch` only — never on push. Deploy is an explicit, audited operation. The `step` input lets you re-run just the credential phase if the chart bring-up succeeded but credential issuance flaked.

### 2. Branch + config gate

```yaml
- name: Validate branch
  run: |
    if [ "${GITHUB_REF_NAME}" != "main" ]; then
      echo "::error::This workflow can only run on the main branch"
      exit 1
    fi
    echo "NETWORK=testnet" >> "$GITHUB_ENV"

- name: Load configuration
  run: |
    set -a; source <agent>/config.env; set +a
    while IFS= read -r line; do
      key="${line%%=*}"
      echo "${key}=${!key}" >> "$GITHUB_ENV"
    done < <(grep -E '^[A-Z_]+=' <agent>/config.env)
```

`config.env` lives in the agent's folder and holds non-secret deployment settings (chart name, public URL, organization settings). Secrets come from GitHub Secrets — never `config.env`.

### 3. Parse `deployment.yaml` for chart metadata

```yaml
- name: Parse deployment.yaml
  run: |
    CHART_SOURCE=$(yq '.chartSource' <agent>/deployment.yaml)
    CHART_VERSION=$(yq '.chartVersion' <agent>/deployment.yaml)
    RELEASE_NAME=$(yq '.nameOverride' <agent>/deployment.yaml)
    echo "CHART_SOURCE=${CHART_SOURCE}" >> "$GITHUB_ENV"
    ...
```

The chart and version come from the agent's `deployment.yaml` — that file is the single source of truth.

### 4. K8s + Verana CLI setup

```yaml
- name: Set up kubeconfig
  run: |
    mkdir -p ~/.kube
    echo "${{ secrets.OVH_KUBECONFIG }}" > ~/.kube/config

- uses: azure/setup-kubectl@v4
  with:
    version: 'v1.29.9'

- name: Install veranad
  run: |
    curl -sfL "https://github.com/verana-labs/verana/releases/download/v0.9.4/veranad-linux-amd64" \
      -o /usr/local/bin/veranad
    chmod +x /usr/local/bin/veranad

- name: Import account from mnemonic
  run: echo "${{ secrets.VS_DEMO_MNEMONIC }}" | veranad keys add "${USER_ACC}" --recover --keyring-backend test
```

`veranad` is needed only for the credential-issuance phase (it queries the Verana trust registry to find the right schema URLs). Skip if you're not on Verana.

### 5. Secrets

```yaml
- name: Create K8s secrets
  if: inputs.step == 'deploy' || inputs.step == 'all'
  run: |
    kubectl create secret generic <agent>-db-secret \
      --namespace "$NAMESPACE" \
      --from-literal=POSTGRES_PASSWORD="${{ secrets.AGENT_VSAGENT_DB_PASSWORD }}" \
      --dry-run=client -o yaml | kubectl apply -f -
```

Idempotent (`--dry-run=client | kubectl apply`). Reapplied every deploy; safe.

### 6. Agent-pack ConfigMap

```yaml
- name: Create agent pack ConfigMap
  run: |
    kubectl create configmap <agent>-agent-pack \
      --namespace "$NAMESPACE" \
      --from-file=agent-pack.yaml=<agent>/agent-pack.yaml \
      --dry-run=client -o yaml | kubectl apply -f -
```

The chatbot mounts this ConfigMap at the path declared in `deployment.yaml → chatbot.agentPack.mountPath`. Editing `agent-pack.yaml` in the repo + re-running this step + restarting the chatbot is the standard "roll out a config change" loop.

### 7. (Optional) MCP sidecar

For agents bringing their own MCP server:

```yaml
- name: Deploy MCP sidecar
  run: |
    kubectl apply -f - <<EOF
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: <agent>-mcp-<service>
    spec:
      replicas: 1
      template:
        spec:
          containers:
            - name: mcp
              image: io2060/mcp-<service>:<version>
              ports: [{ containerPort: 14101 }]
              env:
                - name: MODE
                  value: "http"
    ---
    apiVersion: v1
    kind: Service
    ...
    EOF
    kubectl rollout restart deployment/<agent>-mcp-<service> -n "$NAMESPACE"
```

Wise, X, and other agents that depend on a 2060-built MCP shim do this. The chatbot's `WISE_MCP_URL` then points at the sidecar's `Service` DNS name.

### 8. Helm upgrade

```yaml
- name: Deploy via Helm
  run: |
    yq 'del(.chartSource, .chartVersion)' <agent>/deployment.yaml > /tmp/helm-values.yaml

    yq -i '.credentialDefinitionId = env(CREDENTIAL_DEFINITION_ID)' /tmp/helm-values.yaml

    helm upgrade --install "$RELEASE_NAME" "$CHART_SOURCE" \
      --version "$CHART_VERSION" \
      --namespace "$CHART_NAMESPACE" --create-namespace \
      --values /tmp/helm-values.yaml \
      --set chatbot.secret.OPENAI_API_KEY="${{ secrets.AGENT_OPENAI_API_KEY }}" \
      --set chatbot.secret.MCP_CONFIG_ENCRYPTION_KEY="${{ secrets.AGENT_MCP_CONFIG_ENCRYPTION_KEY }}" \
      --set chatbot.secret.POSTGRES_PASSWORD="${{ secrets.AGENT_POSTGRES_PASSWORD }}" \
      --set postgres.secret.POSTGRES_PASSWORD="${{ secrets.AGENT_POSTGRES_PASSWORD }}" \
      --set vs-agent-chart.extraEnv[0].name=AGENT_WALLET_ID \
      --set vs-agent-chart.extraEnv[0].value="<Agent Display Name>" \
      --set vs-agent-chart.extraEnv[1].name=AGENT_WALLET_KEY \
      --set vs-agent-chart.extraEnv[1].value="${{ secrets.AGENT_WALLET_KEY }}" \
      --wait --timeout 300s
```

Two important details:

- **`yq 'del(.chartSource, .chartVersion)'`** strips the chart-metadata block from `deployment.yaml` before passing to Helm — those keys aren't valid chart values.
- **Secrets via `--set`** keeps them out of any committed file.

### 9. Force chatbot rollout

```yaml
- name: Restart chatbot to pick up ConfigMap changes
  run: |
    kubectl rollout restart statefulset/<release>-chatbot -n "$CHART_NAMESPACE"
    kubectl rollout status statefulset/<release>-chatbot -n "$CHART_NAMESPACE" --timeout=120s
```

`helm upgrade` only restarts pods if the chart values changed. Editing the agent-pack ConfigMap doesn't trigger a restart automatically — this step does.

### 10. Service-credential issuance

```yaml
- name: Port-forward agent VS Agent
  run: |
    kubectl port-forward -n "$NAMESPACE" "svc/<agent>" 3002:3000 &
    echo "CHILD_PF_PID=$!" >> "$GITHUB_ENV"
    sleep 5

- name: Port-forward organization Agent
  run: |
    kubectl port-forward -n "$NAMESPACE" "svc/organization" 3000:3000 &
    echo "ORG_PF_PID=$!" >> "$GITHUB_ENV"
    sleep 5

- name: Get Service credential
  run: |
    source common/common.sh
    set_network_vars "$NETWORK"

    CHILD_DID=$(curl -sf "http://localhost:3002/v1/agent" | jq -r '.publicDid')

    if has_linked_vp "$CHILD_PUBLIC_URL" "service"; then
      ok "Service credential already linked — skipping"
    else
      SERVICE_VTJSC_OUTPUT=$(discover_ecs_vtjsc "$ECS_TR_PUBLIC_URL" "service")
      SERVICE_JSC_URL=$(echo "$SERVICE_VTJSC_OUTPUT" | sed -n '1p')

      SERVICE_CLAIMS=$(jq -n \
        --rawfile logo /tmp/service_logo_data_uri \
        --arg id "$CHILD_DID" \
        --arg name "$SERVICE_NAME" \
        --arg type "${SERVICE_TYPE:-AIAgent}" \
        --arg desc "$SERVICE_DESCRIPTION" \
        '{id: $id, name: $name, type: $type, description: $desc, logo: $logo}')

      issue_remote_and_link "$ORG_ADMIN_API" "$CHILD_ADMIN_API" "service" \
        "$SERVICE_JSC_URL" "$CHILD_DID" "$SERVICE_CLAIMS"
    fi
```

What this does, briefly:

- Reads the agent's public DID from its admin API.
- Looks up the right VPR-published JSON schema for "service" credentials via `discover_ecs_vtjsc` (defined in `common/common.sh`).
- Constructs claims (name, type, logo, description).
- Calls the **organization** VS Agent's API to issue the credential to the **agent** VS Agent over DIDComm.
- The agent VS Agent accepts the credential and links it as a Verifiable Presentation on its DID document.

After this step, anyone resolving the agent's DID via Hologram's trust resolver gets back a DID document with a signed Linked VP — the agent is now visible as a trusted Verifiable Service.

### 11. Cleanup + summary

```yaml
- name: Stop port-forwards
  if: always()
  run: |
    [ -n "${CHILD_PF_PID:-}" ] && kill "$CHILD_PF_PID" || true
    [ -n "${ORG_PF_PID:-}" ] && kill "$ORG_PF_PID" || true

- name: Summary
  if: always()
  run: |
    echo "## <Agent Name>" >> "$GITHUB_STEP_SUMMARY"
    echo "- VS Agent: https://<agent>.<domain>/.well-known/did.json" >> "$GITHUB_STEP_SUMMARY"
    echo "- Network: testnet" >> "$GITHUB_STEP_SUMMARY"
    echo "- Chart: ${CHART_SOURCE}:${CHART_VERSION}" >> "$GITHUB_STEP_SUMMARY"
```

The summary is what you see in the Actions tab after a deploy — a one-screen recap with the public DID URL.

## Layered deps

For agents that depend on shared infra (organization VS, avatar VS), the deps deploy first, then the per-agent workflows. The numbering convention in the workflow filenames (`1_deploy-organization`, `2_deploy-avatar`, `3_deploy-github-agent`, …) is a hint at the order — though they don't auto-chain, you trigger them by hand.

The full ordering for `demos.hologram.zone`:

1. `1_deploy-organization.yml` — issues credentials, governs the trust hierarchy.
2. `2_deploy-avatar.yml` — issues avatar credentials to Hologram users.
3. `3_…` through `7_…` — per-agent workflows, each independent.

If a dependency changes (org chart upgrade, network reset), the per-agent workflows auto-reuse the still-current credentials on next deploy thanks to the `has_linked_vp` early-out.

## Required GitHub Secrets

Per agent (replace `AGENT` with the actual prefix):

| Secret | Purpose |
|---|---|
| `OVH_KUBECONFIG` | Cluster access |
| `K8S_NAMESPACE` | Target namespace |
| `VS_DEMO_MNEMONIC` | Verana account mnemonic for issuing credentials |
| `AGENT_OPENAI_API_KEY` | LLM provider key |
| `AGENT_MCP_CONFIG_ENCRYPTION_KEY` | AES-256-GCM key (`openssl rand -hex 32`) |
| `AGENT_POSTGRES_PASSWORD` | Used by both chatbot + postgres |
| `AGENT_VSAGENT_DB_PASSWORD` | VS Agent's own Postgres password (separate db) |
| `AGENT_WALLET_KEY` | VS Agent wallet encryption key |
| `AGENT_…` | Agent-specific (Wise token, X creds, etc.) |

## Adapting for your stack

This is the OVH + 2060 pattern. To adapt:

- **Different cluster.** Replace `OVH_KUBECONFIG` with whatever provider you use; the rest of the workflow is portable.
- **Skip Verana / `veranad`.** The credential-issuance phase is opt-in. If you only need a chatbot deployment without Hologram trust resolution, you can stop after step 9 (helm upgrade + restart). Users still connect over DIDComm; they just won't see the Verifiable Service stamp in their app.
- **GitOps instead.** Replace `helm upgrade --install` with an ArgoCD `Application` pointing at the chart. Same values structure, different control loop.

## Next

- [**Helm chart**](./kubernetes/helm-chart.md) — what the chart actually deploys.
- [**Run locally**](./local.md) — same stack, dev tooling.
- [**Cookbook — Wise agent**](../build/cookbook/wise-agent.md) — full deploy story for an MCP-sidecar agent.
