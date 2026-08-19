import nodemailer from 'nodemailer'
import type {
  NotificationConfig,
  NotificationConfigUpdate,
  NotificationSweepResult,
} from '@dentora/contracts'
import { prisma } from './prisma'
import { decrypt, encrypt } from './encryption'
import { captureError } from './sentry'
import { logger } from './logger'
import {
  buildEmailSubject,
  buildEmailText,
  buildWhatsAppText,
  planSend,
  type PlannerAppointment,
  type PlannerPatient,
} from './notifyMath'

const CONFIG_KEY = 'notifications.config'

// One StoredConfig row holds the WHOLE config as JSON; secret fields (whatsapp
// token, smtp pass) are AES-256-GCM encrypted at rest (ADR 006) and never exposed
// on read — the API only reports `token: { set }` / `pass: { set }` (ADR 032).
export interface StoredConfig {
  enabled: boolean
  offsetMinutes: number
  whatsapp: {
    enabled: boolean
    provider: 'generic'
    apiUrl: string
    from: string
    token: string
  }
  email: {
    enabled: boolean
    host: string
    port: number
    secure: boolean
    user: string
    from: string
    pass: string
  }
}

export function defaultStoredConfig(): StoredConfig {
  return {
    enabled: false,
    offsetMinutes: 1440,
    whatsapp: {
      enabled: false,
      provider: 'generic',
      apiUrl: '',
      from: '',
      token: '',
    },
    email: {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      from: '',
      pass: '',
    },
  }
}

function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return ''
  try {
    return decrypt(payload)
  } catch {
    logger.warn({}, 'notification secret could not be decrypted (treating as unset)')
    return ''
  }
}

function encryptSecret(value: string): string {
  return value ? encrypt(value) : ''
}

export async function loadStoredConfig(branchId: string): Promise<StoredConfig> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
  })
  if (!row?.value) return defaultStoredConfig()
  const empty = defaultStoredConfig()
  try {
    const raw = JSON.parse(row.value) as StoredConfig
    return {
      enabled: Boolean(raw.enabled),
      offsetMinutes:
        typeof raw.offsetMinutes === 'number' ? raw.offsetMinutes : empty.offsetMinutes,
      whatsapp: {
        enabled: Boolean(raw.whatsapp?.enabled),
        provider: 'generic',
        apiUrl: raw.whatsapp?.apiUrl ?? '',
        from: raw.whatsapp?.from ?? '',
        token: raw.whatsapp?.token ?? '',
      },
      email: {
        enabled: Boolean(raw.email?.enabled),
        host: raw.email?.host ?? '',
        port: typeof raw.email?.port === 'number' ? raw.email.port : empty.email.port,
        secure: Boolean(raw.email?.secure),
        user: raw.email?.user ?? '',
        from: raw.email?.from ?? '',
        pass: raw.email?.pass ?? '',
      },
    }
  } catch {
    return defaultStoredConfig()
  }
}

export async function saveStoredConfig(branchId: string, cfg: StoredConfig): Promise<void> {
  const value = JSON.stringify(cfg)
  await prisma.setting.upsert({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
    create: { branchId, key: CONFIG_KEY, value },
    update: { value },
  })
}

// Masked read shape for the admin board — secrets are flags, never values.
export function toConfigShape(cfg: StoredConfig): NotificationConfig {
  return {
    enabled: cfg.enabled,
    offsetMinutes: cfg.offsetMinutes,
    whatsapp: {
      enabled: cfg.whatsapp.enabled,
      provider: cfg.whatsapp.provider,
      apiUrl: cfg.whatsapp.apiUrl,
      from: cfg.whatsapp.from,
      token: { set: Boolean(cfg.whatsapp.token) },
    },
    email: {
      enabled: cfg.email.enabled,
      host: cfg.email.host,
      port: cfg.email.port,
      secure: cfg.email.secure,
      user: cfg.email.user,
      from: cfg.email.from,
      pass: { set: Boolean(cfg.email.pass) },
    },
  }
}

