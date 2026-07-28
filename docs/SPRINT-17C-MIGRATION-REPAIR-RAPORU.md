# SPRINT-17C Kontrollü Migration Repair Raporu

Tarih: 22.07.2026

## Yönetici Özeti

Development veritabanının yeni tam yedeği alındı ve bağımsız veritabanına eksiksiz geri yüklendi. Altı kayıtsız migrationın beklenen ana tablo, kolon, enum, indeks ve dış anahtar nesnelerinin development veritabanında bulunduğu kanıtlandı.

Kontrollü repair denemesi yalnızca geri yüklenen geçici veritabanında yapıldı. Prisma, `20260722_...` biçimindeki altı migration adını `migrate resolve` için geçerli migration adı saymadığı için `P3017` verdi. Sıfır veritabanı testi de repository'de legacy ERP şemasını kuran bir baseline bulunmadığından ilk migrationda `P3018` ile durdu. Risk kuralı gereği ana development migration geçmişi değiştirilmedi.

Production ortamına bağlanılmadı, production servisi veya veritabanı değiştirilmedi ve deployment başlatılmadı.

## Yeni Yedek Bilgileri

- Durum: Başarılı
- Dosya: `backups/database/SPRINT-17C-REPAIR-DEV-20260722-233248.dump`
- Kaynak: Development PostgreSQL, `localhost:5433 / erhan_flowers_panel_dev`
- Biçim: PostgreSQL custom archive (`pg_dump -Fc --no-owner --no-acl`)
- Boyut: 529.070 byte
- SHA-256: `923B91E674AC66DB0DABF20AD92F50D317478510B519B62A15FCF00C3F01891D`

## Geri Yükleme Testi

Yedek `sprint17c_repair_restore_verify` adlı bağımsız ve geçici veritabanına `pg_restore --exit-on-error` ile yüklendi.

| Kontrol | Kaynak | Geri yüklenen |
|---|---:|---:|
| Public tablo | 62 | 62 |
| Kullanıcı | 2 | 2 |
| Stok kartı | 291 | 291 |
| Trendyol varyasyonu | 938 | 938 |
| CRM müşterisi | 2 | 2 |
| Satış | 2 | 2 |
| Bilgi analizi logu | 13 | 13 |
| Prisma migration kaydı | 1 | 1 |

Sonuç: Başarılı. Test sonrasında yalnızca oluşturulan geçici test veritabanları kaldırıldı. Ana development veritabanı değiştirilmedi.

## Eksik Migration Analizi

`_prisma_migrations` tablosunda yalnızca `20260722123544_add_knowledge_base_core` kayıtlıdır. Aşağıdaki altı migration dosya sisteminde bulunmasına ve nesneleri veritabanında mevcut olmasına rağmen migration geçmişinde kayıtlı değildir.

| Migration | Kanıtlanan nesneler | Uygulama sonucu |
|---|---|---|
| `20260722_sprint_17b_sales` | 7 satış/CRM tablosu, 4 stok hareketi kolonu, ilgili indeks ve FK'ler | Gerçek şemada uygulanmış, geçmişte kayıtsız |
| `20260722_sprint_17c_customer_crm` | 9 müşteri kolonu, etiket tanım ve bağlantı tabloları | Gerçek şemada uygulanmış, geçmişte kayıtsız |
| `20260722_sprint_17c_crm_v1` | 3 CRM tablosu ve `source_definition_id` | Gerçek şemada uygulanmış, geçmişte kayıtsız |
| `20260722_sprint_17c_crm_profile` | 6 profil kolonu ve müşteri dosyaları tablosu | Gerçek şemada uygulanmış, geçmişte kayıtsız |
| `20260722_sprint_17c_knowledge_center` | 12 Knowledge Center kolonu ve feedback tablosu | Gerçek şemada uygulanmış, geçmişte kayıtsız |
| `20260722_sprint_17c_sales_lifecycle` | 9 yaşam döngüsü/fatura kolonu, durum tablosu ve enum değerleri | Gerçek şemada uygulanmış, geçmişte kayıtsız |

Toplu nesne denetiminde beklenen 12 kritik indeksin 12'si ve 7 kritik constraint'in 7'si bulundu. Ana yapısal nesneleri eksik veya yarım kalmış migration tespit edilmedi. Seed verilerinin içerik doğruluğu ayrı bir veri kalitesi konusu olarak kalmaktadır.

### Kontrollü Resolve Denemesi

Geri yüklenen geçici veritabanında ilk kayıtsız migration için aşağıdaki yaklaşım denendi:

