// Pure sterilization status-transition math (3.6, ADR 026) — no prisma import so it
// is unit-testable. A cycle starts IN_PROGRESS; only in-progress cycles may move to a
// terminal state (COMPLETED/FAILED/CANCELLED). Terminal rows are never reopened: mistakes
// are corrected by recording a fresh cycle, matching the append-only stock conventions.
export type SterilizationState = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export const STERILIZATION_TERMINAL: ReadonlySet<SterilizationState> = new Set([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
])

export type SterilizationTransition =
  | { ok: true; status: SterilizationState }
  | { ok: false; error: 'UNKNOWN_TRANSITION' | 'TERMINAL_CYCLE' }

// Returns the target status only when the move is legal: no-op or
// IN_PROGRESS → terminal. Anything out of a terminal state is refused.
export function applySterilizationTransition(
  current: SterilizationState,
  next: SterilizationState,
): SterilizationTransition {
  if (next === current) return { ok: true, status: next }
  if (current !== 'IN_PROGRESS') return { ok: false, error: 'TERMINAL_CYCLE' }
  if (!STERILIZATION_TERMINAL.has(next)) return { ok: false, error: 'UNKNOWN_TRANSITION' }
  return { ok: true, status: next }
}
