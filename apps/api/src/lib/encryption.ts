import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

function getKey() {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== KEY_BYTES * 2) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (openssl rand -hex 32)')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function decrypt(payload: string): string {
  const key = getKey()
  const [iv, tag, data] = payload.split('.')
  if (!iv || !tag || !data) throw new Error('Invalid encrypted payload')
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
