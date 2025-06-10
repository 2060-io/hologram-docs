
# Credential Schema Module

The Credential Schema module lets you define schemas for verifiable credentials.

### Create a Credential Schema
```bash
echo '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": ["name"]
}' > schema.json

veranad tx credentialschema create-credential-schema \
  1 "$(cat schema.json)" \
  --from user \
  --keyring-backend test \
  --chain-id test-1
```