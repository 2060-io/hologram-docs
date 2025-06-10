# Credential Schema Permissions

Define and manage permissions for credential schemas.

### Create Permissions
```bash
veranad tx cspermission create-credential-schema-perm \
  1 \
  1 \
  "did:example:123" \
  verana1... \
  --from user \
  --keyring-backend test \
  --chain-id test-1
```