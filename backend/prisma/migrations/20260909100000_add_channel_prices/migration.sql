-- N11 ve Hepsiburada için kanal bazlı satış fiyatı alanları
ALTER TABLE "trendyol_product_variants"
  ADD COLUMN IF NOT EXISTS "n11_sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hepsiburada_sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0;
