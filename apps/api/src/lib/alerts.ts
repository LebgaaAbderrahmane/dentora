// Pure stock-alert math (3.4, ADR 025) — no prisma import so it is unit-testable
// without a DATABASE_URL. Alerts are derived on read from the catalog + ledger.
export type ProductShape = {
  id: string
  name: string
  unit: string
  category: string
  quantityOnHand: number
  reorderLevel: number
  archivedAt: Date | null
}

export type LowStockAlert = {
  productId: string
  productName: string
  unit: string
  category: string
  quantityOnHand: number
  reorderLevel: number
}

// Active products with a configured threshold at or below it alert (ADR 025):
// `reorderLevel > 0 && quantityOnHand <= reorderLevel` — the same `<=` as the 3.1 badge,
// plus the threshold guard so zero-stock rows with no reorder level never spam the feed.
export function computeLowStock(products: ProductShape[]): LowStockAlert[] {
  return products
    .filter((p) => !p.archivedAt && p.reorderLevel > 0 && p.quantityOnHand <= p.reorderLevel)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      unit: p.unit,
      category: p.category,
      quantityOnHand: p.quantityOnHand,
      reorderLevel: p.reorderLevel,
    }))
}

export type LedgerEntryShape = {
  productId: string
  type: 'OPENING' | 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  batch: string | null
  expiryDate: Date | null
}

export type ExpiringLot = {
  productId: string
  batch: string
  expiryDate: Date
  remaining: number
  expired: boolean
}

// First-expiry-first-out (FEFO) remaining per lot (ADR 025). Per product: all inward
// quantities (IN + positive ADJUST) form the pool sorted by expiry date (batchless last);
// consumption (OUT + negative ADJUST) drains from the soonest-expiring lot first. A lot
// with `remaining > 0` whose expiry is within `horizonMs` of `now` alerts; already-past
// lots with stock are flagged `expired`. The ADR 024 invariant keeps totals exact — only
// the lot split is approximated, conservatively so for expiry risk.
export function computeExpiringLots(
  entries: LedgerEntryShape[],
  horizonMs: number,
  now: Date,
): ExpiringLot[] {
  const byProduct = new Map<string, LedgerEntryShape[]>()
  for (const e of entries) {
    const list = byProduct.get(e.productId) ?? []
    list.push(e)
    byProduct.set(e.productId, list)
  }

  const alerts: ExpiringLot[] = []
  const cutoff = new Date(now.getTime() + horizonMs)

  for (const [productId, rows] of byProduct) {
    // Pool of incoming units, oldest-expiry first; batchless lots sort to the end.
    const pool = rows
      .filter((e) => e.type === 'IN' || (e.type === 'ADJUST' && e.quantity > 0))
      .map((e) => ({ amount: e.quantity, batch: e.batch, expiryDate: e.expiryDate }))
      .sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0
        if (!a.expiryDate) return 1
        if (!b.expiryDate) return -1
        return a.expiryDate.getTime() - b.expiryDate.getTime()
      })

    let consumed = rows.reduce(
      (sum, e) =>
        sum +
        (e.type === 'OUT' ? e.quantity : e.type === 'ADJUST' && e.quantity < 0 ? -e.quantity : 0),
      0,
    )

    for (const lot of pool) {
      if (consumed <= 0) break
      const take = Math.min(lot.amount, consumed)
      lot.amount -= take
      consumed -= take
    }

    const horizonEnd = cutoff.getTime()
    for (const lot of pool) {
      if (!lot.batch || !lot.expiryDate) continue
      if (lot.amount <= 0) continue
      const expiryMs = lot.expiryDate.getTime()
      if (expiryMs > horizonEnd) continue
      alerts.push({
        productId,
        batch: lot.batch,
        expiryDate: lot.expiryDate,
        remaining: lot.amount,
        expired: expiryMs <= now.getTime(),
      })
    }
  }

  return alerts.sort(
    (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.batch.localeCompare(b.batch),
  )
}
