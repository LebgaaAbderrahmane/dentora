import { publicBookingResponseSchema, type PublicBooking } from '@dentora/contracts'

// Thin client for the anonymous public-booking endpoint (ADR 016). Throws on
// network failure — callers decide whether to queue the request offline.
export async function submitPublicBooking(booking: PublicBooking): Promise<{ status: number }> {
  const res = await fetch('/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  })
  if (res.ok) {
    publicBookingResponseSchema.parse(await res.json())
  }
  return { status: res.status }
}
