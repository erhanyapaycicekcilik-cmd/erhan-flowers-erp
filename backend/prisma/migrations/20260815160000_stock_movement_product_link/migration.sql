ALTER TABLE "stock_movements" ALTER COLUMN "stock_card_id" DROP NOT NULL;
ALTER TABLE "stock_movements" ADD COLUMN "product_id" INTEGER;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
