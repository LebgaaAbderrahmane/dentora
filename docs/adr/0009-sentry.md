# ADR 0009 — Sentry from Phase 0

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

Clinic-critical software must fail loudly and be diagnosable. Logs alone are not enough to correlate errors across a browser SPA and an API, and nobody will be watching the console on the VPS.

## Decision

- **Sentry** is wired into `apps/api` and the `admin`/`portal` frontends during **Phase 0**.
- Backend logs use structured output (pino) alongside Sentry.
- A dashboard review is part of the Phase 6 hardening pass.

## Consequences

- Errors surface with stack traces, release, and user context.
- Requires a Sentry DSN in the environment (self-hosted or SaaS).
- Small dependency + request overhead; batched by the SDK.
