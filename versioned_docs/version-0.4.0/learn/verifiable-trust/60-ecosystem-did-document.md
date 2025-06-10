# Ecosystem DID Document

Finally, the Ecosystem must publish both the **JSON Schema Credential** and the **location of the Trust Registry** within the **DID Document** associated with the declared **Trust Registry Ecosystem DID** in the VPR.

This ensures that the Credential Schema and its controlling Trust Registry are publicly discoverable and cryptographically verifiable.

```json
"service": [
    {
      "id": "did:example:ecosystem#vpr-schemas-example-jsc-vp",
      "type": "LinkedVerifiablePresentation",
      "serviceEndpoint": ["https://ecosystem/schemas-example-jsc-vp.json"]
    },
    {
      "id": "did:example:trust-registry#vpr-schemas-trust-registry-1234",
      "type": "VerifiablePublicRegistry",
      "version": "1.0",
      "serviceEndpoint": ["vpr:verana:mainnet"]
    }
    ...
  ]
```
