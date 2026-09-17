ALTER TABLE "retail_sale_proof_photos" ADD COLUMN IF NOT EXISTS "photo_type" TEXT NOT NULL DEFAULT 'BARCODE';
