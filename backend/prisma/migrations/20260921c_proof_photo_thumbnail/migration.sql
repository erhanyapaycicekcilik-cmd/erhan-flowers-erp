ALTER TABLE retail_sale_proof_photos
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
