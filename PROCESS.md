# Dentora PMS — Process & Roadmap Log

> Living document: updated at every session. Keeps decisions, step-by-step plan, progress, and conventions in one place so we're always in context.
> **Rules:** update §14 (session log) and flip checkbox statuses in §9 whenever you make progress. Documentation lives in `README.md` + `docs/` (see §11).

---

## 1. Vision

Transform `dentora` from a static marketing site into a complete, self-hosted dental practice management system ("Dentora PMS") for a single Algerian clinic (designed multi-branch ready):

- **Patients** — records, medical history, odontogram, documents/X-rays
- **Appointments** — calendar, statuses, waiting list, no-shows, reminders
- **Billing & Finance** — invoices, payments, receipts, expenses, daily cash close-out, P&L
- **Stock** — products, suppliers, purchase orders, ledger, expiry alerts, per-treatment consumption, sterilization logs
- **Staff & Interns** — roles/permissions, schedules, attendance, intern hours/mentor/rotation, payroll
- **Dashboard + Reports** — KPIs, occupancy, revenue, stock valuation, CSV/PDF export
- **Patient portal** — login, history/invoices, online booking/cancel
- **Public site** — stays separate; booking modal creates pending requests

Requirements: visually & code professional, fr/ar/en (RTL), DZD currency. Medical data ⇒ encryption at rest, audit logging, and access control from day one. Production system → will be operated and extended by other people, so documentation is a first-class deliverable.

## 2. Current state (baseline commit `5323fcc`)

- Static Vite React 19 SPA at repo root (marketing site for "Dentora").
- Tailwind 4, i18next (fr/ar/en), motion, lucide, shadcn-style UI.
- No backend, no DB, no auth. Booking = WhatsApp modal.
- Lint: oxlint. Build: `tsc -b && vite build`. Package manager: pnpm.

**After 0.1:** the SPA now lives in `apps/web/` inside a pnpm monorepo (`apps/{web,admin,portal,api}`, `packages/{contracts,ui,config}`).

## 3. Confirmed decisions

| Area           | Decision                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Deployment     | Self-hosted web app, VPS + Docker Compose; **manual deploy runbook initially** (ADR 011), CI/CD decided in 6.6             |
| Backend        | Express + TypeScript + Prisma + PostgreSQL                                                                                 |
| API style      | REST + Zod; schemas shared via `packages/contracts` (ADR 002)                                                              |
| Frontend       | **Three** Vite SPAs: `web` (public), `admin` (staff), `portal` (patients) — ADR 003                                        |
| Frontend stack | React Router v7, TanStack Query, React Hook Form + Zod, Zustand, recharts, Tailwind 4                                      |
| Auth           | httpOnly cookie sessions + server-side session store; revoke-all endpoint; revocation on role change                       |
| Roles          | `admin` · `dentist` · `receptionist` · `accountant` · `intern` · `patient`                                                 |
| Scope          | Staff app + patient portal; public marketing site kept separate                                                            |
| Branches       | Single clinic now, `branchId` everywhere (multi-branch ready)                                                              |
| Offline        | PWA (Workbox): cache app shell, offline-queue bookings                                                                     |
| i18n           | fr / ar / en, RTL, DZD (reuse existing i18next system)                                                                     |
| Monorepo       | pnpm workspaces: `apps/{web,admin,portal,api}`, `packages/{contracts,ui,config}`                                           |
| Object storage | **MinIO** (S3-compatible, self-hosted) for documents/X-rays; signed-URL delivery; server-side encryption at rest (ADR 005) |
| Encryption     | Field-level AES-256-GCM for MedicalHistory; app-level key via env (ADR 006)                                                |
| Audit log      | Basic (view/edit on patient records) from Phase 0; admin UI in Phase 6 (ADR 007)                                           |
| Observability  | Sentry on api + admin/portal from Phase 0 (ADR 009)                                                                        |
| Backups        | Nightly pg_dump + WAL archiving/PITR; documented RTO/RPO; restore runbook (ADR 010)                                        |
| Infra          | postgres + minio + api + SPAs (nginx) + caddy TLS                                                                          |

## 4. Architecture

