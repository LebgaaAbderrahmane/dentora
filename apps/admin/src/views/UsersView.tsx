import { useEffect, useState } from 'react'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import type { Role, SafeUser } from '@dentora/contracts'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    return <p className="text-sm text-muted-foreground">…</p>
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>{t('users.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(users ?? []).map((u) => {
          return (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{u.name}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select value={u.role} onValueChange={(r) => void changeRole(u.id, r as Role)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_KEY) as Array<[Role, MessageKey]>).map(([value, key]) => (
                      <SelectItem key={value} value={value}>
                        {t(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => void revoke(u.id)}>
                  {t('users.revoke')}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
