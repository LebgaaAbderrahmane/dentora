import { useEffect, useState } from 'react'
import { Button, Card, useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import type { Role, SafeUser } from '@dentora/contracts'
import { api } from '../lib/api'

const ROLE_KEY: Record<Role, MessageKey> = {
  ADMIN: 'role.admin',
  DENTIST: 'role.dentist',
  RECEPTIONIST: 'role.receptionist',
  ACCOUNTANT: 'role.accountant',
  INTERN: 'role.intern',
  PATIENT: 'role.patient',
}

export function UsersView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [users, setUsers] = useState<SafeUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch(() => toast(t('auth.serverError'), 'error'))
      .finally(() => setLoading(false))
  }, [t, toast])

  async function changeRole(id: string, role: Role) {
    try {
      await api.updateRole(id, role)
      const updated = await api.users()
      setUsers(updated)
      toast(t('users.roleChanged'), 'success')
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }

  async function revoke(id: string) {
    try {
      const { revokedCount } = await api.revokeSessions(id)
      toast(`${t('users.revoked')} ${revokedCount}`, 'success')
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">…</p>
  }

  return (
    <Card title={t('users.title')} className="flex flex-col gap-4">
      {(users ?? []).map((u) => {
        return (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {u.name}
              </div>
              <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {u.email}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={u.role}
                onChange={(e) => void changeRole(u.id, e.target.value as Role)}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              >
                {(Object.entries(ROLE_KEY) as Array<[Role, MessageKey]>).map(([value, key]) => (
                  <option key={value} value={value}>
                    {t(key)}
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={() => void revoke(u.id)}>
                {t('users.revoke')}
              </Button>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
