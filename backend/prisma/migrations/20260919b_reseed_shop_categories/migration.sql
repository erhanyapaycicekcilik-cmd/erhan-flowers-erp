-- Kategori listesi güncellendi — eski seed'i temizle ve yeniden ekle
-- (henüz ürün bağlantısı olmadığı için güvenle silinebilir)
TRUNCATE TABLE "shop_categories" RESTART IDENTITY CASCADE;

-- ============================================================
-- ANA KATEGORİLER
-- ============================================================
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yapay Ağaçlar',        'yapay-agaclar',        NULL, 1,  NOW()),
('Bambular',             'bambular',              NULL, 2,  NOW()),
('Yapay Sarmaşıklar',    'yapay-sarmasiklar',     NULL, 3,  NOW()),
('Yapay Çiçekler',       'yapay-cicekler',        NULL, 4,  NOW()),
('Demet Çiçekler',       'demet-cicekler',        NULL, 5,  NOW()),
('Bitkiler',             'bitkiler',              NULL, 6,  NOW()),
('Saksılar & Vazolar',   'saksilar-vazolar',      NULL, 7,  NOW()),
('Saksı Aranjmanları',   'saksi-aranjmanlari',    NULL, 8,  NOW()),
('Yapay Dal & Yaprak',   'yapay-dal-yaprak',      NULL, 9,  NOW()),
('Kuru Çiçek & Doğal',   'kuru-cicek-dogal',      NULL, 10, NOW()),
('Duvar Dekorları',      'duvar-dekorlari',       NULL, 11, NOW()),
('Tavan Dekorları',      'tavan-dekorlari',       NULL, 12, NOW()),
('Dikey Bahçe & Panel',  'dikey-bahce-panel',     NULL, 13, NOW()),
('Mekan Tasarımları',    'mekan-tasarimlari',     NULL, 14, NOW());

-- ============================================================
-- ALT KATEGORİLER
-- ============================================================

-- Yapay Ağaçlar (id=1)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yeşil Ağaçlar',            'yesil-agaclar',          1, 1, NOW()),
('Renkli Ağaçlar',           'renkli-agaclar',         1, 2, NOW()),
('Hazır Gövde Ağaçlar',      'hazir-govde-agaclar',    1, 3, NOW()),
('Ficus Ağaçlar',            'ficus-agaclar',          1, 4, NOW()),
('Palmiye Ağaçlar',          'palmiye-agaclar',        1, 5, NOW()),
('Zeytin & Meyve Ağaçları',  'zeytin-meyve-agaclari', 1, 6, NOW()),
('Bonsai Ağaçlar',           'bonsai-agaclar',         1, 7, NOW()),
('Top & Konik Bitkiler',     'top-konik-bitkiler',     1, 8, NOW());

-- Bambular (id=2)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Bambu Tekli',       'bambu-tekli',      2, 1, NOW()),
('Bambu Ağaçlar',     'bambu-agaclar',    2, 2, NOW()),
('Bambu Seperatör',   'bambu-seperator',  2, 3, NOW());

-- Yapay Sarmaşıklar (id=3)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yeşil Sarmaşık',           'yesil-sarmasik',       3, 1, NOW()),
('Renkli Sarmaşık',          'renkli-sarmasik',      3, 2, NOW()),
('Duvar & Tavan Sarmaşığı',  'duvar-tavan-sarmasigi',3, 3, NOW());

-- Yapay Çiçekler (id=4)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Güller',            'guller',           4, 1, NOW()),
('Laleler',           'laleler',          4, 2, NOW()),
('Papatyalar',        'papatyalar',       4, 3, NOW()),
('Orkideler',         'orkideler',        4, 4, NOW()),
('Sümbül & Lavanta',  'sumbul-lavanta',   4, 5, NOW()),
('Ayçiçekleri',       'aycicekleri',      4, 6, NOW()),
('Karma Çiçekler',    'karma-cicekler',   4, 7, NOW());

-- Demet Çiçekler (id=5) — alt kategori yok şimdilik

-- Bitkiler (id=6)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yeşil Bitkiler',   'yesil-bitkiler',  6, 1, NOW()),
('Renkli Bitkiler',  'renkli-bitkiler', 6, 2, NOW()),
('Mini Masa Bitkileri', 'mini-masa-bitkileri', 6, 3, NOW());

-- Saksılar & Vazolar (id=7)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Metal Saksı',        'metal-saksi',       7, 1, NOW()),
('Plastik Saksı',      'plastik-saksi',     7, 2, NOW()),
('MDF Saksı',          'mdf-saksi',         7, 3, NOW()),
('Fiberglas Saksı',    'fiberglas-saksi',   7, 4, NOW()),
('Dekoratif Vazolar',  'dekoratif-vazolar', 7, 5, NOW());

-- Saksı Aranjmanları (id=8) — alt kategori yok şimdilik

-- Yapay Dal & Yaprak (id=9)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Tek Dal Çiçekler',            'tek-dal-cicekler',          9, 1, NOW()),
('Yapraklı Dallar',             'yaprakli-dallar',           9, 2, NOW()),
('Buğday & Kuru Görünümlü Dal', 'bugday-kuru-gorumlu-dal',   9, 3, NOW());

-- Kuru Çiçek & Doğal (id=10)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Kuru Buketler',          'kuru-buketler',      10, 1, NOW()),
('Pamuk Dalları',          'pamuk-dallari',      10, 2, NOW()),
('Okaliptüs & Tropikal',   'okaliptus-tropikal', 10, 3, NOW());

-- Duvar Dekorları (id=11)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Duvar Sarmaşığı',     'duvar-sarmasigi',    11, 1, NOW()),
('Çiçekli Duvar Paneli','cicekli-duvar',      11, 2, NOW()),
('Yapay Çim Duvar',     'yapay-cim-duvar',    11, 3, NOW()),
('3D Duvar Dekor',      '3d-duvar-dekor',     11, 4, NOW());

-- Tavan Dekorları (id=12)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Tavan Sarmaşığı',   'tavan-sarmasigi',  12, 1, NOW()),
('Çiçekli Tavan',     'cicekli-tavan',    12, 2, NOW()),
('Asılı Dekorlar',    'asili-dekorlar',   12, 3, NOW());

-- Dikey Bahçe & Panel (id=13)
INSERT INTO "shop_categories" ("name", "slug", "parent_id", "sort_order", "updated_at") VALUES
('Yeşil Panel',          'yesil-panel',       13, 1, NOW()),
('Çiçekli Panel',        'cicekli-panel',     13, 2, NOW()),
('Karma Panel',          'karma-panel',       13, 3, NOW()),
('Yapay Çim Panel',      'yapay-cim-panel',   13, 4, NOW());

-- Mekan Tasarımları (id=14) — proje bazlı, alt kategori eklenir ihtiyaca göre
