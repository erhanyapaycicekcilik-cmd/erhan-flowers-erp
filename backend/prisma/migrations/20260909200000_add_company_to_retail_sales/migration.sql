-- Add company_id to retail_sales for multi-company support
ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Set existing rows to ERHAN company (will be updated once we have FLORA orders)
UPDATE retail_sales SET company_id = (SELECT id FROM companies WHERE code = 'ERHAN' LIMIT 1)
WHERE company_id IS NULL;

-- Now make it NOT NULL with default from ERHAN
ALTER TABLE retail_sales ALTER COLUMN company_id SET NOT NULL;

-- Add FK constraint
ALTER TABLE retail_sales ADD CONSTRAINT retail_sales_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS retail_sales_company_id_idx ON retail_sales(company_id);
CREATE INDEX IF NOT EXISTS retail_sales_company_created_idx ON retail_sales(company_id, created_at);
