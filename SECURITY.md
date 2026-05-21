# Security Policy

## Reporting a vulnerability

Please **don't** open a public GitHub Issue for security problems —
they're searchable, and it can take time to ship a fix.

Email henrik@stooss.io with:

- a description of the issue,
- a minimal reproduction (curl recipe, test case, screenshot),
- the affected version (commit SHA or container tag).

You'll get an acknowledgment within a week. A fix and coordinated
disclosure follow once the impact is understood.

## What's in scope

- The server in `src/server/` and its REST API (`/api/*`).
- The authentication / authorization model (session cookie, role
  middleware, CSRF check, rate limit).
- The migration runner in `src/server/db.ts`.
- The Docker images published to GHCR.

## What's known and intentional

- **Single-user admin seed.** First boot seeds `admin/changeme` (or
  `ADMIN_DEFAULT_PASSWORD`). Rotating this is the operator's
  responsibility on day 1; the server warns at startup until a non-
  default password is set.
- **HTTP-only nginx.** The shipped compose stack listens on plain HTTP
  port 80. TLS is expected to be terminated by a reverse proxy in
  front. `NODE_ENV=production` makes the session cookie `secure`, so
  it won't work unless that proxy serves HTTPS.
- **No 2FA, no audit log, no password reset flow.** Suitable for
  small-team / single-org use. Add if your threat model needs more.

## Dependencies

`npm audit --omit=dev --audit-level=high` runs in CI on every push and
blocks the build on production-dep vulnerabilities of high+ severity.
Dependabot opens PRs weekly for both npm and Docker.
