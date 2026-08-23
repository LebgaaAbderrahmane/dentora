import { describe, expect, it } from 'vitest'
import { issueActivationToken, verifyActivationToken } from './activationTokens'

describe('activationTokens', () => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)

  it('round-trips a valid token', () => {
    const token = issueActivationToken('patient-1', 'p@example.com')
    const result = verifyActivationToken(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.pid).toBe('patient-1')
      expect(result.payload.email).toBe('p@example.com')
      expect(result.payload.exp).toBeGreaterThan(Date.now())
    }
  })

  it('rejects tampered payloads', () => {
    const token = issueActivationToken('patient-1', 'p@example.com')
    const [payload] = token.split('.')
    const forged = `${Buffer.from(JSON.stringify({ pid: 'other', email: 'x@x.com', exp: Date.now() + 1000 })).toString('base64url')}.${token.split('.')[1]}`
    expect(verifyActivationToken(forged)).toMatchObject({ ok: false, reason: 'BAD_SIGNATURE' })
    expect(verifyActivationToken(`${payload}.badsig`)).toMatchObject({
      ok: false,
      reason: 'BAD_SIGNATURE',
    })
  })

  it('rejects expired tokens', () => {
    const token = issueActivationToken('patient-1', 'p@example.com', -1_000)
    expect(verifyActivationToken(token)).toMatchObject({ ok: false, reason: 'EXPIRED' })
  })

  it('rejects malformed tokens', () => {
    expect(verifyActivationToken('no-dot')).toMatchObject({ ok: false, reason: 'MALFORMED' })
    // wrong-length or wrong-value signature is rejected before JSON parsing
    expect(
      verifyActivationToken(`${Buffer.from('not json').toString('base64url')}.${'x'.repeat(43)}`),
    ).toMatchObject({ ok: false })
  })
})
