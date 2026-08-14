import express from 'express'
import {
  healthSchema,
  systemStatusSchema,
  type Health,
  type SystemStatus,
} from '@dentora/contracts'
import { prisma } from './lib/prisma'

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(express.json())

const api = express.Router()

api.get('/health', (_req, res) => {
  const health: Health = healthSchema.parse({
    status: 'ok',
    service: 'api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
  res.json(health)
})

api.get('/system/status', async (_req, res) => {
  let db: SystemStatus['db'] = 'up'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    db = 'down'
  }
  const status: SystemStatus = systemStatusSchema.parse({
    ok: db === 'up',
    db,
    uptimeSeconds: Math.round(process.uptime()),
  })
  res.json(status)
})

app.use('/api', api)

app.listen(port, () => {
  console.log(`[dentora:api] listening on :${port}`)
})
