## What

Short description of the change. Link the issue if there is one.

## Why

The motivation. What was wrong / missing / annoying that this fixes.

## How to verify

Steps a reviewer can follow. e.g.:

```sh
docker compose up -d --build
# log in as admin, create a shift, confirm X
```

Or, for backend changes:

```sh
npm test -- --run
```

## Checklist

- [ ] Tests added or updated (unit / integration / component, as appropriate)
- [ ] `npm run lint` clean
- [ ] `npx tsc -p tsconfig.app.json --noEmit` and `tsconfig.backend.json` both clean
- [ ] User-facing strings go through i18n (`t("...")`) with keys in both `en.json` + `de.json`
- [ ] Schema changes added as a new entry to `MIGRATIONS` (didn't edit existing ones)
- [ ] `README.md` / `ARCHITECTURE.md` updated if behavior or layout changed

## Notes for the reviewer

Anything you want extra eyes on, alternatives you considered, etc.
