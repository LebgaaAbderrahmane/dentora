// Pure stock-ledger math (3.3, ADR 024) — no prisma import so it is unit-testable
// without a DATABASE_URL. All whole units (ADR 017). The invariant is
// Σ ledger == Product.quantityOnHand, maintained by applying stockDelta on write.
export type StockType = 'OPENING' | 'IN' | 'OUT' | 'ADJUST'

// Signed contribution of a ledger row to the on-hand balance. OPENING and IN add
// their magnitude; OUT removes its magnitude; ADJUST is already signed (positive
// adds, negative removes).
export function stockDelta(type: StockType, quantity: number): number {
  if (type === 'OUT') return -quantity
  return type === 'ADJUST' ? quantity : quantity
}

export type StockOutcome = { ok: true; onHand: number } | { ok: false; error: 'INSUFFICIENT_STOCK' }

// Applies a movement to the current on-hand value. Movements that would drive stock
// below zero are refused (OUT and negative ADJUST); everything else must keep the
// balance non-negative to honour the ledger invariant on the stored quantity.
export function applyStock(current: number, type: StockType, quantity: number): StockOutcome {
  const next = current + stockDelta(type, quantity)
  if (next < 0) return { ok: false, error: 'INSUFFICIENT_STOCK' }
  return { ok: true, onHand: next }
}
