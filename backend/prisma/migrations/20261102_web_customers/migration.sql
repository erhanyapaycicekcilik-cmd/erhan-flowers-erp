-- CreateTable: web_customers
CREATE TABLE "web_customers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "birth_date" TIMESTAMP(3),
    "city" TEXT,
    "district" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_customers_email_key" ON "web_customers"("email");
CREATE INDEX "web_customers_email_idx" ON "web_customers"("email");

-- Add customerId FK to web_orders
ALTER TABLE "web_orders" ADD COLUMN "customer_id" INTEGER;
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "web_customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
