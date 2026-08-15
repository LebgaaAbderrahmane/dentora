-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'CHANGE_PASSWORD', 'REVOKE_ALL_SESSIONS', 'USER_ROLE_CHANGE', 'REVOKE_SESSIONS', 'PATIENT_VIEW', 'PATIENT_CREATE', 'PATIENT_UPDATE', 'PATIENT_ARCHIVED', 'PATIENT_RESTORE');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "archivedAt" TIMESTAMP(3);

