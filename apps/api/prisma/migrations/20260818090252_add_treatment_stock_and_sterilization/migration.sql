-- CreateEnum
CREATE TYPE "SterilizationMethod" AS ENUM ('AUTOCLAVE', 'CHEMICAL', 'UV', 'OTHER');

-- CreateEnum
CREATE TYPE "SterilizationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'STERILIZATION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'STERILIZATION_UPDATE';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'STERILIZATION';

-- AlterTable
ALTER TABLE "stock_ledger_entries" ADD COLUMN     "appointmentId" TEXT;

-- CreateTable
CREATE TABLE "treatment_stock_consumptions" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "batch" TEXT,
    "reason" TEXT,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_stock_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sterilization_logs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT,
    "instrument" TEXT NOT NULL,
    "method" "SterilizationMethod" NOT NULL,
    "cycle" INTEGER,
    "status" "SterilizationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "operatorId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sterilization_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treatment_stock_consumptions_branchId_consumedAt_idx" ON "treatment_stock_consumptions"("branchId", "consumedAt");

-- CreateIndex
CREATE INDEX "treatment_stock_consumptions_branchId_productId_consumedAt_idx" ON "treatment_stock_consumptions"("branchId", "productId", "consumedAt");

-- CreateIndex
CREATE INDEX "treatment_stock_consumptions_appointmentId_idx" ON "treatment_stock_consumptions"("appointmentId");

-- CreateIndex
CREATE INDEX "sterilization_logs_branchId_startedAt_idx" ON "sterilization_logs"("branchId", "startedAt");

-- CreateIndex
CREATE INDEX "sterilization_logs_branchId_status_startedAt_idx" ON "sterilization_logs"("branchId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "sterilization_logs_branchId_productId_idx" ON "sterilization_logs"("branchId", "productId");

-- CreateIndex
CREATE INDEX "sterilization_logs_operatorId_idx" ON "sterilization_logs"("operatorId");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_appointmentId_idx" ON "stock_ledger_entries"("appointmentId");

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stock_consumptions" ADD CONSTRAINT "treatment_stock_consumptions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stock_consumptions" ADD CONSTRAINT "treatment_stock_consumptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stock_consumptions" ADD CONSTRAINT "treatment_stock_consumptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stock_consumptions" ADD CONSTRAINT "treatment_stock_consumptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sterilization_logs" ADD CONSTRAINT "sterilization_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
