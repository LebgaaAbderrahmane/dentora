import { Router, type Response } from 'express'
import {
  financeReportQuerySchema,
  financeReportSchema,
  occupancyReportSchema,
  reportExportQuerySchema,
  reportWindowQuerySchema,
  stockValuationQuerySchema,
  stockValuationReportSchema,
  type ExpenseCategory,
  type FinanceReport,
  type OccupancyReport,
  type PaymentMethod,
  type PaymentKind,
  type StockValuationReport,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { addDays, startOfDay } from '../lib/dashboard'
import { dailySeries, expenseStats, revenueStats } from '../lib/finance'
import {
  buildOccupancyReport,
  documentToCsv,
  financeDoc,
  occupancyDoc,
  stockValuationDoc,
  valuationRows,
  valuationSummary,
  type ReportDocument,
} from '../lib/reportMath'
import { renderPdf } from '../lib/pdf'

const router = Router()

// Phase 6.1 reports (ADR 033) — everything derived on read, never stored. Three
// audiences: occupancy is the clinical desk's operational view; stock valuation and
// revenue are the finance desk's books (same ADMIN + ACCOUNTANT as ADR 021/022).
// Reports carry no PHI and no PII (no patient names), and every request is already
// line-logged by the request middleware — so no per-read audit row here.
const CLINICAL = ['ADMIN', 'DENTIST', 'RECEPTIONIST'] as const
const FINANCE = ['ADMIN', 'ACCOUNTANT'] as const

function windowFrom(query: { from?: string; to?: string }): { from: Date; to: Date } {
  const from = query.from ? new Date(query.from) : startOfDay(new Date())
  const to = query.to ? new Date(query.to) : addDays(startOfDay(new Date()), 1)
  return { from, to }
}

interface FinanceWindowData {
  payments: { kind: PaymentKind; method: PaymentMethod; amountDZD: number; receivedAt: Date }[]
  expenses: { category: ExpenseCategory; amountDZD: number; incurredAt: Date }[]
}

async function loadFinanceWindow(
  branchId: string,
  from: Date,
  to: Date,
): Promise<FinanceWindowData> {
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
  return { payments, expenses }
}

function buildFinanceReport(branchId: string, from: Date, to: Date): Promise<FinanceReport> {
  return loadFinanceWindow(branchId, from, to).then(({ payments, expenses }) => {
    const fromMs = from.getTime()
    const toMs = to.getTime()
    const revenue = revenueStats(payments)
    const expensesStats = expenseStats(expenses)
    return financeReportSchema.parse({
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
    })
  })
}

function sendExport(res: Response, doc: ReportDocument, baseName: string, format: 'csv' | 'pdf') {
  const stamp = new Date().toISOString().slice(0, 10)
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}-${stamp}.pdf"`)
    res.send(Buffer.from(renderPdf(doc)))
  } else {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}-${stamp}.csv"`)
    res.send(documentToCsv(doc))
  }
}

async function loadOccupancy(branchId: string, from: Date, to: Date): Promise<OccupancyReport> {
  const appointments = await prisma.appointment.findMany({
    where: { branchId, startAt: { gte: from, lte: to } },
    select: { status: true, startAt: true, dentistId: true, dentist: { select: { name: true } } },
  })
  return occupancyReportSchema.parse(
    buildOccupancyReport(
      appointments.map((a) => ({
        status: a.status,
        startAt: a.startAt,
        dentistId: a.dentistId,
        dentistName: a.dentist?.name ?? null,
      })),
      from.getTime(),
      to.getTime(),
    ),
  )
}

async function loadValuation(
  branchId: string,
  includeArchived = false,
): Promise<StockValuationReport> {
  const products = await prisma.product.findMany({
    where: includeArchived ? { branchId } : { branchId, archivedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      unit: true,
      quantityOnHand: true,
    },
  })
  const ids = products.map((p) => p.id)
  const movements =
    ids.length === 0
      ? []
      : await prisma.stockLedgerEntry.findMany({
          where: {
            branchId,
            productId: { in: ids },
            type: { in: ['OPENING', 'IN'] },
            unitCostDZD: { not: null },
          },
          select: { productId: true, quantity: true, unitCostDZD: true },
        })
  const costsByProduct = new Map<string, { quantity: number; unitCostDZD: number }[]>()
  for (const m of movements) {
    const list = costsByProduct.get(m.productId)
    const entry = { quantity: m.quantity, unitCostDZD: m.unitCostDZD ?? 0 }
    if (list) list.push(entry)
    else costsByProduct.set(m.productId, [entry])
  }
  const rows = valuationRows(
    products.map((p) => ({
      productId: p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      unit: p.unit,
      quantityOnHand: p.quantityOnHand,
    })),
    costsByProduct,
  )
  return stockValuationReportSchema.parse({
    generatedAt: new Date().toISOString(),
    summary: valuationSummary(rows),
    rows,
  })
}

// ---- Occupancy (clinical desk) ----

router.get('/occupancy', requireAuth, requireRole(...CLINICAL), async (req, res) => {
  const parsed = reportWindowQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { from, to } = windowFrom(parsed.data)
  res.json(await loadOccupancy(branchId, from, to))
})

router.get('/occupancy/export', requireAuth, requireRole(...CLINICAL), async (req, res) => {
  const parsed = reportExportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { from, to } = windowFrom(parsed.data)
  sendExport(
    res,
    occupancyDoc(await loadOccupancy(branchId, from, to)),
    'occupancy',
    parsed.data.format,
  )
})

// ---- Stock valuation (finance desk) ----

router.get('/stock-valuation', requireAuth, requireRole(...FINANCE), async (req, res) => {
  const parsed = stockValuationQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const report = await loadValuation(branchId, parsed.data.archived === 'include')
  res.json(report)
})

router.get('/stock-valuation/export', requireAuth, requireRole(...FINANCE), async (req, res) => {
  const parsed = reportExportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  sendExport(
    res,
    stockValuationDoc(await loadValuation(branchId)),
    'stock-valuation',
    parsed.data.format,
  )
})

// ---- Revenue (finance desk) — same shape as /api/finance/report (ADR 021) ----

router.get('/revenue', requireAuth, requireRole(...FINANCE), async (req, res) => {
  const parsed = financeReportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { from, to } = windowFrom(parsed.data)
  res.json(await buildFinanceReport(branchId, from, to))
})

router.get('/revenue/export', requireAuth, requireRole(...FINANCE), async (req, res) => {
  const parsed = reportExportQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { from, to } = windowFrom(parsed.data)
  sendExport(
    res,
    financeDoc(await buildFinanceReport(branchId, from, to)),
    'revenue',
    parsed.data.format,
  )
})

export default router
