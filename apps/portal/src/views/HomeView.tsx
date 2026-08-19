import { useEffect, useState } from 'react'
import { formatDate, formatDateTime, useI18n } from '@dentora/i18n'
import type { Appointment, SafeUser } from '@dentora/contracts'
import { Button, Card } from '@dentora/ui'
import { CalendarDays, CalendarPlus, ReceiptText } from 'lucide-react'
import { api } from '../lib/api'
import { useProfile } from '../lib/portal'
import { AppointmentStatusBadge } from '../components/badges'

export default function HomeView({
  user,
  onNavigate,
}: {
  user: SafeUser
  onNavigate: (view: 'appointments' | 'book' | 'invoices') => void
}) {
  const { t, locale } = useI18n()
  const { profile, error } = useProfile()
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    api
      .appointments()
      .then((r) => setAppointments(r.items))
      .catch(() => setAppointments([]))
  }, [])

  const now = Date.now()
  const next = appointments
    .filter((a) => a.status !== 'CANCELLED' && new Date(a.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]

  return (
    <>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('portal.hello')}, {profile ? (profile.firstName ?? '') : ''}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
      </section>

      {error === 'portal.notLinked' && (
        <Card className="p-5 text-sm text-amber-700 dark:text-amber-300">
          {t('portal.notLinked')}
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            <CalendarDays className="size-4 text-brand-500" aria-hidden="true" />
            {t('portal.nextAppointment')}
          </div>
          {next ? (
            <div className="mt-3 space-y-2">
              <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {formatDateTime(next.startAt, locale)}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {next.dentistName ?? t('portal.anyDentist')}
              </p>
              <AppointmentStatusBadge status={next.status} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              {t('portal.noUpcoming')}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            <CalendarPlus className="size-4 text-brand-500" aria-hidden="true" />
            {t('portal.book')}
          </div>
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            {t('portal.bookingHint')}
          </p>
          <Button className="mt-4 w-full" onClick={() => onNavigate('book')}>
            {t('portal.bookCta')}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            <ReceiptText className="size-4 text-brand-500" aria-hidden="true" />
            {t('portal.invoices')}
          </div>
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            {t('portal.contactOffice')}
          </p>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => onNavigate('invoices')}
          >
            {t('portal.invoices')}
          </Button>
        </Card>
      </section>

      {profile && (
        <Card title={t('portal.profile')} className="p-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-400">{t('portal.birthDate')}</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                {profile.birthDate ? formatDate(profile.birthDate, locale) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">{t('portal.gender')}</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                {profile.gender === 'M'
                  ? t('portal.gender.male')
                  : profile.gender === 'F'
                    ? t('portal.gender.female')
                    : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">{t('portal.phone')}</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                {profile.phone ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">{t('portal.email')}</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                {profile.email ?? '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-400">{t('portal.address')}</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">
                {profile.address ?? '—'}
              </dd>
            </div>
          </dl>
        </Card>
      )}
    </>
  )
}
