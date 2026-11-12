-- Web sitesi siparişleri için de kanıt videosu/fotoğrafı saklanabilsin.
-- Önceden web siparişinin id'si yanlışlıkla retail_sales.id olarak gönderiliyordu.
ALTER TYPE "WebOrderStatus" ADD VALUE IF NOT EXISTS 'READY' AFTER 'PREPARING';

ALTER TABLE "retail_sale_proof_photos" ALTER COLUMN "sale_id" DROP NOT NULL;
ALTER TABLE "retail_sale_proof_photos" ADD COLUMN IF NOT EXISTS "web_order_id" INTEGER;
ALTER TABLE "retail_sale_proof_photos"
  ADD CONSTRAINT "retail_sale_proof_photos_web_order_id_fkey"
  FOREIGN KEY ("web_order_id") REFERENCES "web_orders"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "retail_sale_proof_photos_web_order_id_idx" ON "retail_sale_proof_photos"("web_order_id");
