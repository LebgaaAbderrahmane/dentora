import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import type {
  Appointment,
  AppointmentDetail,
  AppointmentInput,
  AppointmentStatus,
  AppointmentUpdate,
  ClinicSchedule,
} from '@dentora/contracts'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError, parseConflict } from '../lib/api'
import type { Patient, StaffDentist } from '@dentora/contracts'
import { ConsumptionModal } from './ConsumptionModal'
import { ClinicScheduleDialog } from './ClinicScheduleDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings2 } from 'lucide-react'
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
import '../appointments-calendar.css'

const STATUS_KEY: Record<AppointmentStatus, MessageKey> = {
  PENDING: 'appointments.status.pending',
  CONFIRMED: 'appointments.status.confirmed',
  COMPLETED: 'appointments.status.completed',
  CANCELLED: 'appointments.status.cancelled',
  NOSHOW: 'appointments.status.noshow',
}

const STATUS_COLOR: Record<AppointmentStatus, { bg: string; border: string }> = {
  PENDING: { bg: '#eab308', border: '#ca8a04' },
  CONFIRMED: { bg: '#3b82f6', border: '#2563eb' },
  COMPLETED: { bg: '#22c55e', border: '#16a34a' },
  CANCELLED: { bg: '#71717a', border: '#52525b' },
  NOSHOW: { bg: '#ef4444', border: '#dc2626' },
}

type ViewMode = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

type Editing = { detail: AppointmentDetail } | { new: { start: Date; end: Date } } | null

