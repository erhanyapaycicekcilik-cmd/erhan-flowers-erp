# SPRINT-17C Migration Baseline Reconstruction Raporu

Tarih: 22.07.2026

## Yönetici Özeti

Prisma migration zinciri mevcut çalışan development veritabanı değiştirilmeden yeniden oluşturuldu. Eski migrationlar silinmedi; ayrı bir arşiv klasörüne taşındı. Güncel `schema.prisma` dosyasından tam legacy baseline üretildi ve Sprint-17C drift farklarını mevcut veritabanı klonlarında giderecek ikinci bir uyumluluk migrationı eklendi.

Yeni zincir tamamen boş PostgreSQL veritabanında baştan sona başarıyla uygulandı. `prisma migrate status` temiz ve Prisma schema diff boş çıktı. Development yedeğinin bağımsız klonunda eski geçmiş arşivlenerek yeni baseline işaretleme ve uyumluluk migrationı da başarıyla prova edildi; veri sayıları korundu.

Production ortamına bağlanılmadı. Çalışan development veritabanının verisi, şeması ve `_prisma_migrations` tablosu değiştirilmedi.

## Güvenlik Kopyaları

### Kaynak Kod Snapshot'ı

- Konum: `snapshots/SPRINT-17C-BEFORE-BASELINE-RECONSTRUCTION-001`
- Dosya sayısı: 584
- Boyut: 209.536.936 byte
- Gerçek `.env` dosyaları, `node_modules`, build çıktıları, upload ve veritabanı klasörleri snapshot dışında bırakıldı.

### Development Veritabanı Yedeği

- Konum: `backups/database/SPRINT-17C-BASELINE-PRE-DEV-20260722-234433.dump`
- Boyut: 529.021 byte
- SHA-256: `64519F9C60976678EBB02DE9EB4A134BD49B282E5F229FEFA75BAB7776BCFF3B`
- Kaynak: Yalnızca development DB, `localhost:5433 / erhan_flowers_panel_dev`

## Migration Zincirinin Önceki Hatası

Eski zincirin sıfırdan çalışmamasının dört nedeni vardı:

1. Repository'de `users`, `stock_cards`, `production_families`, finans ve diğer legacy tabloları oluşturan başlangıç migrationı yoktu.
2. İlk kayıtlı Knowledge Base migrationı var olmayan `production_families` tablosuna FK eklemeye çalışıyordu ve boş DB'de `P3018 / 42P01` veriyordu.
3. Altı Sprint-17B/17C migrationı 8 haneli `20260722_...` adları nedeniyle `migrate resolve` işleminde `P3017` veriyordu.
4. CRM ve Sales migrationlarının alfabetik sırası gerçek tablo/kolon bağımlılık sırasıyla uyumlu değildi.

## Checksum Kök Nedeni

Sorunlu dosya:

`20260722123544_add_knowledge_base_core/migration.sql`

- DB checksum: `889b4f068c3a5eeb099b5fa4a9fa823d6dcfad3c1e34a076872f36aad2c67fe7`
- Mevcut eski dosya checksum: `f0c1a504ff9fcc71dc4e7f22b241e9eaac6bbff9fa257351c8439a7af96ab2f3`
- Uygulanma zamanı: `09:36:16 UTC`
- Dosya son yazma zamanı: `09:36:30 UTC`

Kök neden, migration dosyasının uygulandıktan yaklaşık 14 saniye sonra değiştirilmesidir. Uygulama anındaki orijinal içerik snapshot'larda bulunamadı.

Eski checksum elle değiştirilmedi. Sorun yeni değişmez baseline zinciriyle çözüldü; eski dosyalar denetim için arşivde korundu.

## Yeniden Oluşturulan Migration Zinciri

Aktif zincir:

1. `20260722234500_reconstructed_full_baseline`
2. `20260722234600_align_sprint17c_schema`

Eklenen migration kilidi:

`backend/prisma/migrations/migration_lock.toml`

Eski zincirin arşivi:

`backend/prisma/migrations_pre_baseline_20260722`

### Full Baseline

Baseline, Prisma 5.22.0 ile güncel `schema.prisma` dosyasından `migrate diff --from-empty` kullanılarak üretildi.

