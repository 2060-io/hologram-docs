
# Credential Schema Module

The Credential Schema module lets you define schemas for verifiable credentials.

### Create a Credential Schema
```bash
echo '{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "/vpr/v1/cs/js/1",
    "type": "object",
    "$defs": {},
    "properties": {
        "name": {
            "type": "string"
        }
    },
    "required": ["name"],
    "additionalProperties": false
}' > schema.json

veranad tx credentialschema create-credential-schema \
1 \
"$(cat schema.json)" \
365 \
365 \
180 \
180 \
180 \
2 \
2 \
--from $FAUCET_ACC \
--keyring-backend test \
--chain-id $CHAIN_ID \
--fees 600000uvna --node $NODE_RPC --yes
```

### List the Credential Schemas


```
veranad q credentialschema list-schemas \
--tr_id 2 \
--created_after "2024-01-01T00:00:00Z" \
--response_max_size 100 \
--output json --node $NODE_RPC
```