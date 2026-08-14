# Dentora PMS

Complete dental practice management system for a single Algerian clinic (multi-branch ready).
Built on top of the [Dentora](https://dentora.dz) public marketing site.

> **Status:** under active development — Phase 0 (walking skeleton). See [`PROCESS.md`](./PROCESS.md) for the full roadmap and session log.

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

- **Frontend:** React 19 · Vite 8 · Tailwind CSS 4 · React Router v7 · TanStack Query · Zustand
- **Backend:** Express 5 · Prisma · PostgreSQL · Zod
- **Infra:** Docker Compose (postgres + minio + nginx + caddy) · manual deploy runbook (see [docs/deploy.md](docs/deploy.md))
- **Language/locale:** fr / ar / en (RTL), DZD currency

## Quickstart

```sh
pnpm install
pnpm dev          # run all apps in parallel
pnpm build        # build all workspaces
pnpm lint         # oxlint
pnpm typecheck    # tsc across all workspaces
pnpm test         # vitest across all workspaces
pnpm format       # prettier --write .
```

The API listens on `:4000` and exposes `GET /api/health` (Zod-validated via `packages/contracts`).

## Documentation

- [`PROCESS.md`](./PROCESS.md) — roadmap, decisions, session log (read this first)
- [`docs/setup.md`](docs/setup.md) — dev environment
- [`docs/conventions.md`](docs/conventions.md) — code standards & git workflow
- [`docs/security.md`](docs/security.md) — encryption, auth, audit model
- [`docs/deploy.md`](docs/deploy.md) — deploy runbook (Phase 0.9)
- [`docs/backup-restore.md`](docs/backup-restore.md) — backups & PITR (Phase 0.9)
- [`docs/adr/`](docs/adr/) — architecture decision records

## Git workflow

Commits land on feature branches (`feat/<phase>-<slug>`, `fix/<slug>`), verified by CI, then merged to `main`.
`main` always stays deployable. See docs/conventions.md.
