CREATE TABLE "bill_accounts" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "due_day" INTEGER NOT NULL,
    "statement_day" INTEGER,
    "estimated_amount" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bill_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bill_payments" (
    "id" SERIAL NOT NULL,
    "bill_account_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3),
    "amount" DECIMAL(12,2),
    "note" TEXT,
    CONSTRAINT "bill_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bill_payments_bill_account_id_year_month_key" ON "bill_payments"("bill_account_id", "year", "month");

ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_bill_account_id_fkey"
    FOREIGN KEY ("bill_account_id") REFERENCES "bill_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
