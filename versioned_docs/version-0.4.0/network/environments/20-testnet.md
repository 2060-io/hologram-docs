# Testnet


| Parameters | Value                          |
|------------|--------------------------------|
| Chain ID  | `vna-testnet-1`               |
| API       | `http://node1.testnet.verana.network:1317` |
| RPC       | `http://node1.testnet.verana.network:26657` |
| Explorer  | `http://node3.testnet.verana.network:5173` |

## Consensus Parameters

| Parameter | Value |
|-----------|-------|
| Average Block Time | ~5 seconds |
| Max Block Size | 22,020,096 bytes |
| Max Gas Per Block | Unlimited (-1) |

## Economic Parameters

| Parameter | Value |
|-----------|-------|
| Current Inflation Rate | 13% |
| Min Inflation Rate | 7% |
| Max Inflation Rate | 20% |
| Rate Change | 13% |
| Goal Bonded | 67% |
| Blocks Per Year | 6,311,520 |

## Staking Parameters

| Parameter | Value |
|-----------|-------|
| Bond Denom | uvna (micro-VNA) |
| Unbonding Time | 21 days (1,814,400s) |
| Min Commission Rate | 0% |
| Max Validators | 100 |

## Distribution Parameters

| Parameter | Value |
|-----------|-------|
| Community Tax | 2% |
| Base Proposer Reward | 0% |
| Bonus Proposer Reward | 0% |

## Governance Parameters

| Parameter | Value |
|-----------|-------|
| Min Deposit | 10,000,000 uvna |
| Expedited Min Deposit | 50,000,000 uvna |
| Voting Period | 1209600s (14 days) |
| Expedited Voting Period | 24 hours (86400s) |
| Deposit Period | 259200s (3 days) |
| Quorum | 33.4% |
| Threshold | 50% |
| Veto Threshold | 33.4% |
| Min Deposit Ratio | 1% |

## Slashing Parameters

| Parameter | Value |
|-----------|-------|
| Signed Blocks Window | 100 |
| Min Signed Per Window | 50% |
| Downtime Jail Duration | 10 minutes (600s) |
| Double Sign Slash | 5% |
| Downtime Slash | 1% |

## Verana-Specific Parameters

### Trust Parameters
| Parameter | Value |
|-----------|-------|
| Trust Unit Price | 1,000,000 uvna |
| Trust Registry Deposit | 10 units |
| Credential Schema Deposit | 10 units |
| DID Directory Deposit | 5 units |
| DID Directory Grace Period | 30 days |

### Trust Deposit Parameters
| Parameter | Value |
|-----------|-------|
| Reclaim Burn Rate | 60% |
| Share Value | 1.0 |
| Deposit Rate | 20% |
| Wallet User Agent Reward Rate | 20% |
| User Agent Reward Rate | 20% |

### Validation Parameters
| Parameter | Value |
|-----------|-------|
| Term Requested Timeout Days | 7 |
| Credential Schema Validity Periods | 3650 days (10 years) |

## Account Configuration

### Genesis Accounts
| Account Type | Address | Initial Balance | Vesting Period |
|--------------|---------|-----------------|----------------|
| Community Pool | `vna1...` | 100,000,000 VNA | N/A |
| Team Treasury | `vna1...` | 50,000,000 VNA | 24 months cliff, 36 months vesting |
| Foundation Treasury | `vna1...` | 30,000,000 VNA | 12 months cliff, 24 months vesting |
| Ecosystem Development | `vna1...` | 20,000,000 VNA | 6 months cliff, 18 months vesting |

### Multi-Signature Accounts
| Account Purpose | Address | Signers Required | Total Signers |
|-----------------|---------|------------------|---------------|
| Genesis Governance | `vna1...` | 3 of 5 | 5 |
| Team Treasury | `vna1...` | 2 of 3 | 3 |
| Foundation Treasury | `vna1...` | 2 of 3 | 3 |

### Vesting Schedules
| Account Type | Cliff Period | Vesting Period | Total Duration |
|--------------|--------------|----------------|----------------|
| Team Tokens | 24 months | 36 months | 60 months |
| Foundation Tokens | 12 months | 24 months | 36 months |
| Ecosystem Development | 6 months | 18 months | 24 months |

Note: All vesting schedules follow a linear vesting model after the cliff period. Multi-signature accounts are implemented using Cosmos SDK's multi-sig module with appropriate threshold configurations.
