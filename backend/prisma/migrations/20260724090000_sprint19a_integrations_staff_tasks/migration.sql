ALTER TYPE "RetailSaleChannel" ADD VALUE IF NOT EXISTS 'HEPSIBURADA';
ALTER TYPE "RetailSaleChannel" ADD VALUE IF NOT EXISTS 'N11';
ALTER TYPE "RetailSaleChannel" ADD VALUE IF NOT EXISTS 'AMAZON';

ALTER TABLE "stock_cards"
  ADD COLUMN IF NOT EXISTS "reserved_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0;

ALTER TABLE "retail_sales"
  ADD COLUMN IF NOT EXISTS "platform_order_number" TEXT,
  ADD COLUMN IF NOT EXISTS "external_order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "integration_sync_status" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cargo_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "cargo_tracking_number" TEXT,
  ADD COLUMN IF NOT EXISTS "order_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "delivery_due_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "retail_sales_idempotency_key_key"
  ON "retail_sales"("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "retail_sale_items"
  ADD COLUMN IF NOT EXISTS "external_line_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_variant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "variation_text" TEXT;

CREATE TABLE IF NOT EXISTS "stock_reservations" (
  "id" SERIAL PRIMARY KEY,
  "stock_card_id" INTEGER NOT NULL,
  "sale_id" INTEGER NOT NULL,
  "sale_item_id" INTEGER,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "event_key" TEXT NOT NULL UNIQUE,
  "created_by_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "stock_reservations_stock_card_id_idx" ON "stock_reservations"("stock_card_id");
CREATE INDEX IF NOT EXISTS "stock_reservations_sale_id_idx" ON "stock_reservations"("sale_id");

CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" SERIAL PRIMARY KEY,
  "platform" TEXT NOT NULL UNIQUE,
  "display_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "uses_env_credentials" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_test_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "integration_sync_logs" (
  "id" SERIAL PRIMARY KEY,
  "platform" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "external_order_id" TEXT,
  "sale_id" INTEGER,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "payload_summary" JSONB
);

CREATE INDEX IF NOT EXISTS "integration_sync_logs_platform_started_at_idx" ON "integration_sync_logs"("platform", "started_at");
CREATE INDEX IF NOT EXISTS "integration_sync_logs_status_idx" ON "integration_sync_logs"("status");

CREATE TABLE IF NOT EXISTS "production_staff_tasks" (
  "id" SERIAL PRIMARY KEY,
  "sale_id" INTEGER NOT NULL,
  "sale_item_id" INTEGER,
  "task_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "assignment_group" TEXT,
  "assigned_user_id" INTEGER,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "due_at" TIMESTAMP(3),
  "seen_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "blocked_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "production_staff_tasks_sale_id_idx" ON "production_staff_tasks"("sale_id");
CREATE INDEX IF NOT EXISTS "production_staff_tasks_assigned_user_id_idx" ON "production_staff_tasks"("assigned_user_id");
CREATE INDEX IF NOT EXISTS "production_staff_tasks_assignment_group_idx" ON "production_staff_tasks"("assignment_group");
CREATE INDEX IF NOT EXISTS "production_staff_tasks_status_idx" ON "production_staff_tasks"("status");

CREATE TABLE IF NOT EXISTS "production_task_proofs" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INTEGER NOT NULL,
  "sale_id" INTEGER NOT NULL,
  "sale_item_id" INTEGER,
  "product_name_snapshot" TEXT NOT NULL,
  "barcode" TEXT,
  "photo_path" TEXT,
  "barcode_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "uploaded_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "production_task_proofs_task_id_idx" ON "production_task_proofs"("task_id");
CREATE INDEX IF NOT EXISTS "production_task_proofs_sale_id_idx" ON "production_task_proofs"("sale_id");
