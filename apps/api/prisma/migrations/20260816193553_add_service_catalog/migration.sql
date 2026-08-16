-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'SURGERY', 'CARE', 'HYGIENE', 'PROSTHETIC_ORTHO', 'IMAGING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'SERVICE_RESTORE';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'SERVICE';

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "priceDZD" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "reimbursablePct" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_branchId_category_idx" ON "services"("branchId", "category");

-- CreateIndex
CREATE INDEX "services_branchId_archivedAt_idx" ON "services"("branchId", "archivedAt");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
