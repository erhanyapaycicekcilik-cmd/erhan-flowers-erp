CREATE TABLE "product_groups" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "main_image" TEXT,
    "category" TEXT,
    "sub_category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "product_group_variants" (
    "id" SERIAL PRIMARY KEY,
    "group_id" INTEGER NOT NULL,
    "size_label" TEXT,
    "pot_label" TEXT,
    "pot_image" TEXT,
    "product_id" INTEGER,
    "trendyol_variant_id" INTEGER,
    "price_override" DECIMAL(12, 2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "product_group_variants_group_id_fkey"
        FOREIGN KEY ("group_id") REFERENCES "product_groups"("id") ON DELETE CASCADE
);

CREATE INDEX "product_groups_slug_idx" ON "product_groups"("slug");
CREATE INDEX "product_group_variants_group_id_idx" ON "product_group_variants"("group_id");
