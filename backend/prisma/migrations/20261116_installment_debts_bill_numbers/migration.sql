-- Fatura hesaplarına abone/tesisat numarası
ALTER TABLE "bill_accounts" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "bill_accounts" ADD COLUMN IF NOT EXISTS "subscriber_no" TEXT;
ALTER TABLE "bill_accounts" ADD COLUMN IF NOT EXISTS "email_sender" TEXT;

-- Aylık fatura kaydına fatura no / son ödeme tarihi / kaynak
ALTER TABLE "bill_payments" ADD COLUMN IF NOT EXISTS "invoice_no" TEXT;
ALTER TABLE "bill_payments" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);
ALTER TABLE "bill_payments" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "bill_payments" ADD COLUMN IF NOT EXISTS "email_message_id" TEXT;

-- Taksitli borçlar
CREATE TABLE "installment_debts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "creditor" TEXT,
    "supplier_id" INTEGER,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "document_no" TEXT,
    "notes" TEXT,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "installment_debts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "debt_installments" (
    "id" SERIAL NOT NULL,
    "installment_debt_id" INTEGER NOT NULL,
    "no" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "paid_amount" DECIMAL(14,2),
    "note" TEXT,
    CONSTRAINT "debt_installments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "debt_installments_installment_debt_id_no_key" ON "debt_installments"("installment_debt_id", "no");
CREATE INDEX "debt_installments_due_date_idx" ON "debt_installments"("due_date");

ALTER TABLE "installment_debts" ADD CONSTRAINT "installment_debts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "debt_installments" ADD CONSTRAINT "debt_installments_installment_debt_id_fkey" FOREIGN KEY ("installment_debt_id") REFERENCES "installment_debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
