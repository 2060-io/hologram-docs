# Authentication

Hologram agents authenticate users with **verifiable credentials**, not passwords or OAuth. A user proves who they are by presenting a VC issued by a trusted party (an organization, a government, a company HR), and the agent reads attributes off that credential to identify them and resolve their roles.

This page covers the `flows.authentication` block. For the role mapping that consumes the resolved identity, see [**RBAC**](./rbac.md). For the menu wiring that triggers the auth UI, see [**Flows**](./flows.md).

## Why VC-based auth

| Property | What it buys you |
|---|---|
| **Privacy** | The agent only sees the attributes the credential exposes. No password reset emails, no OAuth scopes leak. |
| **Portability** | A corporate badge issued once can authenticate the user on every Hologram agent in the organisation. |
| **Cryptographic verification** | The agent confirms the credential was issued by the expected issuer and hasn't been revoked. No identity-provider call. |
| **Attribute-driven** | The same credential carries identity (`email` / `employeeLogin`) and roles (`roles: ["finance","auditor"]`) — no separate role API. |

## Schema

```yaml
flows:
  authentication:
    enabled: true
    required: true
    credentialDefinitionId: ${CREDENTIAL_DEFINITION_ID}
    userIdentityAttribute: employeeLogin
    rolesAttribute: roles
    defaultRole: employee
    adminUsers:
      - admin@acme.corp
```

| Field | Required | Default | Description |
|---|---|---|---|
| `enabled` | no | `false` | Turn the flow on. When `false`, the agent never asks for credentials and has no concept of authenticated users. |
| `required` | no | `false` | When `true`, **unauthenticated users cannot chat**. They get the welcome message and the authentication prompt only. Set to `false` for "guest mode" agents that have a free tier. |
| `credentialDefinitionId` | yes | — | The VC definition the agent will request. AnonCreds-style ID (`<schema>:<tag>:<def>`) or W3C-style depending on the issuer. |
| `userIdentityAttribute` | yes | — | Which credential attribute is the unique identity. Common choices: `email`, `name`, `employeeLogin`, `nationalId`. |
| `rolesAttribute` | no | — | Credential attribute holding role list. Accepts a single string, comma-separated list (`"finance,auditor"`), or JSON array (`["finance","auditor"]`). |
| `defaultRole` | no | `user` | Role assigned when `rolesAttribute` is missing or empty. |
| `adminUsers` | no | `[]` | Identities (matched against `userIdentityAttribute`) that bypass RBAC and see every tool. Replaces the legacy `adminAvatars`. |
| `issuerServiceDid` | no | — | Optional — restrict accepted credentials to ones issued by a specific service DID. |

## The flow

```text
                    User                     Hologram agent (chatbot)
                     │                                  │
                     │  Hi                              │
                     │  ────────────────────────────────▶
                     │                                  │  required:true,
                     │                                  │  no auth yet → reply
                     │  ◀────────────────────────────── │  "Please authenticate"
                     │                                  │  + menu item: Authenticate
                     │                                  │
                     │  taps "Authenticate"             │
                     │  ────────────────────────────────▶
                     │                                  │  → DIDComm presentation request
                     │                                  │    for credentialDefinitionId
                     │  ◀────────────────────────────── │
                     │                                  │
                     │  approves in Hologram app        │
                     │  ────────────────────────────────▶  → presentation submitted
                     │                                  │
                     │                                  │  Verify proof, extract attrs:
                     │                                  │   - employeeLogin = "alice"
                     │                                  │   - roles = ["finance"]
                     │                                  │  Resolve user identity + roles
                     │  ◀────────────────────────────── │  "Welcome Alice!"
                     │                                  │  + menu now shows Logout
```

When `required: false` the user can chat from the start; the credential prompt is only triggered when they tap the auth menu item or when a tool requires it.

## Menu wiring

Authentication shows up to the user as menu items. Add them to `flows.menu.items`:

```yaml
flows:
  menu:
    items:
      - id: authenticate
        labelKey: CREDENTIAL
        action: authenticate
        visibleWhen: unauthenticated
      - id: logout
        labelKey: LOGOUT
        action: logout
        visibleWhen: authenticated
```

