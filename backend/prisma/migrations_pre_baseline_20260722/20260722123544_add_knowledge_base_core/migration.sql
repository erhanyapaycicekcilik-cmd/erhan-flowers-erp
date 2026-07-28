-- CreateEnum
CREATE TYPE "KnowledgeAliasEntityType" AS ENUM ('PLANT_TYPE', 'POT_PROFILE', 'MATERIAL_RULE');

-- CreateEnum
CREATE TYPE "KnowledgeRecipeComponentType" AS ENUM ('LEAF', 'TRUNK', 'POT', 'SILICONE', 'ELECTRICITY', 'LABOR', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeRuleType" AS ENUM ('PRODUCT_NAME', 'HEIGHT', 'POT', 'MATERIAL', 'RECIPE');

-- CreateTable
CREATE TABLE "knowledge_plant_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "description" TEXT,
    "product_family_id" INTEGER,
    "default_leaf_stock_card_id" INTEGER,
    "default_trunk_stock_card_id" INTEGER,
    "default_recipe_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_plant_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_aliases" (
    "id" SERIAL NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized_alias" TEXT NOT NULL,
    "entity_type" "KnowledgeAliasEntityType" NOT NULL,
    "plant_type_id" INTEGER,
    "pot_profile_id" INTEGER,
    "material_rule_id" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_pot_profiles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "material_type" TEXT,
    "color" TEXT,
    "width" DECIMAL(12,2),
    "depth" DECIMAL(12,2),
    "height" DECIMAL(12,2),
    "diameter" DECIMAL(12,2),
    "stock_card_id" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_pot_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_recipe_profiles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "plant_type_id" INTEGER,
    "product_family_id" INTEGER,
    "min_height_cm" INTEGER,
    "max_height_cm" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_recipe_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_recipe_items" (
    "id" SERIAL NOT NULL,
    "recipe_profile_id" INTEGER NOT NULL,
    "stock_card_id" INTEGER,
    "component_type" "KnowledgeRecipeComponentType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_rules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rule_type" "KnowledgeRuleType" NOT NULL,
    "condition_json" JSONB NOT NULL,
    "action_json" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_analysis_logs" (
    "id" SERIAL NOT NULL,
    "input_text" TEXT NOT NULL,
    "normalized_input" TEXT NOT NULL,
    "detected_plant_type_id" INTEGER,
    "detected_product_family_id" INTEGER,
    "detected_pot_profile_id" INTEGER,
    "detected_height_cm" INTEGER,
    "confidence_score" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "result_json" JSONB,
    "accepted_by_user" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_plant_types_default_recipe_id_key" ON "knowledge_plant_types"("default_recipe_id");

-- CreateIndex
CREATE INDEX "knowledge_plant_types_normalized_name_idx" ON "knowledge_plant_types"("normalized_name");

-- CreateIndex
CREATE INDEX "knowledge_plant_types_is_active_idx" ON "knowledge_plant_types"("is_active");

-- CreateIndex
CREATE INDEX "knowledge_aliases_normalized_alias_idx" ON "knowledge_aliases"("normalized_alias");

-- CreateIndex
CREATE INDEX "knowledge_aliases_entity_type_is_active_idx" ON "knowledge_aliases"("entity_type", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_pot_profiles_normalized_name_idx" ON "knowledge_pot_profiles"("normalized_name");

-- CreateIndex
CREATE INDEX "knowledge_pot_profiles_is_active_idx" ON "knowledge_pot_profiles"("is_active");

-- CreateIndex
CREATE INDEX "knowledge_recipe_profiles_plant_type_id_is_active_idx" ON "knowledge_recipe_profiles"("plant_type_id", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_recipe_profiles_product_family_id_is_active_idx" ON "knowledge_recipe_profiles"("product_family_id", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_recipe_items_recipe_profile_id_sort_order_idx" ON "knowledge_recipe_items"("recipe_profile_id", "sort_order");

-- CreateIndex
CREATE INDEX "knowledge_rules_rule_type_is_active_idx" ON "knowledge_rules"("rule_type", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_analysis_logs_normalized_input_idx" ON "knowledge_analysis_logs"("normalized_input");

-- CreateIndex
CREATE INDEX "knowledge_analysis_logs_created_at_idx" ON "knowledge_analysis_logs"("created_at");

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_product_family_id_fkey" FOREIGN KEY ("product_family_id") REFERENCES "production_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_default_leaf_stock_card_id_fkey" FOREIGN KEY ("default_leaf_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_default_trunk_stock_card_id_fkey" FOREIGN KEY ("default_trunk_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_default_recipe_id_fkey" FOREIGN KEY ("default_recipe_id") REFERENCES "knowledge_recipe_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_aliases" ADD CONSTRAINT "knowledge_aliases_plant_type_id_fkey" FOREIGN KEY ("plant_type_id") REFERENCES "knowledge_plant_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_aliases" ADD CONSTRAINT "knowledge_aliases_pot_profile_id_fkey" FOREIGN KEY ("pot_profile_id") REFERENCES "knowledge_pot_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_aliases" ADD CONSTRAINT "knowledge_aliases_material_rule_id_fkey" FOREIGN KEY ("material_rule_id") REFERENCES "knowledge_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_pot_profiles" ADD CONSTRAINT "knowledge_pot_profiles_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_recipe_profiles" ADD CONSTRAINT "knowledge_recipe_profiles_plant_type_id_fkey" FOREIGN KEY ("plant_type_id") REFERENCES "knowledge_plant_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_recipe_profiles" ADD CONSTRAINT "knowledge_recipe_profiles_product_family_id_fkey" FOREIGN KEY ("product_family_id") REFERENCES "production_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_recipe_items" ADD CONSTRAINT "knowledge_recipe_items_recipe_profile_id_fkey" FOREIGN KEY ("recipe_profile_id") REFERENCES "knowledge_recipe_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_recipe_items" ADD CONSTRAINT "knowledge_recipe_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_detected_plant_type_id_fkey" FOREIGN KEY ("detected_plant_type_id") REFERENCES "knowledge_plant_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_detected_product_family_id_fkey" FOREIGN KEY ("detected_product_family_id") REFERENCES "production_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_detected_pot_profile_id_fkey" FOREIGN KEY ("detected_pot_profile_id") REFERENCES "knowledge_pot_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

