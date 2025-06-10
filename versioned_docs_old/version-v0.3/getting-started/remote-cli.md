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

## Example Commands

Query Balances on vna-testnet-1

```bash
veranad q bank balances <wallet-address> \
  --node https://rpc.testnet.verana.network:443
```

Send Tokens to Another Address

```bash
veranad tx bank send <from-wallet> <to-wallet> 100000uvna \
  --chain-id vna-testnet-1 \
  --node https://rpc.testnet.verana.network:443 \
  --gas auto --fees 600000uvna 
```

Query Blocks

```bash
veranad q block 100 \
  --node https://rpc.testnet.verana.network:443
```

Refer to the Environments section for details on RPC endpoints for other networks.
