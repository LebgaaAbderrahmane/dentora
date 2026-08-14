import { describe, expect, it } from 'vitest'
import { generateSessionToken, getCookie, hashSessionToken, SESSION_COOKIE } from './session'

describe('session tokens', () => {
  it('generates 64-char hex tokens', () => {
    const token = generateSessionToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashes deterministically and never equals the plaintext', () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(hashSessionToken(a)).toBe(hashSessionToken(a))
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b))
    expect(hashSessionToken(a)).not.toBe(a)
  })
})

describe('getCookie', () => {
  const req = (cookie: string | undefined) =>
    ({ headers: { cookie } }) as Parameters<typeof getCookie>[0]

  it('returns undefined without a Cookie header', () => {
    expect(getCookie(req(undefined), SESSION_COOKIE)).toBeUndefined()
  })

  it('extracts the named cookie among others', () => {
    expect(getCookie(req('foo=bar; dentora_session=abc123'), SESSION_COOKIE)).toBe('abc123')
  })

  it('decodes URL-encoded values', () => {
    expect(getCookie(req('dentora_session=a%20b'), SESSION_COOKIE)).toBe('a b')
  })
})
