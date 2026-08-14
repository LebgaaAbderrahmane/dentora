# ADR 0003 — Three frontends: web / admin / portal

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

The product has three very different audiences: the public marketing site, the internal staff app, and the patient portal. They have different auth models, build needs, and change cadence.

## Decision

Keep **three separate SPAs** in one pnpm monorepo:

- `apps/web` — public marketing site (SEO-driven, no auth, i18n fr/ar/en).
- `apps/admin` — staff management app (auth required, complex data-heavy UI).
- `apps/portal` — patient portal (patient auth, read + self-booking).

## Consequences

- Independent builds, deploys, and release cycles per audience.
- Auth isolation: staff and patient credentials never share a code path.
- More infra to run (three static hosts behind nginx), shared via `packages/ui` + `packages/contracts`.
