import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { MessageKey } from '@dentora/i18n'
import type { AuditAction, AuditEntry, AuditRetention, AuditTarget } from '@dentora/contracts'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 50
const DAY_MS = 86_400_000

const ACTION_KEY: Record<AuditAction, MessageKey> = {
  LOGIN_SUCCESS: 'audit.actions.loginSuccess',
  LOGIN_FAILURE: 'audit.actions.loginFailure',
  LOGOUT: 'audit.actions.logout',
  CHANGE_PASSWORD: 'audit.actions.changePassword',
  REVOKE_ALL_SESSIONS: 'audit.actions.revokeAllSessions',
  USER_ROLE_CHANGE: 'audit.actions.userRoleChange',
  REVOKE_SESSIONS: 'audit.actions.revokeSessions',
  PATIENT_VIEW: 'audit.actions.patientView',
  PATIENT_CREATE: 'audit.actions.patientCreate',
  PATIENT_UPDATE: 'audit.actions.patientUpdate',
  PATIENT_ARCHIVED: 'audit.actions.patientArchived',
  PATIENT_RESTORE: 'audit.actions.patientRestore',
  PATIENT_MEDICAL_VIEW: 'audit.actions.patientMedicalView',
  PATIENT_MEDICAL_UPDATE: 'audit.actions.patientMedicalUpdate',
  PATIENT_ODONTOGRAM_VIEW: 'audit.actions.patientOdontogramView',
  PATIENT_ODONTOGRAM_UPDATE: 'audit.actions.patientOdontogramUpdate',
  PATIENT_DOCUMENT_CREATE: 'audit.actions.patientDocumentCreate',
  PATIENT_DOCUMENT_VIEW: 'audit.actions.patientDocumentView',
  APPOINTMENT_CREATE: 'audit.actions.appointmentCreate',
  APPOINTMENT_UPDATE: 'audit.actions.appointmentUpdate',
  APPOINTMENT_CANCEL: 'audit.actions.appointmentCancel',
  APPOINTMENT_RESCHEDULE: 'audit.actions.appointmentReschedule',
  APPOINTMENT_VIEW: 'audit.actions.appointmentView',
  APPOINTMENT_NOSHOW: 'audit.actions.appointmentNoShow',
  WAITLIST_CREATE: 'audit.actions.waitlistCreate',
  WAITLIST_UPDATE: 'audit.actions.waitlistUpdate',
  WAITLIST_BOOK: 'audit.actions.waitlistBook',
  WAITLIST_CANCEL: 'audit.actions.waitlistCancel',
  SERVICE_CREATE: 'audit.actions.serviceCreate',
  SERVICE_UPDATE: 'audit.actions.serviceUpdate',
  SERVICE_ARCHIVE: 'audit.actions.serviceArchive',
  SERVICE_RESTORE: 'audit.actions.serviceRestore',
  INVOICE_CREATE: 'audit.actions.invoiceCreate',
  INVOICE_VOID: 'audit.actions.invoiceVoid',
  PAYMENT_CREATE: 'audit.actions.paymentCreate',
  PAYMENT_REFUND: 'audit.actions.paymentRefund',
  EXPENSE_CREATE: 'audit.actions.expenseCreate',
  EXPENSE_UPDATE: 'audit.actions.expenseUpdate',
  EXPENSE_VOID: 'audit.actions.expenseVoid',
  PRODUCT_CREATE: 'audit.actions.productCreate',
  PRODUCT_UPDATE: 'audit.actions.productUpdate',
  PRODUCT_ARCHIVE: 'audit.actions.productArchive',
  PRODUCT_RESTORE: 'audit.actions.productRestore',
  SUPPLIER_CREATE: 'audit.actions.supplierCreate',
  SUPPLIER_UPDATE: 'audit.actions.supplierUpdate',
  SUPPLIER_ARCHIVE: 'audit.actions.supplierArchive',
  SUPPLIER_RESTORE: 'audit.actions.supplierRestore',
  PURCHASE_ORDER_CREATE: 'audit.actions.purchaseOrderCreate',
  PURCHASE_ORDER_UPDATE: 'audit.actions.purchaseOrderUpdate',
  PURCHASE_ORDER_RECEIVE: 'audit.actions.purchaseOrderReceive',
  PURCHASE_ORDER_CANCEL: 'audit.actions.purchaseOrderCancel',
  STOCK_OUT: 'audit.actions.stockOut',
  STOCK_ADJUST: 'audit.actions.stockAdjust',
  STERILIZATION_CREATE: 'audit.actions.sterilizationCreate',
  STERILIZATION_UPDATE: 'audit.actions.sterilizationUpdate',
  STAFF_CREATE: 'audit.actions.staffCreate',
  STAFF_UPDATE: 'audit.actions.staffUpdate',
  STAFF_PASSWORD_RESET: 'audit.actions.staffPasswordReset',
  SCHEDULE_UPDATE: 'audit.actions.scheduleUpdate',
  ATTENDANCE_CREATE: 'audit.actions.attendanceCreate',
  ATTENDANCE_UPDATE: 'audit.actions.attendanceUpdate',
  INTERN_CREATE: 'audit.actions.internCreate',
  INTERN_UPDATE: 'audit.actions.internUpdate',
  PAYROLL_CREATE: 'audit.actions.payrollCreate',
  PAYROLL_UPDATE: 'audit.actions.payrollUpdate',
  PAYROLL_VOID: 'audit.actions.payrollVoid',
  PORTAL_ACCESS_CREATE: 'audit.actions.portalAccessCreate',
  PORTAL_ACCESS_RESET: 'audit.actions.portalAccessReset',
  NOTIFICATION_CONFIG_UPDATE: 'audit.actions.notificationConfigUpdate',
  AUDIT_RETENTION_UPDATE: 'audit.actions.auditRetentionUpdate',
}