export function AppointmentsView({ canEditSchedule }: { canEditSchedule: boolean }) {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const calendarRef = useRef<FullCalendar | null>(null)
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null)
  const [events, setEvents] = useState<Appointment[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('timeGridWeek')
  const [editing, setEditing] = useState<Editing>(null)
  const [consuming, setConsuming] = useState<AppointmentDetail | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<StaffDentist[]>([])
  const [schedule, setSchedule] = useState<ClinicSchedule | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  useEffect(() => {
    Promise.all([api.patients({ limit: 200 }), api.dentists(), api.clinicSchedule()])
      .then(([pr, dentists, schedule]) => {
        setPatients(pr.patients)
        setDentists(dentists)
        setSchedule(schedule)
      })
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [t, toast])

  useEffect(() => {
    calendarRef.current?.getApi().changeView(viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!range) return
    api
      .appointments({ start: range.start.toISOString(), end: range.end.toISOString() })
      .then((r) => setEvents(r.items))
      .catch(() => toast(t('appointments.loadError'), 'error'))
  }, [range, t, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const fcEvents = useMemo(
    () =>
      events.map((a) => ({
        id: a.id,
        title: a.patientName,
        start: a.startAt,
        end: a.endAt,
        backgroundColor: STATUS_COLOR[a.status].bg,
        borderColor: STATUS_COLOR[a.status].border,
        extendedProps: { status: a.status, dentistName: a.dentistName },
      })),
    [events],
  )

  // Stable references: FullCalendar re-applies options whenever these props
  // change identity, which refires datesSet — inline literals here would loop
  // forever (setRange → render → new array → resetOptions → datesSet …).
  const hiddenDays = useMemo(
    () => (schedule ? [0, 1, 2, 3, 4, 5, 6].filter((d) => !schedule.workingDays.includes(d)) : []),
    [schedule],
  )
  const businessHours = useMemo(
    () =>
      schedule
        ? {
            daysOfWeek: schedule.workingDays,
            startTime: schedule.openTime,
            endTime: schedule.closeTime,
          }
        : true,
    [schedule],
  )

  const allDaySlot = viewMode !== 'dayGridMonth'

  function openCreateFromSelect(sel: DateSelectArg) {
    if (!sel.start) return
    if (sel.allDay) {
      // a whole-day selection — default to the clinic's opening time, 30 min slot
      const [h, m] = (schedule?.openTime ?? '09:00').split(':').map(Number)
      const start = new Date(sel.start)
      start.setHours(h, m, 0, 0)
      setEditing({ new: { start, end: new Date(start.getTime() + 30 * 60 * 1000) } })
      return
    }
    const end = sel.end
      ? new Date(sel.end.getTime())
      : new Date(sel.start.getTime() + 30 * 60 * 1000)
    setEditing({ new: { start: new Date(sel.start.getTime()), end } })
  }

  function handleEventClick(info: EventClickArg) {
    api
      .appointment(info.event.id)
      .then((d) => setEditing({ detail: d }))
      .catch(() => toast(t('appointments.loadError'), 'error'))
  }

  async function handleDrop(info: EventDropArg) {
    const startAt = info.event.start?.toISOString()
    const endAt = info.event.end?.toISOString()
    if (!startAt || !endAt) return
    try {
      await api.updateAppointment(info.event.id, { startAt, endAt })
      refetchRange()
      toast(t('appointments.saved'), 'success')
    } catch (e) {
      info.revert()
      if (parseConflict(e as ApiError)) {
        toast(t('appointments.conflictTitle'), 'error')
      } else {
        toast(t('appointments.savedError'), 'error')
      }
    }
  }

  async function handleResize(info: EventResizeDoneArg) {
    const startAt = info.event.start?.toISOString()
    const endAt = info.event.end?.toISOString()
    if (!startAt || !endAt) return
    try {
      await api.updateAppointment(info.event.id, { startAt, endAt })
      refetchRange()
      toast(t('appointments.saved'), 'success')
    } catch (e) {
      info.revert()
      if (parseConflict(e as ApiError)) {
        toast(t('appointments.conflictTitle'), 'error')
      } else {
        toast(t('appointments.savedError'), 'error')
      }
    }
  }

  function refetchRange() {
    if (range) {
      setRange({ start: range.start, end: range.end })
    }
  }

  function goPrev() {
    calendarRef.current?.getApi().prev()
  }
  function goNext() {
    calendarRef.current?.getApi().next()
  }
  function goToday() {
    calendarRef.current?.getApi().today()
  }

  const calendarLocale = (locale === 'fr' ? 'fr' : locale === 'ar' ? 'ar' : 'en') as
    'fr' | 'ar' | 'en'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={goPrev} aria-label={t('appointments.prev')}>
            ‹
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            {t('appointments.today')}
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} aria-label={t('appointments.next')}>
            ›
          </Button>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleOpen(true)}
            aria-label={t('appointments.schedule.title')}
            title={t('appointments.schedule.title')}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-fit text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dayGridMonth">{t('appointments.viewMonth')}</SelectItem>
              <SelectItem value="timeGridWeek">{t('appointments.viewWeek')}</SelectItem>
              <SelectItem value="timeGridDay">{t('appointments.viewDay')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-[calc(100dvh-11rem)] min-h-[480px] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={viewMode}
          headerToolbar={false}
          height="100%"
          allDaySlot={allDaySlot}
          slotMinTime={schedule?.openTime ?? '00:00'}
          slotMaxTime={schedule?.closeTime ?? '24:00'}
          hiddenDays={hiddenDays}
          businessHours={businessHours}
          // Cap per-day events in month view ("+N more" popover) so every week
          // row renders at the same height regardless of how busy it is.
          dayMaxEventRows={3}
          selectable
          selectMirror
          unselectAuto={false}
          editable
          eventDurationEditable
          events={fcEvents}
          locale={calendarLocale}
          datesSet={(info) =>
            setRange((prev) =>
              prev &&
              prev.start.getTime() === info.start.getTime() &&
              prev.end.getTime() === info.end.getTime()
                ? prev
                : { start: info.start, end: info.end },
            )
          }
          select={openCreateFromSelect}
          eventClick={handleEventClick}
          eventDrop={handleDrop}
          eventResize={handleResize}
        />
      </div>

      {scheduleOpen && schedule && (
        <ClinicScheduleDialog
          schedule={schedule}
          canEdit={canEditSchedule}
          onClose={() => setScheduleOpen(false)}
          onSaved={(next) => {
            setSchedule(next)
            setScheduleOpen(false)
          }}
        />
      )}

      {editing && (
        <AppointmentDialog
          {...('detail' in editing
            ? { detail: editing.detail }
            : { defaultStart: editing.new.start, defaultEnd: editing.new.end })}
          patients={patients}
          dentists={dentists}
          schedule={schedule}
          onClose={() => setEditing(null)}
          onStartConsumption={(d) => {
            setEditing(null)
            setConsuming(d)
          }}
          onSaved={() => {
            setEditing(null)
            refetchRange()
          }}
        />
      )}

      {consuming && (
        <ConsumptionModal
          appointmentId={consuming.id}
          patientName={consuming.patientName}
          onClose={() => setConsuming(null)}
          onSaved={refetchRange}
        />
      )}
    </div>
  )
}

function AppointmentDialog({
  detail,
  defaultStart,
  defaultEnd,
  patients,
  dentists,
  schedule,
  onClose,
  onStartConsumption,
  onSaved,
}: {
  detail?: AppointmentDetail
  defaultStart?: Date
  defaultEnd?: Date
  patients: Patient[]
  dentists: StaffDentist[]
  schedule: ClinicSchedule | null
  onClose: () => void
  onStartConsumption?: (detail: AppointmentDetail) => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const initialStart = useMemo(() => defaultStart ?? new Date(), [defaultStart])
  const [saving, setSaving] = useState(false)
  const [patientId, setPatientId] = useState(detail?.patientId ?? '')
  const [dentistId, setDentistId] = useState(detail?.dentistId ?? '')
  const [startAt, setStartAt] = useState<string>(() =>
    detail ? toLocalInputValue(new Date(detail.startAt)) : toLocalInputValue(initialStart),
  )
  const [endAt, setEndAt] = useState<string>(() =>
    detail
      ? toLocalInputValue(new Date(detail.endAt))
      : toLocalInputValue(defaultEnd ?? new Date(initialStart.getTime() + 30 * 60 * 1000)),
  )
  const [status, setStatus] = useState<AppointmentStatus>(detail?.status ?? 'PENDING')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (!detail) {
      setNotes('')
      return
    }
    api
      .appointment(detail.id)
      .then((d) => setNotes(d.notes ?? ''))
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [detail, t, toast])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patientId || !startAt || !endAt) return
    if (new Date(endAt) <= new Date(startAt)) {
      toast(t('appointments.savedError'), 'error')
      return
    }
    // Warn (but allow) when the appointment falls outside the clinic's opening
    // window — the schedule frames planning; real desks sometimes book off-hours.
    if (schedule) {
      const start = new Date(startAt)
      const dayOk = schedule.workingDays.includes(start.getDay())
      const minutes = start.getHours() * 60 + start.getMinutes()
      const [oh, om] = schedule.openTime.split(':').map(Number)
      const [ch, cm] = schedule.closeTime.split(':').map(Number)
      const timeOk = minutes >= oh * 60 + om && minutes < ch * 60 + cm
      if (!dayOk || !timeOk) toast(t('appointments.outsideHours'), 'info')
    }
    setSaving(true)
    const common = {
      patientId,
      dentistId: dentistId || null,
      startAt: fromLocalInputValue(startAt),
      endAt: fromLocalInputValue(endAt),
      status,
      notes: notes.trim() || undefined,
    }
    try {
      if (detail) {
        const patch: AppointmentUpdate = {
          ...(common.patientId !== detail.patientId ? { patientId: common.patientId } : {}),
          ...(common.dentistId !== detail.dentistId ? { dentistId: common.dentistId } : {}),
          ...(fromLocalInputValue(startAt) !== detail.startAt ? { startAt: common.startAt } : {}),
          ...(fromLocalInputValue(endAt) !== detail.endAt ? { endAt: common.endAt } : {}),
          ...(status !== detail.status ? { status } : {}),
          ...(common.notes !== undefined ? { notes: common.notes } : {}),
        }
        if (Object.keys(patch).length === 0) {
          toast(t('appointments.saved'), 'success')
          onSaved()
          return
        }
        await api.updateAppointment(detail.id, patch)
      } else {
        const input: AppointmentInput = {
          patientId,
          dentistId: dentistId || null,
          startAt: common.startAt,
          endAt: common.endAt,
          status,
          ...(common.notes ? { notes: common.notes } : {}),
        }
        await api.createAppointment(input)
      }
      toast(t('appointments.saved'), 'success')
      onSaved()
    } catch (e) {
      const conflict = parseConflict(e as ApiError)
      if (conflict && conflict.overlaps.length > 0) {
        const o = conflict.overlaps[0]
        toast(
          t('appointments.conflict', {
            from: new Date(o.startAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            to: new Date(o.endAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }),
          'error',
        )
      } else {
        toast(t('appointments.savedError'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const statuses: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NOSHOW']
  const canConsume =
    !!(detail && onStartConsumption) && detail.status !== 'CANCELLED' && detail.status !== 'NOSHOW'

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(detail ? 'appointments.edit' : 'appointments.new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-patient">{t('appointments.patient')}</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger id="appt-patient">
                <SelectValue placeholder={t('appointments.patient')} />
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-dentist">{t('appointments.dentist')}</Label>
            <Select value={dentistId || ''} onValueChange={(v) => setDentistId(v || '')}>
              <SelectTrigger id="appt-dentist">
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
              <Label htmlFor="appt-start">{t('appointments.startAt')}</Label>
              <Input
                id="appt-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-end">{t('appointments.endAt')}</Label>
              <Input
                id="appt-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-status">{t('appointments.status')}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
              <SelectTrigger id="appt-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STATUS_KEY[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-notes">{t('appointments.notes')}</Label>
            <Input
              id="appt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('appointments.notes')}
            />
          </div>

          <DialogFooter>
            {canConsume && detail && (
              <Button type="button" variant="outline" onClick={() => onStartConsumption?.(detail)}>
                {t('consumption.record')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.close')}
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
