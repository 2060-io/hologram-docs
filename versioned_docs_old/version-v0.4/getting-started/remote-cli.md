# Using Remote CLI

To interact with the Verana blockchain remotely, you can use the CLI (`veranad`) to query data and send transactions to networks like `vna-testnet-1` or `vna-mainnet-1`.

## Pre-Requisites

1. Install the Verana CLI binary on your machine:

```bash
git clone https://github.com/verana-labs/verana-blockchain.git
cd verana-blockchain
make install
```

2.	Verify installation:

```bash
veranad version
```

3. Environmnet Variables to use with documentation examples

Local environmnet
```
FAUCET_ACC="cooluser"
FAUCET_ACC_LIT=verana16mzeyu9l6kua2cdg9x0jk5g6e7h0kk8q6uadu4
CHAIN_ID="vna-local-1"
NODE_RPC=http://localhost:26657
```

betanet environmnet
```
FAUCET_ACC="faucet"
FAUCET_ACC_LIT=verana167vrykn5vhp8v9rng69xf0jzvqa3v79etmr0t2
CHAIN_ID="vna-betanet-1"
NODE_RPC=https://rpc.vna-betanet-1.devnet.verana.network
```

devnet environmnet
```
FAUCET_ACC="faucet"
FAUCET_ACC_LIT=verana167vrykn5vhp8v9rng69xf0jzvqa3v79etmr0t2
CHAIN_ID="vna-devnet-1"
NODE_RPC=http://node1.devnet.verana.network:26657
```

Testnet environmnet
```
FAUCET_ACC="faucet"
FAUCET_ACC_LIT=verana167vrykn5vhp8v9rng69xf0jzvqa3v79etmr0t2
CHAIN_ID="vna-testnet-1"
NODE_RPC=http://node1.devnet.verana.network:26657
```

## Example Commands


Query Balances on vna-testnet-1

```bash
veranad q bank balances $FAUCET_ACC_LIT \
  --node $NODE_RPC
```

Send Tokens to Another Address

```bash
veranad tx bank send <from-wallet> <to-wallet> 100000uvna \
  --chain-id $CHAIN_ID --fees 600000uvna --node $NODE_RPC \
  --gas auto --fees 600000uvna 
```

Create a Trust Registry:
```bash
veranad tx trustregistry create-trust-registry \
    did:example:123456789abcdefghi en \
    https://example.com/framework.pdf "sha256-315f5bdb76d078c43b8ac00641b2a6ea241e27fcb60e23f9e6acfa2c05b9e36a" \
    --from $FAUCET_ACC --keyring-backend test --chain-id $CHAIN_ID --node $NODE_RPC --fees 600000uvna
```

List Trust Registries:
```bash
veranad q trustregistry list-trust-registries --node $NODE_RPC
```

Query Blocks

```bash
veranad q block 100 --type=height \
  --node $NODE_RPC
```

Refer to the [Environments section](../environments/environments.md) for details on RPC endpoints for other networks.
