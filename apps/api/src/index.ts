import express from 'express'
import {
  healthSchema,
  systemStatusSchema,
  type Health,
  type SystemStatus,
} from '@dentora/contracts'
import { prisma } from './lib/prisma'
import { logger } from './lib/logger'
import { initSentry, captureError } from './lib/sentry'
import authRouter from './routes/auth'
import auditRouter from './routes/audit'
import patientsRouter from './routes/patients'
import usersRouter from './routes/users'
import appointmentsRouter from './routes/appointments'
import staffRouter from './routes/staff'
import waitlistRouter from './routes/waitlist'
import dashboardRouter from './routes/dashboard'
import publicRouter from './routes/public'
import servicesRouter from './routes/services'
import invoicesRouter from './routes/invoices'
import paymentsRouter from './routes/payments'
import expensesRouter from './routes/expenses'
import financeRouter from './routes/finance'
import productsRouter from './routes/products'
import suppliersRouter from './routes/suppliers'
import purchaseOrdersRouter from './routes/purchaseOrders'
import stockRouter from './routes/stock'
import alertsRouter from './routes/alerts'
import consumptionRouter from './routes/consumption'
import sterilizationsRouter from './routes/sterilizations'
import attendanceRouter from './routes/attendance'
import internsRouter from './routes/interns'
import payrollRouter from './routes/payroll'
import portalRouter from './routes/portal'
import notificationsRouter from './routes/notifications'
import { runSweep } from './lib/notifications'

initSentry()

const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(express.json())

app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
      },
      'request',
    )
  })
  next()
})

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
api.use('/audit', auditRouter)
api.use('/patients', patientsRouter)
api.use('/appointments', appointmentsRouter)
api.use('/waitlist', waitlistRouter)
api.use('/staff', staffRouter)
api.use('/dashboard', dashboardRouter)
api.use('/public', publicRouter)
api.use('/services', servicesRouter)
api.use('/invoices', invoicesRouter)
api.use('/payments', paymentsRouter)
api.use('/expenses', expensesRouter)
api.use('/finance', financeRouter)
api.use('/products', productsRouter)
api.use('/suppliers', suppliersRouter)
api.use('/purchase-orders', purchaseOrdersRouter)
api.use('/stock', stockRouter)
api.use('/alerts', alertsRouter)
api.use('/consumption', consumptionRouter)
api.use('/sterilizations', sterilizationsRouter)
api.use('/attendance', attendanceRouter)
api.use('/interns', internsRouter)
api.use('/payroll', payrollRouter)
api.use('/portal', portalRouter)
api.use('/notifications', notificationsRouter)

app.use('/api', api)

app.use(
  '/api',
  (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    captureError(err, {
      userId: req.auth?.user.id,
      email: req.auth?.user.email,
      extra: { method: req.method, url: req.originalUrl },
    })
    logger.error({ err, method: req.method, url: req.originalUrl }, 'request failed')
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' })
  },
)

app.listen(port, () => {
  logger.info({ port }, 'api listening')

  // Reminder sweep (ADR 032): periodic, unref'd so it never blocks shutdown;
  // per-branch config drives whether anything is actually sent.
  const sweepIntervalMin = Number(process.env.REMINDER_SWEEP_INTERVAL_MIN ?? 15)
  const sweep = setInterval(() => {
    void (async () => {
      try {
        const branches = await prisma.branch.findMany({ select: { id: true } })
        for (const branch of branches) {
          await runSweep(branch.id)
        }
      } catch (err) {
        captureError(err, { extra: { context: 'reminder-sweep' } })
        logger.error({ err }, 'reminder sweep failed')
      }
    })()
  }, sweepIntervalMin * 60_000)
  sweep.unref?.()
})
