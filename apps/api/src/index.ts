import express from 'express'
import {
  healthSchema,
  systemStatusSchema,
  type Health,
  type SystemStatus,
} from '@dentora/contracts'
import { prisma } from './lib/prisma'
import authRouter from './routes/auth'
import usersRouter from './routes/users'

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

api.use('/auth', authRouter)
api.use('/users', usersRouter)

app.use('/api', api)

app.use(
  '/api',
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' })
  },
)

app.listen(port, () => {
  console.log(`[dentora:api] listening on :${port}`)
})
