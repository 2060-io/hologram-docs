# Join Verana Testnet

This guide provides comprehensive instructions for joining the Verana testnet as a full node or pruned node.

## Overview

| Parameter | Value |
|-----------|-------|
| Chain ID | `vna-testnet-1` |
| API | `http://node1.testnet.verana.network:1317` |
| RPC | `http://node1.testnet.verana.network:26657` |
| Explorer | `https://explorer.vna-testnet-1.testnet.verana.network` |
| Faucet | `https://faucet.vna-testnet-1.devnet.verana.network` |
| Block Time | ~5 seconds |
| Max Validators | 100 |

## Hardware Requirements

| Node Type | RAM | Storage | CPU | Network |
|-----------|-----|---------|-----|---------|
| Full Node | 16GB | 500GB SSD | 4+ cores | 100+ Mbps |
| Pruned Node | 8GB | 100GB SSD | 2+ cores | 50+ Mbps |

## Getting Started

### 1. System Requirements

#### For Ubuntu 20.04 LTS or later
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y build-essential git curl wget jq
```

### 2. Install Verana

#### For Linux
```bash
# Fetch the binary manifest
curl -s https://utc-public-bucket.s3.bhs.io.cloud.ovh.net/vna-testnet-1/binaries/manifest.json > manifest.json

# Get the binary filename for your architecture
BINARY_FILE=$(jq -r '.["linux-amd64"]' manifest.json)

# Download the binary
wget https://utc-public-bucket.s3.bhs.io.cloud.ovh.net/vna-testnet-1/binaries/$BINARY_FILE

# Make it executable
chmod +x $BINARY_FILE

# Move to system path
sudo mv $BINARY_FILE /usr/local/bin/veranad

# Verify installation
veranad version
```

#### For macOS
```bash
# Fetch the binary manifest
curl -s https://utc-public-bucket.s3.bhs.io.cloud.ovh.net/vna-testnet-1/binaries/manifest.json > manifest.json

# Get the binary filename for your architecture
BINARY_FILE=$(jq -r '.["darwin-amd64"]' manifest.json)

# Download the binary
curl -O https://utc-public-bucket.s3.bhs.io.cloud.ovh.net/vna-testnet-1/binaries/$BINARY_FILE

# Make it executable
chmod +x $BINARY_FILE

# Move to system path
sudo mv $BINARY_FILE /usr/local/bin/veranad

# Verify installation
veranad version
```

### 3. Initialize Node

```bash
# Initialize the node with a custom moniker
veranad init <your-moniker> --chain-id vna-testnet-1

# Set minimum gas prices
# For Linux
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.0025uvna"/' ~/.verana/config/app.toml

# For macOS
sed -i '' 's/minimum-gas-prices = ""/minimum-gas-prices = "0.0025uvna"/' ~/.verana/config/app.toml
```

### 4. Download Genesis File

```bash
# Download the genesis file
curl -o genesis.json https://utc-public-bucket.s3.bhs.io.cloud.ovh.net/vna-testnet-1/config/genesis.json
mv genesis.json ~/.verana/config/

# Verify genesis file
veranad validate-genesis
```

### 5. Configure Seeds and Peers

Create a script to fetch and set persistent peers and seeds:

```bash
# Create a script to fetch and set persistent peers and seeds
cat > ~/update-peers.sh << 'EOF'
#!/bin/bash

# Fetch persistent peers from the manifest
PEERS=$(curl -s https://utc-public-bucket.s3.bhs.io.cloud.ovh.net/vna-testnet-1/persistent_peers/persistent_peers.json | jq -r '.persistent_peers')

# Update config.toml with the fetched peers
sed -i.bak "s/persistent_peers = .*/persistent_peers = \"$PEERS\"/" ~/.verana/config/config.toml

# Use the same peers as seeds
sed -i.bak "s/seeds = .*/seeds = \"$PEERS\"/" ~/.verana/config/config.toml

# Update mempool settings with correct numeric values
sed -i.bak "s/experimental_max_gossip_connections_to_persistent_peers = .*/experimental_max_gossip_connections_to_persistent_peers = 10/" ~/.verana/config/config.toml
sed -i.bak "s/experimental_max_gossip_connections_to_non_persistent_peers = .*/experimental_max_gossip_connections_to_non_persistent_peers = 10/" ~/.verana/config/config.toml

echo "Updated persistent peers and seeds to: $PEERS"
echo "Updated mempool settings with recommended values"
EOF

# Make the script executable
chmod +x ~/update-peers.sh

# Run the script
~/update-peers.sh
```

Edit `~/.verana/config/config.toml`:

```toml
# Configure P2P settings
[p2p]
max_num_inbound_peers = 40
max_num_outbound_peers = 20
```

### 6. Configure State Sync (Optional)

Edit `~/.verana/config/config.toml`:

```toml
[statesync]
enable = true
rpc_servers = "http://node1.testnet.verana.network:26657,http://node2.testnet.verana.network:26657"
trust_height = <current_height>
trust_hash = "<block_hash>"
trust_period = "168h0m0s"
```

### 7. Configure Pruning (Optional)

Edit `~/.verana/config/app.toml`:

```toml
# Pruning options: "default", "everything", "nothing", "custom"
pruning = "custom"
pruning-keep-recent = "100"
pruning-keep-every = "0"
pruning-interval = "10"
```

## Running the Node

### 1. Start the Node

```bash
# Start the node
veranad start
```

### 2. Running as a Service

Create a systemd service file:

```bash
sudo tee /etc/systemd/system/veranad.service > /dev/null <<EOF
[Unit]
Description=Verana Daemon
After=network-online.target

[Service]
User=$USER
ExecStart=$(which veranad) start
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable veranad
sudo systemctl start veranad
```

## Monitoring and Maintenance

### 1. Check Node Status

```bash
# Check node status
veranad status

# Check sync status
veranad status 2>&1 | jq .SyncInfo

# Check connected peers
veranad status 2>&1 | jq .NodeInfo
```

### 2. Monitor Logs

```bash
# View logs
journalctl -u veranad -f

# Filter logs by level
journalctl -u veranad -f | grep "ERROR"
```

### 3. System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop

# Monitor system resources
htop
iotop
```

## Troubleshooting

### Common Issues

1. **Node Not Syncing**
   - Check internet connection
   - Verify peers are connected
   - Check system resources
   - Review logs for errors

2. **High Resource Usage**
   - Monitor CPU and memory usage
   - Check disk I/O
   - Review network bandwidth
   - Adjust pruning settings if needed

3. **Connection Issues**
   - Check firewall settings
   - Verify port forwarding
   - Test network connectivity
   - Review peer connections

4. **State Sync Failures**
   - Verify trust height and hash
   - Check RPC server availability
   - Ensure sufficient disk space
   - Review state sync logs

## Security Considerations

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 26656/tcp  # P2P
sudo ufw allow 26657/tcp  # RPC
sudo ufw allow 1317/tcp   # API
```

### 2. System Hardening

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Install security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Backup and Recovery

### 1. Backup Configuration

```bash
# Backup node configuration
tar -czf verana-backup.tar.gz ~/.verana
```

### 2. Restore from Backup

```bash
# Restore from backup
tar -xzf verana-backup.tar.gz -C ~/
```
