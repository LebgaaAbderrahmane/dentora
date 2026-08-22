// One color language for every domain (color-system pass): identical statuses
// render identically across Dashboard, Appointments, Waitlist, Invoices,
// Purchase Orders, Sterilizations, Notifications and Payroll. Colors come from
// the semantic tokens (--success/--warning/--info/--destructive) — never raw
// palette literals.
export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'destructive'

export const BADGE_TINT: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
}

export function tint(tone: BadgeTone): string {
  return BADGE_TINT[tone]
}

// Meaning-based mapping shared by all domains:
//   settled/good → success · progressing/confirmed → info · awaiting action → warning
//   failed/expired → destructive · withdrawn/irrelevant → neutral
const TONES: Record<string, BadgeTone> = {
  // appointments / waitlist lifecycle
  PENDING: 'warning',
  CONFIRMED: 'info',
  CONTACTED: 'info',
  COMPLETED: 'success',
  BOOKED: 'success',
  CANCELLED: 'neutral',
  NOSHOW: 'destructive',
  EXPIRED: 'destructive',
  // invoices
  UNPAID: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
  VOID: 'neutral',
  // purchase orders
  DRAFT: 'neutral',
  ORDERED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  // sterilizations / notifications
  IN_PROGRESS: 'info',
  FAILED: 'destructive',
  SENT: 'success',
  SKIPPED: 'neutral',
}

export function toneFor(status: string): BadgeTone {
  return TONES[status] ?? 'neutral'
}
