import { Client } from 'minio'
import { logger } from './logger'

const endPoint = process.env.S3_ENDPOINT ?? 'minio'
const port = Number(process.env.S3_PORT ?? 9000)
const accessKey = process.env.S3_ACCESS_KEY
const secretKey = process.env.S3_SECRET_KEY
const useSSL = process.env.S3_USE_SSL === 'true'
export const S3_BUCKET = process.env.S3_BUCKET ?? 'dentora-documents'

export interface DocumentEnvelope {
  key: string
  iv: string
  tag: string
}

const ENV_KEY = 'x-amz-meta-dentora-envelope-key'
const ENV_IV = 'x-amz-meta-dentora-envelope-iv'
const ENV_TAG = 'x-amz-meta-dentora-envelope-tag'

let client: Client | null = null

function lookupMeta(meta: Record<string, string>, key: string): string | undefined {
  const keyLc = key.toLowerCase()
  const stripped = key.replace(/^x-amz-meta-(.*)/i, '$1').toLowerCase()
  const entry = Object.entries(meta).find(([k]) => {
    const lc = k.toLowerCase()
    return lc === keyLc || lc === stripped
  })
  return entry?.[1]
}

export function getClient(): Client {
  if (!client) {
    if (!accessKey || !secretKey) {
      throw new Error('S3_ACCESS_KEY/S3_SECRET_KEY are not set; cannot store documents')
    }
    client = new Client({ endPoint, port, useSSL, accessKey, secretKey })
  }
  return client
}

let ensured = false
export async function ensureBucket(): Promise<void> {
  if (ensured) return
  const exists = await getClient().bucketExists(S3_BUCKET)
  if (!exists) {
    await getClient().makeBucket(S3_BUCKET)
    logger.info({ bucket: S3_BUCKET }, 'created s3 bucket')
  }
  ensured = true
}

export interface StoredObject {
  data: Buffer
  contentType: string
  envelope: DocumentEnvelope
}

export function objectKey(branchId: string, patientId: string, documentId: string): string {
  return `branch/${branchId}/patient/${patientId}/${documentId}`
}

export async function putEncryptedObject(
  key: string,
  data: Buffer,
  mimeType: string,
  envelope: DocumentEnvelope,
): Promise<void> {
  await ensureBucket()
  await getClient().putObject(S3_BUCKET, key, data, data.length, {
    'Content-Type': mimeType,
    [ENV_KEY]: envelope.key,
    [ENV_IV]: envelope.iv,
    [ENV_TAG]: envelope.tag,
  })
}

export async function getEncryptedObject(key: string): Promise<StoredObject> {
  const client = getClient()
  const stat = await client.statObject(S3_BUCKET, key)
  const stream = await client.getObject(S3_BUCKET, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  const keyMeta = lookupMeta(stat.metaData, ENV_KEY)
  const ivMeta = lookupMeta(stat.metaData, ENV_IV)
  const tagMeta = lookupMeta(stat.metaData, ENV_TAG)
  if (!keyMeta || !ivMeta || !tagMeta) {
    throw new Error(`object ${key} is missing its encryption envelope metadata`)
  }
  return {
    data: Buffer.concat(chunks),
    contentType: lookupMeta(stat.metaData, 'content-type') ?? 'application/octet-stream',
    envelope: { key: keyMeta, iv: ivMeta, tag: tagMeta },
  }
}
