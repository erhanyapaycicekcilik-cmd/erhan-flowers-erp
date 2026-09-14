CREATE TABLE "retail_sale_proof_photos" (
  "id" SERIAL PRIMARY KEY,
  "sale_id" INTEGER NOT NULL,
  "image_path" TEXT NOT NULL,
  "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "taken_by_id" INTEGER,
  CONSTRAINT "retail_sale_proof_photos_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id") ON DELETE CASCADE,
  CONSTRAINT "retail_sale_proof_photos_taken_by_id_fkey" FOREIGN KEY ("taken_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "retail_sale_proof_photos_sale_id_idx" ON "retail_sale_proof_photos"("sale_id");
CREATE INDEX "retail_sale_proof_photos_expires_at_idx" ON "retail_sale_proof_photos"("expires_at");
