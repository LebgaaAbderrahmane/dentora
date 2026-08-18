import { Router } from 'express'
import { type ProductUnit, stockAlertQuerySchema, stockAlertsSchema } from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { computeExpiringLots, computeLowStock } from '../lib/alerts'

const router = Router()

// Stock alerts (3.4, ADR 025) — derived entirely on read from the catalog + ledger.
// Same audience as /api/products and /api/stock: clinical trio + ACCOUNTANT. Catalog
// data, not PHI — no per-read audit.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'))

router.get('/', async (req, res) => {
  const parsed = stockAlertQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const horizonMs = parsed.data.horizonDays * 24 * 60 * 60 * 1000

  const [products, entries] = await prisma.$transaction([
    prisma.product.findMany({ where: { branchId } }),
    prisma.stockLedgerEntry.findMany({
      where: { branchId },
      select: {
        productId: true,
        type: true,
        quantity: true,
        batch: true,
        expiryDate: true,
      },
    }),
  ])

  const lowStock = computeLowStock(products)
  const expiring = computeExpiringLots(entries, horizonMs, new Date())

  const productMeta = new Map(
    products.map((p) => [p.id, { name: p.name, unit: p.unit, category: p.category }]),
  )

  res.json(
    stockAlertsSchema.parse({
      lowStock,
      expiring: expiring.map((lot) => {
        const meta = productMeta.get(lot.productId)!
        return {
          productId: lot.productId,
          productName: meta.name,
          unit: meta.unit as ProductUnit,
          batch: lot.batch,
          expiryDate: lot.expiryDate.toISOString(),
          remaining: lot.remaining,
          expired: lot.expired,
        }
      }),
      generatedAt: new Date().toISOString(),
    }),
  )
})

export default router
