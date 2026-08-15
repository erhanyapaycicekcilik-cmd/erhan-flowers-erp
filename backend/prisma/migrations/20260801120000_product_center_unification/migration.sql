ALTER TABLE "trendyol_product_variants"
  ADD COLUMN IF NOT EXISTS "product_id" INTEGER;

WITH ranked_matches AS (
  SELECT
    tpv."id" AS variant_id,
    p."id" AS product_id,
    ROW_NUMBER() OVER (PARTITION BY p."id" ORDER BY tpv."id") AS product_match_rank
  FROM "trendyol_product_variants" tpv
  JOIN "products" p ON (
    (tpv."barcode" IS NOT NULL AND p."barcode" = tpv."barcode")
    OR (
      p."model_code" IS NOT NULL
      AND p."model_code" IN (tpv."current_model_code", tpv."proposed_model_code", tpv."supplier_stock_code")
    )
  )
  WHERE tpv."product_id" IS NULL
)
UPDATE "trendyol_product_variants" tpv
SET "product_id" = ranked_matches.product_id
FROM ranked_matches
WHERE tpv."id" = ranked_matches.variant_id
  AND ranked_matches.product_match_rank = 1;

CREATE UNIQUE INDEX IF NOT EXISTS "trendyol_product_variants_product_id_key"
  ON "trendyol_product_variants"("product_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trendyol_product_variants_product_id_fkey'
  ) THEN
    ALTER TABLE "trendyol_product_variants"
      ADD CONSTRAINT "trendyol_product_variants_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
