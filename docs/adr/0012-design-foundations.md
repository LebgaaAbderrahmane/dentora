# 12. Design Foundations: two identities, on purpose

**Status:** Accepted
**Date:** 2026-08-15

## Context

Dentora ships three surfaces (`docs/adr/0003`): a conversion-focused marketing
web, an operational admin, and a patient portal. Their audiences and jobs differ
radically, and the visual language has evolved differently in each:

- **`apps/web`** is dark, dramatic, conversion-driven (navy/teal, large type,
  motion) — it sells.
- **`apps/admin` + `apps/portal`** are light, calm, high-information-density
  (emerald actions, Inter type, restrained neutrals) — they let staff work all
  day without fatigue.

An undocumented divergence between sibling apps reads as a bug to contributors
and reviewers ("why don't these match?"), and invites misguided unification.
The real bug would be **silent drift**, not difference.

## Decision

Maintain **two identities, on purpose**. Each surface belongs to exactly one
identity; tokens live in one authoritative file per identity. Surfaces in the
same identity share tokens and components; surfaces across identities do not.

### Identity A — Web (conversion)

- Tone: dark, confident, high-contrast.
- Tokens: `apps/web/src/index.css` `@theme` (background `hsl(210 42% 5%)`,
  primary `hsl(180 91% 39%)` teal, surface-dark/light, primary/soft ramp).
- Type: `Plus Jakarta Sans`; for Arabic, `Tajawal` first in `html:lang(ar)`.

### Identity B — Admin / Portal (operational)

- Tone: light, calm, neutral-first with emerald brand accents.
- Tokens: `packages/ui/src/tokens.css` `@theme` (brand-50..900 emerald ramp,
  `--font-sans` Inter).
- Type: `Inter`; for Arabic, `Tajawal` first via `html:lang(ar)` in the same
  token file. RTL is first-class: `I18nProvider` sets `dir`, spacing uses
  logical/`gap` utilities, and mirroring is handled by Tailwind `rtl:`/`ltr:`
  variants where a direction-specific layout is required.
- Shared UI: promoted into `@dentora/ui` **only when a second consumer exists**
  (the "two tenants" rule).
- `OdontogramChart` stays in `apps/admin` until the portal genuinely needs it —
  this is the standing rule, not an omission.

## Consequences

- Contributors stop "fixing" the web/admin mismatch; the difference is
  deliberate and documented.
- Each identity owns its tokens in one file, so drift is detectable by diff.
- Arabic is kept first-class across BOTH identities, so RTL never becomes an
  appendix of one app.
- Component promotion is gated on real reuse, avoiding speculative abstraction.
- A defensible runway for the portal: it inherits Identity B tokens and any
  `@dentora/ui` primitives that have already earned promotion.
