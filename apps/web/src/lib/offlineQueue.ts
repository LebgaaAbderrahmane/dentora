import type { PublicBooking } from '@dentora/contracts'

// Client-side offline booking queue (6.3, ADR 035). A visitor's booking form is
// enqueued in localStorage when the network is unavailable, then flushed to the
// existing `/api/public/bookings` endpoint once the connection returns. The
// endpoint is idempotent from the client's perspective: a 409
// WAITLIST_ALREADY_ACTIVE means the same phone already has an active request, so
// flush treats it as success and drops the entry.
//
// The storage is injected so the queue logic is pure and unit-testable without a
// browser (tests pass an in-memory mock instead of window.localStorage).

export interface QueuedBooking {
  id: string
  createdAt: string
  booking: PublicBooking
}

export interface QueueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const OFFLINE_QUEUE_KEY = 'dentora-booking-queue:v1'

let counter = 0

export function createQueuedBookingId(): string {
  counter += 1
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`
}

export function createOfflineQueue(storage: QueueStorage, now: () => Date = () => new Date()) {
  const read = (): QueuedBooking[] => {
    try {
      const raw = storage.getItem(OFFLINE_QUEUE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as QueuedBooking[]) : []
    } catch {
      return []
    }
  }

  const write = (entries: QueuedBooking[]) =>
    storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(entries))

  const enqueue = (booking: PublicBooking): QueuedBooking => {
    const entry: QueuedBooking = {
      id: createQueuedBookingId(),
      createdAt: now().toISOString(),
      booking,
    }
    write([...read(), entry])
    return entry
  }

  const remove = (id: string): QueuedBooking[] => {
    const next = read().filter((e) => e.id !== id)
    if (next.length === 0) {
      storage.removeItem(OFFLINE_QUEUE_KEY)
    } else {
      write(next)
    }
    return next
  }

  const count = () => read().length

  return { read, enqueue, remove, count }
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>
