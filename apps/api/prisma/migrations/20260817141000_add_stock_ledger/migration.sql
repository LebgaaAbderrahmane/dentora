-- CreateEnum
CREATE TYPE "StockLedgerType" AS ENUM ('OPENING', 'IN', 'OUT', 'ADJUST');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_OUT';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_ADJUST';

-- CreateTable
CREATE TABLE "stock_ledger_entries" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockLedgerType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostDZD" INTEGER,
    "batch" TEXT,
    "expiryDate" TIMESTAMP(3),
    "reason" TEXT,
    "purchaseOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_ledger_entries_branchId_createdAt_idx" ON "stock_ledger_entries"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_branchId_productId_createdAt_idx" ON "stock_ledger_entries"("branchId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_branchId_type_createdAt_idx" ON "stock_ledger_entries"("branchId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_purchaseOrderId_idx" ON "stock_ledger_entries"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: open the current stored quantity as an OPENING ledger row so that
-- Σ ledger == quantityOnHand from day one (ADR 024 invariant). OPENING rows are
-- system-created: no actor, reason set, no batch/expiry.
INSERT INTO "stock_ledger_entries" ("id", "branchId", "productId", "type", "quantity", "reason", "createdAt")
SELECT gen_random_uuid(), "branchId", "id", 'OPENING', "quantityOnHand", 'Opening balance (3.3)', CURRENT_TIMESTAMP
FROM "products"
WHERE "quantityOnHand" > 0;