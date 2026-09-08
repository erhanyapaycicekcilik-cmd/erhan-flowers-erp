CREATE TABLE IF NOT EXISTS marketplace_sku_mappings (
  id            SERIAL PRIMARY KEY,
  platform      TEXT NOT NULL,
  external_sku  TEXT NOT NULL,
  external_barcode TEXT,
  stock_card_id INTEGER NOT NULL REFERENCES stock_cards(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_sku_mappings_platform_sku_uq UNIQUE (platform, external_sku)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_sku_mappings_platform ON marketplace_sku_mappings(platform);
