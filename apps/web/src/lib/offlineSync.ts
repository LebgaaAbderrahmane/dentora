import type { PublicBooking } from '@dentora/contracts'
import type { OfflineQueue } from './offlineQueue'

// Upload loop for the offline queue. Pure decision logic is isolated in
// `submitResultFor` so it's testable without the network.

export type SubmitOutcome = 'ok' | 'duplicate' | 'error'

// Network error (thrown fetch) or any non-2xx that is not a duplicate 409 are
// permanent-ish failures for an entry? No — 4xx other than 409 and 5xx are kept
// for retry (the server may be mid-restart or rate-limited); the duplicate 409 is
// the one status that means "already submitted elsewhere".
export function submitResultFor(status: number | undefined, requestFailed: boolean): SubmitOutcome {
  if (requestFailed) return 'error'
  if (status === undefined) return 'error'
  if (status >= 200 && status < 300) return 'ok'
  if (status === 409) return 'duplicate'
  return 'error'
}

export interface FlushResult {
  synced: number
  expired: number
  remaining: number
  stoppedOnError: boolean
}

export const DEFAULT_QUEUE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function flushOfflineQueue(
  queue: OfflineQueue,
  submit: (booking: PublicBooking) => Promise<{ status: number | undefined; failed: boolean }>,
  options: { limit?: number; maxAgeMs?: number; now?: Date } = {},
): Promise<FlushResult> {
  const { limit = 20, maxAgeMs = DEFAULT_QUEUE_MAX_AGE_MS, now = new Date() } = options
  const entries = queue.read()
  const cutoff = now.getTime() - maxAgeMs

  let expired = 0
  const pending: { id: string; booking: PublicBooking }[] = []
  for (const entry of entries) {
    if (new Date(entry.createdAt).getTime() < cutoff) {
      queue.remove(entry.id)
      expired += 1
    } else {
      pending.push(entry)
    }
  }

  let synced = 0
  let stoppedOnError = false
  for (const entry of pending.slice(0, limit)) {
    const { status, failed } = await submit(entry.booking)
    if (submitResultFor(status, failed) === 'error') {
      stoppedOnError = true
      break
    }
    queue.remove(entry.id)
    synced += 1
  }

  return { synced, expired, remaining: queue.count(), stoppedOnError }
}
