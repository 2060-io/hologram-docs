# Debugging CLI and Nodes

Key commands for debugging:

### View Logs
```bash
veranad start
```

### Query Balances

```bash
veranad q bank balances <address>
```

### Inspect Transactions

```bash
veranad q txs --query "tx.height=57"
```