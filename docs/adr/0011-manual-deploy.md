# ADR 0011 — Manual deploy runbook initially

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

Automating deploys is valuable but adds moving parts (pipeline secrets, SSH access from CI) before the system is stable. Shipping working software first is the priority.

## Decision

- Deploys to the VPS are **manual, following a documented runbook** (`docs/deploy.md`) during initial development.
- The decision on CI/CD automation is revisited and finalized in **Phase 6.6**, once the system is stable and teams know the deploy cadence they need.

## Consequences

- No pipeline-to-server attack surface in early stages; deploys are deliberate.
- Requires discipline to follow the runbook; rollback steps are part of it.