// Merges an update over the stored config; empty secret strings keep the stored
// secret (clients never round-trip secrets). Returns the new StoredConfig.
export function applyConfigUpdate(
  stored: StoredConfig,
  update: NotificationConfigUpdate,
): StoredConfig {
  return {
    ...stored,
    enabled: update.enabled,
    offsetMinutes: update.offsetMinutes,
    whatsapp: {
      enabled: update.whatsapp.enabled,
      provider: update.whatsapp.provider,
      apiUrl: update.whatsapp.apiUrl,
      from: update.whatsapp.from,
      token: update.whatsapp.token.trim()
        ? encryptSecret(update.whatsapp.token.trim())
        : stored.whatsapp.token,
    },
    email: {
      enabled: update.email.enabled,
      host: update.email.host,
      port: update.email.port,
      secure: update.email.secure,
      user: update.email.user,
      from: update.email.from,
      pass: update.email.pass.trim() ? encryptSecret(update.email.pass.trim()) : stored.email.pass,
    },
  }
}

async function deliverWhatsApp(cfg: StoredConfig, to: string, text: string): Promise<void> {
  const apiUrl = cfg.whatsapp.apiUrl.trim()
  if (!apiUrl) throw new Error('WHATSAPP_API_URL_NOT_CONFIGURED')
  if (!cfg.whatsapp.token) throw new Error('WHATSAPP_TOKEN_NOT_CONFIGURED')
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.whatsapp.token}`,
    },
    body: JSON.stringify({ to, text, from: cfg.whatsapp.from.trim() || undefined }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(`WHATSAPP_HTTP_${res.status}`)
  }
}

async function deliverEmail(
  cfg: StoredConfig,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (!cfg.email.host.trim()) throw new Error('SMTP_HOST_NOT_CONFIGURED')
  const transporter = nodemailer.createTransport({
    host: cfg.email.host.trim(),
    port: cfg.email.port,
    secure: cfg.email.secure,
    auth: cfg.email.user
      ? { user: cfg.email.user, pass: decryptSecret(cfg.email.pass) }
      : undefined,
  })
  await transporter.sendMail({
    from: cfg.email.from.trim() || cfg.email.user,
    to,
    subject,
    text,
  })
}

// Sweeps one branch: everything due in the next `offsetMinutes` gets planned;
// log rows are bulk-inserted (unique `[appointmentId, channel]` makes it
// idempotent) and genuinely-new WhatsApp/email sends are attempted and their row
// outcome updated to SENT/FAILED. Runs as an unref'd interval + manual endpoint.
export async function runSweep(branchId: string): Promise<NotificationSweepResult> {
  const cfg = await loadStoredConfig(branchId)
  if (!cfg.enabled) {
    return { planned: 0, created: 0, sent: 0, failed: 0 }
  }

  const offsetMs = cfg.offsetMinutes * 60_000
  const now = new Date()
  const until = new Date(now.getTime() + offsetMs)

  const rows = await prisma.appointment.findMany({
    where: {
      branchId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { gt: now, lte: until },
    },
    select: {
      id: true,
      patientId: true,
      startAt: true,
      dentist: { select: { name: true } },
      patient: {
        select: {
          firstName: true,
          lastName: true,
          notifyWhatsapp: true,
          notifyEmail: true,
          phone: true,
          email: true,
        },
      },
    },
  })
  if (rows.length === 0) return { planned: 0, created: 0, sent: 0, failed: 0 }

  const existing = new Set<string>()
  const logs = await prisma.notificationLog.findMany({
    where: { branchId, appointmentId: { in: rows.map((r) => r.id) } },
    select: { appointmentId: true, channel: true },
  })
  for (const log of logs) existing.add(`${log.appointmentId}:${log.channel}`)

  const dateFmt = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const plannerCfg = {
    globalEnabled: true,
    offsetMs,
    whatsappEnabled: cfg.whatsapp.enabled,
    emailEnabled: cfg.email.enabled,
  }

  const createData: Array<{
    branchId: string
    appointmentId: string
    channel: 'WHATSAPP' | 'EMAIL'
    status: 'SKIPPED' | 'SENT'
    to: string
    provider: string
    error?: string
  }> = []
  const attempts: Array<{
    row: (typeof rows)[number]
    channel: 'WHATSAPP' | 'EMAIL'
    to: string
    patientName: string
  }> = []

  for (const row of rows) {
    const patient: PlannerPatient = {
      id: row.patientId,
      notifyWhatsapp: row.patient.notifyWhatsapp,
      notifyEmail: row.patient.notifyEmail,
      phone: row.patient.phone,
      email: row.patient.email,
    }
    const appointment: PlannerAppointment = {
      id: row.id,
      patientId: row.patientId,
      startAt: row.startAt,
      dentistName: row.dentist?.name ?? null,
    }
    const plans = planSend(plannerCfg, appointment, patient, new Map(), now.getTime())
    for (const plan of plans) {
      const key = `${plan.appointmentId}:${plan.channel}`
      if (existing.has(key)) continue
      if (!plan.willSend) {
        createData.push({
          branchId,
          appointmentId: plan.appointmentId,
          channel: plan.channel,
          status: 'SKIPPED',
          to: plan.to || '—',
          provider: plan.channel === 'EMAIL' ? 'smtp' : 'generic-webhook',
          error: plan.skipReason ?? 'unknown',
        })
        continue
      }
      createData.push({
        branchId,
        appointmentId: plan.appointmentId,
        channel: plan.channel,
        status: 'SKIPPED',
        to: plan.to,
        provider: plan.channel === 'EMAIL' ? 'smtp' : 'generic-webhook',
        error: 'sending', // transient placeholder, replaced by SENT/FAILED below
      })
      attempts.push({
        row,
        channel: plan.channel,
        to: plan.to,
        patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim() || 'Patient',
      })
    }
  }

  let createdInserted = 0
  if (createData.length > 0) {
    const result = await prisma.notificationLog.createMany({
      data: createData,
      skipDuplicates: true,
    })
    createdInserted = result.count
  }

  let sent = 0
  let failed = 0
  for (const attempt of attempts) {
    const key = `${attempt.row.id}:${attempt.channel}`
    if (existing.has(key)) continue // row pre-existed → already handled by an earlier sweep
    const datePart = dateFmt.format(attempt.row.startAt)
    const timePart = timeFmt.format(attempt.row.startAt)
    try {
      if (attempt.channel === 'WHATSAPP') {
        await deliverWhatsApp(
          cfg,
          attempt.to,
          buildWhatsAppText(datePart, timePart, attempt.row.dentist?.name ?? null),
        )
      } else {
        await deliverEmail(
          cfg,
          attempt.to,
          buildEmailSubject(datePart, timePart),
          buildEmailText(
            attempt.patientName,
            datePart,
            timePart,
            attempt.row.dentist?.name ?? null,
          ),
        )
      }
      await prisma.notificationLog.updateMany({
        where: { appointmentId: attempt.row.id, channel: attempt.channel },
        data: { status: 'SENT', sentAt: new Date(), error: null },
      })
      sent += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UNKNOWN_DELIVERY_ERROR'
      await prisma.notificationLog.updateMany({
        where: { appointmentId: attempt.row.id, channel: attempt.channel },
        data: { status: 'FAILED', error: message },
      })
      failed += 1
      captureError(err, { extra: { channel: attempt.channel, appointmentId: attempt.row.id } })
      logger.warn(
        { err: message, channel: attempt.channel, appointmentId: attempt.row.id },
        'reminder delivery failed',
      )
    } finally {
      existing.add(key)
    }
  }

  return {
    planned: createData.length,
    created: createdInserted,
    sent,
    failed,
  }
}