const TARGET_KEY: Record<AuditTarget, MessageKey> = {
  USER: 'audit.targets.user',
  SESSION: 'audit.targets.session',
  PATIENT: 'audit.targets.patient',
  BRANCH: 'audit.targets.branch',
  SYSTEM: 'audit.targets.system',
  SERVICE: 'audit.targets.service',
  INVOICE: 'audit.targets.invoice',
  EXPENSE: 'audit.targets.expense',
  PRODUCT: 'audit.targets.product',
  SUPPLIER: 'audit.targets.supplier',
  PURCHASE_ORDER: 'audit.targets.purchaseOrder',
  STERILIZATION: 'audit.targets.sterilization',
  SCHEDULE: 'audit.targets.schedule',
  ATTENDANCE: 'audit.targets.attendance',
  INTERN: 'audit.targets.intern',
  PAYROLL: 'audit.targets.payroll',
  NOTIFICATION: 'audit.targets.notification',
  AUDIT: 'audit.targets.audit',
}

function localMidnight(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isoFrom(dateStr: string): string | undefined {
  return dateStr ? localMidnight(new Date(`${dateStr}T00:00:00`)).toISOString() : undefined
}

function isoTo(dateStr: string): string | undefined {
  return dateStr
    ? new Date(localMidnight(new Date(`${dateStr}T00:00:00`)).getTime() + DAY_MS).toISOString()
    : undefined
}

export function AuditView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<AuditAction | undefined>(undefined)
  const [targetType, setTargetType] = useState<AuditTarget | undefined>(undefined)
  const [actorEmail, setActorEmail] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [offset, setOffset] = useState(0)

  const [retention, setRetention] = useState<AuditRetention | null>(null)
  const [draft, setDraft] = useState({ enabled: false, days: 365 })
  const [purgedCount, setPurgedCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [purging, setPurging] = useState(false)

  useEffect(() => {
    setOffset(0)
  }, [action, targetType, actorEmail, from, to])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .audit({
        limit: PAGE_SIZE,
        offset,
        action,
        targetType,
        actorEmail: actorEmail.trim() || undefined,
        from: isoFrom(from),
        to: isoTo(to),
      })
      .then((r) => {
        if (cancelled) return
        setEntries(r.entries)
        setTotal(r.total)
      })
      .catch(() => {
        if (!cancelled) toast(t('audit.loadError'), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [action, targetType, actorEmail, from, to, offset, t, toast])

  const loadRetention = useCallback(() => {
    let cancelled = false
    api
      .auditRetention()
      .then((r) => {
        if (cancelled) return
        setRetention(r)
        setDraft({ enabled: r.enabled, days: r.days })
      })
      .catch(() => {
        if (!cancelled) toast(t('audit.retention.loadError'), 'error')
      })
    return () => {
      cancelled = true
    }
  }, [t, toast])

  useEffect(() => {
    return loadRetention()
  }, [loadRetention])

  const handleSaveRetention = async () => {
    setSaving(true)
    try {
      const updated = await api.updateAuditRetention(draft)
      setRetention(updated)
      setDraft({ enabled: updated.enabled, days: updated.days })
      toast(t('audit.retention.saved'), 'success')
    } catch {
      toast(t('audit.retention.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePurge = async () => {
    if (!retention?.enabled) return
    setPurging(true)
    try {
      const result = await api.purgeAuditRetention()
      setPurgedCount(result.deleted)
      toast(t('audit.retention.purged', { count: result.deleted }), 'success')
      loadRetention()
      setTotal(Math.max(0, total - result.deleted))
    } catch {
      toast(t('audit.retention.purgeError'), 'error')
    } finally {
      setPurging(false)
    }
  }

  const pageStart = total === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + PAGE_SIZE, total)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('audit.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={action ?? 'all'}
              onValueChange={(v) => setAction(v === 'all' ? undefined : (v as AuditAction))}
            >
              <SelectTrigger className="w-fit">
                <SelectValue placeholder={t('audit.allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit.allActions')}</SelectItem>
                {(Object.keys(ACTION_KEY) as AuditAction[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(ACTION_KEY[a])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={targetType ?? 'all'}
              onValueChange={(v) => setTargetType(v === 'all' ? undefined : (v as AuditTarget))}
            >
              <SelectTrigger className="w-fit">
                <SelectValue placeholder={t('audit.allTargets')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit.allTargets')}</SelectItem>
                {(Object.keys(TARGET_KEY) as AuditTarget[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(TARGET_KEY[a])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder={t('audit.search')}
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              className="w-56"
            />

            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs text-muted-foreground">{t('audit.from')}</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
              <Label className="shrink-0 text-xs text-muted-foreground">{t('audit.to')}</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString()}{' '}
                    {new Date(e.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="shrink-0 font-medium text-foreground">
                    {t(ACTION_KEY[e.action])}
                  </span>
                  <span className="shrink-0 rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {t(TARGET_KEY[e.targetType])}
                    {e.targetId ? <span className="font-mono"> · {e.targetId}</span> : null}
                  </span>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {e.actorEmail ?? '—'}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {e.ip ?? ''}
                </span>
              </div>
            ))}
            {!loading && entries.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('audit.noEvents')}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {total > 0
                ? t('audit.showing', {
                    from: String(pageStart),
                    to: String(pageEnd),
                    total: String(total),
                  })
                : `0 ${t('audit.events')}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                {t('audit.prev')}
              </Button>
              <Button
                variant="outline"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                {t('audit.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {retention ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('audit.retention.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t('audit.retention.hint')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                />
                {t('audit.retention.enabled')}
              </label>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  draft.enabled
                    ? 'border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : 'border-neutral-400/30 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {t(draft.enabled ? 'audit.retention.enabled' : 'audit.retention.purgeDisabled')}
              </span>
            </div>
            <div className="grid max-w-sm gap-1.5">
              <Label>{t('audit.retention.daysLabel')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={Number.isNaN(draft.days) ? '' : draft.days}
                  onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  {t('audit.retention.dayUnit')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t('audit.retention.enabledHint')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => void handleSaveRetention()}
                disabled={saving || Number.isNaN(draft.days) || draft.days < 1}
              >
                {t('audit.retention.save')}
              </Button>
              <Button onClick={() => void handlePurge()} disabled={purging || !retention.enabled}>
                {t('audit.retention.purgeNow')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {retention.lastPurgedAt
                  ? t('audit.retention.lastPurged', {
                      date: new Date(retention.lastPurgedAt).toLocaleString(),
                    })
                  : t('audit.retention.neverPurged')}
              </span>
              {purgedCount !== null && (
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  {t('audit.retention.purged', { count: String(purgedCount) })}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            {t('audit.retention.loadError')}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
