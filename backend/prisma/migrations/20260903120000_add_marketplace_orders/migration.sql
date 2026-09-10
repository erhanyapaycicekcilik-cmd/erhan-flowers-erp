-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" SERIAL NOT NULL,
    "channel_account_id" INTEGER,
    "platform" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "customer_name" TEXT,
    "customer_email" TEXT,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cargo_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "order_date" TIMESTAMP(3),
    "cargo_tracking_number" TEXT,
    "cargo_provider" TEXT,
    "raw_payload" JSONB,
    "stock_deducted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(14,2) NOT NULL,
    "stock_card_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_platform_external_order_id_key" ON "marketplace_orders"("platform", "external_order_id");

-- CreateIndex
CREATE INDEX "marketplace_orders_platform_order_date_idx" ON "marketplace_orders"("platform", "order_date");

-- CreateIndex
CREATE INDEX "marketplace_orders_platform_status_idx" ON "marketplace_orders"("platform", "status");

-- CreateIndex
CREATE INDEX "marketplace_order_items_order_id_idx" ON "marketplace_order_items"("order_id");

-- AddForeignKey
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_stock_card_id_fkey" FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
