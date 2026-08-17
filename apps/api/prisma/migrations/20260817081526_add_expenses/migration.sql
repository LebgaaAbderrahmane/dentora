-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SALARY', 'RENT', 'SUPPLIES', 'EQUIPMENT', 'UTILITIES', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_VOID';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'EXPENSE';

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amountDZD" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_branchId_incurredAt_idx" ON "expenses"("branchId", "incurredAt");

-- CreateIndex
CREATE INDEX "expenses_branchId_category_incurredAt_idx" ON "expenses"("branchId", "category", "incurredAt");

-- CreateIndex
CREATE INDEX "expenses_branchId_voidedAt_idx" ON "expenses"("branchId", "voidedAt");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
