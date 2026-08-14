# ADR 0002 — REST + Zod + shared `packages/contracts`

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

Three TypeScript frontends and an Express API need to share request/response shapes without contract drift. Manually duplicated types rot quickly.

## Decision

- HTTP **REST** API.
- Every input/output schema lives as a **Zod schema** in `packages/contracts`.
- Types are **inferred** from the schemas and consumed by the API and all frontends — a single source of truth.
- Endpoint inputs are validated with these schemas before touching the database.

## Consequences

- Single source of truth for types; contract drift becomes a compile error, not a runtime surprise.
- Easy path to auto-generate OpenAPI 3 (`zod-to-openapi`) for `docs/api.md`.
- Adds a shared dependency (zod) that must stay minimal and stable.
