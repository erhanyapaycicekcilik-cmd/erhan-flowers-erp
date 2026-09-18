-- CreateEnum
CREATE TYPE "WebOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebOrderPaymentMethod" AS ENUM ('WHATSAPP', 'EFT');

-- CreateTable
CREATE TABLE "web_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "WebOrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "WebOrderPaymentMethod" NOT NULL DEFAULT 'WHATSAPP',
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "address" TEXT NOT NULL,
    "postal_code" TEXT,
    "note" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "grand_total" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_slug" TEXT NOT NULL,
    "product_image" TEXT,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "web_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "web_orders_order_number_key" ON "web_orders"("order_number");
CREATE INDEX "web_orders_status_idx" ON "web_orders"("status");
CREATE INDEX "web_orders_created_at_idx" ON "web_orders"("created_at" DESC);
CREATE INDEX "web_order_items_order_id_idx" ON "web_order_items"("order_id");

-- AddForeignKey
ALTER TABLE "web_order_items" ADD CONSTRAINT "web_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "web_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
