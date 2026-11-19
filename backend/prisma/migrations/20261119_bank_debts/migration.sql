-- Banka borçları: kredi kartı / kredi / KMH hesapları ve aylık ekstreler
CREATE TABLE IF NOT EXISTS "bank_debt_accounts" (
  "id" SERIAL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "bank_name" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "account_no" TEXT,
  "credit_limit" DECIMAL(14,2),
  "current_debt" DECIMAL(14,2),
  "current_debt_at" TIMESTAMP(3),
  "statement_day" INTEGER,
  "due_day" INTEGER NOT NULL,
  "monthly_payment" DECIMAL(14,2),
  "end_date" DATE,
  "interest_rate" DECIMAL(6,2),
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bank_statements" (
  "id" SERIAL PRIMARY KEY,
  "account_id" INTEGER NOT NULL REFERENCES "bank_debt_accounts"("id") ON DELETE CASCADE,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "statement_date" DATE,
  "due_date" DATE NOT NULL,
  "total_amount" DECIMAL(14,2) NOT NULL,
  "minimum_payment" DECIMAL(14,2),
  "paid_at" TIMESTAMP(3),
  "paid_amount" DECIMAL(14,2),
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "source_ref" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "bank_statements_account_id_year_month_key" ON "bank_statements"("account_id", "year", "month");
CREATE INDEX IF NOT EXISTS "bank_statements_due_date_idx" ON "bank_statements"("due_date");
