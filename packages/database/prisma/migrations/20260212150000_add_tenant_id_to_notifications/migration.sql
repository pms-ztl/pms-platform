-- AlterTable: Add tenant_id to notifications
ALTER TABLE "notifications" ADD COLUMN "tenant_id" UUID;

-- Backfill tenant_id from the user's tenant
UPDATE "notifications" n
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE n."user_id" = u."id";

-- Make tenant_id NOT NULL after backfill
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
