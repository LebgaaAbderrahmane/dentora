import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useI18n } from '@dentora/i18n'
import type { PortalDentist } from '@dentora/contracts'
import { Button, Card, Field, Input, useToast } from '@dentora/ui'
import { api, ApiError } from '../lib/api'

function toLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const DURATION_MIN = 45

export default function BookingView({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [dentists, setDentists] = useState<PortalDentist[]>([])
  const [dentistId, setDentistId] = useState<string>('')
  const [date, setDate] = useState(() => toLocalValue(new Date(Date.now() + 86_400_000)))
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .dentists()
      .then((r) => setDentists(r.dentists))
      .catch(() => setDentists([]))
  }, [])

  const startAt = useMemo(() => new Date(`${date}T${time}:00`), [date, time])
  const endAt = useMemo(() => new Date(startAt.getTime() + DURATION_MIN * 60_000), [startAt])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (startAt.getTime() <= Date.now()) {
      setError(t('portal.schedule'))
      return
    }
    setSubmitting(true)
    try {
      await api.book({
        dentistId: dentistId || null,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        notes: notes.trim() || undefined,
      })
      toast(t('portal.bookingSent'), 'success')
      onDone()
    } catch (err) {
      if (err instanceof ApiError && err.message === 'CONFLICT') {
        setError(t('portal.error'))
      } else {
        setError(t('portal.error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {t('portal.book')}
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('portal.bookingHint')}</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg">
        <Card className="space-y-4 p-5">
          <Field label={t('portal.dentist')}>
            <select
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              <option value="">{t('portal.anyDentist')}</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('portal.date')}>
              <Input
                type="date"
                value={date}
                min={toLocalValue(new Date())}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label={t('portal.time')}>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>

          <Field label={t('portal.notes')}>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('portal.notes')}
            />
          </Field>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t('auth.connecting') : t('portal.submit')}
          </Button>
        </Card>
      </form>
    </>
  )
}
