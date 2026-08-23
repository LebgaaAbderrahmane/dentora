import { createHmac, timingSafeEqual } from 'node:crypto'

// One-time portal activation tokens for web-booked patients (no DB table):
// a signed payload `{ pid, exp }` — base64url(body).base64url(hmac-sha256).
// Signed with ENCRYPTION_KEY so no extra secret is deployed; 48h expiry keeps
// the leak window small since the token travels in a URL query param.
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000

function signingKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY must be set to sign portal activation tokens')
  }
  return key
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

export interface ActivationTokenPayload {
  pid: string
  email: string
  exp: number
}

export function issueActivationToken(
  patientId: string,
  email: string,
  ttlMs = DEFAULT_TTL_MS,
): string {
  const payload = b64url(JSON.stringify({ pid: patientId, email, exp: Date.now() + ttlMs }))
  return `${payload}.${sign(payload)}`
}

export type VerifyResult =
  | { ok: true; payload: ActivationTokenPayload }
  | { ok: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' }

export function verifyActivationToken(token: string): VerifyResult {
  const dot = token.indexOf('.')
  if (dot === -1) return { ok: false, reason: 'MALFORMED' }
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'BAD_SIGNATURE' }
  }
  let parsed: ActivationTokenPayload
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ActivationTokenPayload
  } catch {
    return { ok: false, reason: 'MALFORMED' }
  }
  if (
    typeof parsed.pid !== 'string' ||
    typeof parsed.email !== 'string' ||
    typeof parsed.exp !== 'number'
  ) {
    return { ok: false, reason: 'MALFORMED' }
  }
  if (parsed.exp <= Date.now()) return { ok: false, reason: 'EXPIRED' }
  return { ok: true, payload: parsed }
}
