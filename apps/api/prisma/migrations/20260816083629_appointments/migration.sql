-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NOSHOW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_RESCHEDULE';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_VIEW';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_NOSHOW';

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_branchId_startAt_idx" ON "appointments"("branchId", "startAt");

-- CreateIndex
CREATE INDEX "appointments_branchId_status_startAt_idx" ON "appointments"("branchId", "status", "startAt");

-- CreateIndex
CREATE INDEX "appointments_branchId_dentistId_startAt_idx" ON "appointments"("branchId", "dentistId", "startAt");

-- CreateIndex
CREATE INDEX "appointments_patientId_startAt_idx" ON "appointments"("patientId", "startAt");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
