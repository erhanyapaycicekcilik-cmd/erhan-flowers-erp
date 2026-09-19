ALTER TABLE "product_cost_drafts" ADD COLUMN IF NOT EXISTS "marketplace_sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0;
