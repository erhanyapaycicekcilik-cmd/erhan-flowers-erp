-- CreateTable
CREATE TABLE "competitor_keywords" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "category_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_snapshots" (
    "id" SERIAL NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rank" INTEGER NOT NULL,
    "trendyol_product_id" TEXT NOT NULL,
    "seller_name" TEXT,
    "product_name" TEXT NOT NULL,
    "brand" TEXT,
    "price_current" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price_original" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rating_average" DECIMAL(4,2),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "image_count" INTEGER NOT NULL DEFAULT 0,
    "free_cargo" BOOLEAN NOT NULL DEFAULT false,
    "promotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_url" TEXT,
    "raw" JSONB,

    CONSTRAINT "competitor_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_insight_reports" (
    "id" SERIAL NOT NULL,
    "report_date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "comparison" JSONB NOT NULL DEFAULT '[]',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_insight_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_account_connections" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "account_name" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_account_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_insight_snapshots" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "follows_count" INTEGER NOT NULL DEFAULT 0,
    "media_count" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "profile_views" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,

    CONSTRAINT "social_insight_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_insight_reports" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_insight_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitor_keywords_keyword_key" ON "competitor_keywords"("keyword");

-- CreateIndex
CREATE INDEX "competitor_snapshots_keyword_id_captured_at_idx" ON "competitor_snapshots"("keyword_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_insight_reports_report_date_key" ON "market_insight_reports"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "social_account_connections_platform_key" ON "social_account_connections"("platform");

-- CreateIndex
CREATE INDEX "social_insight_snapshots_platform_captured_at_idx" ON "social_insight_snapshots"("platform", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_insight_reports_platform_report_date_key" ON "social_insight_reports"("platform", "report_date");

-- AddForeignKey
ALTER TABLE "competitor_keywords" ADD CONSTRAINT "competitor_keywords_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "competitor_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
