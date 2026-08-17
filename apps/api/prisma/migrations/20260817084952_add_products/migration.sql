-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ANESTHETICS', 'DISPOSABLES', 'MATERIALS', 'INSTRUMENTS', 'EQUIPMENT', 'MEDICATIONS', 'LABORATORY', 'STATIONERY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('UNIT', 'BOX', 'PACK', 'BOTTLE', 'JAR', 'SYRINGE', 'SET', 'KIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_RESTORE';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'PRODUCT';

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" "ProductCategory" NOT NULL,
    "unit" "ProductUnit" NOT NULL,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_branchId_category_idx" ON "products"("branchId", "category");

-- CreateIndex
CREATE INDEX "products_branchId_archivedAt_idx" ON "products"("branchId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_branchId_code_key" ON "products"("branchId", "code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
