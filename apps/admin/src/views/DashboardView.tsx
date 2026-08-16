import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import type { AppointmentStatus, DashboardKpis, SystemStatus } from '@dentora/contracts'
import type { MessageKey } from '@dentora/i18n'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import { Ban, CalendarDays, ListTodo, RefreshCw, Users } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_KEY: Record<AppointmentStatus, MessageKey> = {
  PENDING: 'appointments.status.pending',
  CONFIRMED: 'appointments.status.confirmed',
  COMPLETED: 'appointments.status.completed',
  CANCELLED: 'appointments.status.cancelled',
  NOSHOW: 'appointments.status.noshow',
}

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CONFIRMED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  NOSHOW: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function dayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}min`
}

export function DashboardView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const from = dayStart().toISOString()
  const to = addDays(new Date(from), 1).toISOString()
  const windowStart = addDays(new Date(from), -30).toISOString()

  useEffect(() => {
    api
      .systemStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
    api
      .dashboard({ from, to, windowStart })
      .then(setKpis)
      .catch(() => toast(t('dashboard.loadError'), 'error'))
  }, [from, to, windowStart, reloadKey, toast, t])

  const dbDown = status?.db === 'down'
  const percent = (rate: number) => `${Math.round(rate * 100)}%`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
            status === null
              ? 'border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400'
              : dbDown
                ? 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dbDown ? 'bg-red-500' : 'bg-brand-500'}`} />
          {status === null
            ? t('dashboard.loadingStatus')
            : dbDown
              ? t('dashboard.dbDown')
              : t('dashboard.dbUp')}
          {status && status.db === 'up' && (
            <span className="text-muted-foreground">· {formatUptime(status.uptimeSeconds)}</span>
          )}
        </span>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {t('dashboard.refresh')}
        </Button>
      </div>

      {kpis && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={CalendarDays}
              label={t('dashboard.todayVisits')}
              value={String(kpis.visits.today.total)}
              hint={`${kpis.visits.today.byStatus.CONFIRMED} ${t('appointments.status.confirmed')} · ${kpis.visits.today.byStatus.PENDING} ${t('appointments.status.pending')} · ${kpis.visits.today.byStatus.COMPLETED} ${t('appointments.status.completed')}`}
            />
            <KpiCard
              icon={Ban}
              label={t('dashboard.noShowToday')}
              value={String(kpis.noShow.today)}
              hint={t('dashboard.noShowRate30d', { rate: percent(kpis.noShow.rate30d) })}
            />
            <KpiCard
              icon={ListTodo}
              label={t('dashboard.activeWaitlist')}
              value={String(kpis.waitlist.active)}
              hint={`${t('waitlist.status.pending')} + ${t('waitlist.status.contacted')}`}
            />
            <KpiCard
              icon={Users}
              label={t('dashboard.patientsTotal')}
              value={String(kpis.patients.total)}
              hint={t('dashboard.newPatients30d', { count: kpis.patients.new30d })}
            />
          </div>

          <Card className="flex flex-col gap-3">
            <CardHeader>
              <CardTitle>{t('dashboard.todaySchedule')}</CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString([], {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {kpis.visits.upcoming.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('dashboard.upcomingEmpty')}
                </p>
              ) : (
                kpis.visits.upcoming.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border-b border-neutral-100 px-2 py-2.5 last:border-0 dark:border-neutral-800"
                  >
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {formatTime(v.startAt)}–{formatTime(v.endAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {v.patientName}
                    </span>
                    <span className="hidden w-40 truncate text-sm text-muted-foreground sm:block">
                      {v.dentistName ?? '—'}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[v.status]}`}
                    >
                      {t(STATUS_KEY[v.status])}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
