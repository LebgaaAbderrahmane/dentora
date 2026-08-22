import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MessageKey } from '@dentora/i18n'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import {
  STAFF_ROLES,
  WEEKDAYS,
  type Role,
  type SafeUser,
  type StaffInput,
  type StaffRole,
  type StaffSchedule,
  type StaffUpdate,
  type Weekday,
} from '@dentora/contracts'
import { api, ApiError } from '../lib/api'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ROLE_KEY: Record<Role, MessageKey> = {
  ADMIN: 'role.admin',
  DENTIST: 'role.dentist',
  RECEPTIONIST: 'role.receptionist',
  ACCOUNTANT: 'role.accountant',
  INTERN: 'role.intern',
  PATIENT: 'role.patient',
}

const WEEKDAY_KEY: Record<Weekday, MessageKey> = {
  MONDAY: 'staff.weekday.monday',
  TUESDAY: 'staff.weekday.tuesday',
  WEDNESDAY: 'staff.weekday.wednesday',
  THURSDAY: 'staff.weekday.thursday',
  FRIDAY: 'staff.weekday.friday',
  SATURDAY: 'staff.weekday.saturday',
  SUNDAY: 'staff.weekday.sunday',
}

const HOUR_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/

type EditorRow = { weekday: Weekday; active: boolean; startTime: string; endTime: string }

const EMPTY_EDITOR: EditorRow[] = WEEKDAYS.map((weekday) => ({
  weekday,
  active: false,
  startTime: '09:00',
  endTime: '17:00',
}))

function mergeSchedule(row: EditorRow, schedules: StaffSchedule[]): EditorRow {
  const match = schedules.find((s) => s.weekday === row.weekday)
  if (!match) return row
  return {
    weekday: row.weekday,
    active: match.active,
    startTime: match.startTime,
    endTime: match.endTime,
  }
}

