# VS Agent admin API

The **VS Agent admin API** is the HTTP/REST surface that a controller (your chatbot, your backend, your script) uses to talk to a VS Agent. Send messages, query connections, manage credential types — all the agent-control verbs.

This page summarises the most-used endpoints and message types. The **canonical reference** is [`vs-agent/doc/vs-agent-api.md`](https://github.com/2060-io/vs-agent/blob/main/doc/vs-agent-api.md) — refer to it for exhaustive payload schemas.

## Where it lives

By default the admin API listens on port **3000** (override with `ADMIN_PORT`). When the agent is up:

| Surface | Default URL | Purpose |
|---|---|---|
| Admin REST API | `http://localhost:3000` | Send messages, query state, manage VC types |
| Public DIDComm | `http://localhost:3001` | Receive DIDComm from other agents (this is what `AGENT_PUBLIC_DID` resolves to) |
| Swagger UI | `http://localhost:3000/api` | Interactive API explorer |

In Kubernetes the admin API is exposed as `Service: <agent>-vs-agent` on port 3000, **not** ingress-exposed (it's an internal control plane). The chatbot reaches it via cluster DNS at `http://<agent>-vs-agent:3000`.

## Endpoint groups

### Messaging — `/v1/message`

Send a DIDComm message to a connected peer. The body's `type` field selects the message kind.

```bash
curl -X POST http://localhost:3000/v1/message \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "b5079338-b96e-4197-98db-ada67db10895",
    "type": "text",
    "content": "Hello from VS Agent"
  }'
```

Returns:

```json
{ "id": "<message-id-uuid>" }
```

The message is queued and delivered asynchronously. Subscribe to the `message-state-updated` event to track delivery (see [**Webhook events**](./webhook-events.md)).

### Connections — `/v1/connections`

```bash
# All current connections
curl http://localhost:3000/v1/connections

# A specific connection
curl http://localhost:3000/v1/connections/<connection-id>
```

Each connection corresponds to one DIDComm peer (typically a Hologram user). The `id` is what you pass as `connectionId` in messages.

### Invitations — `/v1/invitation`, `/v1/presentation-request`, `/v1/credential-offer`

Generate connection / proof / credential-offer invitations. The simplest:

```bash
curl http://localhost:3000/v1/invitation
```

Returns a long URL-encoded DIDComm invitation that can be rendered as a QR or pasted into a Hologram client to start a connection.

For presentation requests (proof requests):

```bash
curl -X POST http://localhost:3000/v1/presentation-request \
  -H "Content-Type: application/json" \
  -d '{
    "credentialDefinitionId": "<def-id>",
    "claims": ["name", "roles"]
  }'
```

Returns a one-shot URL that, when opened in Hologram, prompts the user to share the listed claims.

### Verifiable Data Registry — `/v1/credential-types`, `/vt/issue-credential`

Create new credential types and issue credentials.

Create an AnonCreds credential definition:

```bash
curl -X POST http://localhost:3000/v1/credential-types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EmployeeBadge",
    "version": "1.0",
    "attributes": ["employeeLogin", "department", "roles"],
    "supportRevocation": true
  }'
```

Returns the `credentialDefinitionId` you'll plug into your agent pack's `flows.authentication.credentialDefinitionId`.

Issue a W3C-style credential against a previously-created schema:

```bash
curl -X POST http://localhost:3000/vt/issue-credential \
  -H "Content-Type: application/json" \
  -d '{
    "format": "anoncreds",
    "jsonSchemaCredential": "https://my-issuer.example.com/vt/schemas/badge.json",
    "claims": {
      "id": "<recipient-did>",
      "employeeLogin": "alice",
      "department": "Finance",
      "roles": ["employee","finance"]
    }
  }'
```

Returns a `credentialExchangeId` for follow-up.

### Agent introspection — `/v1/agent`

```bash
curl http://localhost:3000/v1/agent
```

```json
{
  "publicDid": "did:webvh:my-agent.demos.hologram.zone",
  "endpoint": "https://my-agent.demos.hologram.zone",
  "label": "My Hologram Agent"
}
```

Useful for verifying that `AGENT_PUBLIC_DID` resolved correctly and for building dynamic invitation URLs.

## Message types

Every message sent through `/v1/message` has a `type` field. The most common:

| `type` | Direction | Purpose |
|---|---|---|
| `text` | both | Plain chat message. `content` field holds the body. |
| `media` | both | Image / file / audio. |
| `menu-display` | controller → user | Opens a button menu in the user's chat. |
| `menu-select` | user → controller | The user's button choice (matched by `id`). |
| `contextual-menu-update` | controller → user | Updates the chat's contextual menu (e.g. "Logout" appears after auth). |
| `contextual-menu-select` | user → controller | The user picked a menu item. |
| `credential-request` | controller → user | Triggers a credential request (used by issuers). |
| `credential-issuance` | controller → user | Actually issues the credential (carries the signed VC). |
| `credential-reception` | user → controller | Acknowledge / decline / abandon receipt. |
| `credential-revocation` | controller → user | Notify the user that a previously-issued credential is revoked. |
| `identity-proof-request` | controller → user | Ask the user to present a credential as proof. |
| `identity-proof-submit` | user → controller | The user's submitted proof. |
| `identity-proof-result` | controller → user | Outcome of proof verification. |
| `invitation` | controller → user | Send a follow-up invitation (e.g. to another VS). |
| `profile` | both | Exchange profile info (username, locale, capabilities). |
| `terminate-connection` | both | Close the DIDComm session. |
| `call-offer`, `call-accept`, `call-reject`, `call-end` | both | Voice/video call control. |
| `mrz-data-request`, `mrz-data-submit` | both | MRZ (passport machine-readable zone) flow. |
| `emrtd-data-request`, `emrtd-data-submit` | both | ePassport flow. |

For exhaustive payload shapes see [the upstream spec](https://github.com/2060-io/vs-agent/blob/main/doc/vs-agent-api.md#message-types).

## Receiving messages

The admin API is **request/response** — it doesn't push. To receive messages from peers, subscribe to webhook events. See [**Webhook events**](./webhook-events.md) for the full event catalog.

The chatbot in the [generic AI agent](../build/agent-pack/overview.md) wires this up automatically — it sets `EVENTS_BASE_URL` on the VS Agent to its own HTTP endpoint and processes incoming `message-received` events as LLM input.

## Client libraries

You don't usually call this API by hand. Two officially-supported clients:

| Package | Language | When to use |
|---|---|---|
| [`@2060.io/vs-agent-client`](https://github.com/2060-io/vs-agent/tree/main/packages/client) | TypeScript / Node | Plain Node controllers, scripts, tests |
| [`@2060.io/vs-agent-nestjs-client`](https://github.com/2060-io/vs-agent/tree/main/packages/nestjs-client) | NestJS | NestJS controllers (the chatbot uses this) |

If you fork the chatbot you'll already have everything wired up. If you build a custom controller, start with `@2060.io/vs-agent-client`.

## Worked example — issuer + verifier

A minimal credential issuer (corporate badge):

```bash
# 1. Create the credential definition
curl -X POST http://localhost:3000/v1/credential-types \
  -H "Content-Type: application/json" \
  -d '{ "name": "Badge", "version": "1.0",
        "attributes": ["employeeLogin","roles"] }'

# 2. After a user connects (you got connectionId from the connection-state-updated webhook):

# 3. Send them a credential request asking for their email
curl -X POST http://localhost:3000/v1/message \
  -H "Content-Type: application/json" \
  -d '{ "connectionId": "<id>",
        "type": "identity-proof-request",
        "requestedProofItems": [{"type":"emailVc"}] }'

# 4. After the user submits it, issue the badge
curl -X POST http://localhost:3000/v1/message \
  -H "Content-Type: application/json" \
  -d '{ "connectionId": "<id>",
        "type": "credential-issuance",
        "credentialDefinitionId": "<def-id-from-step-1>",
        "claims": [
          {"name":"employeeLogin","value":"alice"},
          {"name":"roles","value":"employee,finance"}
        ] }'
```

A minimal verifier (the auth flow inside the chatbot):

```bash
# 1. After a user taps "Authenticate", build a presentation request
curl -X POST http://localhost:3000/v1/presentation-request \
  -H "Content-Type: application/json" \
  -d '{ "credentialDefinitionId": "<corp-badge-def-id>",
        "claims": ["employeeLogin","roles"] }'

# 2. Send it to the user as an invitation
curl -X POST http://localhost:3000/v1/message \
  -H "Content-Type: application/json" \
  -d '{ "connectionId": "<id>",
        "type": "invitation",
        "url": "<the-url-from-step-1>" }'

# 3. Subscribe to message-received events; the user's
#    identity-proof-submit message arrives there.
```

## Operating notes

- **Never expose 3000 publicly.** The admin API has no built-in auth; it's a control plane. Run it on a private network only.
- **Public DIDComm port (3001) is the user-facing one.** That's the one ingress should expose, with TLS.
- **Swagger is dev-only.** Set `ENABLE_PUBLIC_API_SWAGGER=true` in dev; turn off in prod.
- **Idempotency.** `POST /v1/message` is **not** idempotent — retries create duplicate messages. Use the message `id` returned and dedupe client-side if you retry.
- **Async delivery.** The 200 response means "queued", not "delivered". Track delivery via the `message-state-updated` webhook.

## Next

- [**Webhook events**](./webhook-events.md) — the receive path.
- [**Bare VS Agent tutorial**](../build/advanced/bare-vs-agent.md) — using the API directly without the chatbot.
- Source of truth: [`vs-agent/doc/vs-agent-api.md`](https://github.com/2060-io/vs-agent/blob/main/doc/vs-agent-api.md).