```
dentora/
├─ apps/
│  ├─ web/          # public marketing site (moved from root; booking → API)
│  ├─ admin/        # staff SPA
│  ├─ portal/       # patient SPA
│  └─ api/          # Express server (REST + Zod)
├─ packages/
│  ├─ contracts/    # Zod schemas + inferred types (api ↔ frontends)
│  ├─ ui/           # design system (grown incrementally, not spec-built)
│  └─ config/       # shared tsconfig / lint presets
├─ infra/           # docker-compose, nginx/caddy, backup scripts, runbook
├─ docs/            # human documentation (see §11)
├─ README.md        # project overview + quickstart
└─ PROCESS.md       # this file
```

Data flow: frontends → api (Zod-validated REST) → PostgreSQL + MinIO. Files are never served directly from the app; clients get short-lived signed URLs.

## 5. Infrastructure (VPS + Docker)

- Services: `postgres` (volume + WAL archiving) · `minio` (volume) · `api` · three SPAs behind `nginx` · `caddy` reverse proxy (auto Let's Encrypt).
- Backups: nightly `pg_dump` + continuous WAL archive for point-in-time recovery; retention 7/30/90; restore script + runbook with measured RTO/RPO.
- Observability: Sentry; backend structured request logging (pino).
- Security: non-root containers, helmet, rate limiting, CSRF, Zod validation everywhere, audit log, field-level encryption.

## 6. Data model (Prisma — grown per feature, branch-scoped)

**Phase 0 (minimal):** Users · Roles · Sessions · Patients (skeleton) · Branch.
**Grown in later phases:** Permissions matrix · MedicalHistory (encrypted) · Odontogram/Tooth · Documents (MinIO key refs) · Services & Pricing · Appointments (+WaitingList, NoShow) · Treatments (per-tooth/service) · Invoices/InvoiceLines · Payments (CASH/CHEQUE/CARD/TRANSFER) · Expenses · Payroll · Staff & Interns · Attendance · Shifts · Products · StockMovement (ledger) · ProductBatch (expiry) · Suppliers · PurchaseOrders · TreatmentStockUsage · SterilizationLog · Notifications/Reminders · AuditLog · Settings.

## 7. Standards

### 7.1 Code standards (professional bar)

- TypeScript strict; shared lint (oxlint) + Prettier; conventional commits.
- Every feature: Zod schema in `packages/contracts` → inferred types; tested (Vitest units; Playwright e2e for core flows).
- Sensitive fields must use the encryption helper (never plaintext in DB).
- Every patient-record read/mutation writes an audit event.
- No secrets in code; `.env` via `infra/.env.example`; i18n keys never hardcoded in components.

### 7.2 Git & documentation rules

- **Commit after every roadmap step** (§9) with a conventional message scoped to the step, e.g. `feat(api): auth + RBAC middleware`.
- **Phase or major step finished & DoD green → push to a dedicated branch**: `feat/<phase>-<slug>` or `fix/<slug>`.
- Merge to `main` only when DoD is met; `main` always stays deployable; tag releases for production.
- Docs are written in the **same commit** as the code they describe — never a separate cleanup task.
- Update §14 log + flip §9 checkboxes in the same commit.

## 8. Definition of Done (every step)

- [ ] Lint-clean (`pnpm lint`) + typecheck + build pass
- [ ] Tests added & passing (Vitest; Playwright where applicable)
- [ ] Prisma migration created when schema changes
- [ ] Audit events covered for any patient-data access/change
- [ ] i18n fr/ar/en complete + RTL checked
- [ ] Docs updated (`docs/`) + conventional commit + §9/§14 statuses flipped

## 9. Roadmap — step-by-step

Legend: `[ ]` todo · `[/]` in progress · `[x]` done

### Phase 0 — Walking skeleton (thin vertical slice)

Goal: prove login → authed API → admin dashboard stub end-to-end. No speculative building.

- [x] **0.0 Planning** — decisions locked (ADRs 003/005–007/009–011), PROCESS.md written
- [x] **0.1 Monorepo restructure** — move web app to `apps/web/`; scaffold `apps/{admin,portal,api}` + `packages/{contracts,ui,config}`; root scripts (`dev/build/lint/typecheck/test`); **verify `web` builds identically** ✅
- [x] **0.2 Tooling + CI + docs skeleton** — shared tsconfig, oxlint + Prettier, Vitest, GitHub Actions (lint→typecheck→test→build); `README.md` + `docs/` tree + ADR files; deploy stays manual (0.9 runbook) ✅
- [x] **0.3 Docker + DB + storage + proxy** — docker-compose (postgres + minio + caddy + nginx), `infra/.env.example`, volumes, WAL archiving on ✅
- [ ] **0.4 Minimal Prisma + encryption lib** — schema: users/roles/sessions/branch/patients-skeleton; seed admin; AES-256-GCM helper (ADR 006)
- [ ] **0.5 Auth + RBAC + sessions** — login page, cookie session, role/permission middleware, **revoke-all + revocation on role change**
- [ ] **0.6 Basic audit log** — view/edit events on patient records; service + middleware (ADR 007)
- [ ] **0.7 Sentry** — wired to api + admin/portal (ADR 009)
- [ ] **0.8 App shells** — admin layout + login-gated dashboard stub reading real data; portal skeleton; i18n fr/ar/en + theme + RTL; minimal ui tokens/Button/Input/Card/Toast only
- [ ] **0.9 Backups + deploy runbook** — pg_dump + WAL/PITR confirmed, restore script, RTO/RPO measured, manual deploy steps in `docs/deploy.md`
- **DoD:** admin logs in → dashboard stub renders live data; `web` untouched & building.

### Phase 1 — Clinical core (features drive the design system)

- [ ] 1.1 Patients CRUD + search/pagination
- [ ] 1.2 Medical history (record/edit, field-level encryption)
- [ ] 1.3 Odontogram (interactive tooth chart)
- [ ] 1.4 Documents upload/view (MinIO, signed URLs, audit on view)
- [ ] 1.5 Appointments calendar (day/week/month) + conflict check + statuses
- [ ] 1.6 Waiting list + no-show handling
- [ ] 1.7 Dashboard KPIs (today's visits, revenue, no-shows, low-stock alerts)
- [ ] 1.8 Public-site booking → API creates pending request (web ↔ api)
- **DoD:** end-to-end patient → appointment → dashboard flow works.

### Phase 2 — Billing & Finance

- [ ] 2.1 Service catalog & pricing (DZD, duration, insurance coverage)
- [ ] 2.2 Invoices + lines + numbering, status (paid/partial/unpaid/void)
- [ ] 2.3 Payments (cash/cheque/card/transfer), partial, receipts, refunds
- [ ] 2.4 Expenses + categories
- [ ] 2.5 Daily cash close-out + P&L report
- **DoD:** invoice → payment → receipt works; P&L reflects data.

### Phase 3 — Stock & Inventory

- [ ] 3.1 Products, categories, units, reorder levels
- [ ] 3.2 Suppliers + purchase orders
- [ ] 3.3 Stock ledger (in/out/adjust), batch + expiry tracking
- [ ] 3.4 Low-stock + expiry alerts
- [ ] 3.5 Treatment-stock consumption + sterilization logs
- **DoD:** stock flows with every treatment and purchase; alerts fire.

### Phase 4 — Staff & Interns

- [ ] 4.1 Staff management + schedules
- [ ] 4.2 Attendance tracking
- [ ] 4.3 Intern management (school, hours, mentor, rotation)
- [ ] 4.4 Payroll (base, bonus, deductions, net)
- **DoD:** staff/intern hours flow into payroll.

### Phase 5 — Patient portal + notifications

- [ ] 5.1 Portal login, view history/invoices, online booking/cancel
- [ ] 5.2 Notifications: WhatsApp + email reminders (configurable provider)
- **DoD:** patient books/cancels online; reminders scheduled.

### Phase 6 — Reports & hardening

- [ ] 6.1 Reports: occupancy, revenue, stock valuation + CSV/PDF export
- [ ] 6.2 Audit log admin UI + retention policy
- [ ] 6.3 PWA offline (app shell + offline booking queue)
- [ ] 6.4 Playwright e2e for core flows
- [ ] 6.5 Security/perf audit, DR drill (restore from backup verified), review Sentry dashboards
- [ ] 6.6 Final CD automation decision; README + docs consolidation
- **DoD:** full system hardened, documented, exportable, backup-restore proven.

## 10. Dev workflow & commands

- `pnpm dev` — run all apps (or per-workspace)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`
- Migrations + seed run inside `apps/api`: `pnpm prisma:migrate` / `pnpm prisma:seed`
- Conventional commits; update §9 + §14 after each completed step.

## 11. Documentation map (docs-as-code)

| File                     | Content                                                       | Maintained in   |
| ------------------------ | ------------------------------------------------------------- | --------------- |
| `README.md`              | Project overview, architecture, stack, quickstart             | 0.2 + as needed |
| `docs/setup.md`          | Dev environment, env vars, docker-compose                     | 0.3 + as needed |
| `docs/deploy.md`         | Manual VPS deploy runbook (caddy TLS, updates, rollback)      | 0.9 + as needed |
| `docs/backup-restore.md` | pg_dump + WAL/PITR, restore procedure, RTO/RPO                | 0.9 + as needed |
| `docs/api.md`            | Auto-generated OpenAPI 3 from Zod schemas (served at `/docs`) | per endpoint    |
| `docs/conventions.md`    | Code standards, i18n keys, commit style, migration workflow   | 0.2 + as needed |
| `docs/security.md`       | Encryption model, sessions/RBAC, audit, threat notes          | per change      |
| `docs/adr/`              | One file per ADR (003, 005–007, 009–011) + index              | per ADR         |
| per-app `README.md`      | `api`, `admin`, `portal`, `web`, packages                     | per app         |

## 12. Git workflow

1. Work a single §9 step on a feature branch: `feat/<phase>-<slug>` (or `fix/<slug>`). **Never commit to `main`.**
2. Commit when the step is green (`feat|fix|docs|chore|refactor(...)`).
3. When a **phase or major step** completes its DoD → push the branch and open a PR; CI must be green.
4. Merge to `main` only after review; `main` stays deployable; tag `v*` for production.

## 13. ADR decision log

| #   | Date       | Decision                                                   | Reason                                        |
| --- | ---------- | ---------------------------------------------------------- | --------------------------------------------- |
| 002 | 2026-08-14 | REST + Zod + shared `packages/contracts`                   | Contract safety across TS apps                |
| 003 | 2026-08-14 | Three frontends: web/admin/portal                          | Auth isolation; web stays SEO marketing site  |
| 005 | 2026-08-14 | MinIO object storage, signed-URL delivery                  | Self-hosted, S3-compatible, medical documents |
| 006 | 2026-08-14 | Field-level AES-256-GCM for MedicalHistory                 | Sensitive medical data at rest                |
| 007 | 2026-08-14 | Basic audit log from Phase 0                               | No blind spot on patient-data access          |
| 009 | 2026-08-14 | Sentry from Phase 0                                        | Clinic-critical; fail with visibility         |
| 010 | 2026-08-14 | pg_dump + WAL/PITR, documented RTO/RPO                     | Medical/financial data survivability          |
| 011 | 2026-08-14 | Manual deploy runbook initially; CD decided in 6.6         | Ship first, automate later                    |
|     |            | (append as decisions are made; full detail in `docs/adr/`) |                                               |

## 14. Session log / progress

| Date       | Scope    | Status / Notes                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-14 | Planning | ADRs 002/003/005–007/009–011 recorded; roadmap revised per review (walking skeleton, MinIO, encryption, audit, Sentry, backup rigor, granular scope)                                                                                                                                                                                                                                            |
| 2026-08-14 | 0.1      | Monorepo restructured. Web app → `apps/web/` (rename-tracked). Scaffolds: `apps/admin`, `apps/portal` (Vite React + Tailwind stubs), `apps/api` (Express + Zod + `@dentora/contracts`, tsup build, `/health` verified), `packages/contracts` (shared Zod schemas), `packages/ui`, `packages/config`. Root scripts: dev/build/typecheck/test/lint. All green: typecheck, build, lint, test.      |
| 2026-08-14 | 0.2 | Tooling + CI + docs. All workspaces extend `packages/config/tsconfig.base.json`. Prettier (no-semi/single-quote) + `format`/`format:check`. GitHub Actions CI (format→lint→typecheck→test→build). Root `README.md`, `docs/` tree (setup, conventions, security, ADR index + 8 ADR files), per-app READMEs. Branch policy: work on `feat/phase0-tooling-ci-docs`; main frozen. All checks green. |
| 2026-08-14 | 0.3 | Docker infra. `infra/docker-compose.yml` (postgres+minio+api+nginx+caddy), `.env.example`, WAL archiving `on` (wal_archive volume), `.dockerignore`, `apps/api/Dockerfile` (single-stage build, `@dentora/api...` filter, bundled runtime), `infra/nginx/Dockerfile` (builds SPAs in-image) + nginx.conf (3 sites, `/api` proxy), `infra/caddy/Caddyfile` (domain routing). API routes standardized under `/api`. Verified live: postgres+minio healthy, `/api/health` End-to-end (nginx→api→contracts), all 3 SPAs served by nginx. `dangerouslyAllowAllBuilds` for pnpm 11 (esbuild/oxide postinstall). Left branch `feat/phase0-docker-infra`. |
| | | (append every session) |
