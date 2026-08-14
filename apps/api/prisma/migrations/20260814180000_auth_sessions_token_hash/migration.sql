-- AlterTable (rename column keeps data)
ALTER TABLE "sessions" RENAME COLUMN "token" TO "tokenHash";

-- Recreate unique index with the expected name
DROP INDEX "sessions_token_key";
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");