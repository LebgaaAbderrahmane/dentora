-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_MEDICAL_VIEW';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_MEDICAL_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_ODONTOGRAM_VIEW';
ALTER TYPE "AuditAction" ADD VALUE 'PATIENT_ODONTOGRAM_UPDATE';

-- CreateTable
CREATE TABLE "patient_medical_histories" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_odontograms" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_odontograms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_medical_histories_patientId_key" ON "patient_medical_histories"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_odontograms_patientId_key" ON "patient_odontograms"("patientId");

-- CreateIndex
CREATE INDEX "audit_logs_branchId_action_createdAt_idx" ON "audit_logs"("branchId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "patient_medical_histories" ADD CONSTRAINT "patient_medical_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_odontograms" ADD CONSTRAINT "patient_odontograms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

