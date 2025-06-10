# Issuing Credentials

Once the Ecosystem has:

- Created its **Credential Schemas** in the VPR
- Issued the corresponding **JSON Schema Credentials**
- Properly configured the `"service"` section of its **Ecosystem DID Document**

it is now possible for **registered Issuers** to issue **Verifiable Credentials** based on these schemas.

Credentials that comply with the **Verifiable Trust Specification** are referred to as **Verifiable Trust Credentials (VTC)**. These credentials must include, in their `credentialSchema` attribute, a reference to the corresponding **JSON Schema Credential** issued by the Trust Registry Ecosystem DID. This linkage ensures cryptographic proof of the schema's origin and trustworthiness.

In our previous example, that would mean and ExampleCredential should look like this example:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2"
  ],
  "id": "did:example:holder",
  "type": ["VerifiableCredential", "VerifiableTrustCredential", "ExampleCredential"],
  "issuer": "did:example:authorized-issuer",
  "credentialSubject": {
     "id": "did:example:holder",
    ...
  },
  ...
  "credentialSchema": {
    "id": "https://ecosystem/schemas-example-jsc.json",
    "type": "JsonSchemaCredential"
  }
}

```
