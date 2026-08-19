-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_CONFIG_UPDATE';

-- AlterEnum
ALTER TYPE "AuditTarget" ADD VALUE 'NOTIFICATION';

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "to" TEXT NOT NULL,
    "provider" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_branchId_channel_createdAt_idx" ON "notification_logs"("branchId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_branchId_status_createdAt_idx" ON "notification_logs"("branchId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_appointmentId_channel_key" ON "notification_logs"("appointmentId", "channel");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
