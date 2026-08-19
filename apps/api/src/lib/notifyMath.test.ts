import { describe, expect, it } from 'vitest'
import {
  buildEmailSubject,
  buildEmailText,
  buildWhatsAppText,
  contactFor,
  isDue,
  planSend,
  type PlannerAppointment,
  type PlannerConfig,
  type PlannerPatient,
} from './notifyMath'

const NOW = Date.parse('2026-08-19T09:00:00.000Z')

const cfg: PlannerConfig = {
  globalEnabled: true,
  offsetMs: 1440 * 60_000, // 24h
  whatsappEnabled: true,
  emailEnabled: true,
}

function appt(startAtMs: number, dentistName?: string | null): PlannerAppointment {
  return { id: 'a1', patientId: 'p1', startAt: new Date(startAtMs), dentistName }
}

const patient: PlannerPatient = {
  id: 'p1',
  notifyWhatsapp: true,
  notifyEmail: true,
  phone: '0550 12 34 56',
  email: 'P.TEST@Mail.DZ',
}

describe('isDue', () => {
  it('is due only inside (now, now+offset]', () => {
    expect(isDue(NOW + 60_000, NOW, cfg.offsetMs)).toBe(true)
    expect(isDue(NOW + cfg.offsetMs, NOW, cfg.offsetMs)).toBe(true)
    expect(isDue(NOW, NOW, cfg.offsetMs)).toBe(false)
    expect(isDue(NOW - 60_000, NOW, cfg.offsetMs)).toBe(false)
    expect(isDue(NOW + cfg.offsetMs + 1, NOW, cfg.offsetMs)).toBe(false)
  })
})

describe('contactFor', () => {
  it('normalizes phone digits and trims/normalizes email', () => {
    expect(contactFor('WHATSAPP', patient)).toBe('0550123456')
    expect(contactFor('WHATSAPP', { phone: null, email: null })).toBeNull()
    expect(contactFor('WHATSAPP', { phone: '123', email: null })).toBeNull()
    expect(contactFor('EMAIL', patient)).toBe('p.test@mail.dz')
    expect(contactFor('EMAIL', { phone: null, email: '  ' })).toBeNull()
  })
})

describe('planSend', () => {
  it('plans an immediate send for a due opted-in patient', () => {
    const plans = planSend(cfg, appt(NOW + 3_600_000), patient, new Map(), NOW)
    expect(plans).toHaveLength(2)
    expect(plans.find((p) => p.channel === 'WHATSAPP')).toMatchObject({
      willSend: true,
      to: '0550123456',
      skipReason: null,
    })
    expect(plans.find((p) => p.channel === 'EMAIL')).toMatchObject({
      willSend: true,
      to: 'p.test@mail.dz',
      skipReason: null,
    })
  })

  it('skips non-willSend with a reason but still records the row', () => {
    const disabled: PlannerConfig = { ...cfg, whatsappEnabled: false }
    const plans = planSend(disabled, appt(NOW + 3_600_000), patient, new Map(), NOW)
    expect(plans.find((p) => p.channel === 'WHATSAPP')!.skipReason).toBe('disabled')
    expect(plans.find((p) => p.channel === 'EMAIL')!.skipReason).toBeNull()

    const optoff: PlannerPatient = { ...patient, notifyEmail: false }
    const p2 = planSend(cfg, appt(NOW + 3_600_000), optoff, new Map(), NOW)
    expect(p2.find((x) => x.channel === 'EMAIL')!.skipReason).toBe('optoff')

    const noContact: PlannerPatient = { ...patient, phone: null }
    const p3 = planSend(cfg, appt(NOW + 3_600_000), noContact, new Map(), NOW)
    expect(p3.find((x) => x.channel === 'WHATSAPP')).toMatchObject({
      skipReason: 'nocontact',
      willSend: false,
    })

    const globalOff: PlannerConfig = { ...cfg, globalEnabled: false }
    const p4 = planSend(globalOff, appt(NOW + 3_600_000), patient, new Map(), NOW)
    expect(p4.every((p) => p.skipReason === 'notdue' && !p.willSend)).toBe(true)
  })

  it('does not duplicate an already-logged (appointment, channel)', () => {
    const logged = new Map([['a1', 'EMAIL' as const]])
    const plans = planSend(cfg, appt(NOW + 3_600_000), patient, logged, NOW)
    const email = plans.find((p) => p.channel === 'EMAIL')!
    expect(email.skipReason).toBe('duplicate')
    expect(email.willSend).toBe(false)
  })

  it('does not plan outside the due window', () => {
    const plans = planSend(cfg, appt(NOW + cfg.offsetMs + 60_000), patient, new Map(), NOW)
    expect(plans.every((p) => p.skipReason === 'notdue' && !p.willSend)).toBe(true)
  })
})

describe('message builders', () => {
  it('builds human WhatsApp + email copy with dentist when present', () => {
    expect(buildWhatsAppText('20 août', '10:00', 'Dr. Karim Bensalem')).toContain(
      'Dr. Karim Bensalem',
    )
    expect(buildWhatsAppText('20 août', '10:00')).not.toContain('avec')
    expect(buildEmailSubject('20 août', '10:00')).toContain('20 août')
    expect(buildEmailText('Mohammed', '20 août', '10:00', null)).toContain('Bonjour Mohammed')
  })
})
