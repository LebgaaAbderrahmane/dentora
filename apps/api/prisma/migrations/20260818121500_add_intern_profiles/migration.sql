-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INTERN_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'INTERN_UPDATE';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'INTERN';

-- CreateEnum
CREATE TYPE "InternRotation" AS ENUM ('CONSULTATION', 'SURGERY', 'CARE', 'HYGIENE', 'PROSTHETIC_ORTHO', 'IMAGING');

-- CreateTable
CREATE TABLE "intern_profiles" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "requiredHours" INTEGER NOT NULL,
    "rotation" "InternRotation" NOT NULL,
    "mentorId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intern_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intern_profiles_internId_key" ON "intern_profiles"("internId");

-- CreateIndex
CREATE INDEX "intern_profiles_branchId_idx" ON "intern_profiles"("branchId");

-- AddForeignKey
ALTER TABLE "intern_profiles" ADD CONSTRAINT "intern_profiles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intern_profiles" ADD CONSTRAINT "intern_profiles_internId_fkey" FOREIGN KEY ("internId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intern_profiles" ADD CONSTRAINT "intern_profiles_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;