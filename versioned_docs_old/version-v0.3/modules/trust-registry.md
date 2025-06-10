# Trust Registry Module

The Trust Registry module lets you manage governance frameworks.

### Create a Trust Registry
```bash
veranad tx trustregistry create-trust-registry \
  did:example:123456789abcdefghi \
  "http://example.com" \
  en \
  https://example.com/framework.pdf \
  --from user --keyring-backend test --chain-id test-1
```

Query a Trust Registry

```bash
veranad q trustregistry get-trust-registry <tr_id> --output json
```