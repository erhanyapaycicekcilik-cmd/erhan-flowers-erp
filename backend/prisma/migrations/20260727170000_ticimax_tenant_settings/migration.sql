CREATE TABLE IF NOT EXISTS "integration_tenant_settings" (
  "id" SERIAL PRIMARY KEY,
  "tenant" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "site_url" TEXT,
  "service_endpoint" TEXT,
  "wsdl_url" TEXT,
  "secret_value" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "last_test_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_tenant_settings_tenant_platform_key"
  ON "integration_tenant_settings"("tenant", "platform");

CREATE INDEX IF NOT EXISTS "integration_tenant_settings_platform_idx"
  ON "integration_tenant_settings"("platform");
