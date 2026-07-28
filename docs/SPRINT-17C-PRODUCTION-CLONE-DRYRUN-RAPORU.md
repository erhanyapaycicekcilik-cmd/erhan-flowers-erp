# SPRINT-17C Production Clone Dry-Run Raporu

Tarih: 23.07.2026

## 1. Yönetici Özeti

Production PostgreSQL veritabanı yalnızca salt okunur sorgularla incelendi, tam yedeği alındı ve development PostgreSQL sunucusunda tamamen bağımsız `erhan_flowers_production_dryrun_clone` veritabanına başarıyla geri yüklendi. Kaynak ve klon tablo/veri/constraint sayıları birebir eşleşti.

Dry-run migration güvenlik kontrolünde durduruldu. Production şeması güncel Prisma şemasından köklü biçimde farklıdır. Otomatik Prisma diff; 24 production tablosunu, 41 kolonu ve bazı mevcut birincil anahtarları silmek/yeniden oluşturmak istemektedir. Özellikle `users`, `products`, `categories`, `media_files`, `barcode_logs` ve `stock_movements` tablolarında kimlik tipi ve alan modeli değişmiştir. Baseline'ı uygulanmış saymak da güvenli değildir; güncel şemadaki 55 tablo production'da yoktur.

Kritik kural gereği klonda baseline/align uygulanmadı, migration geçmişi işaretlenmedi ve veri dönüşümü yapılmadı. Gerçek production deployment kararı **RED / HAZIR DEĞİL** olarak verildi.

## 2. Production İşlem Öncesi Durumu

- Frontend: `3001`, PID `26884`
- Backend: `8001`, PID `21436`
- PostgreSQL: `5432`, container `erhan-flowers-postgres`
- Development servisleri: `3101`, `8101`, PostgreSQL `5433`
- Production PostgreSQL container başlangıcı: `22.07.2026 08:54` Türkiye saati
- Production backend süreç başlangıcı: `22.07.2026 12:53:13`
- Production frontend süreç başlangıcı: `22.07.2026 12:57:41`

Görev öncesi ve sonrası production frontend login HTTP 200, production backend login HTTP 201 verdi.

## 3. Production Salt Okunur İnceleme

| Alan | Sonuç |
|---|---|
| Database | `erhan_flowers_panel` |
| PostgreSQL | 16.14, Alpine |
| Boyut | 12 MB |
| Public tablo | 30 |
| Şemalar | `public`, `pg_catalog`, `pg_toast`, `information_schema` |
| `_prisma_migrations` | Yok |
| Migration kayıt sayısı | 0 / uygulanamaz |
| Son migration | Yok |
| Başarısız migration | Yok; migration tablosu bulunmuyor |
| Yeni `retail_customer*` tabloları | Yok |
| Yeni `retail_sale*` tabloları | Yok |
| `knowledge_*` tabloları | Yok |
| `stock_cards` | Yok |

Production'da yeni modüller yerine eski tablolar bulunuyor:

- `crm_customers`, `crm_notes`, `crm_quotes`, `crm_tasks`
- `individual_customers`, `individual_orders`
- `sales_orders`, `sales_order_items`, `sales_print_records`
- Eski maliyet, teklif, entegrasyon ve WhatsApp tabloları

### Production Kod Sürümü Kanıtı

- Backend entry: `backend/dist/src/main.js`
- SHA-256: `ABDF26B88C9BE94FB55E63101ABC105C3B2C262BDFA7C3A7AC028400B8173445`
- Dosya tarihi: `22.07.2026 21:51:16`
- Frontend BUILD_ID: `fZS1_vio7v_hCg0Od6ldv`
- Git aracı ortamda bulunmadığından commit SHA doğrulanamadı.
- Production 8001 süreci diskteki son değişikliklerden önce başlamıştır ve bellekte eski Prisma Client kullanmaktadır.

## 4. Production Yedek Bilgileri

