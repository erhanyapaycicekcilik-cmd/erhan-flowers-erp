-- Personel maaş ödemeleri (aylık) ve avanslar
CREATE TABLE IF NOT EXISTS "salary_payments" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "amount" DECIMAL(14,2),
  "paid_at" TIMESTAMP(3),
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "salary_payments_emp_month_key" ON "salary_payments"("employee_id", "year", "month");

CREATE TABLE IF NOT EXISTS "salary_advances" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "advance_date" DATE NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "salary_advances_emp_date_idx" ON "salary_advances"("employee_id", "advance_date");
