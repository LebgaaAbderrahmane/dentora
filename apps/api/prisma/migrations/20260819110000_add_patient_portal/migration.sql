-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PORTAL_ACCESS_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PORTAL_ACCESS_RESET';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "patientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_patientId_key" ON "users"("patientId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
