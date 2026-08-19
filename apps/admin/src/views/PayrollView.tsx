import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MessageKey } from '@dentora/i18n'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import {
  MAX_PAYROLL_AMOUNT_DZD,
  type Payslip,
  type PayslipInput,
  type PayslipUpdate,
  type Role,
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

const ROLE_KEY: Record<Role, MessageKey | null> = {
  ADMIN: 'role.admin',
  DENTIST: 'role.dentist',
  RECEPTIONIST: 'role.receptionist',
  ACCOUNTANT: 'role.accountant',
  INTERN: 'role.intern',
  PATIENT: null,
}

function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

type MetaStaff = { id: string; name: string; role: Role }

export function PayrollView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<Payslip[]>([])
  const [staff, setStaff] = useState<MetaStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [voided, setVoided] = useState<'true' | 'false' | ''>('')
  const [editing, setEditing] = useState<Payslip | 'new' | null>(null)
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null)

  async function fetchItems() {
    const r = await api.payslips({
      staffId: staffId || undefined,
      from: from || undefined,
      to: to || undefined,
      voided: voided === '' ? undefined : voided === 'true',
      limit: 200,
    })
    setItems(r.items)
  }

  useEffect(() => {
    api
      .payslips({
        staffId: staffId || undefined,
        from: from || undefined,
        to: to || undefined,
        voided: voided === '' ? undefined : voided === 'true',
        limit: 200,
      })
      .then((r) => setItems(r.items))
      .catch(() => toast(t('auth.serverError'), 'error'))
      .finally(() => setLoading(false))
  }, [staffId, from, to, voided, t, toast])

  useEffect(() => {
    api
      .payrollMeta()
      .then((meta) => setStaff(meta.staff))
      .catch(() => undefined)
  }, [])

  function handleVoid(slip: Payslip) {
    if (confirmVoidId !== slip.id) {
      setConfirmVoidId(slip.id)
      return
    }
    setConfirmVoidId(null)
    api
      .voidPayslip(slip.id)
      .then(() => {
        toast(t('payroll.voided'), 'success')
        void fetchItems()
      })
      .catch((err) => {
        const done = err instanceof ApiError && err.status === 409
        toast(t(done ? 'payroll.alreadyVoided' : 'auth.serverError'), 'error')
        void fetchItems()
      })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={staffId} onValueChange={setStaffId}>
          <SelectTrigger className="w-[210px]">
            <SelectValue placeholder={t('payroll.allStaff')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('payroll.allStaff')}</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label htmlFor="payroll-from" className="text-xs text-muted-foreground">
            {t('payroll.from')}
          </Label>
          <Input
            id="payroll-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="payroll-to" className="text-xs text-muted-foreground">
            {t('payroll.to')}
          </Label>
          <Input
            id="payroll-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
        <Select value={voided} onValueChange={(v) => setVoided(v as 'true' | 'false' | '')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('payroll.allPeriods')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('payroll.allPeriods')}</SelectItem>
            <SelectItem value="true">{t('payroll.voidedBadge')}</SelectItem>
            <SelectItem value="false">{t('payroll.net')}</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && <Button onClick={() => setEditing('new')}>{t('payroll.add')}</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('payroll.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('payroll.empty')}</p>
          ) : (
            items.map((slip) => (
              <div
                key={slip.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {slip.staffName}
                    </span>
                    {ROLE_KEY[slip.staffRole] && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {t(ROLE_KEY[slip.staffRole] as MessageKey)}
                      </span>
                    )}
                    {slip.voidedAt && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {t('payroll.voidedBadge')}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t('payroll.period')}: {slip.periodStart.slice(0, 10)} →{' '}
                    {slip.periodEnd.slice(0, 10)} — {t('payroll.worked')}:{' '}
                    {minutesLabel(slip.workedMinutes)}
                    {slip.createdByName ? ` — ${slip.createdByName}` : ''}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {t('payroll.base')}: {slip.baseDZD.toLocaleString()} {t('catalog.currency')}
                    </span>
                    {slip.bonusDZD > 0 && (
                      <span>
                        {t('payroll.bonus')}: {slip.bonusDZD.toLocaleString()}{' '}
                        {t('catalog.currency')}
                      </span>
                    )}
                    {slip.deductionsDZD > 0 && (
                      <span>
                        {t('payroll.deductions')}: {slip.deductionsDZD.toLocaleString()}{' '}
                        {t('catalog.currency')}
                      </span>
                    )}
                    <span className="font-medium text-foreground">
                      {t('payroll.net')}: {slip.netDZD.toLocaleString()} {t('catalog.currency')}
                    </span>
                  </div>
                  {slip.notes && (
                    <div className="mt-1 truncate text-xs italic text-muted-foreground">
                      {slip.notes}
                    </div>
                  )}
                </div>
                {canEdit && !slip.voidedAt && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(slip)}>
                      {t('payroll.edit')}
                    </Button>
                    <Button
                      variant={confirmVoidId === slip.id ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => handleVoid(slip)}
                    >
                      {confirmVoidId === slip.id ? t('payroll.voidConfirm') : t('payroll.void')}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing && (
        <PayrollDialog
          slip={editing}
          staff={staff}
          onClose={() => setEditing(null)}
          onSaved={fetchItems}
        />
      )}
    </div>
  )
}

function PayrollDialog({
  slip,
  staff,
  onClose,
  onSaved,
}: {
  slip: Payslip | 'new'
  staff: MetaStaff[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const isNew = slip === 'new'
  const [staffId, setStaffId] = useState(isNew ? '' : slip.staffId)
  const [periodStart, setPeriodStart] = useState(isNew ? '' : slip.periodStart.slice(0, 10))
  const [periodEnd, setPeriodEnd] = useState(isNew ? '' : slip.periodEnd.slice(0, 10))
  const [baseDZD, setBaseDZD] = useState(isNew ? 0 : slip.baseDZD)
  const [bonusDZD, setBonusDZD] = useState(isNew ? 0 : slip.bonusDZD)
  const [deductionsDZD, setDeductionsDZD] = useState(isNew ? 0 : slip.deductionsDZD)
  const [notes, setNotes] = useState(isNew ? '' : (slip.notes ?? ''))
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (periodEnd && periodStart && periodEnd < periodStart) {
      toast(t('payroll.dateError'), 'error')
      return
    }
    if (deductionsDZD > baseDZD + bonusDZD) {
      toast(t('payroll.amountError'), 'error')
      return
    }
    setSubmitting(true)
    try {
      if (isNew) {
        const input: PayslipInput = {
          staffId,
          periodStart,
          periodEnd,
          baseDZD,
          bonusDZD,
          deductionsDZD,
          notes: notes || undefined,
        }
        await api.createPayslip(input)
        toast(t('payroll.created'), 'success')
      } else {
        const input: PayslipUpdate = {
          periodStart,
          periodEnd,
          baseDZD,
          bonusDZD,
          deductionsDZD,
          notes: notes || null,
        }
        await api.updatePayslip(slip.id, input)
        toast(t('payroll.updated'), 'success')
      }
      onClose()
      await onSaved()
    } catch (err) {
      const dup = err instanceof ApiError && err.status === 409
      toast(t(dup ? 'payroll.duplicate' : 'auth.serverError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(isNew ? 'payroll.add' : 'payroll.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          {!isNew && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('payroll.staff')}</Label>
              <p className="text-sm text-muted-foreground">{slip.staffName}</p>
            </div>
          )}
          {isNew && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payroll-staff">{t('payroll.staff')}</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger id="payroll-staff" className="w-full">
                  <SelectValue placeholder={t('payroll.chooseStaff')} />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payroll-start">{t('payroll.from')}</Label>
              <Input
                id="payroll-start"
                type="date"
                value={periodStart}
                required
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payroll-end">{t('payroll.to')}</Label>
              <Input
                id="payroll-end"
                type="date"
                value={periodEnd}
                required
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payroll-base">{t('payroll.base')}</Label>
            <Input
              id="payroll-base"
              type="number"
              min={0}
              max={MAX_PAYROLL_AMOUNT_DZD}
              value={baseDZD}
              required
              onChange={(e) => setBaseDZD(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="payroll-bonus">{t('payroll.bonus')}</Label>
              <Input
                id="payroll-bonus"
                type="number"
                min={0}
                max={MAX_PAYROLL_AMOUNT_DZD}
                value={bonusDZD}
                onChange={(e) => setBonusDZD(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="payroll-deductions">{t('payroll.deductions')}</Label>
              <Input
                id="payroll-deductions"
                type="number"
                min={0}
                max={MAX_PAYROLL_AMOUNT_DZD}
                value={deductionsDZD}
                onChange={(e) => setDeductionsDZD(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payroll-notes">{t('payroll.notes')}</Label>
            <Input
              id="payroll-notes"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || (isNew && !staffId)}>
              {t(isNew ? 'payroll.add' : 'appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
