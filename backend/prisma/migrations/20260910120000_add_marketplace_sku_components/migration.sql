CREATE TABLE IF NOT EXISTS marketplace_sku_components (
  id            SERIAL PRIMARY KEY,
  platform      TEXT NOT NULL,
  external_sku  TEXT NOT NULL,
  stock_card_id INTEGER REFERENCES stock_cards(id) ON DELETE SET NULL,
  quantity      DECIMAL(12,3) NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_sku_components_uq UNIQUE (platform, external_sku, stock_card_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_sku_components_platform ON marketplace_sku_components(platform);
