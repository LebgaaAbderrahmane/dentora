import * as Sentry from '@sentry/node'

export const sentryDsn = process.env.SENTRY_DSN || undefined

export const sentryEnabled = Boolean(sentryDsn)

export function initSentry(): void {
  if (!sentryDsn) return
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,
  })
}

export interface CaptureContext {
  userId?: string
  email?: string
  extra?: Record<string, unknown>
}

export function captureError(err: unknown, context?: CaptureContext): void {
  if (!sentryDsn) return
  Sentry.withScope((scope) => {
    if (context?.userId || context?.email) {
      scope.setUser({ id: context.userId, email: context.email })
    }
    if (context?.extra) scope.setExtras(context.extra)
    Sentry.captureException(err)
  })
}