```text
prisma migrate resolve --applied 20260722_sprint_17b_sales
```

Sonuç: `P3017 - migration could not be found`.

Klasör dosya sisteminde bulunmasına rağmen adı yalnızca 8 haneli tarih öneki içeriyor. Prisma status bu klasörleri listeliyor, fakat `migrate resolve` bunları çözümlenebilir migration adı olarak kabul etmiyor. Bu nedenle otomatik geçmiş uzlaştırması durduruldu; `_prisma_migrations` tablosuna manuel kayıt eklenmedi.

## Checksum Analizi

Kayıtlı migration:

`20260722123544_add_knowledge_base_core`

- Veritabanındaki checksum: `889b4f068c3a5eeb099b5fa4a9fa823d6dcfad3c1e34a076872f36aad2c67fe7`
- Mevcut dosyanın checksum'u: `f0c1a504ff9fcc71dc4e7f22b241e9eaac6bbff9fa257351c8439a7af96ab2f3`
- Migration uygulanma zamanı: `2026-07-22 09:36:16 UTC`
- Dosyanın son yazılma zamanı: `2026-07-22 09:36:30 UTC`

Dosya migration kaydından yaklaşık 14 saniye sonra değiştirilmiştir. Snapshot'lardaki üç kopya da mevcut yeni checksum'a sahiptir; uygulama anındaki orijinal içerik bulunamadı. En güçlü kanıt, checksum farkının migration dosyasının uygulandıktan sonra düzenlenmesinden kaynaklandığıdır.

Veritabanındaki checksum'u elle değiştirmek veya güncel dosyayı geçmişte uygulanmış gibi kabul etmek güvenli bulunmadığından yapılmadı.

## Drift Analizi

Development DB ile `schema.prisma` arasında read-only `prisma migrate diff` çalıştırıldı. Drift tamamen giderilmedi; bu görevde schema veya DB değişikliği yapılmadı.

Tespit edilen farklar:

1. `retail_customer_reminders.updated_at` DB'de `CURRENT_TIMESTAMP` varsayılanına sahip, Prisma modelinde yok.
2. `retail_customer_source_definitions.updated_at` DB'de `CURRENT_TIMESTAMP` varsayılanına sahip, Prisma modelinde yok.
3. `retail_customer_tag_definitions.updated_at` DB'de `CURRENT_TIMESTAMP` varsayılanına sahip, Prisma modelinde yok.
4. `retail_sale_status_history.sale_id` dış anahtarının referential action tanımı Prisma beklentisiyle tam eşleşmiyor.
5. `retail_sale_status_history.changed_by_id` dış anahtarının referential action tanımı Prisma beklentisiyle tam eşleşmiyor.

Ayrıca migration history drift vardır: altı kayıtsız migration ve bir checksum uyuşmazlığı.

## Migration Bağımlılık Sırası

Repository'de legacy ERP tablolarını kuran başlangıç migrationı bulunmadığından ilk zorunlu adım bir baseline'dır.

Önerilen bağımlılık sırası:

1. Legacy ERP baseline: `users`, `stock_cards`, `stock_movements`, `production_families`, finans ve diğer mevcut temel tablolar.
2. `20260722_sprint_17b_sales`
3. `20260722_sprint_17c_customer_crm`
4. `20260722_sprint_17c_crm_v1`
5. `20260722_sprint_17c_crm_profile`
6. `20260722123544_add_knowledge_base_core` bağımsız dal olarak baseline sonrasında uygulanabilir.
7. `20260722_sprint_17c_knowledge_center`, Knowledge Base Core sonrasında uygulanmalıdır.
8. `20260722_sprint_17c_sales_lifecycle`, Sprint 17B Sales sonrasında uygulanmalıdır.

Mevcut alfabetik sıra güvenli değildir:

- CRM profile, ihtiyaç duyduğu source/tag tablolarından önce sıralanabilir.
- CRM v1, `customer_crm` migrationındaki `source` kolonuna bağımlıdır.
- Sales lifecycle, temel sales migrationından önce sıralanabilir.

## Test Sonuçları

### Sıfır Veritabanı Migration Testi

Geçici boş `sprint17c_empty_migration_test` veritabanında mevcut migration zinciriyle `prisma migrate deploy` çalıştırıldı.

Sonuç: Başarısız.

- Hata: `P3018`
- PostgreSQL kodu: `42P01`
- İlk başarısız migration: `20260722123544_add_knowledge_base_core`
- Neden: `production_families` tablosu bulunmuyor.

