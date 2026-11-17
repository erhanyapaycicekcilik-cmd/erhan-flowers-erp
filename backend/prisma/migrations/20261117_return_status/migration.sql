-- İade süreci takibi (iade reddi için video kanıtı)
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "return_status" TEXT;
ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "return_updated_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "marketplace_orders_return_status_idx" ON "marketplace_orders"("return_status");