export function StaffView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('')
  const [editing, setEditing] = useState<SafeUser | 'new' | null>(null)
  const [resetFor, setResetFor] = useState<SafeUser | null>(null)
  const [schedFor, setSchedFor] = useState<SafeUser | null>(null)
  const [schedRows, setSchedRows] = useState<EditorRow[]>(EMPTY_EDITOR)
  const [schedLoading, setSchedLoading] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  async function fetchStaff() {
    const r = await api.staff({
      search: debouncedQ || undefined,
      role: roleFilter || undefined,
      limit: 100,
    })
    setItems(r.items)
  }

  useEffect(() => {
    api
      .staff({ search: debouncedQ || undefined, role: roleFilter || undefined, limit: 100 })
      .then((r) => {
        setItems(r.items)
      })
      .catch(() => toast(t('auth.serverError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, roleFilter, t, toast])

  if (loading) {
    return <p className="text-sm text-muted-foreground">…</p>
  }

  async function openSchedule(user: SafeUser) {
    setSchedFor(user)
    setSchedLoading(true)
    try {
      const schedules = await api.staffSchedules(user.id)
      setSchedRows(EMPTY_EDITOR.map((r) => mergeSchedule(r, schedules)))
    } catch {
      setSchedRows(EMPTY_EDITOR)
    } finally {
      setSchedLoading(false)
    }
  }

  async function saveSchedule() {
    if (!schedFor) return
    const rows = schedRows
      .filter((r) => r.active && HOUR_RE.test(r.startTime) && HOUR_RE.test(r.endTime))
      .map((r) => ({
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        active: true,
      }))
    for (const r of schedRows.filter((r) => r.active)) {
      if (!HOUR_RE.test(r.startTime) || !HOUR_RE.test(r.endTime)) {
        toast(t('staff.scheduleError'), 'error')
        return
      }
      if (r.endTime <= r.startTime) {
        toast(t('staff.scheduleTimeError'), 'error')
        return
      }
    }
    try {
      await api.saveStaffSchedules(schedFor.id, { schedules: rows })
      toast(t('staff.scheduleSaved'), 'success')
      setSchedFor(null)
    } catch (err) {
      toast(err instanceof ApiError ? t('staff.scheduleError') : t('auth.serverError'), 'error')
    }
  }

  async function toggleActive(user: SafeUser) {
    try {
      await api.updateStaff(user.id, { active: !user.active })
      toast(user.active ? t('staff.deactivated') : t('staff.activated'), 'success')
      await fetchStaff()
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('staff.search')}
          placeholder={t('staff.search')}
          value={q}
          onChange={setQ}
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as StaffRole | '')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('staff.role')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('staff.allRoles')}</SelectItem>
            {(STAFF_ROLES as StaffRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {t(ROLE_KEY[r])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setEditing('new')}>{t('staff.add')}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('staff.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('staff.noResults')}</p>
          ) : (
            items.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{u.name}</span>
                    <span
                      className={
                        u.active
                          ? 'rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }
                    >
                      {t(u.active ? 'staff.active' : 'staff.inactive')}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t(ROLE_KEY[u.role])}</span>
                  <Button variant="outline" size="sm" onClick={() => openSchedule(u)}>
                    {t('staff.schedule')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResetFor(u)}>
                    {t('staff.resetPassword')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                    {t('staff.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleActive(u)}
                    aria-label={t('staff.toggleActive')}
                  >
                    {t(u.active ? 'staff.deactivate' : 'staff.activate')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing && (
        <MemberDialog user={editing} onClose={() => setEditing(null)} onSaved={fetchStaff} />
      )}
      {resetFor && <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />}
      {schedFor && (
        <Dialog open onOpenChange={(o) => !o && setSchedFor(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('staff.scheduleTitle')}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t('staff.scheduleFor', { name: schedFor.name })}
              </p>
            </DialogHeader>
            {schedLoading ? (
              <p className="text-sm text-muted-foreground">…</p>
            ) : (
              <div className="flex flex-col gap-2">
                {schedRows.map((row) => (
                  <div
                    key={row.weekday}
                    className="flex flex-wrap items-center gap-3 rounded-lg border bg-background px-3 py-2"
                  >
                    <label className="flex w-28 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(e) =>
                          setSchedRows((rows) =>
                            rows.map((r) =>
                              r.weekday === row.weekday ? { ...r, active: e.target.checked } : r,
                            ),
                          )
                        }
                      />
                      <span className="font-medium text-foreground">
                        {t(WEEKDAY_KEY[row.weekday])}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={t('staff.scheduleStart')}
                        className="w-[110px]"
                        disabled={!row.active}
                        value={row.startTime}
                        onChange={(e) =>
                          setSchedRows((rows) =>
                            rows.map((r) =>
                              r.weekday === row.weekday ? { ...r, startTime: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      <span className="text-xs text-muted-foreground">—</span>
                      <Input
                        type="time"
                        aria-label={t('staff.scheduleEnd')}
                        className="w-[110px]"
                        disabled={!row.active}
                        value={row.endTime}
                        onChange={(e) =>
                          setSchedRows((rows) =>
                            rows.map((r) =>
                              r.weekday === row.weekday ? { ...r, endTime: e.target.value } : r,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSchedFor(null)}>
                {t('appointments.cancel')}
              </Button>
              <Button onClick={() => void saveSchedule()}>{t('staff.saveSchedule')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function MemberDialog({
  user,
  onClose,
  onSaved,
}: {
  user: SafeUser | 'new'
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const isNew = user === 'new'
  const [name, setName] = useState(isNew ? '' : user.name)
  const [email, setEmail] = useState(isNew ? '' : user.email)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<StaffRole>(
    isNew ? 'RECEPTIONIST' : user.role === 'PATIENT' ? 'RECEPTIONIST' : user.role,
  )
  const [active, setActive] = useState(isNew ? true : user.active)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (isNew) {
        const input: StaffInput = { name, email, password, role, active: true }
        await api.createStaff(input)
        toast(t('staff.created'), 'success')
      } else {
        const input: StaffUpdate = { name, email, role, active }
        await api.updateStaff(user.id, input)
        toast(t('staff.updated'), 'success')
      }
      onClose()
      await onSaved()
    } catch (err) {
      const inUse = err instanceof ApiError && err.status === 409
      toast(t(inUse ? 'staff.emailInUse' : 'auth.serverError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(isNew ? 'staff.add' : 'staff.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-name">{t('staff.name')}</Label>
            <Input
              id="staff-name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-email">{t('staff.email')}</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {isNew && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-password">{t('staff.password')}</Label>
              <Input
                id="staff-password"
                type="password"
                value={password}
                required
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('staff.passwordHint')}</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staff-role">{t('staff.role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger id="staff-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(STAFF_ROLES as StaffRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(ROLE_KEY[r])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isNew && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {t('staff.active')}
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t(isNew ? 'staff.add' : 'appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: SafeUser; onClose: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.resetStaffPassword(user.id, password)
      toast(t('staff.passwordReset'), 'success')
      onClose()
    } catch {
      toast(t('auth.serverError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('staff.resetPassword')}</DialogTitle>
          <p className="text-sm text-muted-foreground">{user.name}</p>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-password">{t('staff.password')}</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              required
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('staff.passwordHint')}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t('staff.resetPassword')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
