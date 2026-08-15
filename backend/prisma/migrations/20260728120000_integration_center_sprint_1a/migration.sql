CREATE TYPE "IntegrationChannelType" AS ENUM ('MARKETPLACE', 'WEBSITE', 'STORE', 'B2B', 'OTHER');
CREATE TYPE "ChannelAccountStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'CONNECTED', 'FAILED', 'DISABLED');
CREATE TYPE "ChannelCredentialType" AS ENUM ('API_KEY', 'API_SECRET', 'SUPPLIER_ID', 'TOKEN', 'UYE_KODU', 'USERNAME', 'PASSWORD', 'OTHER');
CREATE TYPE "ChannelPublicationStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ERROR', 'PAUSED');
CREATE TYPE "IntegrationJobType" AS ENUM ('PRODUCT_PREVIEW', 'PRICE_PREVIEW', 'STOCK_PREVIEW', 'CONNECTION_TEST');
CREATE TYPE "IntegrationJobMode" AS ENUM ('DRY_RUN', 'LIVE');
CREATE TYPE "IntegrationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'BLOCKED');

CREATE TABLE "companies" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legal_name" TEXT,
  "domain" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sales_channels" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel_type" "IntegrationChannelType" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "supports_products" BOOLEAN NOT NULL DEFAULT false,
  "supports_stock" BOOLEAN NOT NULL DEFAULT false,
  "supports_price" BOOLEAN NOT NULL DEFAULT false,
  "supports_orders" BOOLEAN NOT NULL DEFAULT false,
  "supports_webhooks" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "channel_accounts" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "sales_channel_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "external_account_id" TEXT,
  "status" "ChannelAccountStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_test_mode" BOOLEAN NOT NULL DEFAULT true,
  "last_connection_test_at" TIMESTAMP(3),
  "last_connection_status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "channel_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "channel_credentials" (
  "id" SERIAL NOT NULL,
  "channel_account_id" INTEGER NOT NULL,
  "credential_type" "ChannelCredentialType" NOT NULL,
  "encrypted_value" TEXT NOT NULL,
  "masked_value" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "rotated_at" TIMESTAMP(3),
  CONSTRAINT "channel_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "channel_product_mappings" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "sales_channel_id" INTEGER NOT NULL,
  "channel_account_id" INTEGER NOT NULL,
  "product_id" INTEGER,
  "trendyol_product_variant_id" INTEGER,
  "stock_card_id" INTEGER,
  "external_product_id" TEXT,
  "external_variant_id" TEXT,
  "external_sku" TEXT,
  "external_barcode" TEXT,
  "publication_status" "ChannelPublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "channel_product_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_sync_jobs" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "sales_channel_id" INTEGER NOT NULL,
  "channel_account_id" INTEGER NOT NULL,
  "job_type" "IntegrationJobType" NOT NULL,
  "mode" "IntegrationJobMode" NOT NULL DEFAULT 'DRY_RUN',
  "status" "IntegrationJobStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by_user_id" INTEGER,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "total_items" INTEGER NOT NULL DEFAULT 0,
  "successful_items" INTEGER NOT NULL DEFAULT 0,
  "failed_items" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "integration_sync_logs"
  ADD COLUMN "sync_job_id" INTEGER,
  ADD COLUMN "entity_type" TEXT,
  ADD COLUMN "entity_id" TEXT,
  ADD COLUMN "operation" TEXT,
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");
CREATE UNIQUE INDEX "sales_channels_code_key" ON "sales_channels"("code");
CREATE INDEX "sales_channels_is_active_idx" ON "sales_channels"("is_active");
CREATE INDEX "channel_accounts_company_id_idx" ON "channel_accounts"("company_id");
CREATE INDEX "channel_accounts_sales_channel_id_idx" ON "channel_accounts"("sales_channel_id");
CREATE INDEX "channel_accounts_is_active_idx" ON "channel_accounts"("is_active");
CREATE UNIQUE INDEX "channel_credentials_channel_account_id_credential_type_key" ON "channel_credentials"("channel_account_id", "credential_type");
CREATE INDEX "channel_credentials_is_active_idx" ON "channel_credentials"("is_active");
CREATE UNIQUE INDEX "channel_product_mappings_channel_account_id_external_variant_id_key" ON "channel_product_mappings"("channel_account_id", "external_variant_id");
CREATE INDEX "channel_product_mappings_company_id_idx" ON "channel_product_mappings"("company_id");
CREATE INDEX "channel_product_mappings_sales_channel_id_idx" ON "channel_product_mappings"("sales_channel_id");
CREATE INDEX "channel_product_mappings_product_id_idx" ON "channel_product_mappings"("product_id");
CREATE INDEX "channel_product_mappings_trendyol_product_variant_id_idx" ON "channel_product_mappings"("trendyol_product_variant_id");
CREATE INDEX "channel_product_mappings_stock_card_id_idx" ON "channel_product_mappings"("stock_card_id");
CREATE INDEX "channel_product_mappings_is_active_idx" ON "channel_product_mappings"("is_active");
CREATE INDEX "integration_sync_jobs_company_id_idx" ON "integration_sync_jobs"("company_id");
CREATE INDEX "integration_sync_jobs_sales_channel_id_idx" ON "integration_sync_jobs"("sales_channel_id");
CREATE INDEX "integration_sync_jobs_channel_account_id_idx" ON "integration_sync_jobs"("channel_account_id");
CREATE INDEX "integration_sync_jobs_mode_status_idx" ON "integration_sync_jobs"("mode", "status");
CREATE INDEX "integration_sync_logs_sync_job_id_idx" ON "integration_sync_logs"("sync_job_id");

ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "sales_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "channel_credentials" ADD CONSTRAINT "channel_credentials_channel_account_id_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "channel_product_mappings" ADD CONSTRAINT "channel_product_mappings_channel_account_id_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "sales_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_channel_account_id_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
