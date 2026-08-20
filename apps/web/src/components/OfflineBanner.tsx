import { CloudOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOffline } from '@/providers/offline'

// Fixed banner shown while the device is offline. When bookings are queued it
// explains they will be sent automatically on reconnect (6.3, ADR 035).
export function OfflineBanner() {
  const { t } = useTranslation()
  const { online, queuedCount } = useOffline()

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-sky-700 px-4 py-2 text-[0.8rem] font-medium text-white"
    >
      <CloudOff className="h-4 w-4 shrink-0" />
      <span>{queuedCount > 0 ? t('offline.queued') : t('offline.offline')}</span>
    </div>
  )
}