- Tam yol: `C:\Users\Erhan Flowers\Documents\Codex\2026-06-23\coding-phase-1-erhan-flowers-erp\backups\database\SPRINT-17C-PRODUCTION-PRE-DRYRUN-20260723-000556.dump`
- Oluşturulma: `23.07.2026 00:05:57 +03:00`
- Boyut: 214.915 byte
- SHA-256: `A1E1545C1BEE7D1287E5532CB2B381FB8F0E9538F6D92234DE6092AF3F96D760`
- Biçim: PostgreSQL custom archive
- Komut özeti: `pg_dump -Fc --no-owner --no-acl`
- Sonuç: Başarılı

Yedek tüm şema ve verileri, indeksleri, foreign keyleri, constraintleri ve identity/sequence metadata'sını içerir. Production'da `_prisma_migrations` bulunmadığından bu tablo yedekte yoktur.

## 5. Production Yedeği Geri Yükleme Testi

Yedek, `5433` üzerindeki bağımsız `erhan_flowers_production_dryrun_clone` DB'sine `pg_restore --exit-on-error` ile yüklendi.

- Production uygulaması klona bağlanmadı.
- Development uygulaması klona bağlanmadı.
- Production portları kullanılmadı.
- Geri yükleme başarılı oldu.

## 6. Production Klonu Kayıt Sayıları

| Veri | Production | Klon |
|---|---:|---:|
| Public tablo | 30 | 30 |
| Kullanıcı | 1 | 1 |
| Eski CRM müşterisi | 3 | 3 |
| Bireysel müşteri | 4 | 4 |
| Bireysel sipariş | 23 | 23 |
| Satış siparişi | 0 | 0 |
| Satış çıktı kaydı | 11 | 11 |
| Ürün | 288 | 288 |
| Stok hareketi | 0 | 0 |

Diğer yapısal sayımlar:

- İndeks: production 46, klon 46
- Foreign key: production 29, klon 29
- Toplam constraint: production 59, klon 59
- Sequence: production 0, klon 0
- Doğrulanmamış foreign key: 0

## 7. Production Şema Analizi

Production 30 uygulama tablosu, güncel hedef şema ise 61 uygulama tablosu içeriyor. Ortak ad taşıyan yalnızca 6 tablo vardır. Prisma farkı:

- Güncel şemada olup production'da olmayan: 55 tablo
- Production'da olup güncel şemada olmayan: 24 tablo
- Oluşturulması istenen enum: 32
- Drop edilmek istenen tablo: 24
- Drop edilmek istenen kolon: 41
- Eklenmek istenen kolon: 38
- Toplam `ALTER TABLE` ifadesi: 142

Production'a özel 24 tablo hiçbir koşulda gereksiz kabul edilmedi.

## 8. Güncel Prisma Şemasıyla Farklar

En kritik ortak tablo farkları:

- `users`: ID ve role tipi değişiyor; `status` ve `remember_token` eksik.
- `products`: ID UUID'den integer/autoincrement yapıya çevrilmek isteniyor; 20'den fazla eski alan drop riski taşıyor.
- `categories`: ID tipi değişiyor ve yeni kod alanları ekleniyor.
- `media_files`: ID/product ID tipi değişiyor; `file_url`, `is_main`, `mime_type` drop riski taşıyor.
- `barcode_logs`: ID/product ID tipi değişiyor; `action` alanı drop riski taşıyor.
- `stock_movements`: eski ürün/sipariş/kanal bağlantıları ve bakiye alanları kaldırılmak isteniyor; yeni stok kartı modeliyle uyumsuz.

Rename olarak yorumlanabilecek alanlar Prisma tarafından drop+add olarak algılanmıştır. Açık veri eşleme kararı olmadan otomatik SQL kullanılamaz.

## 9. Migration Stratejisi

Karar:

