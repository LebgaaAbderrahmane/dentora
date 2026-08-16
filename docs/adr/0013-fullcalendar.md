# ADR 0013 — FullCalendar 6.1.21 for the appointments calendar

- **Status:** Accepted
- **Date:** 2026-08-16

## Context

Phase 1.5 needs a professional day/week/month calendar with drag-and-drop and resize. The
hand-rolled approach used for the odontogram is not worth repeating: calendar UX (agenda,
time-slot selection, drag/drop/resize, locale) is a solved problem with mature libraries.
v6 was chosen over v5 because v6 dropped all peer dependencies (including `temporal-polyfill`),
which keeps the dependency tree small and pinning simple.

## Decision

- Use **FullCalendar 6.1.21**, exact-pinned across `@fullcalendar/{core,react,daygrid,timegrid,interaction}`.
- No calendar library CSS dependency: v6 npm packages ship **no `*.css`** (styles are embedded
  only in the `index.global.js` bundle). The full stylesheet was extracted from the `fullcalendar`
  tgz global bundle into `apps/admin/src/appointments-calendar.css` and themed with the
  shadcn-neutral token palette (`:root` + `.dark`).

## Consequences

- Single exact version across all five packages — no range drift or transitive peer surprises.
- The calendar is fully styleable; custom `--fc-*` variables map to admin design tokens and dark mode.
- Maintained CSS file adds a manual sync step if FullCalendar ever ships style changes (the CSS
  is stable across 6.x minors; revisit on any major upgrade).
