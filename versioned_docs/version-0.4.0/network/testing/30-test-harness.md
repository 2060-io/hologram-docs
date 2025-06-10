# Verana-test-harness

## Overview
The test-harness repository contains a test harness for the Verifiable Public Registry (VPR) specification implementation. It allows for automated testing of various customer journeys that represent typical interactions with a VPR blockchain.

## Prerequisites
- Go 1.18 or later
- A running Verana blockchain node
- Account with sufficient funds for testing

## Installation
```bash
git clone https://github.com/your-org/verana-test-harness.git
cd verana-test-harness
go mod tidy
```

## Configuration
Set up environment variables for the test harness:

```bash
export VNA_CHAIN_ID="vna-local-1"
```

To run a local development node, follow the [Isolated Local Node Guide](../run-a-node/20-local-node-isolated.md).

## Usage
To run a specific journey, use:

```bash
go run cmd/main.go [journey_id]
```