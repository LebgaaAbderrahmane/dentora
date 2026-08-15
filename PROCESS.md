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
- [x] **0.4 Minimal Prisma + encryption lib** — Prisma 7.9 driver-adapter schema (Branch/User/Session/Patient/Setting + Role enum), migration applied, seed creates admin; AES-256-GCM helper with tests; `/api/system/status`; api bundled ESM with external deps, verified standalone + in Docker ✅
- [x] **0.5 Auth + RBAC + sessions** — opaque 256-bit token cookie sessions (SHA-256 in DB), login/logout/me/revoke-all/change-password, role/ADMIN middlewares, **role change revokes all sessions**; admin login page + ADMIN users panel ✅
- [x] **0.6 Basic audit log** — `AuditLog` table (action/target/metadata/ip/userAgent), service + middleware helper, wired into auth + user events; `GET /api/audit` (ADMIN, paginated/filtered); admin panel; patient events ready for 1.1 ✅
- [x] **0.7 Sentry** — DSN-guarded on api + admin/portal (build-time `VITE_SENTRY_DSN`); API error middleware captures with user context; pino structured logs alongside (ADR 009) ✅
- [x] **0.8 App shells** — admin layout + login-gated dashboard stub reading real data; portal skeleton; i18n fr/ar/en + theme + RTL; minimal ui tokens/Button/Input/Card/Toast only ✅
- [x] **0.9 Backups + deploy runbook** — WAL archiving fixed (volume ownership), `backup.sh`/`restore.sh`, PITR drill passed (RTO ~2 s, RPO ≤5 min), `docs/backup-restore.md` + `docs/deploy.md` ✅
- **DoD:** admin logs in → dashboard stub renders live data; `web` untouched & building.

### Phase 1 — Clinical core (features drive the design system)

- [x] **1.1 Patients CRUD + search/pagination** — branch-scoped routes (ADMIN/DENTIST/RECEPTIONIST), create/update/detail/list with ILIKE search (`q`) + `archived` filter, soft-delete via `archivedAt` (+`PATIENT_ARCHIVED`/`PATIENT_RESTORE` audit events), `notes` AES-256-GCM encrypted at rest and decrypted only on detail; API contract tests + live-verified; admin PatientsView (search, table, create/edit/detail modals, archive/restore) ✅
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

