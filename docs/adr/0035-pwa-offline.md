# ADR 035 — PWA offline: app shell + offline booking queue (Phase 6.3)

- **Date:** 2026-08-20
- **Status:** Accepted
- **Relates to:** ADR 016 (public booking → waitlist, the endpoint the queue replays),
  ADR 003 (the web frontend), ADR 002 (shared Zod contracts reuse)

## Context

Phase 6.3 makes the public website (`apps/web`) work when the visitor has no
connection: **an installable PWA app shell** (service worker + web manifest) and
**an offline booking queue**. Three design questions:

1. **What does "offline" mean here?** Materially, visitors in low-coverage areas —
   the site's first-load shell (HTML/CSS/JS, fonts, the small SVGs) should render,
   and a booking attempt while offline should not be lost silently. Widget-level
   content (Unsplash images, map embeds) is out of scope: it falls back to the
   shell styling, never cached. Per the South-facing-usage policy (May 2025), the
   shell is served **offline-first with cache-first for static assets** after the
   first visit, with network-primary registration so a fresh deploy is still picked
   up (Workbox `autoUpdate` + stale-while-revalidate precache).
2. **How does the offline booking survive?** `navigator.onLine` is not reliable
   alone (SPA hosts, airplane-mode quirks), so the _failure of the fetch itself_
   is the trigger: a `POST /api/public/bookings` that throws (network) is written
   to a **localStorage queue** and replayed automatically on the `online` event.
3. **Does the server need a change?** No. Replaying an entry is a retry of the
   exact same idempotent endpoint (ADR 016): a duplicate phone returns its 409, which
   the flusher treats as success (the request is already known) and drops the entry.

## Decision

**Service worker (Workbox via `vite-plugin-pwa`)**: precache `**/*.{js,css,html,svg,png,ico,woff2}`
with `navigateFallback: '/index.html'`, fonts cached `CacheFirst` (30d), registration
only in production (`registerSW.ts`). No `Background Sync` API — a fetch-retry loop on
reconnect is simpler, testable, and works in browsers without the API.

**Web manifest**: `name` "DENTORA — Clinique Dentaire", `display: standalone`,
`theme_color`/`background_color #0A1520`, PNG icons (192, 512, maskable) generated
into `public/pwa/` from the brand navy.

**Offline queue (`src/lib/offlineQueue.ts` + `offlineSync.ts`)**: pure, injected
storage + clock. `enqueue`/`remove`/`count` on `localStorage` key
`dentora-booking-queue:v1`; `flushOfflineQueue` submits up to 20 entries newest-first,
drops entries older than 30d, stops at the first hard error, and treats the duplicate
409 as a drop. `OfflineProvider` tracks `online` via `navigator.onLine` +
`online`/`offline` events, exposes `{ online, queuedCount, enqueue, flush }`, and
auto-flushes on reconnect. `BookingModal` queues on fetch-throw and its 409/`already`
flow is unchanged; a new `booking.queued*` view + `offline.*` banner i18n keys (fr/en/ar)
explain the behavior.

## Consequences

- **The shell loads with no connection** on repeat visits; a first-time visitor who
  is offline still gets styled fallback (uncached widget images just don't render).
- **No booking is silently lost**: network-failure submissions are queued locally and
  replayed automatically, with a visible banner while offline and a `queued` confirmation.
- **No API/schema change**: pure web-only feature reusing the existing idempotent
  endpoint; `pwa-*` PNGs are the only new _static_ artifacts (no DB, no Zod change).
- **Service workers require HTTPS** (or `localhost`) — fine for the deployed site;
  the dev server intentionally does not register the SW so HMR stays intact.
- **Storage is best-effort not durable**: `localStorage` can be cleared by the user
  or the browser; the banner only claims _saved locally_, never "sent". A 30-day
  expiry keeps the backing store from accumulating stale requests indefinitely.
