CREATE TABLE "bambu_stem_prices" (
    "id" SERIAL NOT NULL,
    "size_cm" INTEGER NOT NULL,
    "price_per_stem" DECIMAL(10,2) NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bambu_stem_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bambu_stem_prices_size_cm_key" ON "bambu_stem_prices"("size_cm");
