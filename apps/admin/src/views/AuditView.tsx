import { useEffect, useState } from 'react'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import type { AuditAction, AuditEntry } from '@dentora/contracts'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
}

export function AuditView() {
  const { t } = useI18n()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState<AuditAction | undefined>(undefined)

  useEffect(() => {
    api
      .audit({ limit: 50, action })
      .then((r) => {
        setEntries(r.entries)
        setTotal(r.total)
      })
      .catch(() => {
        setEntries([])
        setTotal(0)
      })
  }, [action])

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>{t('audit.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {e.actorEmail ?? '—'}
                </span>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.ip ?? ''}</span>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('audit.noEvents')}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {total} {t('audit.events')}
        </p>
      </CardContent>
    </Card>
  )
}
