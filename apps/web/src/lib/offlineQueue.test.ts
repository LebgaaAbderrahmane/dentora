import { describe, expect, it } from 'vitest'
import type { PublicBooking } from '@dentora/contracts'
import { createOfflineQueue, OFFLINE_QUEUE_KEY, type QueueStorage } from './offlineQueue'
import { flushOfflineQueue, submitResultFor } from './offlineSync'

function memoryStorage(): QueueStorage & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  }
}

const booking = (phone: string): PublicBooking => ({
  firstName: 'Amine',
  lastName: 'Haddad',
  phone,
  service: 'Détartrage',
})

describe('offlineQueue (6.3, ADR 035)', () => {
  it('starts empty and enqueues + counts', () => {
    const storage = memoryStorage()
    const q = createOfflineQueue(storage, () => new Date('2026-08-20T12:00:00.000Z'))
    expect(q.count()).toBe(0)
    const e = q.enqueue(booking('+213000000001'))
    expect(q.count()).toBe(1)
    expect(e.booking.phone).toBe('+213000000001')
    expect(e.createdAt).toBe('2026-08-20T12:00:00.000Z')
    expect(JSON.parse(storage.store.get(OFFLINE_QUEUE_KEY)!)).toHaveLength(1)
  })

  it('removes by id and drops the key when empty', () => {
    const storage = memoryStorage()
    const q = createOfflineQueue(storage)
    const a = q.enqueue(booking('+213000000001'))
    const b = q.enqueue(booking('+213000000002'))
    q.remove(a.id)
    expect(q.count()).toBe(1)
    expect(q.read()[0].id).toBe(b.id)
    q.remove(b.id)
    expect(q.count()).toBe(0)
    expect(storage.store.has(OFFLINE_QUEUE_KEY)).toBe(false)
  })

  it('survives garbage in storage', () => {
    const storage = memoryStorage()
    storage.setItem(OFFLINE_QUEUE_KEY, 'not json')
    const q = createOfflineQueue(storage)
    expect(q.count()).toBe(0)
    q.enqueue(booking('+213000000003'))
    expect(q.count()).toBe(1)
  })

  it('submits a duplicate 409 as success', () => {
    expect(submitResultFor(201, false)).toBe('ok')
    expect(submitResultFor(409, false)).toBe('duplicate')
    expect(submitResultFor(500, false)).toBe('error')
    expect(submitResultFor(400, false)).toBe('error')
    expect(submitResultFor(undefined, true)).toBe('error')
  })

  it('flushes, drops duplicates, and stops on the first failure', async () => {
    const storage = memoryStorage()
    const q = createOfflineQueue(storage)
    q.enqueue(booking('+213000000001'))
    q.enqueue(booking('+213000000002'))
    q.enqueue(booking('+213000000003'))

    const calls: string[] = []
    const result = await flushOfflineQueue(
      q,
      async (b) => {
        calls.push(b.phone)
        if (b.phone === '+213000000002') return { status: 503, failed: false }
        return { status: 201, failed: false }
      },
      { now: new Date('2026-08-20T12:00:00.000Z') },
    )

    expect(calls).toEqual(['+213000000001', '+213000000002'])
    expect(result).toEqual({ synced: 1, expired: 0, remaining: 2, stoppedOnError: true })
    expect(q.count()).toBe(2)
  })

  it('drops stale entries older than maxAgeMs', async () => {
    const storage = memoryStorage()
    const q = createOfflineQueue(storage, () => new Date('2026-01-01T00:00:00.000Z'))
    q.enqueue(booking('+213000000001')) // createdAt = 2026-01-01
    // re-set the clock so the entry looks old
    const now = new Date('2026-08-20T12:00:00.000Z')
    const result = await flushOfflineQueue(q, async () => ({ status: 201, failed: false }), {
      now,
      maxAgeMs: 30 * 24 * 60 * 60 * 1000,
    })
    expect(result.expired).toBe(1)
    expect(result.synced).toBe(0)
    expect(q.count()).toBe(0)
  })

  it('treats network failure as error and keeps the entry', async () => {
    const storage = memoryStorage()
    const q = createOfflineQueue(storage)
    q.enqueue(booking('+213000000001'))
    const result = await flushOfflineQueue(q, async () => ({ status: undefined, failed: true }))
    expect(result.stoppedOnError).toBe(true)
    expect(result.synced).toBe(0)
    expect(q.count()).toBe(1)
  })
})
