-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'PASSIVE');

-- CreateEnum
CREATE TYPE "RecipeCostType" AS ENUM ('LABOR', 'ELECTRICITY', 'SILICONE', 'PACKAGING', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductionCostGroup" AS ENUM ('LEAF', 'TRUNK', 'POT', 'CONSUMABLE', 'LABOR', 'ELECTRICITY', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "TemplateComponentScope" AS ENUM ('COMMON', 'SIZE_VARIANT', 'POT_VARIANT');

-- CreateEnum
CREATE TYPE "FinanceDirection" AS ENUM ('IN', 'OUT', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'DEBT', 'RECEIVABLE', 'PAYMENT', 'COLLECTION', 'TRANSFER', 'MARKETPLACE_SETTLEMENT', 'SALARY', 'REGULAR_PAYMENT');

-- CreateEnum
CREATE TYPE "FinanceCategoryKind" AS ENUM ('INCOME', 'EXPENSE', 'BOTH');

-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('BANK', 'CASH', 'CREDIT_CARD', 'MARKETPLACE_RECEIVABLE');

-- CreateEnum
CREATE TYPE "FinancePaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceRecordStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "FinanceRecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BambuLeafRoundingMode" AS ENUM ('DOWN', 'UP', 'NEAREST');

-- CreateEnum
CREATE TYPE "StockUsageEventType" AS ENUM ('PRODUCTION_COMPLETED', 'ORDER_SHIPPED');

-- CreateEnum
CREATE TYPE "ProductCostItemGroup" AS ENUM ('LEAF_TRUNK', 'POT', 'CONSUMABLE', 'LABOR', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductCostSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProductCostStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublishingActionType" AS ENUM ('PREVIEW', 'TEST_UPDATE', 'LIVE_SEND');

-- CreateEnum
CREATE TYPE "PublishingStatus" AS ENUM ('PENDING', 'READY', 'SUCCESS', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "RetailSaleChannel" AS ENUM ('STORE', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'TRENDYOL', 'OTHER');

-- CreateEnum
CREATE TYPE "RetailSaleType" AS ENUM ('STORE_SALE', 'DELIVERY_SALE', 'CUSTOM_PRODUCTION');

-- CreateEnum
CREATE TYPE "RetailSaleStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'IN_PRODUCTION', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RetailInvoiceStatus" AS ENUM ('WAITING', 'E_ARCHIVE', 'E_INVOICE', 'ISSUED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "StockFulfillmentType" AS ENUM ('READY_STOCK', 'CUSTOM_PRODUCTION', 'NON_STOCK_SERVICE');

-- CreateEnum
CREATE TYPE "RetailPaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'ON_ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "RetailDeliveryType" AS ENUM ('STORE_PICKUP', 'OWN_VEHICLE', 'CARGO', 'COURIER');

-- CreateEnum
CREATE TYPE "RetailDeliveryStatus" AS ENUM ('NOT_REQUIRED', 'WAITING', 'PLANNED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RetailPrintType" AS ENUM ('ADDRESS_LABEL_10X15', 'DELIVERY_FORM_A5', 'ORDER_FORM_A4');

-- CreateEnum
CREATE TYPE "KnowledgeAliasEntityType" AS ENUM ('PLANT_TYPE', 'POT_PROFILE', 'MATERIAL_RULE');

-- CreateEnum
CREATE TYPE "KnowledgeRecipeComponentType" AS ENUM ('LEAF', 'TRUNK', 'POT', 'SILICONE', 'ELECTRICITY', 'LABOR', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeRuleType" AS ENUM ('PRODUCT_NAME', 'HEIGHT', 'POT', 'MATERIAL', 'RECIPE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "remember_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code_prefix" TEXT NOT NULL,
    "start_code" INTEGER NOT NULL,
    "current_code" INTEGER NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "product_name" TEXT NOT NULL,
    "model_code" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "barcode" TEXT,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "critical_stock_level" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_cards" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "color" TEXT,
    "model" TEXT,
    "size" TEXT,
    "product_family" TEXT,
    "product_type" TEXT,
    "height" TEXT,
    "width" TEXT,
    "pot_type" TEXT,
    "pot_color" TEXT,
    "pot_size" TEXT,
    "trunk_type" TEXT,
    "leaf_flower_type" TEXT,
    "brand" TEXT,
    "old_model_code" TEXT,
    "barcode" TEXT,
    "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "warehouse" TEXT,
    "shelf_location" TEXT,
    "short_description" TEXT,
    "technical_specs" TEXT,
    "seo_title" TEXT,
    "meta_description" TEXT,
    "image_path" TEXT,
    "description" TEXT,
    "critical_stock_level" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "supplier_name" TEXT,
    "last_movement_at" TIMESTAMP(3),
    "purchase_unit" TEXT NOT NULL DEFAULT 'Adet',
    "purchase_quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL,
    "package_content" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "purchase_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "manual_unit_cost_enabled" BOOLEAN NOT NULL DEFAULT false,
    "manual_unit_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "automatic_unit_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "stock_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_card_images" (
    "id" SERIAL NOT NULL,
    "stock_card_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "folder_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_card_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "stock_card_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "previous_stock" DECIMAL(12,3) NOT NULL,
    "next_stock" DECIMAL(12,3) NOT NULL,
    "reason" TEXT,
    "supplier_name" TEXT,
    "document_no" TEXT,
    "payment_status" TEXT,
    "note" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "event_key" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_family_masters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "family_code" TEXT,
    "description" TEXT,
    "default_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "default_size_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "default_pot_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_family_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_families" (
    "id" SERIAL NOT NULL,
    "master_id" INTEGER,
    "family_name" TEXT NOT NULL,
    "family_code" TEXT,
    "category_id" INTEGER,
    "main_model_code" TEXT,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_matching_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_plant_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "normalized_name" TEXT NOT NULL,
    "description" TEXT,
    "product_family_id" INTEGER,
    "default_leaf_stock_card_id" INTEGER,
    "default_trunk_stock_card_id" INTEGER,
    "default_pot_stock_card_id" INTEGER,
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
    "rule_kind" TEXT NOT NULL DEFAULT 'GENERAL',
    "plant_type_id" INTEGER,
    "height_cm" INTEGER,
    "stock_card_id" INTEGER,
    "quantity" DECIMAL(12,3),
    "unit" TEXT,
    "amount_tl" DECIMAL(14,2),
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
    "decision_status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "matched_recipe_id" INTEGER,
    "applied_automatically" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_analysis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "production_size_options" (
    "id" SERIAL NOT NULL,
    "family_id" INTEGER NOT NULL,
    "size_label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "production_size_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_pot_options" (
    "id" SERIAL NOT NULL,
    "family_id" INTEGER NOT NULL,
    "pot_name" TEXT NOT NULL,
    "stock_card_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "production_pot_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_recipe_templates" (
    "id" SERIAL NOT NULL,
    "family_id" INTEGER NOT NULL,
    "template_name" TEXT NOT NULL,
    "description" TEXT,
    "vat_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "default_commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_recipe_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_template_components" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "stock_card_id" INTEGER,
    "component_name" TEXT NOT NULL,
    "cost_group" "ProductionCostGroup" NOT NULL,
    "scope" "TemplateComponentScope" NOT NULL DEFAULT 'COMMON',
    "size_label" TEXT,
    "pot_name" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "manual_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_template_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trendyol_product_variants" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "current_model_code" TEXT,
    "supplier_stock_code" TEXT,
    "brand" TEXT,
    "trendyol_category_name" TEXT,
    "product_color" TEXT,
    "product_description" TEXT,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "trendyol_product_url" TEXT,
    "images" JSONB,
    "suggested_family_name" TEXT,
    "detected_size" TEXT,
    "detected_pot" TEXT,
    "proposed_model_code" TEXT,
    "seo_product_name" TEXT,
    "seo_manual_product_name" TEXT,
    "seo_distinctive_feature" TEXT,
    "seo_market_title" TEXT,
    "seo_web_title" TEXT,
    "seo_short_description" TEXT,
    "seo_long_description" TEXT,
    "seo_meta_title" TEXT,
    "seo_meta_description" TEXT,
    "seo_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_image_alt_text" TEXT,
    "seo_properties" JSONB,
    "seo_image_history" JSONB,
    "seo_change_history" JSONB,
    "seo_approval_status" TEXT NOT NULL DEFAULT 'Eksik Bilgi',
    "seo_approved_at" TIMESTAMP(3),
    "recipe_status" TEXT NOT NULL DEFAULT 'Eşleşmedi',
    "cost_status" TEXT NOT NULL DEFAULT 'Bekliyor',
    "import_source" TEXT,
    "imported_at" TIMESTAMP(3),
    "family_id" INTEGER,
    "size_option_id" INTEGER,
    "pot_option_id" INTEGER,
    "template_id" INTEGER,
    "trendyol_sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trendyol_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_drafts" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 45,
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "vat_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desi" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "marketplace_markup_percent" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "campaign_buffer_percent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ProductCostStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_items" (
    "id" SERIAL NOT NULL,
    "draft_id" INTEGER NOT NULL,
    "stock_card_id" INTEGER,
    "name" TEXT NOT NULL,
    "group" "ProductCostItemGroup" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "source" "ProductCostSource" NOT NULL DEFAULT 'AUTO',
    "manual_unit_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default_expense" BOOLEAN NOT NULL DEFAULT false,
    "default_expense_key" TEXT,
    "default_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_product_expenses" (
    "id" SERIAL NOT NULL,
    "expense_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "apply_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclude_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_product_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_product_expense_history" (
    "id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "old_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "new_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "changed_by_user_id" INTEGER,
    "affected_draft_count" INTEGER NOT NULL DEFAULT 0,
    "change_scope" TEXT NOT NULL DEFAULT 'future_only',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "default_product_expense_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pot_items" (
    "id" SERIAL NOT NULL,
    "draft_id" INTEGER NOT NULL,
    "stock_card_id" INTEGER,
    "name" TEXT NOT NULL,
    "pot_type" TEXT,
    "color" TEXT,
    "width" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "length" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "height" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diameter" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "source" "ProductCostSource" NOT NULL DEFAULT 'AUTO',
    "manual_unit_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_logs" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "action_type" "PublishingActionType" NOT NULL,
    "status" "PublishingStatus" NOT NULL DEFAULT 'PENDING',
    "missing_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "request_payload" JSONB,
    "response_body" JSONB,
    "error_message" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publishing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_cost_history" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "total_production_cost" DECIMAL(12,2) NOT NULL,
    "trendyol_commission" DECIMAL(12,2) NOT NULL,
    "vat_amount" DECIMAL(12,2) NOT NULL,
    "estimated_net_profit" DECIMAL(12,2) NOT NULL,
    "profit_rate" DECIMAL(7,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_cost_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipes" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "shop_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "site_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 45,
    "marketplace_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 65,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "stock_card_id" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_extra_costs" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "type" "RecipeCostType" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_extra_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "folder_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_logs" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "pdf_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customers" (
    "id" SERIAL NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "display_name" TEXT NOT NULL,
    "company_title" TEXT,
    "tax_office" TEXT,
    "tax_number" TEXT,
    "national_id" TEXT,
    "is_e_invoice_payer" BOOLEAN NOT NULL DEFAULT false,
    "current_account_code" TEXT,
    "phone" TEXT,
    "normalized_phone" TEXT,
    "secondary_phone" TEXT,
    "whatsapp_phone" TEXT,
    "email" TEXT,
    "customer_note" TEXT,
    "birth_date" DATE,
    "website" TEXT,
    "instagram" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "risk_status" TEXT NOT NULL DEFAULT 'NORMAL',
    "last_contact_at" TIMESTAMP(3),
    "source" "RetailSaleChannel",
    "order_communication_allowed" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
    "sms_marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
    "email_marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
    "consent_at" TIMESTAMP(3),
    "consent_source" TEXT,
    "consent_withdrawn_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "source_definition_id" INTEGER,

    CONSTRAINT "retail_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "retail_customer_notes" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_customer_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_source_definitions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_customer_source_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_tag_definitions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#64748b',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_customer_tag_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_tags" (
    "customer_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_customer_tags_pkey" PRIMARY KEY ("customer_id","tag_id")
);

-- CreateTable
CREATE TABLE "retail_customer_addresses" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT,
    "city" TEXT,
    "district" TEXT,
    "neighborhood" TEXT,
    "postal_code" TEXT,
    "full_address" TEXT NOT NULL,
    "location_description" TEXT,
    "delivery_note" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER NOT NULL,

    CONSTRAINT "retail_customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_sales" (
    "id" SERIAL NOT NULL,
    "sale_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "address_id" INTEGER,
    "channel" "RetailSaleChannel" NOT NULL DEFAULT 'STORE',
    "sale_type" "RetailSaleType" NOT NULL DEFAULT 'STORE_SALE',
    "status" "RetailSaleStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customer_note" TEXT,
    "internal_note" TEXT,
    "event_key" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "completed_by_id" INTEGER,
    "cancelled_by_id" INTEGER,
    "invoice_status" "RetailInvoiceStatus" NOT NULL DEFAULT 'WAITING',
    "invoice_note" TEXT,

    CONSTRAINT "retail_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_sale_status_history" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "old_status" "RetailSaleStatus",
    "new_status" "RetailSaleStatus" NOT NULL,
    "note" TEXT,
    "changed_by_id" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_sale_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_sale_items" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "stock_card_id" INTEGER,
    "barcode" TEXT,
    "model_code" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "unit_cost_snapshot" DECIMAL(14,4),
    "stock_fulfillment_type" "StockFulfillmentType" NOT NULL DEFAULT 'READY_STOCK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_sale_payments" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "method" "RetailPaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "account_id" INTEGER,
    "finance_transaction_id" INTEGER,
    "event_key" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER NOT NULL,

    CONSTRAINT "retail_sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_deliveries" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "address_id" INTEGER,
    "delivery_type" "RetailDeliveryType" NOT NULL DEFAULT 'STORE_PICKUP',
    "status" "RetailDeliveryStatus" NOT NULL DEFAULT 'WAITING',
    "planned_date" TIMESTAMP(3),
    "planned_time" TEXT,
    "assigned_user_id" INTEGER,
    "delivery_note" TEXT,
    "delivered_at" TIMESTAMP(3),
    "delivered_by_id" INTEGER,
    "event_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_print_logs" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "print_type" "RetailPrintType" NOT NULL,
    "printed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed_by_id" INTEGER NOT NULL,

    CONSTRAINT "retail_print_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_accounts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceAccountType" NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FinanceCategoryKind" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_sales_channels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_sales_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" SERIAL NOT NULL,
    "transaction_type" "FinanceTransactionType" NOT NULL,
    "direction" "FinanceDirection" NOT NULL,
    "category_id" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "account_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "linked_record_type" TEXT,
    "linked_record_id" TEXT,
    "external_key" TEXT,
    "recorded_by_user_id" INTEGER NOT NULL,
    "status" "FinanceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancel_reason" TEXT,
    "correction_of_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_debts" (
    "id" SERIAL NOT NULL,
    "debt_type" "FinanceTransactionType" NOT NULL,
    "title" TEXT NOT NULL,
    "party_name" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "remaining_amount" DECIMAL(14,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "account_id" INTEGER,
    "linked_record_type" TEXT,
    "linked_record_id" TEXT,
    "status" "FinancePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_marketplace_daily_records" (
    "id" SERIAL NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "gross_sales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cancellation_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "return_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cargo_deduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "advertising_deduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_deduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_settlement" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expected_payment_date" TIMESTAMP(3),
    "actual_payment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payment_status" "FinancePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "account_id" INTEGER,
    "transaction_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_marketplace_daily_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_recurring_payments" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "account_id" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "FinanceRecurringFrequency" NOT NULL,
    "next_due_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_recurring_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_salary_records" (
    "id" SERIAL NOT NULL,
    "staff_id" TEXT,
    "staff_name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "net_salary" DECIMAL(14,2) NOT NULL,
    "advance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(14,2) NOT NULL,
    "payment_date" TIMESTAMP(3),
    "account_id" INTEGER,
    "status" "FinancePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" INTEGER,
    "recorded_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_audit_logs" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bambu_cost_rules" (
    "id" SERIAL NOT NULL,
    "family_id" INTEGER NOT NULL,
    "leaf_stock_card_id" INTEGER,
    "trunk_stock_card_id" INTEGER,
    "leaves_per_step" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "leaf_step_cm" DECIMAL(12,3) NOT NULL DEFAULT 10,
    "rounding_mode" "BambuLeafRoundingMode" NOT NULL DEFAULT 'NEAREST',
    "trunk_length_cm" DECIMAL(12,3) NOT NULL DEFAULT 220,
    "silicone_gr" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "labor_amount" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "overhead_amount" DECIMAL(12,2) NOT NULL DEFAULT 5,
    "electricity_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "packaging_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bambu_cost_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bambu_cost_exceptions" (
    "id" SERIAL NOT NULL,
    "rule_id" INTEGER NOT NULL,
    "size_cm" INTEGER NOT NULL,
    "leaf_count" DECIMAL(12,3),
    "silicone_gr" DECIMAL(12,3),
    "labor_amount" DECIMAL(12,2),
    "overhead_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bambu_cost_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_usage_logs" (
    "id" SERIAL NOT NULL,
    "stock_card_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "event_type" "StockUsageEventType" NOT NULL,
    "event_key" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "previous_stock" DECIMAL(12,3) NOT NULL,
    "next_stock" DECIMAL(12,3) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_sessions" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" INTEGER NOT NULL,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "stock_card_id" INTEGER NOT NULL,
    "snapshot_quantity" DECIMAL(12,3) NOT NULL,
    "counted_quantity" DECIMAL(12,3),
    "difference" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_model_code_key" ON "products"("model_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "stock_cards_sku_key" ON "stock_cards"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_event_key_key" ON "stock_movements"("event_key");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_family_masters_family_code_key" ON "product_family_masters"("family_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_family_masters_category_name_name_key" ON "product_family_masters"("category_name", "name");

-- CreateIndex
CREATE UNIQUE INDEX "production_families_family_name_key" ON "production_families"("family_name");

-- CreateIndex
CREATE UNIQUE INDEX "production_families_family_code_key" ON "production_families"("family_code");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_plant_types_code_key" ON "knowledge_plant_types"("code");

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
CREATE INDEX "knowledge_rules_rule_kind_plant_type_id_height_cm_is_active_idx" ON "knowledge_rules"("rule_kind", "plant_type_id", "height_cm", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_analysis_logs_normalized_input_idx" ON "knowledge_analysis_logs"("normalized_input");

-- CreateIndex
CREATE INDEX "knowledge_analysis_logs_created_at_idx" ON "knowledge_analysis_logs"("created_at");

-- CreateIndex
CREATE INDEX "knowledge_feedbacks_analysis_log_id_created_at_idx" ON "knowledge_feedbacks"("analysis_log_id", "created_at");

-- CreateIndex
CREATE INDEX "knowledge_feedbacks_field_name_created_at_idx" ON "knowledge_feedbacks"("field_name", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "production_size_options_family_id_size_label_key" ON "production_size_options"("family_id", "size_label");

-- CreateIndex
CREATE UNIQUE INDEX "production_pot_options_family_id_pot_name_key" ON "production_pot_options"("family_id", "pot_name");

-- CreateIndex
CREATE UNIQUE INDEX "trendyol_product_variants_barcode_key" ON "trendyol_product_variants"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_cost_drafts_variant_id_key" ON "product_cost_drafts"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "default_product_expenses_expense_key_key" ON "default_product_expenses"("expense_key");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipes_product_id_key" ON "product_recipes"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customers_customer_code_key" ON "retail_customers"("customer_code");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customers_normalized_phone_key" ON "retail_customers"("normalized_phone");

-- CreateIndex
CREATE INDEX "retail_customers_display_name_idx" ON "retail_customers"("display_name");

-- CreateIndex
CREATE INDEX "retail_customer_files_customer_id_created_at_idx" ON "retail_customer_files"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "retail_customer_notes_customer_id_created_at_idx" ON "retail_customer_notes"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "retail_customer_reminders_status_remind_at_idx" ON "retail_customer_reminders"("status", "remind_at");

-- CreateIndex
CREATE INDEX "retail_customer_reminders_customer_id_idx" ON "retail_customer_reminders"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customer_source_definitions_code_key" ON "retail_customer_source_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customer_source_definitions_name_key" ON "retail_customer_source_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customer_tag_definitions_name_key" ON "retail_customer_tag_definitions"("name");

-- CreateIndex
CREATE INDEX "retail_customer_addresses_customer_id_idx" ON "retail_customer_addresses"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_sales_sale_number_key" ON "retail_sales"("sale_number");

-- CreateIndex
CREATE UNIQUE INDEX "retail_sales_event_key_key" ON "retail_sales"("event_key");

-- CreateIndex
CREATE INDEX "retail_sales_created_at_idx" ON "retail_sales"("created_at");

-- CreateIndex
CREATE INDEX "retail_sales_customer_id_idx" ON "retail_sales"("customer_id");

-- CreateIndex
CREATE INDEX "retail_sale_status_history_sale_id_idx" ON "retail_sale_status_history"("sale_id");

-- CreateIndex
CREATE INDEX "retail_sale_items_sale_id_idx" ON "retail_sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "retail_sale_items_variant_id_idx" ON "retail_sale_items"("variant_id");

-- CreateIndex
CREATE INDEX "retail_sale_items_stock_card_id_idx" ON "retail_sale_items"("stock_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_sale_payments_event_key_key" ON "retail_sale_payments"("event_key");

-- CreateIndex
CREATE INDEX "retail_sale_payments_sale_id_idx" ON "retail_sale_payments"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_deliveries_sale_id_key" ON "retail_deliveries"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_deliveries_event_key_key" ON "retail_deliveries"("event_key");

-- CreateIndex
CREATE INDEX "retail_print_logs_sale_id_idx" ON "retail_print_logs"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_accounts_name_key" ON "finance_accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "finance_categories_name_kind_key" ON "finance_categories"("name", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "finance_sales_channels_name_key" ON "finance_sales_channels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transactions_external_key_key" ON "finance_transactions"("external_key");

-- CreateIndex
CREATE INDEX "finance_transactions_transaction_date_idx" ON "finance_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "finance_transactions_linked_record_type_linked_record_id_idx" ON "finance_transactions"("linked_record_type", "linked_record_id");

-- CreateIndex
CREATE INDEX "finance_debts_due_date_idx" ON "finance_debts"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "finance_marketplace_daily_records_channel_id_record_date_key" ON "finance_marketplace_daily_records"("channel_id", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "finance_salary_records_staff_name_period_key" ON "finance_salary_records"("staff_name", "period");

-- CreateIndex
CREATE UNIQUE INDEX "bambu_cost_rules_family_id_key" ON "bambu_cost_rules"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "bambu_cost_exceptions_rule_id_size_cm_key" ON "bambu_cost_exceptions"("rule_id", "size_cm");

-- CreateIndex
CREATE UNIQUE INDEX "stock_usage_logs_event_key_key" ON "stock_usage_logs"("event_key");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_items_session_id_stock_card_id_key" ON "stock_count_items"("session_id", "stock_card_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_card_images" ADD CONSTRAINT "stock_card_images_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_families" ADD CONSTRAINT "production_families_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "product_family_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_families" ADD CONSTRAINT "production_families_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_product_family_id_fkey" FOREIGN KEY ("product_family_id") REFERENCES "production_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_default_leaf_stock_card_id_fkey" FOREIGN KEY ("default_leaf_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_default_trunk_stock_card_id_fkey" FOREIGN KEY ("default_trunk_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plant_types" ADD CONSTRAINT "knowledge_plant_types_default_pot_stock_card_id_fkey" FOREIGN KEY ("default_pot_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "knowledge_rules" ADD CONSTRAINT "knowledge_rules_plant_type_id_fkey" FOREIGN KEY ("plant_type_id") REFERENCES "knowledge_plant_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_rules" ADD CONSTRAINT "knowledge_rules_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_detected_plant_type_id_fkey" FOREIGN KEY ("detected_plant_type_id") REFERENCES "knowledge_plant_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_detected_product_family_id_fkey" FOREIGN KEY ("detected_product_family_id") REFERENCES "production_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_detected_pot_profile_id_fkey" FOREIGN KEY ("detected_pot_profile_id") REFERENCES "knowledge_pot_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_analysis_logs" ADD CONSTRAINT "knowledge_analysis_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_feedbacks" ADD CONSTRAINT "knowledge_feedbacks_analysis_log_id_fkey" FOREIGN KEY ("analysis_log_id") REFERENCES "knowledge_analysis_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_feedbacks" ADD CONSTRAINT "knowledge_feedbacks_promoted_rule_id_fkey" FOREIGN KEY ("promoted_rule_id") REFERENCES "knowledge_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_feedbacks" ADD CONSTRAINT "knowledge_feedbacks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_size_options" ADD CONSTRAINT "production_size_options_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "production_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_pot_options" ADD CONSTRAINT "production_pot_options_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "production_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_pot_options" ADD CONSTRAINT "production_pot_options_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_recipe_templates" ADD CONSTRAINT "production_recipe_templates_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "production_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_template_components" ADD CONSTRAINT "production_template_components_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "production_recipe_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_template_components" ADD CONSTRAINT "production_template_components_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_product_variants" ADD CONSTRAINT "trendyol_product_variants_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "production_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_product_variants" ADD CONSTRAINT "trendyol_product_variants_size_option_id_fkey" FOREIGN KEY ("size_option_id") REFERENCES "production_size_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_product_variants" ADD CONSTRAINT "trendyol_product_variants_pot_option_id_fkey" FOREIGN KEY ("pot_option_id") REFERENCES "production_pot_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_product_variants" ADD CONSTRAINT "trendyol_product_variants_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "production_recipe_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_drafts" ADD CONSTRAINT "product_cost_drafts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "trendyol_product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_items" ADD CONSTRAINT "product_cost_items_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "product_cost_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_items" ADD CONSTRAINT "product_cost_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_product_expense_history" ADD CONSTRAINT "default_product_expense_history_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "default_product_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pot_items" ADD CONSTRAINT "product_pot_items_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "product_cost_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pot_items" ADD CONSTRAINT "product_pot_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_logs" ADD CONSTRAINT "publishing_logs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "trendyol_product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_logs" ADD CONSTRAINT "publishing_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_cost_history" ADD CONSTRAINT "production_cost_history_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "trendyol_product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "product_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_extra_costs" ADD CONSTRAINT "recipe_extra_costs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "product_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_logs" ADD CONSTRAINT "barcode_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customers" ADD CONSTRAINT "retail_customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customers" ADD CONSTRAINT "retail_customers_source_definition_id_fkey" FOREIGN KEY ("source_definition_id") REFERENCES "retail_customer_source_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_files" ADD CONSTRAINT "retail_customer_files_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_notes" ADD CONSTRAINT "retail_customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_reminders" ADD CONSTRAINT "retail_customer_reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_tags" ADD CONSTRAINT "retail_customer_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_tags" ADD CONSTRAINT "retail_customer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "retail_customer_tag_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_addresses" ADD CONSTRAINT "retail_customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_addresses" ADD CONSTRAINT "retail_customer_addresses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "retail_customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sales" ADD CONSTRAINT "retail_sales_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_status_history" ADD CONSTRAINT "retail_sale_status_history_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_status_history" ADD CONSTRAINT "retail_sale_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_items" ADD CONSTRAINT "retail_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_items" ADD CONSTRAINT "retail_sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "trendyol_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_items" ADD CONSTRAINT "retail_sale_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_payments" ADD CONSTRAINT "retail_sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_payments" ADD CONSTRAINT "retail_sale_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_payments" ADD CONSTRAINT "retail_sale_payments_finance_transaction_id_fkey" FOREIGN KEY ("finance_transaction_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_sale_payments" ADD CONSTRAINT "retail_sale_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_deliveries" ADD CONSTRAINT "retail_deliveries_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_deliveries" ADD CONSTRAINT "retail_deliveries_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "retail_customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_deliveries" ADD CONSTRAINT "retail_deliveries_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_deliveries" ADD CONSTRAINT "retail_deliveries_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_print_logs" ADD CONSTRAINT "retail_print_logs_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "retail_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_print_logs" ADD CONSTRAINT "retail_print_logs_printed_by_id_fkey" FOREIGN KEY ("printed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_correction_of_id_fkey" FOREIGN KEY ("correction_of_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_debts" ADD CONSTRAINT "finance_debts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_debts" ADD CONSTRAINT "finance_debts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_marketplace_daily_records" ADD CONSTRAINT "finance_marketplace_daily_records_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "finance_sales_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_marketplace_daily_records" ADD CONSTRAINT "finance_marketplace_daily_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_recurring_payments" ADD CONSTRAINT "finance_recurring_payments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_recurring_payments" ADD CONSTRAINT "finance_recurring_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_salary_records" ADD CONSTRAINT "finance_salary_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_salary_records" ADD CONSTRAINT "finance_salary_records_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_audit_logs" ADD CONSTRAINT "finance_audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_audit_logs" ADD CONSTRAINT "finance_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bambu_cost_rules" ADD CONSTRAINT "bambu_cost_rules_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "production_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bambu_cost_rules" ADD CONSTRAINT "bambu_cost_rules_leaf_stock_card_id_fkey" FOREIGN KEY ("leaf_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bambu_cost_rules" ADD CONSTRAINT "bambu_cost_rules_trunk_stock_card_id_fkey" FOREIGN KEY ("trunk_stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bambu_cost_exceptions" ADD CONSTRAINT "bambu_cost_exceptions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "bambu_cost_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usage_logs" ADD CONSTRAINT "stock_usage_logs_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usage_logs" ADD CONSTRAINT "stock_usage_logs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "trendyol_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usage_logs" ADD CONSTRAINT "stock_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
