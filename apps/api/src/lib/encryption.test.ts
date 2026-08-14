import { describe, expect, it } from 'vitest'
import { decrypt, encrypt } from './encryption'

process.env.ENCRYPTION_KEY = 'a'.repeat(64)

describe('encryption', () => {
  it('round-trips plaintext', () => {
    const payload = encrypt('traitement dentaire confidentiel')
    expect(payload).not.toContain('dentaire')
    expect(decrypt(payload)).toBe('traitement dentaire confidentiel')
  })

  it('produces unique ciphertext per call (random IV)', () => {
    const a = encrypt('secret')
    const b = encrypt('secret')
    expect(a).not.toBe(b)
  })

  it('throws on missing key', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/)
  })
})
