import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  AppointmentInput,
  Patient,
  StaffDentist,
  WaitlistEntry,
  WaitlistStatus,
} from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { tint, toneFor } from '../lib/badges'
import { api, ApiError, parseConflict } from '../lib/api'
import { SearchInput } from '@/components/ui/search-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_KEY: Record<WaitlistStatus, MessageKey> = {
  PENDING: 'waitlist.status.pending',
  CONTACTED: 'waitlist.status.contacted',
  BOOKED: 'waitlist.status.booked',
  CANCELLED: 'waitlist.status.cancelled',
  EXPIRED: 'waitlist.status.expired',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: tint(toneFor('PENDING')),
  CONTACTED: tint(toneFor('CONTACTED')),
  BOOKED: tint(toneFor('BOOKED')),
  CANCELLED: tint(toneFor('CANCELLED')),
  EXPIRED: tint(toneFor('EXPIRED')),
}

const ACTIVE: WaitlistStatus[] = ['PENDING', 'CONTACTED']

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function WaitlistView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | undefined>(undefined)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [booking, setBooking] = useState<WaitlistEntry | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .waitlist({ status: statusFilter, q: debouncedQ, limit: 100 })
      .then((r) => {
        setEntries(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('waitlist.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [statusFilter, debouncedQ, t, toast])

  async function refetch() {
    const r = await api.waitlist({ status: statusFilter, q: debouncedQ, limit: 100 })
    setEntries(r.items)
    setTotal(r.total)
  }

  async function transition(
    entry: WaitlistEntry,
    patch: Parameters<typeof api.updateWaitlistEntry>[1],
  ) {
    try {
      await api.updateWaitlistEntry(entry.id, patch)
      toast(t('waitlist.saved'), 'success')
      await refetch()
    } catch {
      toast(t('waitlist.saveError'), 'error')
    }
  }

  const filters: { value: string; label: string }[] = [
    { value: '', label: t('waitlist.all') },
    { value: 'PENDING', label: t('waitlist.status.pending') },
    { value: 'CONTACTED', label: t('waitlist.status.contacted') },
    { value: 'BOOKED', label: t('waitlist.status.booked') },
    { value: 'CANCELLED', label: t('waitlist.status.cancelled') },
    { value: 'EXPIRED', label: t('waitlist.status.expired') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('patients.search')}
          placeholder={t('patients.search')}
          value={q}
          onChange={setQ}
        />
        <Select
          value={statusFilter ?? ''}
          onValueChange={(v) => setStatusFilter(v ? (v as WaitlistStatus) : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">{t('common.filter.status')}&nbsp;·&nbsp;</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filters.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {total} {t('patients.total')}
        </span>
        <div className="ms-auto">
          <Button onClick={() => setCreating(true)} size="sm">
            {t('waitlist.add')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('waitlist.patient')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('waitlist.dentist')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('waitlist.preferredDate')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('appointments.status')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('patients.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  …
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  {t('waitlist.empty')}
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {e.patientName}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {e.dentistName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {e.preferredDate ? new Date(e.preferredDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[e.status]}`}
                    >
                      {t(STATUS_KEY[e.status])}
                    </span>
                    {e.source === 'web' && (
                      <span className="ms-2 inline-flex rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {t('waitlist.fromWeb')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {e.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void transition(e, { status: 'CONTACTED' })}
                        >
                          {t('waitlist.contact')}
                        </Button>
                      )}
                      {ACTIVE.includes(e.status) && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setBooking(e)}>
                            {t('waitlist.book')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void transition(e, { status: 'CANCELLED' })}
                          >
                            {t('waitlist.remove')}
                          </Button>
                        </>
                      )}
                      {e.status === 'CONTACTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void transition(e, { status: 'EXPIRED' })}
                        >
                          {t('waitlist.expire')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <WaitlistForm
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await refetch()
          }}
        />
      )}
      {booking && (
        <BookDialog
          entry={booking}
          onClose={() => setBooking(null)}
          onSaved={async () => {
            setBooking(null)
            await refetch()
          }}
        />
      )}
    </div>
  )
}

function WaitlistForm({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<StaffDentist[]>([])
  const [patientId, setPatientId] = useState('')
  const [dentistId, setDentistId] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.patients({ limit: 200 }), api.dentists()])
      .then(([pr, ds]) => {
        setPatients(pr.patients)
        setDentists(ds)
      })
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [t, toast])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patientId.trim()) return
    setSaving(true)
    try {
      await api.createWaitlistEntry({
        patientId,
        ...(dentistId ? { dentistId } : {}),
        ...(preferredDate ? { preferredDate: new Date(preferredDate).toISOString() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      toast(t('waitlist.added'), 'success')
      await onSaved()
    } catch (err) {
      if (err instanceof ApiError && err.message === 'WAITLIST_ALREADY_ACTIVE') {
        toast(t('waitlist.alreadyActive'), 'error')
      } else {
        toast(t('waitlist.addError'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('waitlist.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('waitlist.patient')} *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder={t('waitlist.patient')} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.lastName} {p.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('waitlist.dentist')}</Label>
              <Select value={dentistId} onValueChange={setDentistId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.noDentist')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('appointments.noDentist')}</SelectItem>
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('waitlist.preferredDate')}</Label>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('waitlist.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring focus-visible:outline-none disabled:opacity-50 dark:bg-input/30"
            />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !patientId}>
              {t('appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BookDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: WaitlistEntry
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [dentists, setDentists] = useState<StaffDentist[]>([])
  const [dentistId, setDentistId] = useState(entry.dentistId ?? '')
  const [saving, setSaving] = useState(false)

  const defaultStart = useMemo(() => {
    const base = entry.preferredDate ? new Date(entry.preferredDate) : new Date()
    base.setHours(9, 0, 0, 0)
    return base
  }, [entry.preferredDate])
  const [startAt, setStartAt] = useState(toLocalInputValue(defaultStart))
  const [endAt, setEndAt] = useState(
    toLocalInputValue(new Date(defaultStart.getTime() + 30 * 60 * 1000)),
  )

  useEffect(() => {
    api
      .dentists()
      .then(setDentists)
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [t, toast])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const input: AppointmentInput = {
      patientId: entry.patientId,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      ...(dentistId ? { dentistId } : {}),
    }
    try {
      const appointment = await api.createAppointment(input)
      await api.updateWaitlistEntry(entry.id, {
        status: 'BOOKED',
        appointmentId: appointment.id,
      })
      toast(t('waitlist.booked'), 'success')
      await onSaved()
    } catch (err) {
      const conflict = err instanceof ApiError ? parseConflict(err) : null
      if (conflict && conflict.overlaps.length > 0) {
        const o = conflict.overlaps[0]
        toast(
          t('appointments.conflict', {
            from: new Date(o.startAt).toLocaleTimeString(),
            to: new Date(o.endAt).toLocaleTimeString(),
          }),
          'error',
        )
      } else if (err instanceof ApiError && err.message === 'UNKNOWN_DENTIST') {
        toast(t('appointments.noDentist'), 'error')
      } else {
        toast(t('waitlist.bookError'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('waitlist.book')} — {entry.patientName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('waitlist.dentist')}</Label>
            <Select value={dentistId} onValueChange={setDentistId}>
              <SelectTrigger>
                <SelectValue placeholder={t('appointments.noDentist')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('appointments.noDentist')}</SelectItem>
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('appointments.startAt')}</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('appointments.endAt')}</Label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
