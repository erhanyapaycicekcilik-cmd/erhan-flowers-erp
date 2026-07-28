# ERP Stabilizasyon Hazırlık Raporu - 20.07.2026 Gece

Bu rapor yalnızca analiz ve hazırlık içindir. Bu gece veritabanında veri değiştirilmedi, kayıt silinmedi, klasör taşınmadı, migration çalıştırılmadı.

## Login Sorununun Nedeni

- Kullanıcı kayıtları veritabanında mevcut ve aktif:
  - `owner@erhanflowers.com` → `OWNER`, `ACTIVE`
  - `personel@erhanflowers.com` → `STAFF`, `ACTIVE`
- Kod seviyesinde login akışı doğru kullanıcıyı bulup şifreyi kontrol ediyor.
- Dış bilgisayardan giriş sorununun ana riski kullanıcı kaydı değil, bağlantı ve adres yapısıdır:
  - Frontend `3001` portundan çalışıyor.
  - Backend `8001` portundan çalışıyor.
  - Başka bilgisayardan giriş için hem `3001` hem `8001` aynı ağda açık olmalı.
  - Windows güvenlik duvarı veya IP değişimi olursa login ekranı açılır ama API çağrısı başarısız olur.
- Ek risk: `AuthService.login()` her başarılı girişte `users.remember_token` alanını günceller. Bu yüzden gece canlı login testi yapılmadı; login testi veri değişikliği sayılır.

