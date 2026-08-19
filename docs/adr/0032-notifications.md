# ADR 032 — Appointment reminders (Phase 5.2)

- **Date:** 2026-08-19
- **Status:** Accepted
- **Relates to:** ADR 013 (appointments), ADR 002 (shared Zod contracts), ADR 007 (audit —
  new `NOTIFICATION_CONFIG_UPDATE` action + `NOTIFICATION` target), ADR 006 (encryption at
  rest for stored delivery secrets), ADR 031 (patient portal reuses the same reminder
  preferences surface)

## Context

Phase 5.2 reminds patients about upcoming appointments over **WhatsApp and/or email**. The
reminder must be a no-reply notice listed per (appointment, channel) and must never resend
twice. The clinic wants:

- **Two delivery channels** — WhatsApp (via a generic webhook — the clinic can point it at
  WhatsApp Business API, a commercial gateway, or a placeholder) and SMTP email.
- **An explicit window** — reminders go out for appointments starting _within the next
  N minutes_ (configurable per clinic, default 24h, clamped 30..10080 = 7 days).
- **Patient opt-out per channel** — a patient can turn off WhatsApp and/or email reminders
  from the portal (ADR 031 surface) and the desk from the patient record.
- **Observability** — a delivery log the admin can read and filter, plus a manual
  "send now" button for testing.

Three design questions:

1. **How do we prevent duplicate sends?** Delivery state is a first-class row per
   (appointment, channel) — the row's existence _is_ the idempotency guard via
   `@@unique([appointmentId, channel])`, so a crashed sweep can never double-send.
2. **Where do secrets live?** The delivery config (webhook URL, SMTP credentials) is
   sensitive. We store it in an existing `Setting` row as JSON with the secret fields
   AES-256-GCM encrypted (ADR 006) and the API only ever exposes `{ set: boolean }` — the
   real secret is write-only.
3. **What triggers a send?** A background sweep on the API process (unref'd interval,
   per branch) plans + delivers due reminders; the config's `enabled` flag is an
   emergency master kill-switch that turns it into a no-op sweep.

## Decision

**Idempotency-first delivery.** `NotificationLog` carries `branchId`,
`appointmentId`, `channel` (WHATSAPP/EMAIL), `status` (SENT/FAILED/SKIPPED), `to`
(the address as sent to), `provider` (`smtp`/`generic-webhook`), `error`, `sentAt`,
`createdAt`; unique on `(appointmentId, channel)` (cascade on appointment/branch delete).
The sweep (`lib/notifications.ts#runSweep`):

1. reads the branch's stored config + offset;
2. loads PENDING/CONFIRMED appointments with `startAt ∈ (now, now+offset]` plus their patient
   preferences;
3. plans each channel via `lib/notifyMath.ts` (`planSend` produces either a will-send plan or
   a skip reason: `disabled` / `optoff` / `no-contact` / `not-due` / `duplicate`);
4. wholesale `createMany` with `skipDuplicates`, seeding SKIPPED rows immediately and
   SENT-per-attempt rows with the contact resolved; then
5. per created row, delivers (`deliverWhatsApp` = generic webhook `POST {to,text,from}`
   Bearer token; `deliverEmail` = nodemailer SMTP) and marks SENT with `sentAt` or FAILED
   with `error`.

A `SKIPPED` row records _why_ and ships no message — the absence-vs-presence of the row is
the "already handled" flag for both sent and skipped.

**Master config** is one `Setting` row (`key: notifications.config`) but with different
sections for WhatsApp and email. `PUT /api/notifications/config` (ADMIN) accepts
`NotificationConfigUpdate` where optional secrets (`data.whatsapp.token`, `data.email.pass`)
arrive as plain strings **or `""` to keep the stored value**; the stored shape only ever
mirrors `{ set }` flags on read. Every config save is audited `NOTIFICATION_CONFIG_UPDATE`
(target `NOTIFICATION`). A `POST /api/notifications/sweep` (ADMIN) runs the sweep on demand
and returns `{ planned, created, sent, failed }` for the admin UI "send now" button.
`GET /api/notifications/logs` (ADMIN + RECEPTIONIST) serves the log with patient name joined
and channel/status filters (default 50, max 200). The API process additionally runs the sweep
on a configurable unref'd interval (`REMINDER_SWEEP_INTERVAL_MIN`, default 15) across all
branches.

## Consequences

- Exact-once delivery per (appointment, channel): the unique constraint is the guard, so
  restarts and overlapping sweeps are safe.
- Secrets are write-only: read/GET responses report only `set` flags, never tokens or SMTP
  passwords; the encrypted blob is protected by ADR 006.
- The `enabled` kill-switch lets the clinic stop sends instantly without touching
  per-channel configs or patient data.
- Patients control their own channels (`notifyWhatsapp` / `notifyEmail` booleans on
  `Patient`, default true) from the portal or via the desk.
- FR-only copy is built in `notifyMath.ts` (pure, unit-tested): phone normalization to
  digits-only, email trim+lower, and the French reminder subject/body.
- The seed provisions a stored (disabled-by-default) config and a few delivery-log rows so
  the admin "Notifications" view is populated immediately.
