# Architecture

A practical reference for working in this codebase: where things live, how
they connect, and where to add the next thing.

## Repository layout

```
src/
  components/
    ui/                shadcn primitives (don't translate, mostly untouched)
    schedule/          calendar grid, shift cards, applications panel
    settings/          shift-type manager (admin)
    layout/            Header
    ConfirmDialog.tsx  shared destructive-action wrapper
    ErrorBoundary.tsx  top-level error fallback (uses withTranslation)
    LanguageSwitcher.tsx
  hooks/
    use-user.ts                          /api/me-backed session hook
    use-shift-application-actions.ts     approve/reject cascade hook
    use-toast.ts / use-mobile.ts         shadcn helpers
  lib/
    week.ts          getWeekStart / getWeekEnd / getISOWeek (Thursday-anchored)
    shiftLayout.ts   pure mapShiftsForWeek + packOverlappingShifts
    shiftApi.ts / employeeApi.ts / shiftApplicationApi.ts / settingsApi.ts
    cinetixxParser.ts
    __tests__/       Vitest unit tests for the pure modules
  locales/de.json, en.json
  pages/
    Login.tsx, Schedule.tsx, Administration.tsx, Employees.tsx,
    EmployeeSettings.tsx, NotFound.tsx
  server/
    api.ts        entry: builds app, runs migrations, listens
    app.ts        buildApp() factory — used by api.ts and tests
    db.ts         sqlite handle, helpers, migrations, admin seed
    auth.ts       session middleware + /api/login, /api/logout, /api/me
    csrf.ts       Origin-check middleware
    logger.ts     pino instance with redact rules
    routes/       admin, settings, employees, shifts, shiftTypes,
                  shiftApplications, cinetixx
    __tests__/    integration tests + setup file
  App.tsx, main.tsx, i18n.ts
```

## Request flow

```
browser → nginx (port 80) ─┬─ static SPA from /usr/share/nginx/html
                           └─ /api/* → backend container (port 3001)

backend express:
  pino-http  →  express.json  →  cookieParser  →  csrfProtection  →  route
                                                       │
                                          requireAuth / requireRole
```

Middleware order matters:

- `pino-http` first so every request gets logged regardless of how it ends.
- `express.json` and `cookieParser` before CSRF because the CSRF check
  needs `Origin`/`Referer` headers, not the body.
- `csrfProtection` skips safe methods (GET/HEAD/OPTIONS); on
  POST/PUT/PATCH/DELETE it requires `Origin` or `Referer` to match
  `req.headers.host` or an entry in `CSRF_ALLOWED_ORIGINS`.
- `requireAuth` / `requireRole` are applied per route — see the route
  modules under `src/server/routes/`.

## Auth model

- Login (`POST /api/login`) takes `{username, password}`. The server
  looks up the user, runs `bcrypt.compare`, and on success issues a
  JWT with the claim `{id, username, role}` as an `HttpOnly` cookie
  named `session`.
- Every authenticated request carries that cookie. `requireAuth`
  verifies the JWT and populates `req.user`.
- `requireRole('admin', ...)` checks `req.user.role`.
- The frontend doesn't store a user — `useUser()` is a TanStack Query
  that calls `/api/me`. Logout calls `/api/logout` and invalidates the
  query.

Roles: `employee` < `manager` < `admin`. Employees see only their own
applications/shifts in lists; the server enforces this in
`/api/shift-applications` regardless of query params.

## Frontend route map

`src/App.tsx` is the source of truth.

| Path                  | Component         | Access                        |
|-----------------------|-------------------|-------------------------------|
| `/login`              | LoginPage         | public                        |
| `/`                   | redirect → /schedule | —                          |
| `/schedule`           | Schedule          | any authenticated role        |
| `/administration`     | Administration    | manager / admin (`EmployeeOnly` redirects employees away) |
| `/employees`          | EmployeesPage     | manager / admin               |
| `/employee-settings`  | EmployeeSettings  | any authenticated role        |
| `*`                   | NotFound          | —                             |

## Database

