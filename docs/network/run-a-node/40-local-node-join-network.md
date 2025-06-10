# Running a Local Node That Joins a Network

You can set up a local node that joins the `vna-testnet-1` or `vna-mainnet-1` networks. This allows you to participate in the network and sync with the blockchain.

## Pre-Requisites

1. Install the Verana CLI and node binary:
```bash
git clone https://github.com/verana-labs/verana-blockchain.git
cd verana-blockchain
make install
```

2.	Verify the installation:

```bash
veranad version
```



## Steps to Join vna-testnet-1

1.	Initialize the Node
```bash
veranad init "my-testnet-node" --chain-id vna-testnet-1
```


2.	Download the Genesis File

```bash
curl -o ~/.verana/config/genesis.json https://raw.githubusercontent.com/verana-labs/networks/main/vna-testnet-1/genesis.json
```


3.	Add Persistent Peers
Add the testnet peers to your ~/.verana/config/config.toml:

```bash
persistent_peers = "node-id@peer-address:26656"
```


4.	Set Minimum Gas Price
Update the ~/.verana/config/app.toml:

```bash
minimum-gas-prices = "0.01uvna"
```


5.	Start the Node

```bash
veranad start
```


Your node will now start syncing with the vna-testnet-1.

## Steps to Join vna-mainnet-1

Note: Mainnet is not deployed yet, so the following might not work yet.

1.	Follow the same steps as above but replace vna-testnet-1 with vna-mainnet-1.
2.	Download the vna-mainnet-1 genesis file:

```bash
curl -o ~/.verana/config/genesis.json https://raw.githubusercontent.com/verana-labs/networks/main/vna-mainnet-1/genesis.json
```

3.	Use the appropriate persistent peers for the mainnet.

Running as a Validator

If you want to participate in the network as a validator, follow these additional steps:

1.	Create a Validator Key

```bash
veranad tx staking create-validator \
  --amount=1000000uvna \
  --pubkey=$(veranad tendermint show-validator) \
  --moniker="<your-validator-name>" \
  --chain-id vna-testnet-1 \
  --from <your-wallet>
```


2.	Ensure the Node Is Running
Your node must remain online and synced to maintain validator status.
