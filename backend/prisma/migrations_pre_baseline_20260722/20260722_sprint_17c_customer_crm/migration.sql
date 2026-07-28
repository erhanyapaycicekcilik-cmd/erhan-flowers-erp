ALTER TABLE "retail_customers"
  ADD COLUMN "whatsapp_phone" TEXT,
  ADD COLUMN "source" "RetailSaleChannel",
  ADD COLUMN "order_communication_allowed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "whatsapp_marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sms_marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email_marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consent_at" TIMESTAMP(3),
  ADD COLUMN "consent_source" TEXT,
  ADD COLUMN "consent_withdrawn_at" TIMESTAMP(3);

CREATE TABLE "retail_customer_tag_definitions" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT DEFAULT '#64748b',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retail_customer_tag_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "retail_customer_tag_definitions_name_key" ON "retail_customer_tag_definitions"("name");

CREATE TABLE "retail_customer_tags" (
  "customer_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retail_customer_tags_pkey" PRIMARY KEY ("customer_id", "tag_id")
);

ALTER TABLE "retail_customer_tags" ADD CONSTRAINT "retail_customer_tags_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retail_customer_tags" ADD CONSTRAINT "retail_customer_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "retail_customer_tag_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "retail_customer_tag_definitions" ("name", "color") VALUES
  ('Mağaza Müşterisi', '#2563eb'),
  ('WhatsApp Müşterisi', '#16a34a'),
  ('Instagram Müşterisi', '#db2777'),
  ('Tekrar Alışveriş', '#7c3aed'),
  ('Kurumsal', '#475569'),
  ('Yüksek Değerli', '#ca8a04'),
  ('Özel Proje', '#ea580c')
ON CONFLICT ("name") DO NOTHING;