- SQL satırı: 1.737
- Boyut: 70.926 byte
- SHA-256: `A606D2210E4F30329FAD02337D65FE286F36A5C7AC32FDE7C603DC49A8540E4A`
- Kapsam: Güncel ERP şemasındaki 62 public tablo, enumlar, indeksler, dış anahtarlar ve diğer şema nesneleri

### Sprint-17C Uyum Migrationı

Mevcut DB klonlarında tespit edilen şu farkları giderir:

- Üç `updated_at` kolonundaki fazla `CURRENT_TIMESTAMP` default değerini kaldırır.
- `retail_sale_status_history` tablosundaki iki FK'yi Prisma referential action tanımlarıyla hizalar.

Migration tekrar uygulanabilir bir baseline sonrasında da güvenli çalışacak şekilde `DROP CONSTRAINT IF EXISTS` kullanır.

## Migration Bağımlılık Sırası

Legacy ve Sprint-17C nesneleri artık tek full baseline içinde Prisma'nın ürettiği bağımlılık sırasıyla kurulmaktadır. Ayrı ve hatalı eski CRM/Sales sıralaması aktif zincirde bulunmaz.

Yeni sıra:

1. Tüm enumlar
2. Bağımsız temel tablolar
3. Bağımlı ERP, Stok, Finans, Ürün, CRM, Satış ve Bilgi Merkezi tabloları
4. İndeksler
5. Dış anahtarlar
6. Mevcut Sprint-17C veritabanları için metadata uyumluluk düzeltmesi

## Boş Veritabanı Testi

Geçici `sprint17c_baseline_clean_test` veritabanı tamamen boş oluşturuldu.

Sonuçlar:

| Kontrol | Sonuç |
|---|---|
| Full baseline uygulandı | Başarılı |
| Sprint-17C alignment uygulandı | Başarılı |
| Toplam migration geçmişi | 2 |
| `prisma migrate status` | `Database schema is up to date` |
| DB -> `schema.prisma` diff | Boş migration |
| Prisma Client üretimi | Başarılı, Prisma 5.22.0 |
| TypeScript `tsc --noEmit` | Başarılı |

## Mevcut Development Klonu Repair Provası

Yeni development yedeği bağımsız `sprint17c_existing_clone_repair` veritabanına geri yüklendi.

Prova sırası:

1. Eski `_prisma_migrations` kaydı `migration_audit` şemasındaki denetim tablosuna kopyalandı.
2. Yalnızca geçici klondaki aktif migration geçmişi temizlendi.
3. Yeni full baseline `prisma migrate resolve --applied` ile işaretlendi.
4. Alignment migrationı `prisma migrate deploy` ile uygulandı.
5. `migrate status` ve schema diff doğrulandı.

Sonuç:

- `migrate status`: Temiz
- Schema diff: Boş
- Yeni migration geçmişi: 2 kayıt
- Arşivlenen eski geçmiş: 1 kayıt
- Kullanıcı: 2
- Stok kartı: 291
- Trendyol varyasyonu: 938
- CRM müşterisi: 2
- Satış: 2
- Veri kaybı: Tespit edilmedi

Bu işlem ana development DB'de uygulanmadı.

## Backend ve Modül Smoke Testleri

Backend boş baseline test DB'siyle ayrı `8201` portunda başlatıldı. Test sonrasında bu süreç kapatıldı.

Geçici test DB'ye yalnızca kimlik doğrulama için development kullanıcı kayıtları kopyalandı; CRM/Satış verisi eklenmedi.

| Test | Sonuç |
|---|---|
| Backend başlangıcı | Başarılı |
| Login | HTTP 201 |
| CRM Dashboard | HTTP 200 |
| CRM Müşteri Listesi | HTTP 200 |
| Satış Listesi | HTTP 200 |
| Sonraki Satış Numarası | HTTP 200 |
| Bilgi Merkezi Bitki Aileleri | HTTP 200 |
| Bilgi Merkezi Reçeteler | HTTP 200 |
| Bilgi Merkezi Kurallar | HTTP 200 |
| Bilgi Merkezi Analiz Logları | HTTP 200 |

Boş veritabanında sonraki satış numarası `EF-2026-000001` olarak üretildi.