| Field | Description |
|---|---|
| `id` | Stable identifier; logs reference it. |
| `labelKey` | Lookup into `languages[*].strings`. |
| `action` | The agent action this triggers. `authenticate` and `logout` are built in. |
| `visibleWhen` | The agent shows the item only when this state holds. See [**Flows**](./flows.md#visiblewhen-states). |

## i18n strings

```yaml
languages:
  en:
    greetingMessage: "Hi {userName}! Authenticate to access the agent."
    strings:
      CREDENTIAL: "Authenticate"
      LOGOUT: "Logout"
      WELCOME: "Welcome to the agent."
      AUTH_REQUIRED: "Please authenticate to use this feature."
      AUTH_SUCCESS: "Authentication completed successfully."
      AUTH_SUCCESS_NAME: "Authentication successful. Welcome, {name}!"
      WAITING_CREDENTIAL: "Waiting for you to complete the credential process..."
      AUTH_PROCESS_STARTED: "Credential request sent. Please respond to it."
      LOGOUT_CONFIRMATION: "You have been logged out successfully."
  es:
    greetingMessage: "¡Hola {userName}! Autentícate para acceder al agente."
    strings:
      CREDENTIAL: "Autenticar"
      LOGOUT: "Cerrar sesión"
      WELCOME: "Bienvenido al agente."
      AUTH_REQUIRED: "Por favor, autentícate para usar esta función."
      AUTH_SUCCESS: "Autenticación completada con éxito."
      AUTH_SUCCESS_NAME: "Autenticación exitosa. ¡Bienvenido, {name}!"
      WAITING_CREDENTIAL: "Esperando que completes el proceso de credencial..."
      AUTH_PROCESS_STARTED: "Solicitud de credencial enviada. Por favor, responde."
      LOGOUT_CONFIRMATION: "Has cerrado sesión exitosamente."
```

`{userName}` and `{name}` are placeholders the runtime substitutes — `{userName}` from the DIDComm peer's profile, `{name}` from the resolved `userIdentityAttribute`.

## Common credential definitions

What credential should you require? It depends on what the agent does.

| Use case | Credential | Issued by | `userIdentityAttribute` |
|---|---|---|---|
| **Public service for any Hologram user** (typical demo agent) | The Hologram **Avatar credential** | The avatar VS Agent (e.g. `avatar.demos.hologram.zone`) — issued automatically when a user picks an `@username` | `name` |
| **Corporate internal agent** (e.g. Wise tool for finance team) | A **corporate badge** | Your HR system's VS Agent | `employeeLogin` or `email` |
| **Government / regulated service** | A **gov-id-issued credential** | The country's identity service | `nationalId` |

For demo agents on `demos.hologram.zone`, the deployed [`hologram-ai-agent-example-deps`](https://github.com/2060-io/hologram-ai-agent-example-deps) issues an Avatar credential — you set `CREDENTIAL_DEFINITION_ID` to its definition and authenticated users are identified by their Hologram username.

## Required env vars

| Variable | Description |
|---|---|
| `CREDENTIAL_DEFINITION_ID` | Plain string overriding `flows.authentication.credentialDefinitionId`. |
| `AUTH_REQUIRED` | `true`/`false` — overrides `flows.authentication.required` at runtime. |
| `USER_IDENTITY_ATTRIBUTE` | Overrides `userIdentityAttribute` (default `name`). |
| `ROLES_ATTRIBUTE` | Overrides `rolesAttribute`. |
| `DEFAULT_ROLE` | Overrides `defaultRole` (default `user`). |
| `ADMIN_USERS` | Comma-separated list overriding `adminUsers`. |

## Operating notes

- **Logout.** Resets the in-memory session. The credential itself isn't revoked or rotated; the user can re-authenticate immediately.
- **Re-authentication.** A user can present a fresh credential at any time — useful when their role list changed (e.g. promoted from `employee` to `finance`). The next message uses the new roles.
- **Credential expiration.** AnonCreds revocation registries are checked on each presentation. A revoked credential is rejected; the user has to obtain a new one.
- **No password fallback.** This is intentional — the system is designed to make passwords obsolete. If a user can't get a credential they can't use the agent.

## Next

- [**RBAC**](./rbac.md) — what to do with the resolved roles.
- [**Flows**](./flows.md) — menu wiring.
- [**i18n**](./i18n.md) — multi-language string declarations.
- [**Cookbook — corporate Wise agent**](../cookbook/wise-agent.md) — auth + RBAC + approvals end to end.
