// Pure purchase-order math (3.2, ADR 023) — no prisma import so it is unit-testable
// without a DATABASE_URL. All whole dinars (ADR 017); status is derived from per-line
// received quantities at write time, never stored as a hand-set value.
export type OrderLineShape = {
  unitPriceDZD: number
  quantity: number
  receivedQuantity: number
}

export function poLineTotal(line: Pick<OrderLineShape, 'unitPriceDZD' | 'quantity'>): number {
  return line.unitPriceDZD * line.quantity
}

export function poTotalDZD(lines: Pick<OrderLineShape, 'unitPriceDZD' | 'quantity'>[]): number {
  return lines.reduce((sum, l) => sum + poLineTotal(l), 0)
}

export function poRemaining(line: OrderLineShape): number {
  return line.quantity - line.receivedQuantity
}

export type PoStatus = 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED'

// Derived status after receipts: nothing received yet → ORDERED, everything received →
// RECEIVED, anything in between → PARTIALLY_RECEIVED. A cancelled order never comes here.
export function poStatus(lines: OrderLineShape[]): PoStatus {
  if (lines.length === 0) return 'ORDERED'
  const allFull = lines.every((l) => l.receivedQuantity >= l.quantity)
  if (allFull) return 'RECEIVED'
  const anyReceived = lines.some((l) => l.receivedQuantity > 0)
  return anyReceived ? 'PARTIALLY_RECEIVED' : 'ORDERED'
}
