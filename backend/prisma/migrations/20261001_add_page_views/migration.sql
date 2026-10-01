-- CreateTable
CREATE TABLE "page_views" (
    "id" SERIAL NOT NULL,
    "site" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "device_brand" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at");

-- CreateIndex
CREATE INDEX "page_views_site_created_at_idx" ON "page_views"("site", "created_at");
