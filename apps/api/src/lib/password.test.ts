import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword } from './password'

describe('generateTemporaryPassword', () => {
  it('returns a 10-char password starting with a digit', () => {
    const pw = generateTemporaryPassword(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    expect(pw).toHaveLength(10)
    expect(/^\d/.test(pw)).toBe(true)
  })

  it('is stable for a given byte source and within the allowed alphabet', () => {
    const bytes = Buffer.from([2, 30, 40, 50, 60, 70, 80, 90, 100, 110])
    const a = generateTemporaryPassword(bytes)
    const b = generateTemporaryPassword(bytes)
    expect(a).toBe(b)
    expect(/^[0-9A-Za-z]+$/.test(a)).toBe(true)
    expect(/[A-Z]/.test(a)).toBe(true)
  })

  it('produces different values for different byte sources', () => {
    const a = generateTemporaryPassword(Buffer.alloc(10, 1))
    const b = generateTemporaryPassword(Buffer.alloc(10, 2))
    expect(a).not.toBe(b)
  })
})