1. Full baseline dolu production klonuna doğrudan uygulanamaz; mevcut tablo/type çakışmaları oluşturur.
2. Full baseline yalnızca geçmişe `resolve --applied` ile yazılamaz; production 55 hedef tablodan yoksundur.
3. Align migration yalnızca beş metadata farkını düzeltir; eksik 55 tabloyu ve eski veri dönüşümünü çözmez.
4. Otomatik Prisma diff veri kaybına yol açacağından uygulanamaz.
5. Production'a özel, veri koruyan reconciliation migration ve ETL planı zorunludur.

## 10. Baseline Uygulama Yöntemi

Bu dry-run'da baseline uygulanmadı veya uygulanmış işaretlenmedi.

Güvenli gelecek yöntem:

1. Eski 24 tabloyu koruyacak `legacy_sprint17c` şema/arşiv stratejisi belirle.
2. Ortak tablolar için UUID -> integer eşleme tabloları oluştur.
3. Yeni hedef tabloları çakışmasız isimlerle veya kontrollü geçiş adımlarıyla oluştur.
4. Eski müşteri/sipariş/ürün/medya/barkod/stok verisini doğrulanmış ETL ile yeni modele kopyala.
5. Satır ve ilişki doğrulaması tamamlanmadan eski tabloları taşımama veya kaldırmama.
6. Ancak gerçek hedef şema oluşunca baseline geçmişini işaretle ve align migrationı uygula.

## 11. Compatibility veya Reconciliation Migrationlar

Yeni compatibility/reconciliation migration oluşturulmadı. Alan eşlemeleri için iş kararı olmadan migration üretmek veri kaybı riski taşımaktadır.

Gerekli eşleme konuları:

- Eski `crm_customers` + `individual_customers` -> `retail_customers`
- `individual_orders` ve eski satış yapısı -> `retail_sales` ve kalemleri
- Eski `products` UUID -> yeni ürün/varyasyon/stock card ilişkisi
- Eski medya ve barkod ilişkileri
- Eski stok hareketleri ile yeni `stock_card_id` zinciri
- Eski maliyet ve teklif tablolarının arşiv/taşıma kararı

## 12. Dry-Run Migration Sonucu

**Durduruldu / uygulanmadı.**

Klonun migration öncesi ikinci yedeği alındı:

- Dosya: `backups/database/SPRINT-17C-PRODUCTION-CLONE-PRE-MIGRATION-20260723-000715.dump`
- Boyut: 215.690 byte
- SHA-256: `0E3E7C6CC267761A2FE0AFC750B148764CC89C4A4DEE8266DF861432243F828C`

## 13. Drift Sonucu

Production klonunda kapsamlı drift vardır. Diff SQL 1.901 satırdır ve destructive değişiklikler içerir. Migration uygulanmadığı için drift devam etmektedir.

## 14. Prisma Status Sonucu

Production klonunda `_prisma_migrations` yoktur. Prisma status iki migrationı uygulanmamış gösterir:

- `20260722234500_reconstructed_full_baseline`
- `20260722234600_align_sprint17c_schema`

Status temiz değildir. Tam kanıt olmadan resolve kullanılmadı.

## 15. Prisma DLL Kilit Analizi

Kilitlenen dosya:

`backend/dist/src/generated/prisma-client/query_engine-windows.dll.node`

Kilitleyen süreç:

- PID: `25328` (inceleme anında; watch restart sonrası PID değişebilir)
- Servis: Development backend, port 8101
- Komut: `node --enable-source-maps backend/dist/src/main`

Production backend PID `21436` farklı kopyayı kullanıyor:

`backend/node_modules/.prisma/client/query_engine-windows.dll.node`

Build sırasında Nest, generated DLL'yi `dist` içine kopyalamaya çalıştığı için çalışan development process dosyayı kilitliyor ve `EBUSY` oluşuyor.

## 16. Release Build Testi

İzole release klasörü oluşturuldu:

`releases/SPRINT-17C-PRODUCTION-DRYRUN-20260723-0010`

Sonuçlar:

- Backend `npm ci`: Başarılı
- Frontend `npm ci`: Başarılı
- İzole Prisma Client üretimi: Başarılı; DLL kilidi oluşmadı
- Frontend production build: Başarılı, 33 sayfa
- Dry-run frontend 3201: Login, CRM, Satış ve Bilgi Merkezi sayfaları HTTP 200
- Backend build: Başarısız, 9 TypeScript hatası

