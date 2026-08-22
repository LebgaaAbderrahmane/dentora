# ADR 037 — Clinic schedule as a per-branch setting (Phase: post-roadmap UX)

- **Date:** 2026-08-22
- **Status:** Accepted
- **Relates to:** ADR 034 (the `Setting`-row config precedent this follows), ADR 013
  (FullCalendar — the surface the schedule renders into), ADR 027 (staff weekly
  availability — per-staff templates, deliberately untouched by this clinic-wide window)

## Context

The appointments calendar hardcodes nothing about the clinic's day: FullCalendar
defaults render midnight-to-midnight time grids, every weekday shows, and clinics that
open 9–5 see dead space before 8am. Clinics differ (8–16 vs 9–17; Algerian weekend is
Friday–Saturday, so most work Sunday–Thursday). The desk asked for a configurable day
window and working week with defaults of **08:00–16:00, Sunday–Thursday**.

Two prior art points constrain the shape:

- Per-staff `StaffSchedule` rows (ADR 027) already model _who works when_ at template
  granularity. What's missing is the _clinic-level_ frame — rendering bounds and open
  days — which is one value per branch, not a table.
- Branch-wide config already lives in single JSON `Setting` rows with clamped reads
  (`audit.retention` ADR 034, `notifications.config` ADR 032). A new table would be
  over-modelling.

## Decision

**One `Setting` row per branch, key `clinic.schedule`, shape `{ openTime, closeTime,
workingDays }`:**

- Times are local wall-clock `HH:mm` strings (validated by the existing `TIME_HHMM_RE`);
  weekdays are FullCalendar numbers (0 = Sunday … 6 = Saturday), min 1 day. The refine
  enforces `openTime < closeTime`.
- Reads clamp/fall back: corrupt or partial stored values parse-fail safely to the
  defaults (`lib/clinicSchedule.ts`, mirroring retention's loader).
- API: `GET /api/schedule` (ADMIN/DENTIST/RECEPTIONIST — everyone who sees the
  calendar) and full-replace `PUT /api/schedule` (ADMIN only). Every save writes an
  audited `CLINIC_SCHEDULE_UPDATE` row — one enum-value migration, house pattern from
  6.2 — so branch-frame changes are traceable like all other config decisions.
- The admin Appointments page consumes it directly: `slotMinTime`/`slotMaxTime`,
  `hiddenDays`, and `businessHours` shading come from the setting; a toolbar gear
  dialog edits it (ADMIN editable, read-only display otherwise).
- **Outside-hours appointments warn but save.** The schedule frames planning; real
  desks sometimes book off-hours (an emergency squeeze, a special case), so validation
  surfaces a toast rather than blocking. Conflict detection (409) stays the only hard
  gate.

## Consequences

- No schema change beyond one audit-enum value; the setting degrades gracefully — an
  unset branch behaves exactly as today's defaults (08:00–16:00 Sun–Thu applied
  everywhere consistently instead of FullCalendar's midnight defaults).
- Per-staff schedules remain the source of truth for _individual_ availability; the
  clinic window only bounds rendering and warns. The two can disagree (a dentist
  templated past closing) — acceptable: the calendar still renders the appointment;
  nothing is hidden or rejected.
- Timezone note: wall-clock strings are interpreted in each admin user's local time,
  same as every existing date input in the app; a single-clinic deployment shares one
  timezone, so this is a non-issue today and documented here on purpose.
