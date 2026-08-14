# Conventions

## Code standards

- TypeScript in **strict mode**; every workspace extends `packages/config/tsconfig.base.json`.
- Formatting is enforced by **Prettier** (`.prettierrc.json`: no semicolons, single quotes, trailing commas). `pnpm format:check` runs in CI.
- Linting is enforced by **oxlint** (`.oxlintrc.json`). `pnpm lint` runs in CI.
- **Conventional commits**: `feat(scope): subject`, `fix(scope): subject`, `docs(scope): …`, `chore(scope): …`, `refactor(scope): …`, `test(scope): …`.

## API & types

- Every input/output is a **Zod schema in `packages/contracts`**; frontends and the API import the inferred types — never duplicate types by hand.
- All endpoint inputs are validated before touching the database.
- Contracts change → update the OpenAPI export (`docs/api.md`) in the same commit.

## Git workflow

1. Work a single step from `PROCESS.md`.
2. **Never commit to `main`.** Work on `feat/<phase>-<slug>` or `fix/<slug>`.
3. Commit after every completed step (green: lint + typecheck + test + build).
4. When a phase or major step finishes its Definition of Done, push the branch and open a PR.
5. CI must pass on the branch; merge to `main` only after review.
6. `main` always stays deployable. Tag `v*` for production releases.

## Data & migrations

- Schema changes go through a **Prisma migration** and are committed with the feature.
- Migration workflow lives in `apps/api` (see its README; expanded when Prisma lands in Phase 0.4).

## Sensitive data

- Sensitive patient fields must use the encryption helper (ADR 006) — never plaintext.
- Every read/mutation of patient data writes an **audit event** (ADR 007).
- No secrets in code; env vars only, `.env*` gitignored except `.env.example`.

## i18n

- fr / ar / en for every user-facing string; never hardcode text in components.
- Arabic must be RTL-safe (logical CSS properties / `rtl:` utilities).
- Currency: DZD (number formatting via the shared locale helpers).
