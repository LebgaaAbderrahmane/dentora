import { useState } from 'react'
import type { ClinicSchedule } from '@dentora/contracts'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import { api } from '../lib/api'
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

// FullCalendar weekday order (0 = Sunday) → staff.weekday.* keys.
const DAY_KEYS: Record<number, MessageKey> = {
  0: 'staff.weekday.sunday',
  1: 'staff.weekday.monday',
  2: 'staff.weekday.tuesday',
  3: 'staff.weekday.wednesday',
  4: 'staff.weekday.thursday',
  5: 'staff.weekday.friday',
  6: 'staff.weekday.saturday',
}

// Editable by ADMIN (the view passes `canEdit`); others get a read-only copy.
export function ClinicScheduleDialog({
  schedule,
  canEdit,
  onClose,
  onSaved,
}: {
  schedule: ClinicSchedule
  canEdit: boolean
  onClose: () => void
  onSaved: (next: ClinicSchedule) => void
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [openTime, setOpenTime] = useState(schedule.openTime)
  const [closeTime, setCloseTime] = useState(schedule.closeTime)
  const [days, setDays] = useState<number[]>([...schedule.workingDays].sort())
  const [saving, setSaving] = useState(false)

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (days.length === 0 || openTime >= closeTime) return
    setSaving(true)
    try {
      const next = await api.updateClinicSchedule({ openTime, closeTime, workingDays: days })
      toast(t('appointments.schedule.saved'), 'success')
      onSaved(next)
    } catch {
      toast(t('auth.serverError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const valid = days.length > 0 && openTime < closeTime

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('appointments.schedule.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="schedule-open">{t('appointments.schedule.open')}</Label>
              <Input
                id="schedule-open"
                type="time"
                value={openTime}
                disabled={!canEdit}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="schedule-close">{t('appointments.schedule.close')}</Label>
              <Input
                id="schedule-close"
                type="time"
                value={closeTime}
                disabled={!canEdit}
                onChange={(e) => setCloseTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('appointments.schedule.days')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const active = days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleDay(d)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-accent'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {t(DAY_KEYS[d])}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t('appointments.schedule.hint')}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            {canEdit && (
              <Button type="submit" disabled={saving || !valid}>
                {t('common.save')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
