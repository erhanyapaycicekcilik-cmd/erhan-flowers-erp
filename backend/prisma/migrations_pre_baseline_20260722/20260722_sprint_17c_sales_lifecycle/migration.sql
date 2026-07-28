DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RetailInvoiceStatus') THEN
    CREATE TYPE "RetailInvoiceStatus" AS ENUM ('WAITING', 'E_ARCHIVE', 'E_INVOICE', 'ISSUED', 'CANCELLED', 'RETURNED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RetailSaleStatus' AND e.enumlabel = 'PAYMENT_PENDING'
  ) THEN
    ALTER TYPE "RetailSaleStatus" ADD VALUE 'PAYMENT_PENDING' AFTER 'DRAFT';
  END IF;
END $$;

ALTER TABLE "retail_customers"
  ADD COLUMN IF NOT EXISTS "customer_type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS "company_title" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_office" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_number" TEXT,
  ADD COLUMN IF NOT EXISTS "national_id" TEXT,
  ADD COLUMN IF NOT EXISTS "is_e_invoice_payer" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "current_account_code" TEXT;

ALTER TABLE "retail_sales"
  ADD COLUMN IF NOT EXISTS "invoice_status" "RetailInvoiceStatus" NOT NULL DEFAULT 'WAITING',
  ADD COLUMN IF NOT EXISTS "invoice_note" TEXT;

CREATE TABLE IF NOT EXISTS "retail_sale_status_history" (
  "id" SERIAL PRIMARY KEY,
  "sale_id" INTEGER NOT NULL REFERENCES "retail_sales"("id") ON DELETE CASCADE,
  "old_status" "RetailSaleStatus",
  "new_status" "RetailSaleStatus" NOT NULL,
  "note" TEXT,
  "changed_by_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "retail_sale_status_history_sale_id_idx" ON "retail_sale_status_history"("sale_id");