Bu sonuç repository'nin sıfırdan kurulabilir tam migration zincirine sahip olmadığını kanıtlar.

### Development CRM ve Satış Smoke Testleri

| Test | Sonuç |
|---|---|
| Development backend login (`8101`) | HTTP 201 |
| CRM dashboard API | HTTP 200 |
| CRM müşteri listesi API | HTTP 200 |
| Satış listesi API | HTTP 200 |
| Sonraki satış numarası API | HTTP 200 |
| Development login ekranı (`3101/login`) | HTTP 200 |
| Development CRM ekranı (`3101/crm`) | HTTP 200 |

Bu testler yalnızca okuma ve oturum açma seviyesindedir. Yeni müşteri/satış oluşturulmadı; development verisi değiştirilmedi.

## Riskler

1. Repository'de tam legacy baseline migrationı yoktur.
2. Altı migrationın ad formatı `migrate resolve` ile uyumsuzdur.
3. Altı migration şemada mevcut fakat geçmişte kayıtsızdır.
4. Core migration dosyası uygulandıktan sonra değiştirilmiştir ve orijinal içerik bulunamamıştır.
5. Mevcut dosya sırası bağımlılık sırasını bozar.
6. Schema drift halen mevcuttur.
7. Bazı migration seed metinlerinde Türkçe karakter bozulması vardır.
8. Production şeması bu görevde kurala uygun olarak hiç incelenmemiştir.
9. Prisma history tablosuna elle müdahale, yanlış şemayı uygulanmış kabul etme riski taşır.

## Production'a Geçiş İçin Kalan Engeller

- Mevcut development şemasından doğrulanmış legacy baseline oluşturulmalı.
- Migration klasörleri 14 haneli, benzersiz ve bağımlılık sırasını taşıyan adlarla kontrollü olarak yeniden düzenlenmeli.
- Checksum'u bozulan core migration için değişmez bir replacement/baseline stratejisi seçilmeli.
- Beş schema drift farkında DB mi Prisma modeli mi kaynak olacak kararı verilmelidir.
- Onarılmış zincir boş DB'de baştan sona başarıyla uygulanmalıdır.
- Onarılmış zincir development yedeği klonunda veri kaybetmeden uzlaştırılmalıdır.
- `migrate status` temiz, DB-schema diff boş olmalıdır.
- Production yedeği klonunda dry-run yapılmadan production deployment yapılmamalıdır.

## Sonraki Önerilen Görev

**SPRINT-17C Baseline ve Migration Chain Reconstruction** yapılmalıdır.

Bu görev yalnızca development dışında geçici çalışma dizini ve geçici veritabanlarında:

1. Mevcut tam şemadan legacy baseline üretmeli.
2. Altı migrationı geçerli 14 haneli adlar ve doğru bağımlılık sırasıyla yeniden kurmalı.
3. Drift kararlarını migrationa yansıtmalı.
4. Boş DB kurulumunu başarıyla tamamlamalı.
5. Development yedeği klonunda veri korumalı repair provası yapmalı.
6. Sonuç temiz olduğunda production dry-run için ayrıca kullanıcı onayı istemelidir.

## Görev Sonu Cevapları

- Yeni yedek alındı mı? **Evet.**
- Geri yükleme testi başarılı mı? **Evet.**
- 6 migration gerçekten uygulanmış mı? **Ana yapısal nesneleri bakımından evet; DB'de mevcut, Prisma geçmişinde kayıtsız.**
- Checksum sorununun nedeni nedir? **Core migration dosyası uygulandıktan yaklaşık 14 saniye sonra değiştirilmiş. Uygulama anındaki orijinal dosya bulunamadı.**
- Drift tamamen giderildi mi? **Hayır. Bu görevde güvenlik gereği DB/schema değiştirilmedi.**
- Migration geçmişi artık güvenli mi? **Hayır. Geçici resolve denemesi P3017 ile durdu; ana development geçmişine dokunulmadı.**
- Development ortamı tamamen sağlıklı mı? **Çalışma zamanı CRM/Satış smoke testleri başarılı; migration yönetimi sağlıklı değil.**
- Production Dry-Run aşamasına geçebilir miyiz? **Hayır. Önce baseline ve migration zinciri yeniden kurulmalı.**
- Kalan en kritik risk nedir? **Tam baseline bulunmaması ve kayıtsız/yeniden sıralanması gereken migrationlar nedeniyle temiz veya mevcut bir production şemasına güvenli ve tekrarlanabilir deploy yapılamaması.**

