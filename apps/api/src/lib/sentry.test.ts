import { describe, expect, it } from 'vitest'
import { captureError, initSentry, sentryDsn, sentryEnabled } from './sentry'

describe('sentry', () => {
  it('stays disabled and no-ops without a DSN', () => {
    if (!process.env.SENTRY_DSN) {
      expect(sentryDsn).toBeUndefined()
      expect(sentryEnabled).toBe(false)
    }
    expect(() => initSentry()).not.toThrow()
    expect(() => captureError(new Error('boom'))).not.toThrow()
    expect(() =>
      captureError(new Error('boom'), { userId: 'u1', email: 'a@b.dz', extra: { x: 1 } }),
    ).not.toThrow()
  })
})
