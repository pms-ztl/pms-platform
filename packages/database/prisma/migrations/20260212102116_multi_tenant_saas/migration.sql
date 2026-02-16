-- Multi-Tenant SaaS Migration
-- Adds license management, subscription, excel upload, and password set token models
-- Extends Tenant and User models for multi-tenant SaaS features

-- Add new columns to tenants table
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "max_level" INTEGER NOT NULL DEFAULT 16;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "license_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_plan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_status" TEXT NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_expires_at" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "designated_manager_id" UUID;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "admin_notes" TEXT;

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_reason" TEXT;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "license_count" INTEGER NOT NULL,
    "price_per_seat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create tenant_invoices table
CREATE TABLE IF NOT EXISTS "tenant_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id")
);

-- Create excel_uploads table
CREATE TABLE IF NOT EXISTS "excel_uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excel_uploads_pkey" PRIMARY KEY ("id")
);

-- Create password_set_tokens table
CREATE TABLE IF NOT EXISTS "password_set_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_set_tokens_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_invoices_invoice_number_key" ON "tenant_invoices"("invoice_number");
CREATE UNIQUE INDEX IF NOT EXISTS "password_set_tokens_token_key" ON "password_set_tokens"("token");

-- Create regular indexes
CREATE INDEX IF NOT EXISTS "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "tenant_invoices_subscription_id_idx" ON "tenant_invoices"("subscription_id");
CREATE INDEX IF NOT EXISTS "tenant_invoices_tenant_id_idx" ON "tenant_invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_invoices_status_idx" ON "tenant_invoices"("status");
CREATE INDEX IF NOT EXISTS "excel_uploads_tenant_id_idx" ON "excel_uploads"("tenant_id");
CREATE INDEX IF NOT EXISTS "excel_uploads_uploaded_by_id_idx" ON "excel_uploads"("uploaded_by_id");
CREATE INDEX IF NOT EXISTS "excel_uploads_status_idx" ON "excel_uploads"("status");
CREATE INDEX IF NOT EXISTS "password_set_tokens_user_id_idx" ON "password_set_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_set_tokens_token_key_idx" ON "password_set_tokens"("token");

-- Add foreign key constraints
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "excel_uploads" ADD CONSTRAINT "excel_uploads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "excel_uploads" ADD CONSTRAINT "excel_uploads_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_set_tokens" ADD CONSTRAINT "password_set_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
