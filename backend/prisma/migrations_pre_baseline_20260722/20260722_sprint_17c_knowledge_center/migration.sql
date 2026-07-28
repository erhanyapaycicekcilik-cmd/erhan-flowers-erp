ALTER TABLE "knowledge_rules"
  ADD COLUMN "rule_kind" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "plant_type_id" INTEGER,
  ADD COLUMN "height_cm" INTEGER,
  ADD COLUMN "stock_card_id" INTEGER,
  ADD COLUMN "quantity" DECIMAL(12,3),
  ADD COLUMN "unit" TEXT,
  ADD COLUMN "amount_tl" DECIMAL(14,2);

ALTER TABLE "knowledge_plant_types"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "default_pot_stock_card_id" INTEGER;

CREATE UNIQUE INDEX "knowledge_plant_types_code_key" ON "knowledge_plant_types"("code");

ALTER TABLE "knowledge_plant_types"
  ADD CONSTRAINT "knowledge_plant_types_default_pot_stock_card_id_fkey"
  FOREIGN KEY ("default_pot_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_rules"
  ADD CONSTRAINT "knowledge_rules_plant_type_id_fkey"
  FOREIGN KEY ("plant_type_id") REFERENCES "knowledge_plant_types"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "knowledge_rules_stock_card_id_fkey"
  FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "knowledge_rules_rule_kind_plant_type_id_height_cm_is_active_idx"
  ON "knowledge_rules"("rule_kind", "plant_type_id", "height_cm", "is_active");

ALTER TABLE "knowledge_analysis_logs"
  ADD COLUMN "decision_status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  ADD COLUMN "matched_recipe_id" INTEGER,
  ADD COLUMN "applied_automatically" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "knowledge_feedbacks" (
  "id" SERIAL NOT NULL,
  "analysis_log_id" INTEGER NOT NULL,
  "field_name" TEXT NOT NULL,
  "detected_value" JSONB,
  "corrected_value" JSONB NOT NULL,
  "note" TEXT,
  "promoted_rule_id" INTEGER,
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_feedbacks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "knowledge_feedbacks"
  ADD CONSTRAINT "knowledge_feedbacks_analysis_log_id_fkey"
  FOREIGN KEY ("analysis_log_id") REFERENCES "knowledge_analysis_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "knowledge_feedbacks_promoted_rule_id_fkey"
  FOREIGN KEY ("promoted_rule_id") REFERENCES "knowledge_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "knowledge_feedbacks_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "knowledge_feedbacks_analysis_log_id_created_at_idx"
  ON "knowledge_feedbacks"("analysis_log_id", "created_at");

CREATE INDEX "knowledge_feedbacks_field_name_created_at_idx"
  ON "knowledge_feedbacks"("field_name", "created_at");
