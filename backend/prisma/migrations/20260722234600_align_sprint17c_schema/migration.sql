-- Align databases that received the Sprint 17C SQL files before the
-- reconstructed baseline with the current Prisma relation/default metadata.

ALTER TABLE "retail_sale_status_history"
  DROP CONSTRAINT IF EXISTS "retail_sale_status_history_changed_by_id_fkey";

ALTER TABLE "retail_sale_status_history"
  DROP CONSTRAINT IF EXISTS "retail_sale_status_history_sale_id_fkey";

ALTER TABLE "retail_customer_reminders"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "retail_customer_source_definitions"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "retail_customer_tag_definitions"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "retail_sale_status_history"
  ADD CONSTRAINT "retail_sale_status_history_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "retail_sale_status_history"
  ADD CONSTRAINT "retail_sale_status_history_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
