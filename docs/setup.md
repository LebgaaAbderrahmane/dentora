# Setup

Prerequisites:

- Node.js ≥ 20 (LTS 22 recommended)
- pnpm ≥ 9 (via Corepack or standalone)
- PostgreSQL 16+ and MinIO (or use Docker Compose from Phase 0.3)

## Install

```sh
pnpm install
```

## Run in development

```sh
pnpm dev        # all apps in parallel (vite watch + tsx watch)
```

| App    | URL                   |
| ------ | --------------------- |
| web    | http://localhost:5173 |
| admin  | http://localhost:5174 |
| portal | http://localhost:5175 |
| api    | http://localhost:4000 |

To run a single workspace: `pnpm --filter @dentora/admin dev`.

## Common commands

```sh
pnpm build        # production build of all workspaces
pnpm typecheck    # tsc across all workspaces
pnpm test         # vitest across all workspaces
pnpm lint         # oxlint (whole repo)
pnpm format       # prettier --write .
pnpm format:check # prettier --check .
```

## Environment variables

Environment files are never committed. Use `infra/.env.example` as a template (added in Phase 0.3) and
copy it to `.env` locally. Every secret goes through the environment — never hardcode keys.

## The API package

- Dev: `pnpm --filter @dentora/api dev` (tsx watch)
- Build: `pnpm --filter @dentora/api build` (tsup → `dist/`)
- Smoke test: `curl http://localhost:4000/health`

`apps/api` and `packages/contracts` export TypeScript source directly; both `tsx` and `tsup` handle it,
so there is no build-ordering dance between workspaces.
