-- CreateTable
CREATE TABLE "shop_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" INTEGER,
    "cover_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_categories_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "trendyol_product_variants" ADD COLUMN "shop_category_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "shop_categories_slug_key" ON "shop_categories"("slug");

-- AddForeignKey
ALTER TABLE "shop_categories" ADD CONSTRAINT "shop_categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "shop_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trendyol_product_variants" ADD CONSTRAINT "trendyol_product_variants_shop_category_id_fkey"
    FOREIGN KEY ("shop_category_id") REFERENCES "shop_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: Ana kategoriler ve alt kategoriler
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yapay Ağaçlar', 'yapay-agaclar', NULL, 1, NOW()),
('Yapay Sarmaşıklar', 'yapay-sarmasiklar', NULL, 2, NOW()),
('Yapay Çiçekler', 'yapay-cicekler', NULL, 3, NOW()),
('Yapay Dal & Yaprak', 'yapay-dal-yaprak', NULL, 4, NOW()),
('Saksı & Masa Bitkileri', 'saksi-masa-bitkileri', NULL, 5, NOW()),
('Kuru Çiçek & Doğal', 'kuru-cicek-dogal', NULL, 6, NOW()),
('Dikey Bahçe & Panel', 'dikey-bahce-panel', NULL, 7, NOW()),
('Aksesuar & Vazo', 'aksesuar-vazo', NULL, 8, NOW());

-- Alt kategoriler: Yapay Ağaçlar (id=1)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yeşil Ağaçlar', 'yesil-agaclar', 1, 1, NOW()),
('Renkli Ağaçlar', 'renkli-agaclar', 1, 2, NOW()),
('Bambu Ağaçlar', 'bambu-agaclar', 1, 3, NOW()),
('Hazır Gövde Ağaçlar', 'hazir-govde-agaclar', 1, 4, NOW()),
('Ficus Ağaçlar', 'ficus-agaclar', 1, 5, NOW()),
('Palmiye Ağaçlar', 'palmiye-agaclar', 1, 6, NOW()),
('Zeytin & Meyve Ağaçları', 'zeytin-meyve-agaclari', 1, 7, NOW()),
('Bonsai Ağaçlar', 'bonsai-agaclar', 1, 8, NOW()),
('Top & Konik Bitkiler', 'top-konik-bitkiler', 1, 9, NOW());

-- Alt kategoriler: Yapay Sarmaşıklar (id=2)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yeşil Sarmaşık', 'yesil-sarmasik', 2, 1, NOW()),
('Renkli Sarmaşık', 'renkli-sarmasik', 2, 2, NOW()),
('Duvar & Tavan Sarmaşığı', 'duvar-tavan-sarmasigi', 2, 3, NOW());

-- Alt kategoriler: Yapay Çiçekler (id=3)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Güller', 'guller', 3, 1, NOW()),
('Laleler', 'laleler', 3, 2, NOW()),
('Papatyalar', 'papatyalar', 3, 3, NOW()),
('Orkideler', 'orkideler', 3, 4, NOW()),
('Sümbül & Lavanta', 'sumbul-lavanta', 3, 5, NOW()),
('Karışık Buketler', 'karisik-buketler', 3, 6, NOW());

-- Alt kategoriler: Yapay Dal & Yaprak (id=4)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Tek Dal Çiçekler', 'tek-dal-cicekler', 4, 1, NOW()),
('Yapraklı Dallar', 'yaprakli-dallar', 4, 2, NOW()),
('Buğday & Kuru Görünümlü Dallar', 'bugday-kuru-gorünumlu-dallar', 4, 3, NOW());

-- Alt kategoriler: Saksı & Masa Bitkileri (id=5)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Saksılı Yeşil Bitkiler', 'saksi-yesil-bitkiler', 5, 1, NOW()),
('Saksılı Çiçekli Bitkiler', 'saksi-cicekli-bitkiler', 5, 2, NOW()),
('Mini Masa Bitkileri', 'mini-masa-bitkileri', 5, 3, NOW());

-- Alt kategoriler: Kuru Çiçek & Doğal (id=6)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Kuru Buketler', 'kuru-buketler', 6, 1, NOW()),
('Pamuk Dalları', 'pamuk-dallari', 6, 2, NOW()),
('Okaliptüs & Tropikal', 'okaliptus-tropikal', 6, 3, NOW());

-- Alt kategoriler: Dikey Bahçe & Panel (id=7)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yapay Çim Paneller', 'yapay-cim-paneller', 7, 1, NOW()),
('Çiçekli Duvar Panelleri', 'cicekli-duvar-panelleri', 7, 2, NOW()),
('Karma Yeşil Paneller', 'karma-yesil-paneller', 7, 3, NOW());

-- Alt kategoriler: Aksesuar & Vazo (id=8)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Vazolar', 'vazolar', 8, 1, NOW()),
('Saksılar & Kaplar', 'saksilar-kaplar', 8, 2, NOW());
