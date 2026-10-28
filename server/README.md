# OmniTerm control-plane foundation

Pilot increment, not a production bastion. Node.js 24.13+ and SQLite are used so this increment can be tested on the current workstation. This supersedes the initial Go/PostgreSQL proposal **for this single-node pilot only**. PostgreSQL, independent workers, and HA remain future work; SQLite does not establish capacity for 500–1,000 technicians.

## Implemented

- API verifies signed bearer JWTs using a statically configured trusted HTTPS JWKS endpoint. Issuer, API audience, signature, expiration, issue time and subject are checked. Only RS256/ES256 accepted. No development authentication bypass or default password in the executable.
- Only pre-provisioned issuer+subject identities are accepted; roles from JWT claims are not trusted. `active` is checked on every request.
- Default-deny team grants with per-action expiry. Access admins have no implicit connection permission, but **are trusted to administer grants globally and can grant their team access**. Delegation scopes, deny rules, dual approval and anti-self-approval are not implemented yet.
- Inventory/details filtered by `resource.view`. Session requests require both view and connect, but return **501** because the gateway is deliberately not implemented.
- API operations to create teams/resources, add/remove members, grant/revoke rights. User provisioning and role selection are offline operator actions only.
- Transactional SQLite audit for successful management writes. This is not immutable external audit or terminal recording. Authentication failures and reads are not audited yet.
- Docker Compose pilot profile: loopback-published API, non-root container, read-only root filesystem, dropped capabilities, no-new-privileges and resource limits.

## Not implemented / blockers before production

Browser OIDC Authorization Code+PKCE/BFF login, MFA enforcement, CSRF/session cookies, logout/IdP revocation integration, admin UI, pagination beyond 1,000 visible resources, rate limiting, delegated team admins, individual grants, approvals/JIT, secrets vault, SSH/RDP/VNC execution, SFTP, host-key verification, destination network policy, WebSockets, recordings, external audit, PostgreSQL/HA, signed releases, one-command installer, backups/upgrade automation, and independent security/load testing.

There is no credential field or secret storage. Do not enter real passwords/private keys into the frontend demo; its profiles remain browser-local and are not integrated with this API. Do not expose this pilot publicly.

## Local development

```powershell
npm --prefix "D:\02_Project\10_OmniTerm\omniterm\server" ci --ignore-scripts
npm --prefix "D:\02_Project\10_OmniTerm\omniterm\server" test
```

To start locally, set trusted IdP values and an absolute database path. These are placeholders, not an available identity service:

```powershell
$env:OIDC_ISSUER = 'https://id.example.com/realms/company'
$env:OIDC_AUDIENCE = 'omniterm-api'
$env:OIDC_JWKS_URL = 'https://id.example.com/realms/company/protocol/openid-connect/certs'
$env:DATABASE_PATH = 'D:\OmniTermData\control-plane.sqlite'
npm --prefix "D:\02_Project\10_OmniTerm\omniterm\server" start
```

API binds to `127.0.0.1:8080` by default. Missing OIDC configuration prevents startup. JWKS is fetched on token verification; a failed JWKS request refuses authentication. No real IdP integration has been exercised yet. Configure a dedicated API audience, not the browser client audience; configure MFA at the IdP. Token signature validation alone does not prove MFA or instantly detect an IdP-disabled account. Local disabling takes effect on the next request; external account lifecycle integration is still required.

After first startup creates the DB, an operator can provision an identity with its exact configured issuer and stable `sub` (not email):

```powershell
npm --prefix "D:\02_Project\10_OmniTerm\omniterm\server" run admin -- provision 'https://id.example.com/realms/company' 'actual-idp-subject' access_admin
npm --prefix "D:\02_Project\10_OmniTerm\omniterm\server" run admin -- disable 'local-user-uuid'
```

The `DATABASE_PATH` environment variable must point to the existing database. The offline operator already has filesystem-level access to data; this CLI is not a public account-registration endpoint. Protect directory permissions, SQLite/WAL/SHM files and backups. CLI audit actor is currently `offline-operator`; OS operator attribution is future work.

## API outline

All `/api/*` endpoints require `Authorization: Bearer <API access token>`. Never put tokens in URLs or browser localStorage. A test-only authenticator is injected in unit tests; `main.mjs` always uses the real JWT verifier.

| Method | Path | Access / fields |
| --- | --- | --- |
| GET | `/healthz` | Public liveness; not an IdP readiness check |
| GET | `/api/me` | Pre-provisioned active user |
| GET | `/api/resources` | Only resource.view grants; no admin bypass |
| GET | `/api/resources/:id` | view grant; missing/unauthorized both 404 |
| POST | `/api/sessions` | `{resourceId}`; view+connect; always 501 if authorized |
| GET | `/api/audit?after=0` | access_admin/auditor; at most 100 rows |
| POST | `/api/admin/teams` | access_admin; `{name}` |
| POST | `/api/admin/resources` | access_admin; `{name,protocol,host,port}` |
| POST | `/api/admin/memberships` | access_admin; `{userId,teamId}` |
| POST | `/api/admin/memberships/remove` | access_admin; `{userId,teamId}` |
| POST | `/api/admin/grants` | access_admin; `{teamId,resourceId,action,expiresAt}` |
| POST | `/api/admin/grants/revoke` | access_admin; `{teamId,resourceId,action}` |

`expiresAt` is an epoch-milliseconds integer in the future. Supported grant actions: `resource.view`, `session.connect`, `file.read`, `file.write`; file actions are modeled but no file operations exist yet. Resource hosts are syntax-checked only, **not destination-approved**. No network connections are attempted; destination enforcement is mandatory before implementing a gateway. API contains no built-in terminal proxy.

## Linux pilot container

Provide `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL` through the environment or a protected local `.env`. From the project root:

```sh
docker compose -f compose.pilot.yaml up -d --build
```

This is a **pilot API start command**, not the complete one-command enterprise installer. It does not install Docker, configure DNS/TLS/IdP, provision accounts, deploy the frontend, or open terminals. API is published only on server loopback; use an authenticated operator connection for evaluation. Non-loopback deployment must wait for a reviewed HTTPS reverse proxy and the remaining controls.

The image base is a development major tag; pin a reviewed digest and sign release artifacts before production. Docker is unavailable on the current workstation, so image/Compose behavior has not been runtime-tested. The lockfile pins the API dependency tree. Named volume stores SQLite; do not delete it to upgrade. Do not claim safe live backup by copying only the main SQLite file; use a consistent snapshot/backup procedure including WAL state.

## Test scope

Automated tests cover JWT verification with real generated local signing keys, default deny, cross-team IDOR, grant expiry/revocation, membership removal, disabled users, role restrictions, transactional audit and a disabled gateway. They do not establish production security, validate a live IdP, test Linux packaging or prove performance. Node may emit an experimental warning for `node:sqlite` on some supported versions.
