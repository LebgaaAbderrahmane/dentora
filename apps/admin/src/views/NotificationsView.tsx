import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  NotificationChannel,
  NotificationConfig,
  NotificationConfigUpdate,
  NotificationLog,
  NotificationStatus,
} from '@dentora/contracts'
import { useI18n, formatDateTime } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { MessageKey } from '@dentora/i18n'
import { tint, toneFor } from '../lib/badges'
import { api, ApiError } from '../lib/api'
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

const CHANNEL_KEY: Record<NotificationChannel, MessageKey> = {
  WHATSAPP: 'notifications.channel.whatsapp',
  EMAIL: 'notifications.channel.email',
}

const STATUS_KEY: Record<NotificationStatus, MessageKey> = {
  SENT: 'notifications.status.sent',
  FAILED: 'notifications.status.failed',
  SKIPPED: 'notifications.status.skipped',
}

const STATUS_BADGE: Record<string, string> = {
  SENT: tint(toneFor('SENT')),
  FAILED: tint(toneFor('FAILED')),
  SKIPPED:
    'border-neutral-400/30 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
}

export function NotificationsView() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [draft, setDraft] = useState<NotificationConfigUpdate | null>(null)
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [total, setTotal] = useState(0)
  const [channel, setChannel] = useState<NotificationChannel | 'all'>('all')
  const [status, setStatus] = useState<NotificationStatus | 'all'>('all')
  const [saving, setSaving] = useState(false)
  const [sweeping, setSweeping] = useState(false)
  const [lastSweep, setLastSweep] = useState<string | null>(null)

  async function load() {
    try {
      const cfg = await api.notificationConfig()
      setConfig(cfg)
      setDraft({
        enabled: cfg.enabled,
        offsetMinutes: cfg.offsetMinutes,
        whatsapp: {
          enabled: cfg.whatsapp.enabled,
          provider: cfg.whatsapp.provider,
          apiUrl: cfg.whatsapp.apiUrl,
          from: cfg.whatsapp.from,
          token: '',
        },
        email: {
          enabled: cfg.email.enabled,
          host: cfg.email.host,
          port: cfg.email.port,
          secure: cfg.email.secure,
          user: cfg.email.user,
          from: cfg.email.from,
          pass: '',
        },
      })
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLogs() {
    try {
      const r = await api.notificationLogs({
        limit: 100,
        ...(channel !== 'all' ? { channel } : {}),
        ...(status !== 'all' ? { status } : {}),
      })
      setLogs(r.items)
      setTotal(r.total)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [channel, status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    setSaving(true)
    try {
      const cfg = await api.updateNotificationConfig(draft)
      setConfig(cfg)
      setDraft({
        enabled: cfg.enabled,
        offsetMinutes: cfg.offsetMinutes,
        whatsapp: {
          enabled: cfg.whatsapp.enabled,
          provider: cfg.whatsapp.provider,
          apiUrl: cfg.whatsapp.apiUrl,
          from: cfg.whatsapp.from,
          token: '',
        },
        email: {
          enabled: cfg.email.enabled,
          host: cfg.email.host,
          port: cfg.email.port,
          secure: cfg.email.secure,
          user: cfg.email.user,
          from: cfg.email.from,
          pass: '',
        },
      })
      toast(t('notifications.saved'), 'success')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSweep() {
    setSweeping(true)
    try {
      const r = await api.runNotificationSweep()
      setLastSweep(
        t('notifications.sweepResult', {
          planned: String(r.planned),
          created: String(r.created),
          sent: String(r.sent),
          failed: String(r.failed),
        }),
      )
      await Promise.all([loadLogs(), load()])
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    } finally {
      setSweeping(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t('notifications.config')}</CardTitle>
            <p className="text-xs text-muted-foreground">{t('notifications.configHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleSweep()}
              disabled={sweeping}
            >
              {t('notifications.sweep')}
            </Button>
            <Button size="sm" type="submit" form="notification-config" disabled={saving || !draft}>
              {t('notifications.save')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!draft ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : (
            <form id="notification-config" onSubmit={(e) => void handleSave(e)}>
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                    />
                    {t('notifications.enabled')}
                  </label>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      draft.enabled
                        ? 'border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'border-neutral-400/30 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {t(draft.enabled ? 'notifications.enabled' : 'notifications.disabled')}
                  </span>
                </div>
                <div className="grid max-w-sm gap-1.5">
                  <Label htmlFor="notif-offset">{t('notifications.offset')}</Label>
                  <Input
                    id="notif-offset"
                    type="number"
                    min={30}
                    max={10080}
                    value={draft.offsetMinutes}
                    onChange={(e) => setDraft({ ...draft, offsetMinutes: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">{t('notifications.offsetHint')}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <WhatsAppFields
                    draft={draft}
                    setDraft={setDraft}
                    hasToken={config?.whatsapp.token.set ?? false}
                  />
                  <EmailFields
                    draft={draft}
                    setDraft={setDraft}
                    hasPass={config?.email.pass.set ?? false}
                  />
                </div>
              </div>
            </form>
          )}
          {lastSweep && (
            <p className="mt-4 text-xs font-medium text-foreground">
              {lastSweep}: {t('notifications.sweepHint')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>{t('notifications.logs')}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={channel}
              onValueChange={(v) => setChannel(v as NotificationChannel | 'all')}
            >
              <SelectTrigger className="w-fit text-xs">
                <SelectValue placeholder={t('notifications.channelFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('notifications.all')}</SelectItem>
                {(Object.keys(CHANNEL_KEY) as NotificationChannel[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(CHANNEL_KEY[c])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as NotificationStatus | 'all')}
            >
              <SelectTrigger className="w-fit text-xs">
                <SelectValue placeholder={t('notifications.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('notifications.all')}</SelectItem>
                {(Object.keys(STATUS_KEY) as NotificationStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STATUS_KEY[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b py-2.5 text-sm last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{log.patientName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[log.status]}`}
                  >
                    {t(STATUS_KEY[log.status])}
                  </span>
                  <span className="rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {t(CHANNEL_KEY[log.channel])}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('notifications.to')}: {log.to}
                  {log.provider ? ` · ${log.provider}` : ''}
                  {log.error ? ` · ${log.error}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {t('notifications.createdAt')} {formatDateTime(log.createdAt, locale)}
                {log.sentAt
                  ? ` · ${t('notifications.sentAt')} ${formatDateTime(log.sentAt, locale)}`
                  : ''}
              </div>
            </div>
          ))}
          {total > logs.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              {total} {t('audit.events')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function WhatsAppFields({
  draft,
  setDraft,
  hasToken,
}: {
  draft: NotificationConfigUpdate
  setDraft: (d: NotificationConfigUpdate) => void
  hasToken: boolean
}) {
  const { t } = useI18n()
  const w = draft.whatsapp
  return (
    <div className="rounded-lg border p-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={w.enabled}
          onChange={(e) => setDraft({ ...draft, whatsapp: { ...w, enabled: e.target.checked } })}
        />
        {t('notifications.whatsapp')}
      </label>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-wa-url">{t('notifications.apiUrl')}</Label>
          <Input
            id="n-wa-url"
            value={w.apiUrl}
            onChange={(e) => setDraft({ ...draft, whatsapp: { ...w, apiUrl: e.target.value } })}
            placeholder="https://…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-wa-from">{t('notifications.from')}</Label>
          <Input
            id="n-wa-from"
            value={w.from}
            onChange={(e) => setDraft({ ...draft, whatsapp: { ...w, from: e.target.value } })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-wa-token">{t('notifications.token')}</Label>
          <Input
            id="n-wa-token"
            type="password"
            value={w.token}
            onChange={(e) => setDraft({ ...draft, whatsapp: { ...w, token: e.target.value } })}
            placeholder={hasToken ? '••••••' : ''}
          />
          <p className="text-xs text-muted-foreground">{t('notifications.tokenKeep')}</p>
        </div>
      </div>
    </div>
  )
}

function EmailFields({
  draft,
  setDraft,
  hasPass,
}: {
  draft: NotificationConfigUpdate
  setDraft: (d: NotificationConfigUpdate) => void
  hasPass: boolean
}) {
  const { t } = useI18n()
  const e = draft.email
  return (
    <div className="rounded-lg border p-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={e.enabled}
          onChange={(ev) => setDraft({ ...draft, email: { ...e, enabled: ev.target.checked } })}
        />
        {t('notifications.email')}
      </label>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-em-host">{t('notifications.host')}</Label>
          <Input
            id="n-em-host"
            value={e.host}
            onChange={(ev) => setDraft({ ...draft, email: { ...e, host: ev.target.value } })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-em-port">{t('notifications.port')}</Label>
          <Input
            id="n-em-port"
            type="number"
            value={e.port}
            onChange={(ev) =>
              setDraft({ ...draft, email: { ...e, port: Number(ev.target.value) } })
            }
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-em-user">{t('notifications.user')}</Label>
          <Input
            id="n-em-user"
            value={e.user}
            onChange={(ev) => setDraft({ ...draft, email: { ...e, user: ev.target.value } })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-em-pass">{t('notifications.pass')}</Label>
          <Input
            id="n-em-pass"
            type="password"
            value={e.pass}
            onChange={(ev) => setDraft({ ...draft, email: { ...e, pass: ev.target.value } })}
            placeholder={hasPass ? '••••••' : ''}
          />
          <p className="text-xs text-muted-foreground">{t('notifications.passKeep')}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="n-em-from">{t('notifications.from')}</Label>
          <Input
            id="n-em-from"
            value={e.from}
            onChange={(ev) => setDraft({ ...draft, email: { ...e, from: ev.target.value } })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={e.secure}
            onChange={(ev) => setDraft({ ...draft, email: { ...e, secure: ev.target.checked } })}
          />
          {t('notifications.secure')}
        </label>
      </div>
    </div>
  )
}
