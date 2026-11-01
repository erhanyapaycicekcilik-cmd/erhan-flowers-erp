-- AlterTable: add returnNote to marketplace_orders
ALTER TABLE "marketplace_orders" ADD COLUMN "return_note" TEXT;

-- CreateTable: return_videos
CREATE TABLE "return_videos" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT,
    "size_byte" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "return_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_videos_order_id_idx" ON "return_videos"("order_id");

-- AddForeignKey
ALTER TABLE "return_videos" ADD CONSTRAINT "return_videos_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
