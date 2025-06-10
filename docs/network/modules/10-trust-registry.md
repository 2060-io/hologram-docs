# Trust Registry Module

The Trust Registry module lets you manage governance frameworks.

Refer to the [Environments section](../environments/10-environments.md) for details on RPC endpoints to target the correct network.
Setup [Environments variable](../run-a-node/30-remote-cli.md) for specific RPC endpoints to target the correct network.

### Create a Trust Registry
```bash
veranad tx trustregistry create-trust-registry \
  did:example:123456789abcdefghi en \
  https://example.com/framework.pdf "sha256-315f5bdb76d078c43b8ac00641b2a6ea241e27fcb60e23f9e6acfa2c05b9e36a" \
  --from $FAUCET_ACC --keyring-backend test --chain-id $CHAIN_ID --fees 600000uvna --node $NODE_RPC --yes
```

Query a Trust Registry

```bash
veranad q trustregistry get-trust-registry 1 --node $NODE_RPC --output json
```

Query a list of Trust Registries

```bash
veranad q trustregistry list-trust-registries --node $NODE_RPC  --output json
```

