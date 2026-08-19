import { randomBytes } from 'node:crypto'

// Ambiguity-free alphabet (no 0/O, 1/l/I) for printed temporary passwords.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const PASSWORD_LENGTH = 10

// Enforces a leading digit so the result always mixes classes; remaining chars
// come from bytes % alphabet size (uniform enough for a one-time password).
export function generateTemporaryPassword(bytes: Buffer = randomBytes(PASSWORD_LENGTH)): string {
  const digit = String(bytes[0] % 10)
  let rest = ''
  for (let i = 1; i < PASSWORD_LENGTH; i += 1) rest += CHARS[bytes[i] % CHARS.length]
  return digit + rest
}
