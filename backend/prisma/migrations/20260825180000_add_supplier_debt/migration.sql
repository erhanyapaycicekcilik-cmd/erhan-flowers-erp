-- CreateEnum
CREATE TYPE "DebtTransactionType" AS ENUM ('DEBT_ADDED', 'PAYMENT_MADE');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_transactions" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "type" "DebtTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "document_no" TEXT,
    "stock_card_id" INTEGER,
    "quantity" DECIMAL(12,3),
    "unit_price" DECIMAL(12,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_stock_card_id_fkey"
    FOREIGN KEY ("stock_card_id") REFERENCES "stock_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
