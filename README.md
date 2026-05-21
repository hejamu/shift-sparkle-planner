# Shift Sparkle Planner

A small shift-scheduling app: managers create weekly shifts, employees apply
for them, the first N approved applications per employee per week are
auto-assigned. Built originally on Lovable, cleaned up since.

## Stack

| Layer    | Choice                                                    |
|----------|-----------------------------------------------------------|
| Frontend | Vite + React 18 + TypeScript + Tailwind + shadcn/ui       |
| State    | TanStack Query (server state), no client store            |
| i18n     | i18next, German (default) + English                       |
| Backend  | Node 20 + Express + sqlite3                               |
| Auth     | bcrypt hashes + HttpOnly JWT cookie sessions              |
| Tests    | Vitest (unit) + supertest (integration)                   |
| Deploy   | Docker (nginx for the SPA, express for the API) + GHCR    |
| CI       | GitHub Actions: tsc, lint, audit, tests, build, publish   |

## Quick start (Docker)

```sh
# .env first — copy and fill in SESSION_SECRET (32+ random bytes)
cp .env.example .env

# Bring up nginx + backend; admin user is seeded on first boot
SESSION_SECRET="$(openssl rand -hex 32)" docker compose up -d --build

# Default credentials (rotate immediately via the admin UI):
#   user:  admin
#   pass:  changeme  (or whatever ADMIN_DEFAULT_PASSWORD you set)
```

Open <http://localhost:8080>.

## Local dev (without Docker)

```sh
# Backend in a container, frontend on the host with hot reload
SESSION_SECRET=dev-secret docker compose up -d backend

npm ci
npm run dev   # vite at http://localhost:8080, proxies /api → :3001
```

Tests + checks:

```sh
npm test -- --run        # vitest, ~30 tests across unit + integration
npm run build            # vite production bundle
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.backend.json --noEmit
npm run lint
```

If `npm test` fails with a `sqlite3` binding error locally, run
`npm rebuild sqlite3` — the lockfile binary targets a specific Node ABI.

## Configuration

| Env var                  | Required | Default                          | Purpose                                                                       |
|--------------------------|----------|----------------------------------|-------------------------------------------------------------------------------|
| `SESSION_SECRET`         | yes      | —                                | JWT signing key. Backend refuses to start without it. Use 32+ random bytes.   |
| `ADMIN_DEFAULT_PASSWORD` | no       | `changeme`                       | Seeded on first boot when no admin exists. Rotate via the admin UI.           |
| `NODE_ENV`               | no       | `production` (in compose)        | Drives secure-cookie flag and structured-log format.                          |
| `PORT`                   | no       | `3001`                           | Backend HTTP port.                                                            |
| `DB_PATH`                | no       | `/data/shiftplanner.sqlite`      | Used by tests to point at a temp file.                                        |
| `TRUST_PROXY`            | no       | `1`                              | Number of proxy hops to trust for `X-Forwarded-*`. `false` to disable.        |
| `CSRF_ALLOWED_ORIGINS`   | no       | (same-origin only)               | Comma-separated extra Origins allowed on state-changing requests.             |
| `LOG_LEVEL`              | no       | `info` (prod), `debug` (dev)     | pino log level.                                                               |
| `IMAGE_BASE`             | no       | `ghcr.io/hejamu/shift-sparkle-planner` | Override for forks pulling pre-built images.                            |
| `IMAGE_TAG`              | no       | `latest`                         | Tag to pull. Use the commit SHA for reproducible deploys.                     |

## Deploys / updates

CI pushes `*-frontend` and `*-backend` images to GHCR on every commit to
`main`, tagged with the SHA and `latest`. To deploy:

```sh
# Specific version
IMAGE_TAG=$SHA docker compose pull
docker compose up -d

# Or just track main
docker compose pull && docker compose up -d
```

Migrations run automatically on backend startup (idempotent; see
[ARCHITECTURE.md](ARCHITECTURE.md#migrations) for how to add a new one).

## Operations

- **HTTPS.** This repo ships an HTTP-only nginx. Put it behind a TLS-
  terminating reverse proxy (Caddy with ACME is easiest) and the
  `secure` cookie flag will start to apply via `NODE_ENV=production`.
  The proxy must forward `X-Forwarded-Proto`.
- **Backups.** The sqlite database lives in the `sqlite_data` named
  volume. There is no built-in backup; schedule a `sqlite3 .backup` off-
  host before this matters.
- **Rate limit.** 10 failed logins per IP per 15 min. Successful logins
  don't count.
- **Logging.** JSON via pino in prod; cookies / `password` / `token`
  fields are redacted. Pipe to your aggregator of choice.

## License

Not yet decided. Treat as "all rights reserved" until a `LICENSE` file
lands.

## See also

- [ARCHITECTURE.md](ARCHITECTURE.md) — code layout, auth flow, schema, where to add things.
