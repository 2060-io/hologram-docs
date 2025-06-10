# Join as a Validator

This guide provides comprehensive instructions for joining the Verana testnet as a validator.

## What is a Validator?

Validators are responsible for committing new blocks to the blockchain through an automated voting process. They participate in consensus by voting on blocks and are rewarded for their service. A validator's stake can be slashed if they:
- Become unavailable
- Sign blocks at the same height (double-signing)
- Violate network rules

## Prerequisites

- A running full node (see [Join Testnet](./50-join-testnet.md))
- At least 1,000,000 VNA tokens for self-delegation
- A secure server with the following specifications:
  - 32GB RAM
  - 4+ CPU cores
  - 1TB+ SSD storage
  - Reliable internet connection (100+ Mbps)
  - Static IP address
  - 99.9% uptime

## Environment Parameters

| Parameter | Value |
|-----------|-------|
| Chain ID | `vna-testnet-1` |
| API | `http://node1.testnet.verana.network:1317` |
| RPC | `http://node1.testnet.verana.network:26657` |
| Explorer | `https://explorer.vna-testnet-1.testnet.verana.network` |
| Faucet | `https://faucet.vna-testnet-1.devnet.verana.network` |

## Security Considerations

### Sentry Node Architecture

We strongly recommend implementing a sentry node architecture to protect your validator from DDoS attacks:

```
                    +----------------+
                    |                |
                    |  Sentry Node 1 |
                    |                |
                    +----------------+
                           ^
                           |
                           v
+----------------+  +----------------+  +----------------+
|                |  |                |  |                |
|  Sentry Node 2 |->|  Validator     |<-|  Sentry Node 3 |
|                |  |                |  |                |
+----------------+  +----------------+  +----------------+
```

### Key Management

1. **Separate Keys**: Keep your validator key separate from your node
2. **Hardware Security**: Use a hardware wallet for the validator key
3. **Backup**: Regularly backup your keys and configuration
4. **Access Control**: Implement strict access controls to your validator server

## Create Validator

### 1. Create a New Account

```bash
# Create a new key
veranad keys add <key-name>
```

Save the mnemonic phrase securely. You'll need it to recover your account.

### 2. Get Testnet Tokens

Request testnet tokens from the [Verana Faucet](https://faucet.vna-testnet-1.devnet.verana.network).

### 3. Create Validator Transaction

```bash
veranad tx staking create-validator \
  --amount=1000000uvna \
  --pubkey=$(veranad tendermint show-validator) \
  --moniker="<your-moniker>" \
  --chain-id=vna-testnet-1 \
  --commission-rate="0.10" \
  --commission-max-rate="0.20" \
  --commission-max-change-rate="0.01" \
  --min-self-delegation="1000000" \
  --gas="auto" \
  --gas-adjustment=1.5 \
  --from=<key-name>
```

Note: The commission-max-change-rate is used to measure % point change over the commission-rate. For example, 1% to 2% is a 100% rate increase, but only 1 percentage point.

## Validator Operations

### Edit Validator Description

```bash
veranad tx staking edit-validator \
  --moniker="<new-moniker>" \
  --website="https://your-website.com" \
  --identity="<keybase-identity>" \
  --details="Your validator description" \
  --commission-rate="0.10" \
  --from=<key-name> \
  --chain-id=vna-testnet-1
```

### View Validator Information

```bash
# View validator details
veranad query staking validator $(veranad keys show <key-name> --bech val -a)

# Check voting power
veranad status | grep voting_power

# View signing information
veranad query slashing signing-info $(veranad tendermint show-validator)
```

### Unjail Validator

If your validator gets jailed:

```bash
veranad tx slashing unjail --from=<key-name> --chain-id=vna-testnet-1
```

## System Configuration

### 1. Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 26656/tcp  # P2P
sudo ufw allow 26657/tcp  # RPC
sudo ufw allow 1317/tcp   # API
```

### 2. Set Up Monitoring

Install and configure monitoring tools:

```bash
# Install Prometheus
sudo apt-get install prometheus

# Install Node Exporter
sudo apt-get install prometheus-node-exporter

# Install Grafana
sudo apt-get install grafana
```

### 3. Configure System Limits

Create or edit `/etc/security/limits.conf`:

```
* soft nofile 65535
* hard nofile 65535
```

## Maintenance

### Backup

Regularly backup your validator's state:

```bash
# Backup the validator state
tar -czf validator-backup.tar.gz ~/.verana

# Backup keys
veranad keys export <key-name> --unarmored-hex --unsafe > validator-key.txt
```

### Updates

When network upgrades are announced:

1. Monitor the [Verana Discord](https://discord.gg/verana) for announcements
2. Update your node software
3. Restart your validator

### Graceful Shutdown

To halt your validator at a specific height:

```bash
veranad start --halt-height <height>
```

## Troubleshooting

### Common Issues

1. **Validator Not in Active Set**
   - Check if you have enough voting power
   - Verify your commission rate is competitive
   - Ensure your node is fully synced
   - Check if you're in the top 100 validators by voting power

2. **Node Not Syncing**
   - Check your internet connection
   - Verify your peers are connected
   - Check system resources (CPU, RAM, disk space)
   - Review logs for errors: `journalctl -u veranad -f`

3. **Validator Jailed**
   - Check for double-signing
   - Verify uptime
   - Check system time synchronization
   - Review slashing parameters

4. **High Resource Usage**
   - Monitor system resources
   - Check for memory leaks
   - Verify disk I/O performance
   - Review network bandwidth usage

## Best Practices

1. **Regular Maintenance**
   - Monitor system resources
   - Check validator status
   - Review logs for errors
   - Update software regularly

2. **Security**
   - Keep software updated
   - Use strong passwords
   - Implement firewall rules
   - Regular security audits

3. **Performance**
   - Monitor voting power
   - Track missed blocks
   - Check commission rates
   - Review delegations
