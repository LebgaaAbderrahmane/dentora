import { useEffect, useMemo, useState } from 'react'
import type { MessageKey } from '@dentora/i18n'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { AttendanceLog, AttendanceQueryParams, Role } from '@dentora/contracts'
import { api, ApiError } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ROLE_KEY: Record<Role, MessageKey> = {
  ADMIN: 'role.admin',
  DENTIST: 'role.dentist',
  RECEPTIONIST: 'role.receptionist',
  ACCOUNTANT: 'role.accountant',
  INTERN: 'role.intern',
  PATIENT: 'role.patient',
}

function todayStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

type RosterItem = { id: string; name: string; role: Role }

export function AttendanceView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<AttendanceLog[]>([])
  const [roster, setRoster] = useState<RosterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [staffId, setStaffId] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [clockStaff, setClockStaff] = useState('')
  const [clockNote, setClockNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const today = todayStr()

  useEffect(() => {
    api
      .attendanceRoster()
      .then(setRoster)
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [t, toast])

  async function fetchItems() {
    const params: Partial<AttendanceQueryParams> = {
      from: from || undefined,
      to: to || undefined,
      staffId: staffId || undefined,
      open: openOnly,
      limit: 200,
    }
    const r = await api.attendance(params)
    setItems(r.items)
  }

  useEffect(() => {
    api
      .attendance({
        from: from || undefined,
        to: to || undefined,
        staffId: staffId || undefined,
        open: openOnly,
        limit: 200,
      })
      .then((r) => setItems(r.items))
      .catch(() => toast(t('auth.serverError'), 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, staffId, openOnly])

  const todayItems = useMemo(
    () => items.filter((r) => r.date.slice(0, 10) === today),
    [items, today],
  )
  const openItems = useMemo(() => todayItems.filter((r) => r.checkOut === null), [todayItems])
  const hoursToday = useMemo(
    () => todayItems.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0),
    [todayItems],
  )

  async function clockIn() {
    if (!clockStaff) {
      toast(t('attendance.chooseStaff'), 'error')
      return
    }
    setSubmitting(true)
    try {
      await api.createAttendance({
        staffId: clockStaff,
        date: today,
        checkIn: new Date().toISOString(),
        notes: clockNote || undefined,
      })
      toast(t('attendance.created'), 'success')
      setClockNote('')
      await fetchItems()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast(t('attendance.alreadyExists'), 'error')
      } else {
        toast(t('attendance.error'), 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function clockOut(record: AttendanceLog) {
    setSubmitting(true)
    try {
      await api.updateAttendance(record.id, { checkOut: new Date().toISOString() })
      toast(t('attendance.updated'), 'success')
      await fetchItems()
    } catch {
      toast(t('attendance.error'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('attendance.today')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{todayItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('attendance.openNow')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{openItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('attendance.hoursToday')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{minutesLabel(hoursToday)}</p>
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{t('attendance.checkInNow')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('attendance.staff')}</Label>
              <Select value={clockStaff} onValueChange={setClockStaff}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={t('attendance.chooseStaff')} />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="attendance-note">{t('attendance.notes')}</Label>
              <Input
                id="attendance-note"
                value={clockNote}
                maxLength={500}
                className="w-64"
                onChange={(e) => setClockNote(e.target.value)}
              />
            </div>
            <Button onClick={() => void clockIn()} disabled={submitting || !clockStaff}>
              {t('attendance.checkInNow')}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t('attendance.from')}</Label>
          <Input
            type="date"
            className="w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('attendance.to')}</Label>
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('attendance.staff')}</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('attendance.allStaff')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('attendance.allStaff')}</SelectItem>
              {roster.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          {t('attendance.openOnly')}
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('attendance.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('attendance.empty')}</p>
          ) : (
            items.map((r) => {
              const open = r.checkOut === null
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {r.staffName}
                      </span>
                      <span
                        className={
                          open
                            ? 'rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300'
                            : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                        }
                      >
                        {t(ROLE_KEY[r.staffRole])}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t('attendance.date')}: {r.date.slice(0, 10)} — {t('attendance.checkIn')}:{' '}
                      {r.checkIn ? toLocalTime(r.checkIn) : '—'} — {t('attendance.checkOut')}:{' '}
                      {r.checkOut ? toLocalTime(r.checkOut) : '—'} — {t('attendance.worked')}:{' '}
                      {r.workedMinutes !== null ? minutesLabel(r.workedMinutes) : '—'}
                      {r.notes ? ` — ${r.notes}` : ''}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t('attendance.createdBy')}: {r.createdByName}
                    </div>
                  </div>
                  {canEdit && open && (
                    <Button variant="outline" size="sm" onClick={() => void clockOut(r)}>
                      {t('attendance.checkOutNow')}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