İlgili dosyalar:
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.guard.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/login/page.tsx`

## Stok Sistemi Durumu

- Bugün oluşturulan stok kartı sayısı: `14`
- Kimlik alanı eksik stok kartı sayısı: `14`
- Eksik alanlar:
  - `sku` / stok kodu eksik
  - `barcode` eksik
  - bazı kayıtlarda `model` eksik
  - bazı kayıtlarda geçici `STOK-235` gibi eski placeholder model var
- Bugün oluşturulan Product kaydı: `0`
- Bugün oluşturulan Trendyol varyasyon kaydı: `0`

Bugünkü eksik stok kartları:

| ID | Ürün | Kategori | Mevcut SKU | Mevcut Model | Mevcut Barkod | Bağlantı |
|---|---|---|---|---|---|---|
| 235 | Siyah Mdf Saksı 70x18x15 | - | boş | STOK-235 | boş | 1 görsel, 1 maliyet saksı bağlantısı |
| 236 | Mdf Saksı 70x18x15 | - | boş | STOK-236 | boş | 2 görsel, 2 maliyet saksı bağlantısı |
| 237 | YAPAY MA | - | boş | STOK-237 | boş | 2 görsel, bağlantı yok, pasif |
| 238 | YAPAY MİNELİ MAVİ ŞAKAYIK 45CM | YAPAY DEMET | boş | STOK-238 | boş | 2 görsel, 1 stok hareketi |
| 239 | MOR GÜL DEMETİ 45CM | YAPAY DEMET | boş | STOK-239 | boş | 3 görsel, 1 stok hareketi, 1 maliyet bağlantısı |
| 240 | PEMBE GÜL DEMETİ 45CM | YAPAY DEMET | boş | STOK-240 | boş | 2 görsel, 1 stok hareketi |
| 241 | TURUNCU MİNELİ ŞAKAYIK 45CM | YAPAY DEMET | boş | STOK-241 | boş | 2 görsel, 1 stok hareketi |
| 242 | TURUNCU GÜL DEMETİ 45CM | YAPAY DEMET | boş | STOK-242 | boş | 2 görsel, 1 stok hareketi |
| 243 | PUDRA GÜL DEMETİ 45CM | YAPAY DEMET | boş | STOK-243 | boş | 2 görsel |
| 244 | MAVİ GÜL DEMETİ 45CM | YAPAY DEMET | boş | STOK-244 | boş | 2 görsel, 1 stok hareketi |
| 245 | EKRU GÜL DEMETİ 45CM | YAPAY DEMET | boş | STOK-245 | boş | 2 görsel |
| 246 | KIRMIZI MİNELİ ŞAKAYIK 45CM | YAPAY DEMET | boş | STOK-246 | boş | 2 görsel, 1 stok hareketi |
| 253 | Çit Açılır Kapanır Sarmaşıklı 3x1 metre | - | boş | boş | boş | 2 görsel, 1 maliyet malzeme bağlantısı |
| 254 | Siyah Gümüş 40x30Metal Saksı | saksı | boş | boş | boş | 1 görsel, 1 maliyet malzeme bağlantısı |

## Model Kodu Sistemi Durumu

- Eski stok kartlarında model kodu örneği: `STK-000226`
- DB içinde en son görülen stok model numarası: `226`
- Bugünkü kayıtlarda `STOK-235`, `STOK-236` gibi eski/yanlış geçici model değerleri var.
- Yeni stok kartı oluşturma servisinde model kodu üretimi yok. Backend sadece frontend'den gelen `model` değerini kaydediyor.

İlgili dosya:
- `backend/src/stock-cards/stock-cards.service.ts`

## Barkod Sistemi Durumu

- Eski klasör adları barkod kuralını gösteriyor:
  - `DMT-0119_869900000000229_URUN_ADI`
- `D:\stok görseller` klasörlerinden okunan en büyük barkod: `869900000000230`
- Stok kartı tablosunda eski barkodların çoğu boş olduğu için barkodun son numarası DB'den değil klasörlerden okunmalı.
- Product modülündeki barkod servisi sadece `products` tablosu için çalışıyor, `stock_cards` için çağrılmıyor.

İlgili dosyalar:
- `backend/src/barcodes/barcodes.service.ts`
- `backend/src/stock-cards/stock-cards.service.ts`

## Kimlik Zinciri Durumu

Mevcut yeni stok akışı:

1. Frontend stok formunu gönderiyor.
2. Backend `StockCardsService.create()` gelen payload'u normalize ediyor.
3. Backend `sku`, `model`, `barcode` üretmeden kayıt oluşturuyor.
4. Fotoğraf yüklenirse klasör adı mevcut boş/eksik kimliklerden üretildiği için yalnızca ürün adı veya `stok-235` gibi eski yol kalıyor.

Olması gereken akış:

1. Stok kartı adı ve kategori doğrulanır.
2. Stok kodu ön eki belirlenir.
3. Son sıra numarası bulunur.
4. Stok kodu üretilir.
5. Model kodu üretilir.
6. Barkod üretilir.
7. Stok kartı transaction içinde kaydedilir.
8. Görsel klasörü `STOKKODU_BARKOD_URUNADI` formatıyla açılır.
9. Görsel kayıtları bu klasöre bağlanır.

## Perşembe Mantığı ve Bugünkü Mantık Farkı

Perşembe çalışan veri mantığı:
- Stok kodu kategoriden türetilmiş ön ek ile gidiyor:
  - `DMT` → Yapay Demetler, son numara `0119`
  - `PSK` → Plastik Saksılar, son numara `0024`
  - `MSK` → Metal Saksılar, son numara `0036`
  - `GOV` → Ağaç Gövdeleri, son numara `0010`
  - `SRM` → Sarmaşıklar, son numara `0010`
  - `YAP` → Yapraklar, son numara `0024`
  - `BMG` → Bambu Gövdeleri, son numara `0001`
- Model kodu `STK-000xxx` formatında.
- Klasör adı `STOKKODU_BARKOD_URUNADI`.

Bugünkü mantık:
- Frontend boş `sku`, `model`, `barcode` gönderebiliyor.
- Backend bunları otomatik üretmeden kaydediyor.
- Klasör adı kimlikler oluşmadan belirlendiği için kopuk.

## Boş Klasör Durumu

`D:\stok görseller` altında boş klasörler bulundu. Silinmedi.

Örnek boş klasörler:
- `D:\stok görseller\DMT-0054_869900000000071_YAPAY_KASIMPATI_DEMETI_KIRMIZI`
- `D:\stok görseller\DMT-0054_869900000000071_YAPAY_KASIMPATI_DEMETI_FUSYA`
- `D:\stok görseller\DMT-0082_869900000000110_YAPAY_YILDIZ_CICEGI_BEYAZ_90CM`
- `D:\stok görseller\PSK-0001_869900000000130_MANOLYA_DIJON_GRI_13X12_PLASTIK_SAKSI`
- `D:\stok görseller\PSK-0002_869900000000131_FULYA`

Bu klasörler onarımda silinmemeli. Önce kullanıcı onayıyla arşivleme planı yapılmalı.

## YAPAY MA Deneme Kaydı

- Stok kartı ID: `237`
- Durum: `PASSIVE`
- SKU: boş
- Model: `STOK-237`
- Barkod: boş
- Görsel sayısı: `2`
- Stok hareketi: `0`
- Sayım bağlantısı: `0`
- Maliyet bağlantısı: `0`
- Stok kullanım logu: `0`

Silinmedi. Sabah istenirse onayla kalıcı test kaydı temizliğine ayrı alınabilir.

## Değiştirilecek Dosyalar

Zorunlu:
- `backend/src/stock-cards/stock-cards.service.ts`
  - stok kodu, model kodu, barkod üretimi
  - transaction güvenliği
  - klasör adı üretimi
- `frontend/src/app/stock-cards/page.tsx`
  - yeni stok formunda kimlik alanlarını boş zorunlu giriş gibi bırakmama
  - otomatik üretilecek alanları kullanıcıya bilgi olarak gösterme

Hazırlanan ama çalıştırılmayan dosya:
- `backend/scripts/repair-stock-identities.js`

Muhtemel:
- `backend/src/stock-cards/stock-cards.controller.ts`
  - onarım endpointi açılmayacaksa gerek yok; script yeterli.

## Onarım Sırası

1. Uygulama durdurulur.
2. Veritabanı yedeği alınır.
3. `D:\stok görseller` klasörü yedeklenir.
4. MDF saksılar için stok kodu ön eki netleştirilir.
5. Hazırlanan onarım scripti önce dry-run olarak çalıştırılır.
6. Rapor kullanıcıya gösterilir.
7. Kullanıcı onay verirse apply modu çalıştırılır.
8. Eksik 14 kayda stok kodu, model kodu ve barkod yazılır.
9. Görsel klasörleri ayrı adımda taşınır veya medya kayıtları yeni klasöre bağlanır.
10. Yeni stok ekleme akışı düzeltilir.
11. Yeni bir test stok kartı açılır.
12. Model, stok kodu, barkod ve klasör adı kontrol edilir.

## Veri Kaybı Riski

- Veritabanı kimlik alanları için risk düşük.
- Görsel klasör taşıma için risk orta.
- Klasör taşıma yapılmadan önce tüm dosya yolları raporlanmalı ve klasör yedeği alınmalı.
- Eski kayıtlara dokunulmamalı.

## Rollback Planı

1. Onarım scripti apply modunda çalışırsa önce `tmp/stock-identity-repair-backup-*.json` oluşturacak.
2. Bu dosyada her kaydın eski ve yeni kimliği tutulacak.
3. Geri dönüş gerekirse:
   - ilgili 14 stok kartının `sku`, `model`, `barcode` alanları backup değerlerine döndürülür.
   - taşınan klasörler eski adlarına geri alınır.
   - medya kayıtlarındaki `folderName` ve `filePath` değerleri backup üzerinden geri yazılır.
4. Veritabanı tam yedeği varsa doğrudan yedekten geri dönülebilir.

## Tahmini İşlem Süresi

- Yedek alma: 5-10 dakika
- Dry-run kontrol: 2 dakika
- MDF/Belirsiz kayıt onayı: 2-5 dakika
- Kimlik onarımı: 1-2 dakika
- Görsel klasör düzenleme: 10-20 dakika
- Yeni stok akışı düzeltme ve test: 20-30 dakika

Toplam güvenli süre: yaklaşık 45-60 dakika.

## Sabah İçin Kritik Karar

MDF saksılar için stok kodu ön eki seçilmeli:

- Seçenek 1: `MSK` altında devam etsin.
- Seçenek 2: ayrı `MDF` ön eki açılsın.
- Seçenek 3: başka bir işletme ön eki belirlensin.

Onay gelmeden bu 3 kayıt otomatik onarılmamalı:
- `235` Siyah Mdf Saksı 70x18x15
- `236` Mdf Saksı 70x18x15
- `237` YAPAY MA
