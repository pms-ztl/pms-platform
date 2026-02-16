-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_access_enabled" BOOLEAN NOT NULL DEFAULT false;
