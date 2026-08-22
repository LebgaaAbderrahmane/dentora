# ADR 036 — CI/CD final decision (Phase 6.6)

- **Date:** 2026-08-21
- **Status:** Accepted
- **Relates to:** ADR 011 (manual deploy initially — this closes its deferral), ADR 010
  (backups — the deploy flow stays backup-first), ADR 035/§9 6.4 (the e2e suite this
  promotes into CI)

## Context

ADR 011 shipped a manual VPS deploy runbook and deferred automation to 6.6. What exists
today:

- A GitHub Actions **CI** workflow (`.github/workflows/ci.yml`: format/lint/typecheck/
  test/build on every PR and push to main) — live since Phase 0.
- A **Playwright e2e suite** (19 specs across web/admin/portal, §9 6.4) that runs only
  on developer machines — not enforced anywhere.
- A proven but fully **manual deploy**: SSH → `docker compose build/up` + migration
  step from a repo checkout (`docs/deploy.md`), single host, one maintainer.
- Migrations are the risky deploy step: forward-only, occasionally destructive, and the
  runbook mandates a fresh backup before applying them.

The question for 6.6: how much automation is right for a single-host clinic system with
one operator?

## Decision

1. **CI gains an e2e job.** The full gate on every PR becomes format → lint → typecheck
   → unit tests → build → **Playwright against a real Postgres** (service container,
   migrations applied, demo seed loaded). The suite's rate-limit env overrides are
   passed by the workflow exactly as locally. Core flows are no longer enforced only by
   discipline.
2. **CD = manual-trigger workflow, not auto-deploy.** A `workflow_dispatch` deploy
   workflow (main-only, environment-gated secrets) SSHes to the host and executes the
   documented runbook steps in order: backup check → `git pull` → image build →
   `prisma migrate deploy` → `up -d` → health + archiver verification. Deploys stay
   **deliberate acts** chosen by the operator, because:
   - Migrations can be destructive; the backup-first decision belongs to a human who
     just read the migration folder.
   - There is no staging environment to absorb a bad auto-deploy — prod is the only prod.
   - Deploy frequency is low (clinic software), so the tax of one click is negligible.
3. **Rollback remains manual per `docs/deploy.md`** (tagged images + logical restore /
   PITR). Automating rollback without automating judgment is worse than a runbook.

## Consequences

- Every PR is gated by the same checks developers run locally — including browser-level
  flows (login, booking, patient CRUD) — so regressions like the preview-server proxy
  mismatch found in 6.4 cannot merge silently.
- Deploying needs four repository secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`,
  `DEPLOY_PATH`); until they exist the workflow fails fast at the SSH step, which is the
  correct reminder that infra isn't wired yet.
- CI runtime grows (~+3–4 min for services, seed, browsers); acceptable — it replaces an
  unenforced local ritual.
- If the clinic later wants push-to-deploy, the workflow body is already the runbook;
  switching the trigger is a one-line change plus a staging host — out of scope today.