## Development ve Production Güvenliği

- Ana development DB migration satırı görev sonunda hala: 1
- Ana development kritik veri sayıları: kullanıcı 2, stok kartı 291, Trendyol varyasyonu 938, CRM müşterisi 2, satış 2
- Geçici test veritabanları görev sonunda kaldırıldı.
- Test backend 8201 kapatıldı.
- Canlı 3001/8001 ve development 3101/8101 servisleri görev sonunda dinlemeye devam ediyordu.
- Production DB'ye bağlantı kurulmadı.

## Değiştirilen ve Oluşturulan Dosyalar

- `backend/prisma/migrations/20260722234500_reconstructed_full_baseline/migration.sql`
- `backend/prisma/migrations/20260722234600_align_sprint17c_schema/migration.sql`
- `backend/prisma/migrations/migration_lock.toml`
- `backend/prisma/migrations_pre_baseline_20260722/` eski migration arşivi
- `backend/src/generated/prisma-client/` Prisma Client yeniden üretildi
- `docs/SPRINT-17C-MIGRATION-BASELINE-RECONSTRUCTION-RAPORU.md`

## Bilinen Riskler

1. Ana development DB geçmişi kurala uygun olarak henüz yeni baseline'a geçirilmedi; bunu yapmak ayrı onaylı işlem olmalıdır.
2. Production şeması ve verisi bu görevde incelenmedi. Production dry-run mutlaka production yedeğinin bağımsız klonunda yapılmalıdır.
3. `npm run build`, çalışan processin `dist` içindeki Prisma query-engine dosyasını kilitlemesi nedeniyle `EBUSY` verdi. `tsc --noEmit` ve ayrı backend runtime testi başarılıdır; release build için izole build dizini kullanılmalıdır.
4. Full baseline schema oluşturur fakat seed/master data stratejisi migrationdan ayrıdır. Zorunlu başlangıç verileri ayrıca idempotent seed olarak doğrulanmalıdır.
5. Eski migration arşivi aktif zincire geri taşınmamalıdır.

## Production Dry-Run Değerlendirmesi

**Migration zinciri Production Dry-Run aşamasına geçmeye hazırdır. Production deployment'a henüz hazır değildir.**

Dry-run yalnızca production tam yedeğinin bağımsız klonunda şu sırayla yapılmalıdır:

1. Production yedeğini bağımsız test PostgreSQL'e geri yükle.
2. Eski migration geçmişini `migration_audit` şemasında arşivle.
3. Full baseline'ı uygulanmış olarak işaretle.
4. Alignment migrationını uygula.
5. Migration status ve schema diff doğrula.
6. Satır sayıları, FK'ler, login, stok, maliyet, CRM, satış ve Bilgi Merkezi testlerini çalıştır.
7. Sonuç temiz değilse production deployment planını durdur.

## Soruların Doğrudan Cevapları

- Migration zinciri yeniden oluşturuldu mu? **Evet.**
- Legacy baseline sorunu çözüldü mü? **Evet; full baseline boş DB'de başarıyla çalıştı.**
- Checksum problemi çözüldü mü? **Yeni aktif zincirde evet; eski bozuk kayıt ve dosyalar arşivde kanıt olarak korunuyor.**
- Schema drift giderildi mi? **Boş DB ve onarılmış development klonunda evet. Ana development DB kurala uygun olarak değiştirilmedi.**
- Boş veritabanında tüm migrationlar başarıyla çalıştı mı? **Evet.**
- Prisma migrate status temiz mi? **Boş test DB ve repair klonunda evet. Ana development DB henüz uzlaştırılmadı.**
- CRM testleri başarılı mı? **Evet.**
- Satış testleri başarılı mı? **Evet.**
- Development veritabanına dokunuldu mu? **Hayır.**
- Production ortamına dokunuldu mu? **Hayır.**
- Production Dry-Run aşamasına geçmeye hazır mıyız? **Evet, yalnızca production yedeğinin bağımsız klonunda.**
- Kalan son riskler nelerdir? **Production şemasının bilinmemesi, ana development geçmişinin henüz uzlaştırılmaması, izole release build ihtiyacı ve zorunlu seed verilerinin ayrıca doğrulanması.**

