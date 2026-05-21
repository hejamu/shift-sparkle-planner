# Contributing

Thanks for poking around. The basics.

## Setup

```sh
git clone https://github.com/hejamu/shift-sparkle-planner.git
cd shift-sparkle-planner
cp .env.example .env   # fill in SESSION_SECRET
npm ci                 # also installs husky pre-commit hooks
```

Run the app locally — backend in Docker, frontend on the host with HMR:

```sh
SESSION_SECRET="$(openssl rand -hex 32)" docker compose up -d backend
npm run dev
```

Open <http://localhost:8080>, log in as `admin / changeme`.

## Before you push

The pre-commit hook runs `eslint` on staged TS files via lint-staged.
You can also run the same checks CI does:

```sh
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.backend.json --noEmit
npm test -- --run
npm audit --omit=dev --audit-level=high
```

## Where to add things

[ARCHITECTURE.md](ARCHITECTURE.md) is the authoritative tour. Short version:

- **New API endpoint:** add to the right module under
  `src/server/routes/`, apply `requireAuth`/`requireRole`, write an
  integration test in `src/server/__tests__/api.integration.test.ts`.
- **New page:** add component under `src/pages/`, register in
  `src/App.tsx` (use `lazy()` if it's not on the hot path), add nav
  entry in `src/components/layout/Header.tsx`. Strings go through
  `useTranslation`; add keys to both `src/locales/{en,de}.json`.
- **Schema change:** append a migration to `MIGRATIONS` in
  `src/server/db.ts`. **Do not** edit existing entries.

## Conventions

- TypeScript is in strict mode. `noUnusedLocals` / `noUnusedParameters`
  on. Prefer `unknown` over `any` in catch blocks and narrow with
  `instanceof Error`.
- Server interacts with sqlite, which returns untyped rows; eslint
  permits `any` only under `src/server/`. The frontend has zero `any`.
- i18n keys are camelCase. A missing key renders the key string itself
  — so a literal key in the UI means it's not in the locale file.
- Destructive UI actions (delete shift, drop tables, delete employee)
  must be wrapped in `<ConfirmDialog>`.
- Server errors: log the real error via `req.log.error({ err })`,
  return a fixed string in the response body.

## Commit messages

No strict format. Prefix with a scope when it helps (`feat(server):`,
`fix(schedule):`, `chore(docker):`, etc). Body should explain *why*,
not *what* — the diff already shows what.

## Reporting issues

GitHub Issues. For security issues see [SECURITY.md](SECURITY.md).