Backend build hataları:

- Seed dosyaları `@prisma/client` üzerinden custom-output enumlarını bulamıyor.
- `seed-knowledge-base-dev.ts` içinde implicit `any`.
- `import-trendyol-products.ts` içinde implicit `any` ve `{}` üzerinde olmayan alan erişimleri.

Sonuç: İzole release yöntemi DLL kilidini çözüyor, fakat backend kaynak kodu release build'e hazır değil.

## 17. CRM Testleri

Post-migration CRM testleri çalıştırılamadı; migration güvenlik nedeniyle uygulanmadı. Dry-run frontend CRM sayfası HTTP 200 verdi, ancak yeni CRM backend'i production klonunda login sırasında şema uyumsuzluğu nedeniyle HTTP 500 verdi.

## 18. Satış Testleri

Post-migration satış testleri çalıştırılamadı. Production klonunda `retail_sales` ve ilişkili tablolar yoktur. Frontend `/sales` sayfası HTTP 200 verdi; backend iş akışı testine geçilmedi.

## 19. Stok-Finans-Teslimat Testleri

Çalıştırılamadı. Production klonunda yeni `stock_cards`, `finance_transactions` ve `retail_deliveries` tabloları yoktur. Migration uygulanmadan satış oluşturmak kısmi veya hatalı kayıt riski taşır.

## 20. Bilgi Merkezi Testleri

Frontend `/knowledge-center` HTTP 200 verdi. Backend kayıt/listeme testleri çalıştırılamadı; production klonunda `knowledge_*` tabloları yoktur.

## 21. Veri Kaybı Kontrolü

Migration uygulanmadığı için beklenmeyen veri silinmesi olmadı. Görev sonundaki production ve klon sayımları eşleşmektedir:

`30 tablo | 1 kullanıcı | 3 CRM | 4 bireysel müşteri | 23 bireysel sipariş | 288 ürün`

Otomatik diff uygulanırsa 24 tablo ve 41 kolon için doğrudan veri kaybı riski vardır.

## 22. Rollback Testi

Production yedeği ikinci bağımsız `erhan_flowers_production_rollback_test` DB'sine geri yüklendi. Sayımlar production ile eşleşti.

Diskteki güncel backend eski DB ile çalışmadı: `users.status` bulunamadı. Buna karşılık 26.06.2026 tarihli eski Docker backend image'ı ayrı `8302` portunda rollback DB'ye bağlandı:

- Image: `sha256:483fad3d2ca2c4a1d4854c80a5d9ca2362fbc175f4d2122a964539327d522f2a`
- Backend başlangıcı: Başarılı
- Login: HTTP 201
- Ürün listesi: HTTP 200
- Eski CRM müşteri listesi: HTTP 200

Rollback testi eski Docker image ile başarılıdır. Test containerı ve rollback DB görev sonunda kaldırıldı.

Kritik bulgu: Production 8001 süreci şu anda bellekte eski Prisma Client ile çalışmaktadır. Süreç durursa diskteki güncel build eski production DB ile tekrar başlayamayabilir. Eski Docker image rollback için kesinlikle korunmalıdır.

## 23. Production Deployment Planı

Mevcut durumda deployment yapılmamalıdır. Reconciliation tamamlandıktan sonraki kesin sıra:

