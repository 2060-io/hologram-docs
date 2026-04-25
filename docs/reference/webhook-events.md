# Webhook events

VS Agent doesn't push state to its controller through the admin API — that's request/response. Instead, the agent **POSTs events** to a base URL you configure, every time something interesting happens (a new connection, a delivered message, a received message).

This is how the chatbot in the [generic AI agent](../build/agent-pack/overview.md) sees what users are saying. It's also how you wire up your own controller if you fork.

## Configuration

Set `EVENTS_BASE_URL` on the VS Agent. Whenever an event fires, the agent does:

```text
POST  ${EVENTS_BASE_URL}/<topic>
Content-Type: application/json
```

For example, `EVENTS_BASE_URL=http://chatbot:3003` and a message arrives — the agent POSTs to `http://chatbot:3003/message-received`. The controller is responsible for exposing matching POST handlers.

| `EVENTS_BASE_URL` form | Notes |
|---|---|
| `http://chatbot:3003` | Internal cluster DNS — the standard for `helm install` of the agent + chatbot together. |
| `http://host.docker.internal:3003` | Docker Compose macOS — the chatbot is on the host, the VS Agent in a container. |
| `http://192.168.1.50:3003` | Docker Compose Linux — chatbot on host, agent in container. Use the host's LAN IP. |

The chatbot's [`scripts/setup.sh`](https://github.com/2060-io/hologram-ai-agent-example/blob/main/scripts/setup.sh) computes this for you.

## Event topics

Three topics fire today.

| Topic | Endpoint suffix | When |
|---|---|---|
| `connection-state-updated` | `/connection-state-updated` | A new connection is created or its state advances. |
| `message-state-updated` | `/message-state-updated` | A previously-sent message changes delivery state. |
| `message-received` | `/message-received` | A peer sent the agent a message. |

Each event POST body is a JSON object with `type` matching the topic and additional fields per topic.

### `connection-state-updated`

Fired on new connections and state changes (per the [DID Exchange protocol](https://github.com/hyperledger/aries-rfcs/blob/main/features/0023-did-exchange/README.md)).

```json
{
  "type": "connection-state-updated",
  "connectionId": "b5079338-b96e-4197-98db-ada67db10895",
  "invitationId": "a1c4d2…",
  "state": "completed"
}
```

| Field | Type | Description |
|---|---|---|
| `connectionId` | UUID | Stable identifier you'll use in `/v1/message` calls. |
| `invitationId` | UUID | The invitation this connection started from (useful for tracking which QR / link a user came in on). |
| `state` | enum | DID Exchange state: `invitation-sent` → `request-received` → `response-sent` → `completed`. The `completed` event is when you can start sending messages. |

### `message-state-updated`

Fired on each delivery state change for messages you sent through `/v1/message`.

```json
{
  "type": "message-state-updated",
  "messageId": "<id-from-POST-message-response>",
  "timestamp": 1729785672,
  "connectionId": "<connection-uuid>",
  "state": "sent"
}
```

| Field | Type | Description |
|---|---|---|
| `messageId` | UUID | The id you got back from `POST /v1/message`. |
| `state` | enum | `created`, `sent`, `delivered`, `viewed`, `errored`. |

Use these to confirm a critical message reached the user (e.g. the case-number message in a customer-service flow).

### `message-received`

Fired every time a peer sends the agent a message. **This is the firehose** — every `text`, every `menu-select`, every `identity-proof-submit`, every `credential-reception`. The chatbot consumes this to drive the LLM.

```json
{
  "type": "message-received",
  "message": {
    "type": "text",
    "id": "<message-uuid>",
    "connectionId": "<connection-uuid>",
    "timestamp": 1729785672,
    "threadId": "<thread-uuid-or-null>",
    "content": "Hello, can you help me?"
  }
}
```

The `message` field is the full DIDComm message envelope as documented in [**Admin API → Message types**](./admin-api.md#message-types). You dispatch on `message.type`:

| `message.type` | Typical handling |
|---|---|
| `text` | Feed to the LLM. |
| `media` | Either feed to a multimodal LLM or save and acknowledge. |
| `menu-select`, `contextual-menu-select` | Run the action bound to the menu item id. |
| `identity-proof-submit` | Verify the proof; advance the auth flow. |
| `credential-reception` | Update internal state (`done` / `declined` / `abandoned`). |
| `profile` | Stash the user's locale, profile picture, etc. |

## Minimal controller — handle `message-received`

The shape of a controller, in pseudo-code:

```ts
import express from 'express'
const app = express()
app.use(express.json())

// VS Agent sends this when something is received
app.post('/message-received', async (req, res) => {
  const { message } = req.body
  switch (message.type) {
    case 'text':
      await handleText(message)
      break
    case 'menu-select':
      await handleMenuSelect(message)
      break
    // …
  }
  res.status(204).end()
})

app.post('/connection-state-updated', async (req, res) => {
  const { connectionId, state } = req.body
  if (state === 'completed') {
    await sendWelcome(connectionId)
  }
  res.status(204).end()
})

app.post('/message-state-updated', (req, res) => {
  // optional — log delivery state
  res.status(204).end()
})

app.listen(3003)
```

Then point the VS Agent at it: `EVENTS_BASE_URL=http://chatbot:3003`.

The full version of this loop, including LLM dispatch, MCP tool calls, RBAC, memory, and statistics, is what [`hologram-generic-ai-agent-vs`](https://github.com/2060-io/hologram-generic-ai-agent-vs) ships out of the box. Use the chatbot if you want all that; build your own controller only if you have a fundamentally different shape.

## Subscriptions API (planned)

The spec defines a `/event-subscriptions` REST surface that would let controllers register webhook URLs and filter by event type — but it's **not yet implemented**. Today, `EVENTS_BASE_URL` is the only knob. All three topics fire to that single base URL; you decide which to handle.

When subscriptions land, you'll be able to:

- Filter by topic (only `message-received`).
- Filter by attribute (only messages where `connectionId == X`).
- Use either HTTP webhooks or a long-lived WebSocket channel.

For now, plan around the simpler model.

## Operating notes

- **Idempotency.** Events can be re-delivered if the controller returns a non-2xx. Make handlers idempotent — keyed by `messageId` for messages, by `connectionId+state` for connections.
- **Backpressure.** The agent pipelines events; a slow controller will queue them. Don't do heavy work synchronously in the handler — return 204 fast and process asynchronously.
- **Order.** Events for the same `connectionId` arrive in order, but events across connections may interleave. Don't rely on global ordering.
- **Retries.** A 5xx response triggers retry; a 4xx does not. Use 204 for "received and processed", 5xx only for transient failures.
- **Auth.** There's no signed/authenticated payload yet. Run the controller on a private network or behind a reverse proxy with auth.

## Next

- [**Admin API**](./admin-api.md) — the request/response side.
- [**Bare VS Agent tutorial**](../build/advanced/bare-vs-agent.md) — wire up your own controller.
- Source of truth: [`vs-agent-api.md` § Events](https://github.com/2060-io/vs-agent/blob/main/doc/vs-agent-api.md#events).
