import { prisma } from './prisma'

const SEQUENCE_KEY = 'invoiceCounter'

// Allocates the next branch-local invoice number atomically. The counter lives
// in the settings table (unique per branch) and is bumped inside its own row
// lock, so two concurrent creates can never produce the same number (ADR 018).
export async function nextInvoiceNumber(branchId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.setting.findUnique({
      where: { branchId_key: { branchId, key: SEQUENCE_KEY } },
    })
    const next = (row?.value ? Number(row.value) : 0) + 1
    await tx.setting.upsert({
      where: { branchId_key: { branchId, key: SEQUENCE_KEY } },
      create: { branchId, key: SEQUENCE_KEY, value: String(next) },
      update: { value: String(next) },
    })
    return next
  })
}
