ALTER TABLE "stock_movements" ADD COLUMN "variant_id" INTEGER;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "trendyol_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
