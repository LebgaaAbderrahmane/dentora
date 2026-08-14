import { useEffect, useState } from 'react'
import { Card, useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import { api } from '../lib/api'
import type { SystemStatus } from '@dentora/contracts'

export function DashboardView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .systemStatus()
      .then((s) => {
        setStatus(s)
        setError(s.db === 'down')
      })
      .catch(() => {
        setError(true)
        toast(t('dashboard.dbDown'), 'error')
      })
  }, [toast, t])

  const uptime = status ? formatUptime(status.uptimeSeconds) : '—'

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('dashboard.systemStatus')} className="flex flex-col gap-3">
        <span
          className={
            !error && status?.db === 'up'
              ? 'inline-flex w-fit items-center gap-2 rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300'
              : 'inline-flex w-fit items-center gap-2 rounded-full border border-red-500/30 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300'
          }
        >
          <span
            className={
              error
                ? 'h-1.5 w-1.5 rounded-full bg-red-500'
                : 'h-1.5 w-1.5 rounded-full bg-brand-500'
            }
          />
          {error ? t('dashboard.dbDown') : t('dashboard.dbUp')}
        </span>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('dashboard.uptime')}</dt>
            <dd className="font-mono text-neutral-800 dark:text-neutral-200">{uptime}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}min`
}