1. Production bakım öncesi port, disk, container, login ve DB sağlık kontrolü.
2. Yeni production custom-format DB yedeği ve SHA-256.
3. Çalışan image ID'leri ve kod klasörü snapshot'ı.
4. Yeni, benzersiz release klasörü oluşturma.
5. Release klasöründe `npm ci`.
6. Prisma Client'ı yalnızca release klasöründe üretme.
7. Backend ve frontend build; sıfır hata zorunlu.
8. Production yedeği klonunda onaylı reconciliation migration/ETL tekrarı.
9. Migration öncesi tablo/satır/constraint karşılaştırması.
10. Kısa bakım penceresinde yazma işlemlerini durdurma.
11. Production migration ve ETL uygulaması.
12. Yeni backend'i boş portta başlatıp health/login doğrulama.
13. Backend yönlendirmesini atomik değiştirme.
14. Yeni frontend'i boş portta başlatıp doğrulama.
15. Frontend yönlendirmesini atomik değiştirme.
16. CRM smoke testleri.
17. Satış + stok + finans + teslimat transaction testi.
18. Log, constraint ve satır sayısı kontrolü.
19. Kabul kriterleri sağlanırsa yeni release'i sabitleme.
20. Hata halinde yönlendirmeyi eski image/release'e döndürme ve DB yedeğini geri yükleme.

## 24. Değiştirilen Dosyalar

Production kodu veya migration dosyası değiştirilmedi.

Oluşturulanlar:

- Bu rapor
- Production DB yedeği
- Klon migration öncesi yedeği
- İzole release klasörü ve bu klasör içindeki bağımlılık/build çıktıları

## 25. Çalıştırılan Komutlar

Gizli bilgiler çıkarılmış özet:

- `docker inspect`, `docker ps`, `Get-NetTCPConnection`, process/module incelemesi
- Salt okunur `psql SELECT` sorguları
- `pg_dump -Fc --no-owner --no-acl`
- `pg_restore --exit-on-error`
- `prisma migrate diff`
- `prisma migrate status`
- İzole release içinde `npm ci`, `prisma generate`, `nest build`, `next build`
- Ayrı 3201/8201/8302 test portlarında HTTP smoke testleri

`prisma db push`, `prisma migrate reset`, production migration veya production DB yazma komutu çalıştırılmadı.

## 26. Başarısız Testler

1. Production klonuna bağlı yeni backend login: HTTP 500, `users.status` eksik.
2. İzole backend build: 9 TypeScript hatası.
3. CRM/Satış/Stok-Finans-Teslimat/Bilgi Merkezi post-migration E2E: migration durdurulduğu için çalıştırılamadı.
4. Prisma status: iki migration uygulanmamış, temiz değil.
5. Drift: kapsamlı ve destructive, temiz değil.

## 27. Kalan Riskler

1. Eski ve yeni şema arasında veri modelleme/ID tipi uçurumu vardır.
2. 24 legacy tablo ve 41 legacy kolon için arşiv/ETL kararı yoktur.
3. Çalışan production backend yeniden başlatılırsa diskteki yeni Prisma Client nedeniyle açılmama riski vardır.
4. Backend release build 9 TypeScript hatası vermektedir.
5. Yeni CRM/Satış/Bilgi Merkezi production verisi henüz yoktur.
6. Migration geçmişi production'da bulunmamaktadır.
7. E2E transaction testleri güvenli migration olmadığı için yapılamamıştır.

## 28. Production Deployment Kararı

**RED - GERÇEK PRODUCTION DEPLOYMENT'A HAZIR DEĞİLİZ.**

Production klonu, yedek ve rollback mekanizması doğrulanmıştır; ancak veri koruyan reconciliation migration/ETL ve başarılı backend release build olmadan deployment yapılamaz.

## 29. Sonraki Görev Önerisi

`SPRINT-17C PRODUCTION DATA RECONCILIATION MAPPING` başlatılmalıdır.

Bu görev kod yazmadan önce her legacy tablo ve kolon için şu kararı belgelemelidir:

- Yeni hedef tablo/kolon
- ID dönüşüm yöntemi ve eşleme tablosu
- Duplicate müşteri/telefon çözümü
- Ürün/model/barkod/medya/stok kimlik zinciri
- Sipariş ve çıktı geçmişi taşıma yöntemi
- Arşivlenecek fakat silinmeyecek tablolar
- Satır bazlı kabul kontrolleri

Ardından yalnızca production klonunda idempotent reconciliation migration ve ETL uygulanmalıdır.

