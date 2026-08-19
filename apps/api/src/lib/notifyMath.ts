import type { NotificationChannel } from '@dentora/contracts'

export interface PlannerAppointment {
  id: string
  patientId: string
  startAt: Date
  dentistName?: string | null
}

export interface PlannerPatient {
  id: string
  notifyWhatsapp: boolean
  notifyEmail: boolean
  phone: string | null
  email: string | null
}

export interface PlannerLogKey {
  appointmentId: string
  channel: NotificationChannel
}

export interface PlannerConfig {
  globalEnabled: boolean
  offsetMs: number
  whatsappEnabled: boolean
  emailEnabled: boolean
}

export interface SendPlan {
  appointmentId: string
  channel: NotificationChannel
  to: string
  willSend: boolean
  skipReason: 'disabled' | 'optoff' | 'nocontact' | 'notdue' | 'duplicate' | null
}

// A reminder is due for an appointment whose start falls inside (now, now+offset].
export function isDue(startAtMs: number, nowMs: number, offsetMs: number): boolean {
  return startAtMs > nowMs && startAtMs <= nowMs + offsetMs
}

export function contactFor(
  channel: NotificationChannel,
  patient: Pick<PlannerPatient, 'phone' | 'email'>,
): string | null {
  if (channel === 'WHATSAPP') {
    const phone = patient.phone?.replace(/[\s.-]/g, '')
    return phone && phone.length > 4 ? phone : null
  }
  const email = patient.email?.trim().toLowerCase()
  return email ? email : null
}

export function planSend(
  config: PlannerConfig,
  appointment: PlannerAppointment,
  patient: PlannerPatient,
  logged: Map<string, NotificationChannel>,
  nowMs: number,
): SendPlan[] {
  const plans: SendPlan[] = []
  for (const channel of ['WHATSAPP', 'EMAIL'] as const) {
    const skipReason = (() => {
      if (!config.globalEnabled) return 'notdue' as const
      if (channel === 'WHATSAPP' && !config.whatsappEnabled) return 'disabled' as const
      if (channel === 'EMAIL' && !config.emailEnabled) return 'disabled' as const
      if (
        (channel === 'WHATSAPP' && !patient.notifyWhatsapp) ||
        (channel === 'EMAIL' && !patient.notifyEmail)
      )
        return 'optoff' as const
      if (!isDue(appointment.startAt.getTime(), nowMs, config.offsetMs)) return 'notdue' as const
      if (logged.has(appointment.id) && logged.get(appointment.id) === channel)
        return 'duplicate' as const
      return null
    })()

    const to = contactFor(channel, patient) ?? ''
    plans.push({
      appointmentId: appointment.id,
      channel,
      to,
      willSend: skipReason === null && Boolean(to),
      skipReason,
    })

    if (skipReason === null && !to) {
      plans[plans.length - 1].skipReason = 'nocontact'
      plans[plans.length - 1].willSend = false
    }
  }
  return plans
}

// French reminder copy shown to patients. Placeholders keep numbers readable:
//   "Bonjour, vous avez rendez-vous le {date} à {time} chez Dentora."
// sms length-aware (WhatsApp has no hard limit but short is better).
export function buildWhatsAppText(
  datePart: string,
  timePart: string,
  dentistName?: string | null,
): string {
  const dentist = dentistName ? ` avec ${dentistName}` : ''
  return `Bonjour, vous avez rendez-vous${dentist} le ${datePart} à ${timePart} chez Dentora. Répondez ou appelez le secrétariat pour tout changement.`
}

export function buildEmailSubject(datePart: string, timePart: string): string {
  return `Rappel de rendez-vous — ${datePart} à ${timePart}`
}

export function buildEmailText(
  patientName: string,
  datePart: string,
  timePart: string,
  dentistName?: string | null,
): string {
  const dentist = dentistName ? ` avec ${dentistName}` : ''
  return (
    `Bonjour ${patientName},\n\n` +
    `Vous avez rendez-vous${dentist} le ${datePart} à ${timePart} chez Dentora.\n\n` +
    `Pour tout changement, merci de contacter le secrétariat.\n\nCordialement,\nLe cabinet Dentora`
  )
}