A single sqlite file at `/data/shiftplanner.sqlite` (overridable with
`DB_PATH`). Tables:

- `users` — id, username, password (bcrypt hash), name, role
- `shift_types` — id, name, color
- `shifts` — id, employee (FK, nullable), date, start_time, end_time,
  shift_type (FK), notes, created_at
- `shift_applications` — id, shift_id (FK), employee_id (FK), status
  (`pending`/`approved`/`rejected`), auto_assigned (0/1), created_at
- `settings` — key/value (currently just `auto_assign_limit`)
- `schema_migrations` — name, applied_at

### Migrations

Schema changes go in the `MIGRATIONS` array in `src/server/db.ts`.

```ts
const MIGRATIONS: Migration[] = [
  { name: '0001_initial', sql: `...` },
  // Append the next one here:
  { name: '0002_add_shifts_role', sql: `
      ALTER TABLE shifts ADD COLUMN role_required TEXT;
  ` },
];
```

`runMigrations()`:

1. Ensures `schema_migrations` exists.
2. Bootstrap: if `users` exists but no migrations are recorded
   (pre-migration DB), records `0001_initial` as applied without
   re-running it.
3. For each migration not in `schema_migrations`, wraps `BEGIN/COMMIT`
   around the SQL plus the `INSERT INTO schema_migrations`. A failure
   rolls back.

`initSchema()` calls `runMigrations()` then seeds the admin user (the
seed is outside the migration sequence because it needs async bcrypt
and a runtime env var).

## Auto-assign flow

`POST /api/shift-applications` does more than store an application:

1. Validates the shift exists and isn't already assigned to someone else.
2. Handles the duplicate-application cases (re-applying after a manager
   reset, etc.).
3. Computes the Thursday→Wednesday week boundaries via `lib/week`.
4. Counts how many auto-assigned applications this employee has in that
   week.
5. If `count < auto_assign_limit` AND the shift is unassigned, the
   application is created with `status='approved'` and `auto_assigned=1`,
   and the shift is updated with `employee = <them>`. Otherwise it's
   `status='pending'`.

Managers approve / reject pending applications via the inline panel in
the shift dialog (`useShiftApplicationActions` is the shared hook for
the approve/reject cascade; the same hook is used in the Applications
tab on the Schedule page).

## Adding things

- **A new API endpoint:** add it to the right route module under
  `src/server/routes/`. Apply `requireAuth, requireRole(...)` per the
  pattern. Don't add new middleware globally — keep CSRF + auth /
  authz the only global concerns.
- **A new page:** add the page component under `src/pages/`, add a
  `<Route>` to `src/App.tsx`, and a nav entry to
  `src/components/layout/Header.tsx`. Translate strings via
  `useTranslation` and add keys to both locale files.
- **A new schema change:** append a migration to `MIGRATIONS` in
  `src/server/db.ts` (see above). Don't edit `0001_initial` — old DBs
  already have it applied.
- **A new destructive action:** wrap the trigger in `ConfirmDialog`.
  See the delete-shift / drop-tables / delete-employee usages.

## Conventions

- TypeScript strict mode (incl. `noUnusedLocals`,
  `noUnusedParameters`); both `tsconfig.app.json` and
  `tsconfig.backend.json` enforce it.
- Single source of truth for the Thursday week: `src/lib/week.ts`.
  Don't reimplement.
- Server errors are logged with `req.log.error({ err }, '...')` and
  the response is a generic message. Don't echo internal error text
  back to clients.
- i18n keys are camelCase. The `t("missingKey")` fallback is the key
  string itself — so a literal key showing up in the UI means it's
  not in the locale files.
- Shift colors come from `shift_types.color`. Frontend never hard-codes
  shift colors.

## What's intentionally not built

- No client-side state store (Redux/Zustand). TanStack Query plus
  React state is enough.
- No optimistic updates yet; mutations refetch on success.
- No tracing / metrics yet — pino JSON logs are the only observability.
- No backups in-repo. The volume is durable; backup scheduling is an
  operations concern.

## See also

- [README.md](README.md) — quick start, env vars, deploys.
