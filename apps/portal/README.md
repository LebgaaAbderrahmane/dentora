# @dentora/portal

Patient portal SPA (Phase 5.1, ADR 031): login, appointments history, invoices, online
booking/cancel.

- Vite dev server on **port 5175** with `/api` → `http://localhost:4000` proxy (same cookie
  session as admin).
- Uses `@dentora/contracts` types + `@dentora/i18n` (fr/ar/en) + `@dentora/ui`.
- Login is `requireRole('PATIENT')`; portal access is provisioned by the desk
  (Admin/Receptionist) via the patient detail screen — see `apps/api/README.md`
  (Patient portal section).
