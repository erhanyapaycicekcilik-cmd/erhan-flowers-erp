# PostgreSQL Durum Raporu

Tarih: 2026-07-28

## Ozet

- Canli PostgreSQL `5432`: 67 uygulama tablosu, yaklasik 15 MB veri.
- Canli DB fiziksel semasi mevcut Prisma semasiyla uyumlu; drift bulunmadi.
- Canli DB'de Prisma migration gecmisi gorunmuyor; dort migration uygulanmamis gorunuyor. Fiziksel sema dogru olsa da migration yonetimi acisindan risk var.
- Development PostgreSQL `5433`: 68 tablo (`_prisma_migrations` dahil), yaklasik 13 MB, uygulama verisi bos seviyede.
- Development DB migration durumunu guncel gosteriyor; buna ragmen dort `updated_at` default farki ve `retail_sales.idempotency_key` unique index farki var.

## Canli Veri Sayimlari

| Alan | Deger |
| --- | ---: |
| Uygulama tablosu | 67 |
| Stok karti | 290 |
| Stok karti gorsel kaydi | 127 |
| Medya dosyasi kaydi | 139 |
| Stok hareketi | 96 |
| Urun | 2 |
| Kullanici | 2 |

## Gorsel Veri Durumu

- 285 stok kartinda `image_path` dolu.
- 59 kart yeni `stock_card_images` iliskisini kullaniyor.
- 226 kartta eski `/uploads/...` yolu var ve bu eski dosyalarin tamami fiziksel olarak mevcut.
- Yeni `stock_card_images` kayitlarinin 124 dosyasi mevcut, 3 dosyasi eksik.
- Yetim `stock_card_images`, yinelenen gorsel yolu, birden fazla ana gorsel ve `imagePath/isMain` uyusmazligi bulunmadi.

## Diagram Ciktisi

- DBML dosyasi: `docs/database/erhan-flowers-erp.dbml`
- Kaynak: `backend/prisma/schema.prisma`
- Kapsam: 67 uygulama tablosu, 32 enum, foreign key referanslari, unique constraint'ler ve index'ler.
- `_prisma_migrations` diagram disinda tutuldu; bu tablo uygulama modeli degil migration metadatasidir.

## Notlar

Bu calisma sadece dokumantasyon uretir. Canli/development DB'ye migration uygulanmadi, veri degistirilmedi, dosya veya gorsel silinmedi.
