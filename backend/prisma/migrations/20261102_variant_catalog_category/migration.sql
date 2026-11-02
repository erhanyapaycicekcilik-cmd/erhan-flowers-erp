ALTER TABLE "trendyol_product_variants" ADD COLUMN IF NOT EXISTS "catalog_category" TEXT;
ALTER TABLE "trendyol_product_variants" ADD COLUMN IF NOT EXISTS "catalog_sub_category" TEXT;

-- Mevcut Product tablosundaki katalog kategorilerini variant tablosuna kopyala
UPDATE "trendyol_product_variants" v
SET catalog_category = p.catalog_category,
    catalog_sub_category = p.catalog_sub_category
FROM "products" p
WHERE v.product_id = p.id
  AND p.catalog_category IS NOT NULL;
