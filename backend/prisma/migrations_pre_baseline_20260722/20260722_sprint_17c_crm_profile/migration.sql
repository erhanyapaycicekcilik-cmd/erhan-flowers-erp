ALTER TABLE "retail_customers"
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "instagram" TEXT,
  ADD COLUMN "rating" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "risk_status" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "last_contact_at" TIMESTAMP(3);

ALTER TABLE "retail_customers" ADD CONSTRAINT "retail_customers_rating_check" CHECK ("rating" BETWEEN 0 AND 5);

CREATE TABLE "retail_customer_files" (
  "id" SERIAL NOT NULL,
  "customer_id" INTEGER NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "retail_customer_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "retail_customer_files_customer_id_created_at_idx" ON "retail_customer_files"("customer_id", "created_at");
ALTER TABLE "retail_customer_files" ADD CONSTRAINT "retail_customer_files_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "retail_customer_source_definitions" ("code", "name") VALUES
  ('FACEBOOK', 'Facebook'), ('GOOGLE', 'Google'), ('HEPSIBURADA', 'Hepsiburada'),
  ('N11', 'N11'), ('AMAZON', 'Amazon') ON CONFLICT DO NOTHING;

INSERT INTO "retail_customer_tag_definitions" ("name", "color") VALUES
  ('VIP', '#ca8a04'), ('Instagram', '#db2777'), ('Google', '#2563eb'), ('WhatsApp', '#16a34a'),
  ('Mimar', '#7c3aed'), ('Peyzaj', '#15803d'), ('Mağaza', '#475569') ON CONFLICT DO NOTHING;
