ALTER TABLE "trendyol_product_variants" ADD COLUMN     "trendyol_comment_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trendyol_favorite_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trendyol_rating_average" DECIMAL(4,2),
ADD COLUMN     "trendyol_rating_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trendyol_stats_synced_at" TIMESTAMP(3);
