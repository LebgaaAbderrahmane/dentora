import { Router } from 'express'
import { financeReportQuerySchema, financeReportSchema } from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { addDays, startOfDay } from '../lib/dashboard'
import { dailySeries, expenseStats, revenueStats } from '../lib/finance'

const router = Router()

// The P&L and the daily close-out are the finance desk's books (ADR 021) — the same
// ADMIN + ACCOUNTANT desk that records expenses (ADR 020). Clinical roles never see costs.
router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'))

// GET /report?from&to  — windows are absolute-instant ISO strings, optional; defaults to the
// server-local today so the endpoint is a close-out out of the box. Everything derived on read.
router.get('/report', async (req, res) => {
  const parsed = financeReportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const from = parsed.data.from ? new Date(parsed.data.from) : startOfDay(new Date())
  const to = parsed.data.to ? new Date(parsed.data.to) : addDays(startOfDay(new Date()), 1)

  const window = { gte: from, lte: to }
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { branchId, receivedAt: window },
      select: { kind: true, method: true, amountDZD: true, receivedAt: true },
    }),
    prisma.expense.findMany({
      where: { branchId, voidedAt: null, incurredAt: window },
      select: { category: true, amountDZD: true, incurredAt: true },
    }),
  ])

  const fromMs = from.getTime()
  const toMs = to.getTime()
  const revenue = revenueStats(payments)
  const expensesStats = expenseStats(expenses)

  res.json(
    financeReportSchema.parse({
      from: from.toISOString(),
      to: to.toISOString(),
      revenue: {
        receiptsDZD: revenue.receiptsDZD,
        refundsDZD: revenue.refundsDZD,
        netDZD: revenue.netDZD,
        byMethod: revenue.byMethod,
      },
      expenses: expensesStats,
      netDZD: revenue.netDZD - expensesStats.totalDZD,
      days: dailySeries(payments, expenses, fromMs, toMs),
    }),
  )
})

export default router
