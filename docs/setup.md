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
- Build: `pnpm --filter @dentora/api build` (tsup → `dist/`, self-contained bundle)
- Smoke test: `curl http://localhost:4000/api/health`

`apps/api` and `packages/contracts` export TypeScript source directly; both `tsx` and `tsup` handle it,
so there is no build-ordering dance between workspaces. API routes live under the `/api` prefix so dev
(direct) and prod (through nginx) behave identically.

## Docker stack (self-hosted infra)

The production shape runs on Docker Compose from `infra/docker-compose.yml`:

```
cd infra
cp .env.example .env    # fill in real secrets
docker compose up -d    # postgres + minio + api + nginx (`+ caddy` on a real host)
```

| Service  | Purpose                                                             | Port                       |
| -------- | ------------------------------------------------------------------- | -------------------------- |
| postgres | PostgreSQL 16, **WAL archiving on** (`wal_archive` volume, ADR 010) | — (internal)               |
| minio    | S3-compatible object storage (documents/X-rays, ADR 005)            | 9000 (S3) · 9001 (console) |
| api      | Express, bundled single-file output                                 | 4000 (internal)            |
| nginx    | Serves the three SPAs + proxies `/api/` → api                       | 8080/8081/8082 (internal)  |
| caddy    | TLS termination + domain routing (`infra/caddy/Caddyfile`)          | 80 · 443                   |

- `nginx` image builds the SPAs inside Docker (multi-stage) — no host build needed.
- For local testing without DNS, set the `*_DOMAIN` vars to `localhost` so Caddy uses its internal CA.
- API image installs only `@dentora/api...` (includes workspace deps) — keeps the image lean.
- Secrets come from `infra/.env` (gitignored); never commit real credentials.

Sanity check after `up`:

```sh
docker run --rm --network dentora_internal curlimages/curl:latest http://nginx:8080/api/health
# -> {"status":"ok","service":"api",...}
```
