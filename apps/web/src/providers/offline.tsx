import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flushOfflineQueue } from '@/lib/offlineSync'
import { createOfflineQueue, type OfflineQueue } from '@/lib/offlineQueue'
import { submitPublicBooking } from '@/lib/publicApi'

// Offline context (6.3, ADR 035): tracks live network status (navigator.onLine +
// online/offline events), exposes the booking queue, and flushes it automatically
// when the connection returns.
interface OfflineContextValue {
  online: boolean
  queuedCount: number
  enqueue: (booking: Parameters<OfflineQueue['enqueue']>[0]) => void
  flush: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<OfflineQueue | null>(null)
  if (queueRef.current === null) {
    queueRef.current = createOfflineQueue(window.localStorage)
  }
  const queue = queueRef.current

  const [online, setOnline] = useState(() => navigator.onLine)
  const [queuedCount, setQueuedCount] = useState(() => queue.count())
  const [flushing, setFlushing] = useState(false)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const flush = useCallback(async () => {
    if (!navigator.onLine || flushing) return
    setFlushing(true)
    try {
      const result = await flushOfflineQueue(queue, async (booking) => {
        try {
          const { status } = await submitPublicBooking(booking)
          return { status, failed: false }
        } catch {
          return { status: undefined, failed: true }
        }
      })
      if (result.synced > 0 || result.expired > 0) {
        setQueuedCount(queue.count())
      }
    } finally {
      setFlushing(false)
    }
  }, [flushing, queue])

  // Auto-flush whenever we come back online and something is queued.
  useEffect(() => {
    if (online && queue.count() > 0) {
      void flush()
    }
  }, [online, flush, queue])

  const enqueue = useCallback(
    (booking: Parameters<OfflineQueue['enqueue']>[0]) => {
      queue.enqueue(booking)
      setQueuedCount(queue.count())
      void flush()
    },
    [queue, flush],
  )

  const value = useMemo(
    () => ({ online, queuedCount, enqueue, flush }),
    [online, queuedCount, enqueue, flush],
  )

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}
