CREATE TABLE "e_invoices" (
    "id" SERIAL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'TRENDYOL_EFATURAM',
    "source_type" TEXT NOT NULL,
    "source_id" INTEGER NOT NULL,
    "source_number" TEXT NOT NULL,
    "customer_name" TEXT,
    "amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "invoice_type" TEXT NOT NULL DEFAULT 'E_ARSIV',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoice_number" TEXT,
    "provider_ref" TEXT,
    "pdf_url" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "e_invoices_source_type_source_id_key" ON "e_invoices"("source_type", "source_id");
CREATE INDEX "e_invoices_status_idx" ON "e_invoices"("status");
CREATE INDEX "e_invoices_created_at_idx" ON "e_invoices"("created_at" DESC);
