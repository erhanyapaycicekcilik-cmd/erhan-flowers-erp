-- Platform iade talepleri (Trendyol claims)
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "claim_id" TEXT;
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "claim_status" TEXT;
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "claim_reason" TEXT;
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "claim_date" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "marketplace_orders_claim_id_idx" ON "marketplace_orders"("claim_id");
