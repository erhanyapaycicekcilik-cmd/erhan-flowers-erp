-- Ürünlerin hangi mağazaya ait olduğu (ERHAN / FLORA). Mevcut tüm ürünler ERHAN.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "store_code" TEXT NOT NULL DEFAULT 'ERHAN';
ALTER TABLE "trendyol_product_variants" ADD COLUMN IF NOT EXISTS "store_code" TEXT NOT NULL DEFAULT 'ERHAN';
CREATE INDEX IF NOT EXISTS "trendyol_product_variants_store_code_idx" ON "trendyol_product_variants"("store_code");
