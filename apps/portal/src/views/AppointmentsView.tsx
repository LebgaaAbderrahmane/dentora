import { useEffect, useState } from 'react'
import { formatDateTime, useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import type { Appointment } from '@dentora/contracts'
import { Button, Card, useToast } from '@dentora/ui'
import { CalendarX2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { isCancellable } from '../lib/portal'
import { AppointmentStatusBadge } from '../components/badges'

export default function AppointmentsView() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  function load() {
    api
      .appointments()
      .then((r) => setAppointments(r.items))
      .catch(() => setError('portal.error'))
  }

  useEffect(load, [])

  async function cancel(a: Appointment) {
    if (!window.confirm(t('portal.cancelConfirm'))) return
    setBusy(a.id)
    try {
      await api.cancelAppointment(a.id)
      toast(t('portal.cancelled'), 'success')
      load()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'NOT_CANCELLABLE'
          ? t('portal.cancelError')
          : t('portal.error'),
        'error',
      )
    } finally {
      setBusy(null)
    }
  }

  const now = Date.now()
  const upcoming = appointments
    .filter((a) => new Date(a.startAt).getTime() >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const past = appointments
    .filter((a) => new Date(a.startAt).getTime() < now)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  if (error) {
    return <Card className="p-5 text-sm text-red-600 dark:text-red-400">{t(error)}</Card>
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {t('portal.appointments')}
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('portal.cancelHint')}</p>

      <Card title={t('portal.upcoming')} className="p-2">
        {upcoming.length === 0 ? (
          <p className="p-3 text-sm text-neutral-500 dark:text-neutral-400">
            {t('portal.noUpcoming')}
          </p>
        ) : (
          <ul className="flex flex-col">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-3 py-3 last:border-b-0 dark:border-neutral-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDateTime(a.startAt, locale)}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {a.dentistName ?? t('portal.anyDentist')}
                  </p>
                </div>
                <AppointmentStatusBadge status={a.status} />
                {isCancellable(a) && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy === a.id}
                    onClick={() => void cancel(a)}
                  >
                    <CalendarX2 className="size-4" aria-hidden="true" />
                    {t('portal.cancelAppointment')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {past.length > 0 && (
        <Card title={t('portal.past')} className="p-2">
          <ul className="flex flex-col">
            {past.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-3 py-3 last:border-b-0 dark:border-neutral-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDateTime(a.startAt, locale)}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {a.dentistName ?? t('portal.anyDentist')}
                  </p>
                </div>
                <AppointmentStatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
