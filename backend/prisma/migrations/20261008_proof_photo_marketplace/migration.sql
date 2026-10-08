ALTER TABLE retail_sale_proof_photos
  ALTER COLUMN sale_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS marketplace_order_id BIGINT REFERENCES marketplace_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_proof_photos_marketplace ON retail_sale_proof_photos(marketplace_order_id);
