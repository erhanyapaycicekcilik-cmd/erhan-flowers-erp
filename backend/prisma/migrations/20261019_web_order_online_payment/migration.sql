-- TAMI sanal POS ile online kart ödemesi
ALTER TYPE "WebOrderPaymentMethod" ADD VALUE IF NOT EXISTS 'ONLINE';

ALTER TABLE "web_orders"
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_error" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
