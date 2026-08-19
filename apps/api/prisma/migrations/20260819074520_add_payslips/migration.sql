-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_VOID';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'PAYROLL';

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "baseDZD" INTEGER NOT NULL,
    "bonusDZD" INTEGER NOT NULL DEFAULT 0,
    "deductionsDZD" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payslips_branchId_periodStart_periodEnd_idx" ON "payslips"("branchId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "payslips_branchId_staffId_idx" ON "payslips"("branchId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_branchId_staffId_periodStart_periodEnd_key" ON "payslips"("branchId", "staffId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
