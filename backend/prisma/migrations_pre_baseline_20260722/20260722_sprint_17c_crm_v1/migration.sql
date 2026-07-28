CREATE TABLE "retail_customer_source_definitions" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retail_customer_source_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "retail_customer_source_definitions_code_key" ON "retail_customer_source_definitions"("code");
CREATE UNIQUE INDEX "retail_customer_source_definitions_name_key" ON "retail_customer_source_definitions"("name");

ALTER TABLE "retail_customers" ADD COLUMN "source_definition_id" INTEGER;
ALTER TABLE "retail_customers" ADD CONSTRAINT "retail_customers_source_definition_id_fkey"
  FOREIGN KEY ("source_definition_id") REFERENCES "retail_customer_source_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "retail_customer_notes" (
  "id" SERIAL NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "note" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retail_customer_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "retail_customer_notes_customer_id_created_at_idx" ON "retail_customer_notes"("customer_id", "created_at");
ALTER TABLE "retail_customer_notes" ADD CONSTRAINT "retail_customer_notes_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "retail_customer_reminders" (
  "id" SERIAL NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "remind_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "completed_at" TIMESTAMP(3),
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retail_customer_reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "retail_customer_reminders_status_remind_at_idx" ON "retail_customer_reminders"("status", "remind_at");
CREATE INDEX "retail_customer_reminders_customer_id_idx" ON "retail_customer_reminders"("customer_id");
ALTER TABLE "retail_customer_reminders" ADD CONSTRAINT "retail_customer_reminders_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "retail_customer_source_definitions" ("code", "name") VALUES
  ('STORE', 'Mağaza'), ('PHONE', 'Telefon'), ('WHATSAPP', 'WhatsApp'), ('INSTAGRAM', 'Instagram'),
  ('WEBSITE', 'Web Sitesi'), ('TRENDYOL', 'Trendyol'), ('OTHER', 'Diğer') ON CONFLICT DO NOTHING;

UPDATE "retail_customers" c SET "source_definition_id" = s.id
FROM "retail_customer_source_definitions" s WHERE s.code = COALESCE(c.source::text, 'STORE');
