import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MessageKey } from '@dentora/i18n'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import {
  INTERN_REQUIRED_HOURS_MAX,
  INTERN_ROTATIONS,
  type InternInput,
  type InternProfile,
  type InternRotation,
  type InternUpdate,
} from '@dentora/contracts'
import { api, ApiError } from '../lib/api'
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

const ROTATION_KEY: Record<InternRotation, MessageKey> = {
  CONSULTATION: 'intern.rotation.consultation',
  SURGERY: 'intern.rotation.surgery',
  CARE: 'intern.rotation.care',
  HYGIENE: 'intern.rotation.hygiene',
  PROSTHETIC_ORTHO: 'intern.rotation.prostheticOrtho',
  IMAGING: 'intern.rotation.imaging',
}

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

type MetaIntern = { id: string; name: string; hasProfile: boolean }
type MetaMentor = { id: string; name: string }

export function InternsView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<InternProfile[]>([])
  const [interns, setInterns] = useState<MetaIntern[]>([])
  const [mentors, setMentors] = useState<MetaMentor[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [rotation, setRotation] = useState<InternRotation | ''>('')
  const [active, setActive] = useState<'true' | 'false' | ''>('')
  const [editing, setEditing] = useState<InternProfile | 'new' | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  async function fetchItems() {
    const r = await api.interns({
      search: debouncedQ || undefined,
      rotation: rotation || undefined,
      active: active === '' ? undefined : active === 'true',
      limit: 200,
    })
    setItems(r.items)
  }

  useEffect(() => {
    api
      .interns({
        search: debouncedQ || undefined,
        rotation: rotation || undefined,
        active: active === '' ? undefined : active === 'true',
        limit: 200,
      })
      .then((r) => setItems(r.items))
      .catch(() => toast(t('auth.serverError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, rotation, active, t, toast])

  useEffect(() => {
    api
      .internMeta()
      .then((meta) => {
        setInterns(meta.interns)
        setMentors(meta.mentors)
      })
      .catch(() => undefined)
  }, [])

  if (loading) {
    return <p className="text-sm text-muted-foreground">…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label={t('intern.search')}
          placeholder={t('intern.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={rotation} onValueChange={(v) => setRotation(v as InternRotation | '')}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder={t('intern.allRotations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('intern.allRotations')}</SelectItem>
            {[...INTERN_ROTATIONS].map((r) => (
              <SelectItem key={r} value={r}>
                {t(ROTATION_KEY[r])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={active} onValueChange={(v) => setActive(v as 'true' | 'false' | '')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('intern.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('intern.allStatuses')}</SelectItem>
            <SelectItem value="true">{t('intern.active')}</SelectItem>
            <SelectItem value="false">{t('intern.inactive')}</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && <Button onClick={() => setEditing('new')}>{t('intern.add')}</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('intern.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('intern.empty')}</p>
          ) : (
            items.map((p) => {
              const completed = minutesLabel(p.completedMinutes)
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {p.internName}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {t(ROTATION_KEY[p.rotation])}
                      </span>
                      {!p.active && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          {t('intern.inactive')}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.internEmail} — {p.school} — {t('intern.mentor')}:{' '}
                      {p.mentorName ?? t('intern.noMentor')} — {t('intern.period')}:{' '}
                      {p.startDate.slice(0, 10)}
                      {p.endDate ? ` → ${p.endDate.slice(0, 10)}` : ' → …'}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, p.progressPct)}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {completed} / {p.requiredHours}h — {p.progressPct}%
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                        {t('intern.edit')}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {editing && (
        <InternDialog
          profile={editing}
          interns={interns}
          mentors={mentors}
          onClose={() => setEditing(null)}
          onSaved={fetchItems}
        />
      )}
    </div>
  )
}

function InternDialog({
  profile,
  interns,
  mentors,
  onClose,
  onSaved,
}: {
  profile: InternProfile | 'new'
  interns: MetaIntern[]
  mentors: MetaMentor[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const isNew = profile === 'new'
  const [internId, setInternId] = useState(isNew ? '' : profile.internId)
  const [school, setSchool] = useState(isNew ? '' : profile.school)
  const [requiredHours, setRequiredHours] = useState(isNew ? 200 : profile.requiredHours)
  const [rotation, setRotation] = useState<InternRotation>(isNew ? 'CARE' : profile.rotation)
  const [mentorId, setMentorId] = useState(isNew ? '' : (profile.mentorId ?? ''))
  const [startDate, setStartDate] = useState(isNew ? '' : profile.startDate.slice(0, 10))
  const [endDate, setEndDate] = useState(isNew ? '' : (profile.endDate?.slice(0, 10) ?? ''))
  const [active, setActive] = useState(isNew ? true : profile.active)
  const [notes, setNotes] = useState(isNew ? '' : (profile.notes ?? ''))
  const [submitting, setSubmitting] = useState(false)

  const available = interns.filter((i) => isNew || i.id === internId || !i.hasProfile)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (endDate && startDate && endDate < startDate) {
      toast(t('intern.dateError'), 'error')
      return
    }
    setSubmitting(true)
    try {
      if (isNew) {
        const input: InternInput = {
          internId,
          school,
          requiredHours,
          rotation,
          mentorId: mentorId || undefined,
          startDate,
          endDate: endDate || undefined,
          notes: notes || undefined,
        }
        await api.createIntern(input)
        toast(t('intern.created'), 'success')
      } else {
        const input: InternUpdate = {
          school,
          requiredHours,
          rotation,
          mentorId: mentorId || null,
          startDate,
          endDate: endDate || null,
          active,
          notes: notes || null,
        }
        await api.updateIntern(profile.id, input)
        toast(t('intern.updated'), 'success')
      }
      onClose()
      await onSaved()
    } catch (err) {
      const dup = err instanceof ApiError && err.status === 409
      toast(t(dup ? 'intern.alreadyExists' : 'auth.serverError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(isNew ? 'intern.add' : 'intern.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          {isNew && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intern-intern">{t('intern.intern')}</Label>
              <Select value={internId} onValueChange={setInternId}>
                <SelectTrigger id="intern-intern" className="w-full">
                  <SelectValue placeholder={t('intern.chooseIntern')} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isNew && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('intern.intern')}</Label>
              <p className="text-sm text-muted-foreground">{profile.internName}</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intern-school">{t('intern.school')}</Label>
            <Input
              id="intern-school"
              value={school}
              required
              maxLength={120}
              onChange={(e) => setSchool(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intern-hours">{t('intern.requiredHours')}</Label>
            <Input
              id="intern-hours"
              type="number"
              min={1}
              max={INTERN_REQUIRED_HOURS_MAX}
              value={requiredHours}
              required
              onChange={(e) => setRequiredHours(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intern-rotation">{t('intern.rotation')}</Label>
            <Select value={rotation} onValueChange={(v) => setRotation(v as InternRotation)}>
              <SelectTrigger id="intern-rotation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...INTERN_ROTATIONS].map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(ROTATION_KEY[r])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intern-mentor">{t('intern.mentor')}</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger id="intern-mentor" className="w-full">
                <SelectValue placeholder={t('intern.noMentor')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('intern.noMentor')}</SelectItem>
                {mentors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intern-start">{t('intern.startDate')}</Label>
              <Input
                id="intern-start"
                type="date"
                value={startDate}
                required
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intern-end">{t('intern.endDate')}</Label>
              <Input
                id="intern-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="intern-notes">{t('intern.notes')}</Label>
            <Input
              id="intern-notes"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {!isNew && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {t('intern.active')}
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || (isNew && !internId)}>
              {t(isNew ? 'intern.add' : 'appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
