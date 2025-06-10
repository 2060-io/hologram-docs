# DID Directory Module

The DID Directory module allows you to manage decentralized identifiers (DIDs).

### Add a DID
```bash
veranad tx diddirectory add-did \
  did:example:123456789abcdefghi \
  5 \
  --from user \
  --keyring-backend test \
  --chain-id test-1
```

### Query a DID

```bash
veranad q diddirectory get-did \
  did:example:123456789abcdefghi \
  --output json
```