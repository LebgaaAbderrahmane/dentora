import { describe, expect, it } from 'vitest'
import { decrypt, decryptDocument, encrypt, encryptDocument } from './encryption'

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
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  })
})

describe('document envelope encryption', () => {
  it('round-trips a binary document', () => {
    const plaintext = Buffer.from('RAW-IMAGE-BYTES-for-xray', 'latin1')
    const { ciphertext, envelope } = encryptDocument(plaintext)
    expect(ciphertext.equals(plaintext)).toBe(false)
    expect(decryptDocument(ciphertext, envelope).equals(plaintext)).toBe(true)
  })

  it('envelope key is wrapped under the master key, not stored raw', () => {
    const { envelope } = encryptDocument(Buffer.from('data', 'utf8'))
    expect(envelope.key).not.toContain(
      Buffer.from(process.env.ENCRYPTION_KEY ?? '').toString('hex'),
    )
    expect(decrypt(envelope.key)).toHaveLength(64)
  })

  it('rejects tampered ciphertext (auth tag mismatch)', () => {
    const { ciphertext, envelope } = encryptDocument(Buffer.from('DATA', 'utf8'))
    const tampered = Buffer.concat([ciphertext.subarray(0, -1), Buffer.from([0xff])])
    expect(() => decryptDocument(tampered, envelope)).toThrow()
  })

  it('rejects a wrong envelope key', () => {
    const { ciphertext, envelope } = encryptDocument(Buffer.from('DATA', 'utf8'))
    const wrong = { ...envelope, key: encrypt('0'.repeat(64)) }
    expect(() => decryptDocument(ciphertext, wrong)).toThrow()
  })
})
