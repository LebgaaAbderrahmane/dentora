# Dentora PMS

Complete dental practice management system for a single Algerian clinic (multi-branch ready).
Built on top of the [Dentora](https://dentora.dz) public marketing site.

> **Status:** Phase 6 (hardening) complete — reports & exports, audit retention, PWA
> offline, Playwright e2e in CI, security/perf audit + PITR drill, CI/CD finalized.
> See [`PROCESS.md`](./PROCESS.md) for the full roadmap and session log.

## What's included

| App           | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `apps/web`    | Public marketing site (React 19 + Vite + Tailwind 4, fr/ar/en) |
| `apps/admin`  | Staff management SPA (patients, appointments, stock, finance…) |
| `apps/portal` | Patient portal SPA (history, invoices, online booking)         |
| `apps/api`    | Express REST API (Zod-validated, Prisma + PostgreSQL, MinIO)   |

| Package              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `packages/contracts` | Shared Zod schemas + inferred types (api ↔ frontends) |
| `packages/i18n`      | fr/ar/en translations + RTL + locale context (SPAs)   |
| `packages/ui`        | Design system (grown incrementally)                   |
| `packages/config`    | Shared TypeScript config, lint/format presets         |

Monorepo: pnpm workspaces. Everything runs through root scripts.

## Stack

- **Frontend:** React 19 · Vite 8 · Tailwind CSS 4 · fr/ar/en (RTL), DZD currency; public site is an installable PWA with offline booking
- **Backend:** Express 5 · Prisma · PostgreSQL · Zod · MinIO
- **Infra:** Docker Compose (postgres + minio + nginx + caddy) · GitHub Actions CI incl. Playwright e2e · manual-trigger deploy workflow (see [ADR 036](docs/adr/0036-ci-cd-decision.md))

## Quickstart

```sh
pnpm install
pnpm dev          # run all apps in parallel
pnpm build        # build all workspaces
pnpm lint         # oxlint
pnpm typecheck    # tsc across all workspaces
pnpm test         # vitest across all workspaces
pnpm test:e2e     # Playwright (needs docker postgres + seeded demo data; see e2e/)
pnpm format       # prettier --write .
```

The API listens on `:4000` and exposes `GET /api/health` (Zod-validated via `packages/contracts`).

### Demo data

After `pnpm install` + migrations, load a realistic, self-consistent dataset to explore every phase:

```sh
pnpm --filter @dentora/api db:seed:demo
```

It resets the active branch's demo data (catalog, patients + encrypted records, appointments,
waitlist, invoices/payments/refunds, expenses, products + stock ledger, suppliers + purchase
orders), keeps the branch + staff users, and prints the demo logins. Staff accounts use
`demo-pass-123`; the admin keeps the `ADMIN_PASSWORD` from the env. The stock ledger invariant
(`Σ ledger == quantityOnHand`) and the alert feed (low stock, expiring/expired lots) are verified
on every run. `db:seed:demo` is refreshed after each phase so the demo data exercises the latest
features.

## Documentation

- [`PROCESS.md`](./PROCESS.md) — roadmap, decisions, session log (read this first)
- [`docs/setup.md`](docs/setup.md) — dev environment
- [`docs/conventions.md`](docs/conventions.md) — code standards & git workflow
- [`docs/security.md`](docs/security.md) — encryption, auth, audit, hardening notes
- [`docs/deploy.md`](docs/deploy.md) — deploy runbook (executed by the deploy workflow)
- [`docs/backup-restore.md`](docs/backup-restore.md) — backups & PITR + drill log
- [`docs/perf.md`](docs/perf.md) — performance notes from the 6.5 audit
- [`docs/adr/`](docs/adr/) — architecture decision records (ADR 0002–0036)

## Git workflow

Commits land on feature branches (`feat/<phase>-<slug>`, `fix/<slug>`), verified by CI
(format, lint, typecheck, unit tests, build, Playwright e2e against a real Postgres),
then merged to `main`. `main` always stays deployable; deploys are manual-trigger via
the `Deploy` workflow (ADR 036). See docs/conventions.md.
