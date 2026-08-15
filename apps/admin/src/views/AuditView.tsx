import { useEffect, useState } from 'react'
import { Card } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import type { AuditAction, AuditEntry } from '@dentora/contracts'
import { api } from '../lib/api'

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
    <Card title={t('audit.title')} className="flex flex-col gap-4">
      <select
        value={action ?? ''}
        onChange={(e) => setAction(e.target.value ? (e.target.value as AuditAction) : undefined)}
        className="w-fit rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
      >
        <option value="">{t('audit.allActions')}</option>
        {(Object.keys(ACTION_KEY) as AuditAction[]).map((a) => (
          <option key={a} value={a}>
            {t(ACTION_KEY[a])}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-1.5">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-500">
                {new Date(e.createdAt).toLocaleDateString()}{' '}
                {new Date(e.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="shrink-0 font-medium text-neutral-800 dark:text-neutral-200">
                {t(ACTION_KEY[e.action])}
              </span>
              <span className="min-w-0 truncate text-xs text-neutral-500">
                {e.actorEmail ?? '—'}
              </span>
            </div>
            <span className="shrink-0 font-mono text-xs text-neutral-400">{e.ip ?? ''}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('audit.noEvents')}</p>
        )}
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {total} {t('audit.events')}
      </p>
    </Card>
  )
}