| Date       | Scope    | Status / Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-14 | Planning | ADRs 002/003/005–007/009–011 recorded; roadmap revised per review (walking skeleton, MinIO, encryption, audit, Sentry, backup rigor, granular scope)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-14 | 0.1      | Monorepo restructured. Web app → `apps/web/` (rename-tracked). Scaffolds: `apps/admin`, `apps/portal` (Vite React + Tailwind stubs), `apps/api` (Express + Zod + `@dentora/contracts`, tsup build, `/health` verified), `packages/contracts` (shared Zod schemas), `packages/ui`, `packages/config`. Root scripts: dev/build/typecheck/test/lint. All green: typecheck, build, lint, test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-14 | 0.2      | Tooling + CI + docs. All workspaces extend `packages/config/tsconfig.base.json`. Prettier (no-semi/single-quote) + `format`/`format:check`. GitHub Actions CI (format→lint→typecheck→test→build). Root `README.md`, `docs/` tree (setup, conventions, security, ADR index + 8 ADR files), per-app READMEs. Branch policy: work on `feat/phase0-tooling-ci-docs`; main frozen. All checks green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-08-14 | 0.3      | Docker infra. `infra/docker-compose.yml` (postgres+minio+api+nginx+caddy), `.env.example`, WAL archiving `on` (wal_archive volume), `.dockerignore`, `apps/api/Dockerfile` (single-stage build, `@dentora/api...` filter, bundled runtime), `infra/nginx/Dockerfile` (builds SPAs in-image) + nginx.conf (3 sites, `/api` proxy), `infra/caddy/Caddyfile` (domain routing). API routes standardized under `/api`. Verified live: postgres+minio healthy, `/api/health` End-to-end (nginx→api→contracts), all 3 SPAs served by nginx. `dangerouslyAllowAllBuilds` for pnpm 11 (esbuild/oxide postinstall). Left branch `feat/phase0-docker-infra`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-08-14 | 0.4      | Prisma + encryption. Phase 0.3 branch merged via commit `bf24cf2` (archived PR on `main`). Prisma 7.9 + `@prisma/adapter-pg` driver adapter (no native engine; generated client into `apps/api/src/generated`, gitignored). Schema v0: Branch, User, Session, Patient, Setting + Role enum; migration `20260814172336_init` applied to dev DB; seed creates `admin@dentora.dz`/Role ADMIN. AES-256-GCM helper (`src/lib/encryption.ts`, `ENCRYPTION_KEY` 64-hex from `.env`), 3 unit tests pass. API now exposes `/api/system/status` (db health, contract in `packages/contracts`). **Bundle fix:** ESM tsup with runtime deps external (`@prisma/client`, `@prisma/adapter-pg`, pg, express, zod, bcryptjs, dotenv `dependencies`) + Docker runtime does `--prod` filtered install of node_modules, then `node dist/index.js`; verified standalone and in-container (`api:4000/api/system/status` → `{"ok":true,"db":"up"}`). Added `.claude/.agents/.windsurf/skills-lock.json` to gitignore. All checks green: format, lint (oxlint), typecheck, tests 3/3, full `pnpm build`. Branch `feat/phase0-prisma-encryption`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-14 | 0.5      | Auth + RBAC + sessions. Migration `20260814180000_auth_sessions_token_hash` (Session stores `tokenHash` = SHA-256, never the raw token). Contracts: roleSchema, safeUserSchema, login/changePassword/updateUserRole/authResponse/userList/revokeSessions schemas. API: `src/lib/session.ts` (256-bit token gen, hash, cookie set/clear, manual cookie parse — no cookie-parser dep), `src/lib/auth.ts` (loadSession, requireAuth, requireRole, Express Request augmentation), `src/routes/auth.ts` (login/logout/me/revoke-all/change-password), `src/routes/users.ts` (ADMIN: list, `PATCH :id/role` **revokes all sessions**, `POST :id/revoke-sessions`), central error middleware. Verified live via curl: login, me, users, FORBIDDEN for DENTIST on `/api/users`, role-change → target session revoked (UNAUTHORIZED), change-password rotates + revokes others, logout. Admin app: `@dentora/contracts` dep, vite proxy `/api`→4000, pinned port 5174, login page (fr UI) + gated shell + ADMIN users panel (role dropdown + revoke buttons). Verified through the vite proxy end-to-end. Tests: session.test.ts (5) + contracts index.test.ts (4); 12 total pass. Docs: security.md (session model), api README route table, `.env.example` `SESSION_TTL_DAYS`. Branch `feat/phase0-auth-rbac`.                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-14 | 0.6      | Basic audit log (ADR 007). Schema: `AuditLog` model + `AuditAction`/`AuditTarget` enums (incl. PATIENT_* ready for 1.1), denormalized actorEmail, indexes (branchId+createdAt, action, actorId); migration `20260814191000_audit_log` generated via `prisma migrate diff --from-migrations` (added `SHADOW_DATABASE_URL` to prisma.config + created `dentora_shadow` in dev postgres since Prisma 7 dropped `--from-url`). `src/lib/audit.ts`: `recordAudit` + `recordAuditFor(req)` (injects actor/branch/ip/userAgent from request), `requestMeta`. Wired into auth login (success/failure), logout, change-password, revoke-all, and users role-change/revoke-sessions. `GET /api/audit` (ADMIN, branch-scoped, action/targetType/actorEmail filters, limit≤200/offset). Fixed: LOGIN_SUCCESS was being written with branchId 'system' (hidden by branch filter) → now carries the user's branch. Contracts: auditAction/auditTarget/auditEntry/auditList/auditQuery schemas. Admin `AuditPanel` (recent 50 entries table + action filter). Tests: +2 contracts audit suites (6 total in contracts). Verified live: login → LOGIN_SUCCESS, failed login → LOGIN_FAILURE, role change → USER_ROLE_CHANGE with from/to metadata, filter works. Branch `feat/phase0-audit`.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-08-14 | 0.7      | Sentry + structured logs (ADR 009). API: `@sentry/node` 10.70 + `src/lib/sentry.ts` (`initSentry`/`captureError` no-op when `SENTRY_DSN` empty, user context + route/method extras on error), `src/lib/logger.ts` (pino JSON, `LOG_LEVEL`), request middleware logs method/url/status/durationMs, error middleware logs + captures. Admin + portal: `@sentry/react` init guarded by build-time `VITE_SENTRY_DSN` (`import.meta.env`), `<Sentry.ErrorBoundary>` around App in main.tsx. `.env.example`: `LOG_LEVEL`, `SENTRY_DSN`, `VITE_SENTRY_DSN`. Docs: setup.md Sentry section (SPA DSN baked at build), security.md incident visibility, api README. Tests: +1 sentry no-op test (15 total). Verified: api boots w/o DSN (no crash), structured request logs present, dist bundle boots, all builds green. Dropped `pino-http` (custom 6-line middleware instead). Branch `feat/phase0-sentry`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-14 | 0.8      | App shells + i18n/theme/ui. New `packages/i18n` (`@dentora/i18n`): fr/ar/en dictionaries keyed from fr (`MessageKey`), `I18nProvider` sets `documentElement.lang`/`dir` (RTL for ar), localStorage `dentora-locale`; contexts split into `src/context.ts` to keep react-refresh lint clean. `packages/ui` (`@dentora/ui`): `tokens.css` brand emerald palette + `@custom-variant dark` (Tailwind 4 class dark mode), `cn`, `Button`, `Input`, `Card`, `ToastProvider`/`useToast`, `ThemeProvider`/`useTheme` (`dentora-theme`, light/dark/system via matchMedia); contexts moved to `theme-context.ts`/`toast-context.ts` + hooks in `useTheme.ts`/`useToast.ts` (fast-refresh clean). Admin: main.tsx wires ThemeProvider>I18nProvider>ToastProvider inside Sentry.ErrorBoundary, index.css imports tailwind + `@dentora/ui/tokens.css`; App.tsx rewritten → i18n login page (brand Card, Input/Button, fr/default locale), gated shell with sidebar nav (Dashboard/Users/Audit, ADMIN-gated), lang + theme switchers, logout; views `DashboardView.tsx` (live `/api/system/status` via `api.systemStatus`, uptime, error toast), `UsersView.tsx` (role select + revoke, ROLE_KEY→msg), `AuditView.tsx` (action filter + entries, ACTION_KEY→msg). Portal: providers + tokens import + translated skeleton shell (brand header, hero, Card, lang/theme switchers). Verified: full checks green (oxlint clean incl. fast-refresh, typecheck 8/8, 15 tests, all builds), admin dev server serves on 5174 (strictPort) with `/api`→4000 proxy and workspace module resolution via `/@fs/`, tokens.css dark-variant + brand tokens compiled into dist CSS. `web` untouched. Branch `feat/phase0-shells`. |
| 2026-08-15 | 0.9      | Backups + deploy runbook (ADR 010/011). Fixed silent WAL-archiving failure: `wal_archive` volume was docker-root-owned so every `archive_command` ran as postgres user and failed (`pg_stat_archiver` `archived_count=0`, `failed_count` climbing 298→301) → `infra/postgres-entrypoint.sh` chowns `/wal_archive`; added `infra/postgres-pg_hba.conf` replication rule (hba_file) so `pg_basebackup` works. `infra/backup/backup.sh` (daily pg_dump -Z6 keep 14, WAL sync via tar-as-uid-70 off the volume, base `pg_basebackup -Ft -z -X stream` keep 3 incl. `pg_wal.tar` redo) + `restore.sh` (`--logical --yes` destructive import; `--pitr <base> [--at                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | --lsn] [--verify]`throwaway instance on 127.0.0.1:55432). CI fix merged (PR #2): ci.yml "Generate Prisma client" step + api`"prepare": "prisma generate"`. **PITR drill passed** (2026-08-15): sentinel table → base (redo `0/41000028`) → incident UPDATE+INSERT (LSN `0/42000230`) → re-sync WAL → fork to `0/41020028`→ recovered`preserve=original`, incident row absent, promoted; target-after-redo and archive-coverage gotchas hit+fixed (both went in the runbook). **RTO measured ~2 s** (small dev DB, warm disk; dominated by base extraction + replay length in real life), **RPO ≤5 min** (`archive_timeout=300`). Docs: `docs/backup-restore.md`(layout, archiving wiring, 3 restore modes, gotchas, drill checklist, off-site note) +`docs/deploy.md`(env, build/up, migrations-from-checkout, verify incl. pg_stat_archiver, rollback via image tags, incident table). 0.9 restored-state RBAC tests deliberately left to 1.0/1.1 planning (locked for 1.1: patient soft delete`archivedAt`+`PATIENT_ARCHIVED`audit event,`Patient.notes`encrypted, identity ILIKE search ADR-006-safe). Branch`feat/phase0-backups`. |
| 2026-08-15 | 1.1      | Patients CRUD + search + soft delete (search decision Option A locked). Schema: Patient.archivedAt + AuditAction gains PATIENT_ARCHIVED/PATIENT_RESTORE (dropped PATIENT_DELETE; hard delete is out for patients). Migration 20260815120000_patient_archived_at (enum recreate + column) applied via prisma migrate deploy. Contracts: genderSchema, patientInputSchema (notes max 4000), patientUpdateSchema (partial, >=1 field), patientSchema (list/summary, NO notes), patientDetailSchema (+ notes, decrypted only here), patientListSchema, patientQuerySchema (q/archived exclude                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | include                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | only/limit<=200/offset), PatientQueryParams type. API src/routes/patients.ts: router-gated requireRole(ADMIN, DENTIST, RECEPTIONIST), branch-scoped always; list = ILIKE across firstName/lastName/phone/email (identity plaintext, ADR 006-safe) with archive filter + total; POST/PATCH encrypt notes AES-256-GCM; GET :id decrypts notes + audits PATIENT_VIEW; POST :id/archive | restore set/clear archivedAt + audit event; empty-string->null coercion; mounted at /api/patients. Admin: PatientsView (debounced search, archived filter, table, create/edit form modal, detail modal with decrypted notes), api.ts methods, staff-role nav entry, AuditView action map updated, i18n fr/ar/en. Live-verified on internal network (throwaway container): 26 checks green - admin CRUD, notes encrypted at rest/decrypted on detail, list never emits notes, archive/restore in archived filters + audit trail, receptionist create/list OK + 403 on /users and /audit, invalid/empty 400, missing 404; test rows cleaned up. Contracts tests +4 (10 total), typecheck 8/8, oxlint clean, builds green. Dockerfile: runtime --prod now --ignore-scripts (PR-2 prepare hook broke slim image) + longer pnpm fetch retries. Branch feat/phase1-patients. |
|            |          | (append every session)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
