ALTER TABLE "shop_categories" ADD COLUMN IF NOT EXISTS "category_id" INTEGER REFERENCES "categories"("id");
