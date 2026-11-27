# Erhan Flowers ERP — Claude Bağlam Dosyası

Bu dosya her yeni Claude oturumunda otomatik okunur. Sunucu, deploy ve proje bilgilerini içerir.

## Sunucu Bilgileri

- **Hosting:** Hetzner Cloud (Helsinki DC Park 1)
- **IP:** 77.42.122.169
- **Kullanıcı:** root
- **Proje dizini:** /opt/erp
- **SSH key:** ~/.ssh/github_actions (kullanıcının Windows makinesinde)
- **Hetzner Console:** console.hetzner.cloud → sunucuya tıkla → >_ Console (şifresiz giriş)

## Deploy Komutu

Sunucuda (`/opt/erp` dizininde):

```bash
cd /opt/erp
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

## GitHub Actions Deploy (Otomatik)

PR main'e merge edilince otomatik deploy olur (~3-5 dakika).
Claude her zaman `mcp__github__merge_pull_request` ile merge yapabilir — kullanıcıya GitHub'a gitmesini söyleme.

**Gerekli Secrets** (github.com/erhanyapaycicekcilik-cmd/erhan-flowers-erp/settings/secrets/actions):
- `SSH_HOST` = `77.42.122.169`
- `SSH_PASSWORD` = sunucu root şifresi
- `GH_TOKEN` = GitHub Personal Access Token (repo yetkili)

## Proje Yapısı

```
erhan-flowers-erp/
├── backend/          NestJS API (port 8001)
├── frontend/         Next.js 14 App Router (port 3000) — ERP yönetim paneli
├── florayapay/       Next.js 14 App Router (port 3200) — E-ticaret müşteri sitesi
├── docker-compose.prod.yml   Production deploy
├── docker-compose.yml        Sadece PostgreSQL (local)
├── Caddyfile         Reverse proxy + SSL
└── docs/             Proje dokümanları
```

## Domain & URL'ler

- **ERP Panel:** https://erp.erhanflowers.com (eski: erp.florayapaycicek.com → yönlendiriyor)
- **Backend API:** https://api.erhanflowers.com (eski: api.florayapaycicek.com → yönlendiriyor)
- **E-Ticaret Sitesi (canlı):** https://www.erhanflowers.com (eski: florayapaycicek.com → 301 yönlendiriyor)
- **E-Ticaret Sitesi (lokal geliştirme):** http://localhost:3200

## Florayapay E-Ticaret Sitesi Geliştirme

**Lokal başlatma:**
```powershell
cd "C:\Users\Erhan Flowers\Documents\Codex\2026-06-23\coding-phase-1-erhan-flowers-erp\florayapay"
npm run dev
```
Sonra tarayıcıda: **http://localhost:3200**

**Önemli notlar:**
- `florayapay/` klasörü bağımsız Next.js projesi — ERP backend'e bağlı değil, kendi static/API'si var
- Ürün verileri ERP backend'den değil, florayapay'ın kendi `src/lib/api/catalog.ts`'inden geliyor
- Canlıya almak için: Hetzner konsolunda `docker compose -f docker-compose.prod.yml build florayapay && docker compose -f docker-compose.prod.yml up -d florayapay caddy`
- Container adı: `erhan-flowers-florayapay-prod`

**Bilinen sorunlar (düzeltilecek):**
- Marka adı "Flora Yapay Çiçek" oldu; `public/logo.png` görselinde hâlâ "Erhan Flowers" yazıyor — yeni logo dosyası gerekli

## Container İsimleri

- erhan-flowers-backend-prod
- erhan-flowers-frontend-prod
- erhan-flowers-caddy-prod
- erhan-flowers-postgres-prod

## Platform Entegrasyonları

| Platform | Durum | Notlar |
|---|---|---|
| Trendyol | Aktif | pushPrice: barcode veya modelCode |
| N11 | Aktif | pushPrice: product-create endpoint'i kullanır |
| Hepsiburada | Aktif | pushPrice: hepsiburadaSku = barcode ?? modelCode |
| Amazon (TR) | Kod hazır, API bilgisi bekleniyor | SP-API (`adapters/amazon.adapter.ts`), EU endpoint, pazaryeri `A33AVAJ2PDY3EV`. Bilgiler: MERCHANT_ID=Satıcı ID, API_KEY=LWA Client ID, API_SECRET=LWA Client Secret, TOKEN=Refresh Token. pushPrice/pushProduct = Listings PATCH (SKU = barcode, yoksa modelCode; ilan Amazon'da önceden açılmış olmalı). Siparişler 15dk cron `runAmazonSync` → marketplace_orders + retail_sales |
| Koçtaş (Mirakl) | Kod hazır, API anahtarı bekleniyor | `adapters/koctas.adapter.ts`. API `https://koctas.mirakl.net/api`, başlık `Authorization: <API anahtarı>` (Bearer yok). Bilgiler: API_KEY = Satış Ortağım > Kişisel ayarlar > API anahtarı, SUPPLIER_ID = mağaza (shop) ID, isteğe bağlı. Test A01 `/account`; siparişler OR11 `/orders` → 15dk cron `runKoctasSync` → marketplace_orders (durum = Mirakl `order_state`); fiyat PRI01 `/offers/pricing/imports`, stok STO01 `/offers/stock/imports` (CSV `offer-sku;…`, teklif kodu = barcode ?? modelCode; sadece o alan güncellenir, yeni ilan açmaz). Siparişler Mirakl panelinden **kabul edilmeli** (WAITING_ACCEPTANCE), ERP otomatik kabul etmez |

## Fiyat/Stok Senkronizasyonu

- Ürün kaydedilince → tüm platformlara otomatik yayın (`broadcastPriceStock`)
- Maliyet onaylanınca → tüm platformlara otomatik yayın (`broadcastApprovedCost`)
- Toplu gönderim → `/products/broadcast-all` (ürünler sayfasında buton var)
- Eşleştirme: `barcode` yoksa `modelCode` kullanılır
- Platform bağlantı listesi 5dk TTL cache ile tutulur
- **Site fiyatı = güncel Trendyol fiyatının %25 altı** (`backend/src/common/site-pricing.ts`, `SITE_TRENDYOL_DISCOUNT_PERCENT`). Okuma anında hesaplanır (Trendyol fiyatı her gece 04:00 senkronlanır); Product kaydında dükkan fiyatının altına inmez; WEB- ürünler ERP site fiyatıyla satılır. Sitede sadece Trendyol'da ACTIVE olan ürünler listelenir. Üstü çizili fiyat "Trendyol'da" etiketiyle gösterilir
- **Fiyat koruması** (`backend/src/common/price-guard.ts`, `IntegrationsService.applyPriceGuard`): `pushPrice` / `pushPriceForStore` ile giden fiyat, o mağazanın bilinen platform fiyatının (`trendyol_product_variants` trendyol/n11/hepsiburada_sale_price, `store_code` ile) **%10'dan fazla altındaysa gönderilmez**, mevcut fiyat korunur, stok yine gider; `integration_sync_logs` action `PRICE_GUARD` / `BLOCKED`. Eşik `PRICE_DROP_GUARD_PERCENT` (0 = kapalı). Bilerek indirim: Toplu Zam/İndirim (`allowPriceDrop: true`) veya Katalog Stratejisi yayını (önce ERP fiyatını günceller). Stok kartı güncellemesi artık alış fiyatını (`purchasePrice`) pazaryerine **asla** fiyat olarak göndermez
- **15 dakikada bir cron**: `OrderSyncService.syncAllPlatforms()` — tüm platformlarda teslim edilmiş siparişleri otomatik DELIVERED yapar (`markMissingAsDelivered`)

## Katalog Stratejisi (`/katalog-stratejisi`, sadece OWNER)

- Backend: `backend/src/catalog-strategy/` — `GET /catalog-strategy/cleanup/preview?company=ERHAN|FLORA&days=&minSold=`, `POST /catalog-strategy/cleanup/apply` (onay metni `SATISA KAPAT`), `GET /catalog-strategy/bestsellers`, `POST /catalog-strategy/publish`
- Satmayanları kapatma = **silme değil**, stok 0 (Trendyol toplu, N11/HB ERP kaydı olanlar). ERHAN'da kapatılan varyant `PASSIVE` olur; `broadcastPriceStock` ve `broadcastApprovedCost` PASSIVE ürünleri tekrar açmaz
- Satış verisi `marketplace_orders` tablosundan; FLORA siparişleri `external_order_id LIKE 'FLORA\_%'`
- İki mağaza yayını: `PublishingService.sendToStores` (`POST /publishing/send-to-stores`). Varsayılan barkod iki mağazada aynı; FLORA'da model/stok kodu `FL-` ön ekli + %-3 fiyat. FLORA'da contentId/trendyolBarcode gönderilmez (yeni ürün açılır)
- ~~Yeni ürünü iki hesaba birden açma (`TRENDYOL_FLORA`)~~ kaldırıldı → "İki Bağımsız Mağaza" bölümüne bakın
- `IntegrationCenterService.storeCredentials(platform, company)`: ERHAN dışı mağazada .env'e **düşmez**, eksik API bilgisi varsa hata verir (Flora işlemi yanlışlıkla Erhan mağazasına gitmesin)

## İki Bağımsız Mağaza: Erhan Flowers / Flora Yapay Çiçek (11.2026)

- Her ürün tek mağazaya aittir: `products.store_code` + `trendyol_product_variants.store_code` (`ERHAN` varsayılan / `FLORA`), `backend/src/common/store.ts`
- **Flora ürün yükleme ayrı sayfada, aynı ekran:** `/flora/urunler` (menü **Flora** → Flora Ürün Yükleme; Flora Siparişleri = `/orders?magaza=FLORA`). Ürün Merkezi bileşeni `frontend/src/components/product-center/ProductCenterPage.tsx` iki sayfada kullanılır: `/products` = `storeMode="ERHAN"`, `/flora/urunler` = `storeMode="FLORA"`. Stok bileşenleri, reçete, maliyetten fiyat, kurallar birebir aynı; Flora'da Erhan toplu butonları gizli, marka/SEO adı/açıklama/hashtag "Flora Yapay Çiçek" (`currentBrand`; Gemini'ye `brand` gider, `GeminiContentService.enforceBrand` diğer markayı değiştirir). Diğer mağazanın ürünü açılırsa kendi sayfasına yönlenir
- **Flora kodları ayrı:** model kodu kendi serisi `FL-10001…` (`nextFloraModelCode`, Erhan kategori sayacını kullanmaz), yeni barkod 869 + seri no 900000000+ aralığı (`nextEan13Barcode(tx, 'FLORA')`), stok kodu model kodundan. Kayıtlı ürünün mağazası sonradan değişmez
- `/publishing/send`: ürün **kendi mağazasının** hesaplarına gider (`variant.storeCode`). Flora: Trendyol, Hepsiburada, N11, Trendrum (`storeCredentials(…,'FLORA')`, Erhan .env'ine düşmez). Erhan ürününde `TRENDYOL_FLORA` reddedilir (eski "aynı ürünü Flora'ya kopyala" kaldırıldı — hesap kapatma riski). `sendToStores` ve `trendyol-publish` de mağaza dışına göndermez
- Koruma: `IntegrationsService.pushPrice/pushProduct` (Erhan hesapları) Flora ürününü DB'den kontrol edip reddeder (`isFloraPayload`). Flora ürünü kaydı/maliyet onayı → `pushPriceForStore('FLORA')` (sadece fiyat/stok, API bilgisi olmayan platform atlanır)
- Flora ürünleri hariç: `broadcastAll`, görsel yayını, platform Excel'i, toplu zam/indirim (ve haftalık +5 TL), Erhan Trendyol senkronunun PASİF yapması, erhanflowers.com sitesi
- **Siparişler** (`/orders`) mağaza sekmesi "Flora Yapay Çiçek": Flora'nın tüm pazaryeri siparişleri tek listede (`/integrations/marketplace-orders?company=FLORA`, `external_order_id LIKE 'FLORA\_%'`), kanal filtreleri Flora (Trendyol/Hepsiburada/N11/Trendrum). Flora HB ve Trendrum siparişleri 15 dk cron'da `runFloraHepsiburadaSync` / `runFloraTrendrumSync`; Flora siparişi sadece Flora ürününün stoğunu düşer. Erhan'ın `markMissingAsDelivered`'ı `FLORA_` siparişlere dokunmaz
- Flora API bilgileri: Entegrasyon Merkezi → Florayapaycicek sekmesi (Trendyol: SUPPLIER_ID+API_KEY+API_SECRET, HB: MERCHANT_ID+şifre, N11: API_KEY+API_SECRET, Trendrum: API_KEY+API_SECRET)

## Siparişler Menüsü (tek giriş + sekmeler)

- Menüde Satış → **Siparişler** (`/orders`); sipariş sayfalarının üstünde `components/OrdersTabs.tsx` sekmeleri: Pazaryeri (`/orders`) · **Web & Telefon** (`/web-siparisler`: web_orders + telefon/WhatsApp/Instagram/dükkan retail_sales; tezgâhta COMPLETED dükkan satışları hariç; durumlar web durumlarına eşlenir, retail için `POST /sales/:id/status`) · **Çıktı Merkezi (A5)** (`/sabah-ciktisi`, tek çıktı yeri) · Telefon Siparişi Gir (`/adres-ciktisi`) · İadeler · EFT · Fotoğraf Arşivi. Personel ekranı (`/staff/orders`) ayrı
- Ödeme bekleyen (PENDING) web siparişleri personel ekranına / Çıktı Merkezi'ne düşmez
- **İadeler** (`/iade-takip`, `backend/src/returns/`): `GET /returns?q=` (q yoksa: platform iade durumları + `return_status` dolu + videolu; q varsa tüm marketplace_orders'ta sipariş/paket no, müşteri, kargo kodu, barkod, stok kodu, ürün adı araması), `PATCH /returns/:id/return-status` (WAITING / REJECT_REQUESTED / REJECTED / ACCEPTED / CLOSED / null), `POST /returns/:id/videos` (video/fotoğraf, 500MB; ilk videoda süreç WAITING), `GET /returns/videos/:file/stream?token=&download=1` (indirme adı `iade-<platform>-<siparişNo>-<id>`). Telefonda "Kamerayla Video Çek" (`capture=environment`). Platform panel linkleri: partner.trendyol.com, merchant.hepsiburada.com, so.n11.com

## Günlük Ciro (`/reports/ciro`, OWNER/MANAGER)

- `GET /dashboard/revenue?from=&to=` (`DashboardService.revenueLedger`, en fazla 400 gün): gün × kanal ciro, Türkiye saatiyle gün. Kaynaklar çakışmaz: pazaryerleri `marketplace_orders` (status ~ cancel/iptal/return/iade/undeliver/reject/refund hariç; `FLORA_` önekli → `<PLATFORM>_FLORA`), dükkan/telefon/WhatsApp/Instagram `retail_sales` elle girilenler (STORE/PHONE/WHATSAPP/INSTAGRAM/OTHER, sync NULL/MANUAL, CANCELLED/DRAFT hariç), web `web_orders` ödenmiş/onaylı. Tutar = sipariş tutarı (KDV dahil, komisyon/kargo düşülmez). Ekranda hazır aralıklar, kanal dağılımı, gün tablosu, CSV
- **Platformdan canlı** (varsayılan, `source=platform`; `source=erp` sadece ERP): Trendyol + n11 (Erhan ve Flora) siparişleri `IntegrationsService.platformRevenue` ile doğrudan API'den (`TrendyolAdapter.fetchOrdersBetween` 14 günlük parçalar, `HttpMarketplaceOrderAdapter.fetchOrdersBetween` 7 günlük); iptal/iade hariç. Başarılı kanalın ERP satırları platform rakamıyla değiştirilir, hata veren kanal ERP'de kalır (`platformErrors`). Flora `storeAdapter` (Erhan bilgisine düşmez). 10 dk önbellek (`refresh=1` yeniler); en fazla 93 gün / son 6 ay. Hepsiburada ve diğerleri ERP kaydından (tarih aralıklı API yok)
- Not: eski `/reports/gunluk` (dailyReport) retail_sales'in tümünü saydığı için pazaryeri siparişlerini iki kez sayabilir

## Hakedişler (`/reports/hakedis`, OWNER/MANAGER)

- `GET /dashboard/settlements?from=&to=&refresh=1` (en fazla 93 gün, 10 dk önbellek) → `IntegrationsService.platformSettlements`: Trendyol Erhan + Flora (`storeAdapter`) cari hesap ekstresi — `TrendyolAdapter.fetchFinance('settlements'|'otherfinancials', type)` (`${API_URL}/finance/che/sellers/{id}/…`, 15 günlük parçalar). Tipler: Sale (zorunlu), Return, Discount(Cancel), Coupon(Cancel), Provision±; otherfinancials PaymentOrder (yatan ödemeler) + DeductionInvoices (kesinti faturaları)
- Özet `integrations/settlements.ts` `summarizeSettlements` (tutarlar mutlak, yön işlem tipinden): satış, iade, indirim, komisyon, satıcı hakedişi, kesintiler, net, yatan ödemeler, vadesi gelecek (paymentDate ≥ bugün, paymentOrderId yok)
- Hepsiburada / n11 hakediş servisi resmi dokümanda doğrulanamadı → ekranda panel linki; diğer pazaryerleri API aktif olunca

## Boy Serisi (`/products/boy-serisi`, sadece OWNER)

- Bir ürünü farklı boylarda **ayrı ürün / ayrı ilan** olarak kopyalar: `POST /product-center/size-series/preview` ve `POST /product-center/size-series` (`{modelCode,startCm,endCm,stepCm,priceStep,nameFrom,nameTo}`)
- Kaynak adındaki boy (`150 Cm`) → yeni boy; model kodu `<kaynak>-<boy>`, yeni EAN-13 barkod; görsel/açıklama/kategori/stok kopyalanır; fiyat her adımda ±priceStep. `trendyolProductUrl` ve `trendyolBarcode` kopyalanmaz (kaynak ilan ezilmesin). Var olan model kodu tekrar oluşturulmaz
- Sayfa oluşturduktan sonra `/publishing/send` ile Trendyol (Erhan+Flora), N11, HB'ye gönderir

## Toplu Zam / İndirim (`/products/toplu-zam`, sadece OWNER)

- Backend `backend/src/products/bulk-price.service.ts`: `POST /products/bulk-price/preview|apply` (`{mode:'PERCENT'|'AMOUNT', value, search?, minPrice?, maxPrice?, roundTo9?, variantIds?}`), `GET /products/bulk-price/status`, `POST /products/bulk-price/undo`
- Kapsam: ACTIVE `trendyol_product_variants` (WEB- hariç). Mevcut fiyat = `trendyolSalePrice` (yoksa draft `marketplaceSalePrice`). Uygulayınca `trendyolSalePrice` + draft `marketplaceSalePrice` + Product `marketPrice/listPrice` güncellenir, bağlı pazaryerlerine `pushPrice` (fiyat+stok) arka planda 10'arlı gider. Flora mağazası etkilenmez
- Eski fiyatlar `app_settings.bulk_price_last` → "Son işlemi geri al"
- Haftalık Pazar +5 TL cron'u (`ProductsService.weeklyPriceIncrease`, `WEEKLY_PRICE_INCREASE`, 0 = kapalı) bu servisi kullanır

## e-Dönüşüm / Fatura (`/e-donusum`, sadece OWNER)

- Backend: `backend/src/e-invoices/` — `GET/PUT /e-invoices/settings`, `POST /e-invoices/settings/test`, `GET /e-invoices/pending?days=`, `POST /e-invoices/issue` (`{items:[{sourceType,sourceId}]}` veya `{all:true}`), `GET /e-invoices`, `POST /e-invoices/:id/retry`, `GET /e-invoices/draft/:sourceType/:id`
- Kapsam: sadece dükkan/telefon/WhatsApp/Instagram satışları (`retail_sales`) + web siparişleri (`web_orders`). Pazaryeri siparişleri hariç
- Ayarlar `app_settings` tablosunda `einvoice_settings` anahtarında (şifre GET'te maskelenir); kayıtlar `e_invoices` tablosu
- Sağlayıcı: `providers/trendyol-efaturam.provider.ts` — Trendyol e-Faturam Bireysel Entegrasyon API (doküman: developers.trendyolefaturam.com/docs). Giriş: portal e-postası + şifre → `x-access-token` (JWT, companyId/userId içinden okunur). Test: `https://stage-apigateway.trendyolefaturam.com`, canlı: `https://apigateway.trendyolecozum.com`. Tutarlar **kuruş**. Fiyatlar KDV dahil kabul edilir
- **IP whitelist:** e-Faturam portalı → Entegrasyon → IP Adresi (en fazla 3, virgülle). Sunucu IP'si `77.42.122.169` ekli olmalı, yoksa Cloudflare 403. İstekler IPv4 ile atılır
- Şu an sadece **e-Arşiv** kesilir. Alıcı e-Fatura mükellefiyse (mükellef sorgusu) hata verir → portaldan kesilir
- Web siparişleri internet satışı: ayarlarda web sitesi + kargo firması adı/VKN zorunlu
- Her kayıt için ETTN (UUID) bir kez üretilir (`providerRef`) → tekrar denemede çift fatura olmaz (409'da durum sorgulanır)
- TEST ortamında kesilenler `provider = TRENDYOL_EFATURAM_TEST`: satışı "faturalandı" yapmaz, canlıda tekrar listelenir. Otomatik kesim sadece CANLI'da
- 15 dk cron (`autoIssue`): aktif + otomatik açık + CANLI ise son 7 günün faturasızlarını keser (3 hatalı denemeden sonra durur)

## Borçlar & Faturalar (`/borclar`, sadece OWNER)

- Sekmeler: **Tüm Borçlar** (özet + 45 günlük ödeme takvimi, `GET /suppliers/overview?days=`), Tedarikçiler (cari), **Taksitli Borçlar**, Faturalar (`BillsPanel`, `/faturalar` da aynı bileşeni kullanır)
- Taksitli borç: `backend/src/suppliers/installment-debts.*` — `installment_debts` + `debt_installments`. Toplam/taksit sayısı/ilk vade → eşit aylık taksit (kuruş farkı son taksitte, ay sonu taşmasında ayın son günü). `POST /installment-debts/installments/:id/pay` ödendi/geri al, `PUT .../installments/:id` tutar/vade düzelt. Cari bakiyeden bağımsızdır (aynı borcu iki yere girme)
- Fatura hesapları (`bill_accounts`): tür (Kira/Su/Elektrik/Doğalgaz/Telefon/İnternet/Kredi Kartı/Diğer), kurum, **abone/tesisat no**, opsiyonel gönderen e-posta. Her ay otomatik listelenir; aylık kayıt `bill_payments` (tutar, fatura no, son ödeme tarihi, kaynak MANUAL/EMAIL). `PUT /bill-accounts/:id/month` elle giriş
- **Gmail'den otomatik fatura**: her sabah 08:20 (`BillAccountsService.scanEmails`, elle `POST /bill-accounts/scan-email`) Gmail'de abone numarasını içeren son 45 günün e-postalarını okur, `bill-email-parser.ts` ile tutar/son ödeme/fatura no çıkarır. Elle girilmiş veya ödenmiş aya dokunmaz. Gmail bağlantısı mevcut `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI` OAuth'unu kullanır (`/integrations/gmail/auth`)
- Abone no alanına virgülle birden fazla numara girilebilir (ör. CK: hesap no + sözleşme no)
- **SMS'ten fatura (Android)**: telefondaki SMS Forwarder/MacroDroid → `POST /bill-accounts/sms-webhook?token=…` (JSON `{from,text}`; oturumsuz, token `app_settings.bill_sms_token`, `GET /bill-accounts/sms-settings` OWNER). SMS'teki numara hesapla eşleşir, aynı ayrıştırıcı kullanılır, son 30 SMS `bill_sms_log`'da. Kaynak `SMS`. ASAT su SMS'i gönderen `2728`, CK Akdeniz `252533649`
- **Tüm SMS'ler** gelebilir: hesapla eşleşmeyen ve fatura olmayan (banka/kod/kargo — `isBillLikeSms`) SMS hiç kaydedilmez. Eşleşmeyen fatura SMS'i/e-postası → günlükte `suggestion` (abone no + tür/kurum tahmini) → UI'da "Hesap olarak ekle"
- Takip edilen kurumlar: **Vodafone** (cep), **ASAT** (su), **CK Akdeniz** (elektrik), **Türk Telekom** (internet). E-posta keşfi: `scanEmails` sonunda `discoverUnknownBillEmails` (son 10 gün, sadece bu 4 kurumun alan adları, abone no + tutar şart). Hat numarası (5XXXXXXXXX) SMS/e-postada boşluklu/0 ile yazılsa da eşleşir; işlenen id'ler `bill_email_seen`
- **Uyarılar**: `GET /suppliers/alerts?days=3` → OWNER için tüm sayfalarda üst şerit (`PaymentAlertBanner`); her sabah 09:10 gecikmiş/3 gün içindekiler için `NOTIFY_EMAIL`'e e-posta (`SuppliersService.dailyReminderEmail`, test: `POST /suppliers/alerts/send-test`). Push kullanılmaz (abonelikler kullanıcıya bağlı değil, personele gider)
- **Birden fazla Gmail**: `/integrations/gmail/auth?purpose=bills` (OAuth `state=bills`) → hesap `app_settings.BILL_GMAIL_ACCOUNTS` (e-posta → token). Sipariş hesabı (`GMAIL_TOKENS`, 'primary') de taranır. Mesaj ref: primary'de id, diğerlerinde `email|id`. `DELETE /bill-accounts/mailboxes/:email`. Bağlanacaklar: erhanyapaycicekcilik@, florayapaycicek@, cheferhansevim@gmail.com (Google OAuth uygulaması test modundaysa bu hesaplar Test kullanıcısı olarak eklenmeli)
- Vodafone hatları 5446546220 / 5449176220, Türk Telekom internet hesap no 7037200938 (bayraklar `seed_vodafone_v1`, `seed_turktelekom_v1`, `seed_turktelekom_bills_v1`)
- **Personel maaşları** (Borçlar → Personel Maaşları sekmesi, `SalariesPanel`; backend `suppliers/salaries.*`, OWNER): `employees.net_salary` (Personel Özlük'te girilir) − o ay `salary_advances` = ödenecek; `salary_payments` (employee/yıl/ay, paid_at). Maaş günü `app_settings.salary_payday` (varsayılan 1). `GET /salaries?year&month`, `PUT /salaries/payday`, `POST /salaries/pay|unpay|advances`, `DELETE /salaries/advances/:id`. Ödenmemiş maaşlar `overview` (kind SALARY, `salaryUnpaid`), uyarı şeridi ve sabah e-postasına girer; 17.11.2026 öncesi vadeler sayılmaz. `/suppliers/overview|alerts` artık OWNER
- **Banka Borçları** (Borçlar → Banka Borçları sekmesi, `BankDebtsPanel`; backend `backend/src/bank-debts/`, OWNER): `bank_debt_accounts` (tür CREDIT_CARD/LOAN/OVERDRAFT/OTHER, banka, kartın son 4 hanesi / kredi no, limit, güncel borç, hesap kesim günü, son ödeme günü, kredi aylık taksit + bitiş) + `bank_statements` (ay = son ödeme tarihinin ayı; hesap kesim, son ödeme, dönem borcu, asgari, ödendi). `GET/POST /bank-debts`, `PUT/DELETE /bank-debts/:id`, `POST /bank-debts/:id/statements` (aynı ay varsa günceller), `PUT|DELETE /bank-debts/statements/:id`, `POST /bank-debts/statements/:id/pay` (ödendi/geri al), `GET /bank-debts/sms-log`. Ödenmemiş ekstreler + ekstresi girilmemiş ayların beklenen son ödeme günü (`unpaidForOverview`, kredi = aylık taksit) `overview` (kind BANK, `bankUnpaid`), uyarı şeridi ve sabah e-postasına girer
- Bankaların bireysel/işletme kart borcu için açık API'si yok (açık bankacılık lisanslı kuruluş ister) → veri **elle** veya **banka SMS'i** ile gelir: fatura SMS adresi (`/bill-accounts/sms-webhook`) önce `BankDebtsService.receiveSms`'i dener (`bank-sms-parser.ts`): ekstre/taksit SMS'i → o ayın ekstresi (elle girilmiş/ödenmiş aya dokunmaz), "kullanılabilir limit" → güncel borç = limit − kullanılabilir. Eşleşme son 4 hane / kredi no; yoksa o bankada tek hesap. Son 30 kayıt `app_settings.bank_sms_log`
- Tek seferlik kayıtlar: CK elektrik (Dükkan 1 4577106676 / Dükkan 2 8145873522 / Ev), ASAT su (Dükkan 1 1002112893 / Dükkan 2 1002112894 / Ev), ilk faturalar — bayraklar `seed_ck_electric_v1`, `seed_asat_water_v1`, `seed_initial_bills_v1`

## Sadece Sitede Satılan Ürünler (`WEB-` model kodu)

- Model kodu `WEB-` ile başlayan ürünler **sadece www.erhanflowers.com'da** satılır (`backend/src/common/site-only.ts`)
- Pazaryerlerine gönderilmez (`broadcastPriceStock`, `broadcastAll`, görsel yayını, platform Excel'i atlar) ve Trendyol ürün senkronu bunları PASİF yapmaz
- Bostann saksıları: `backend/src/site-only-catalog/` — backend açılışında eksikse eklenir (var olan kayda dokunmaz). 14 seri = 14 ürün grubu (`/urun-grubu/bostann-…-serisi-saksi`), her boyut×renk ayrı ürün (`WEB-BST-LUMEN140-BEJ`). Görseller `florayapay/public/bostann/`
- `WEB-BST-` ürünleri sitede düz listede gizli, sadece grup sayfasında (Boy + Renk seçimi) ve aramada görünür
- Kapatmak için: `SITE_ONLY_CATALOG_SEED=false` (yeni ekleme yapmaz) + ERP'den ürünleri/grupları pasif yap
- Fiber saksılar (`fiber-pots.data.ts`, `WEB-SRN-FBR…`): 69 ürün, Saksılar → Fiber Saksılar, site fiyatı 0 = **"Fiyat için iletişime geçin"** (API `priceOnRequest`, sepete eklenmez, WhatsApp'tan fiyat sor). ERP'den site fiyatı girilince normal satışa açılır. Görseller `florayapay/public/fiber-saksi/`
- Kaktüs & sazlıklar (`cactus-reeds.data.ts`, `WEB-CNP-…`): 57 ürün, ayrı üst kategori **Kaktüs ve Sazlıklar** (alt: Kaktüsler 34 / Sazlıklar 23; menüde "Kaktüs & Sazlık"), fiyatsız ("Fiyat için iletişime geçin"). Görseller `florayapay/public/kaktus-sazlik/` (arka plan silinip beyaz zemin, %12 kenar boşluğu — ERP Photoroom standardı)
- Metal saksılar (`metal-pots.data.ts`, `WEB-OVV-…`): OOVV listesinden 86 ürün (metal saksı/vazo/şamdan/aranjman), Saksılar → Metal Saksılar (şamdan ve vazolar ayrı üst kategori **Vazo ve Şamdanlar**: Vazolar / Şamdan ve Mumluklar; menüde "Vazo & Şamdan"), **normal satış**, site fiyatı = listedeki fiyat × 3. Renk/boy farkı açıklamada not. Görseller `florayapay/public/metal-saksi/` (her fotoğraftan tek ürün kırpıldı, beyaz zemin)
- Dekoratif plastik saksılar (`decor-pots.data.ts`, `WEB-DKS-<kod>-<RENK>`): tedarikçi fiyat listesi 09.09.2026'dan 40 seri = 40 ürün grubu (`/urun-grubu/<seri>-dekoratif`), 241 boy×renk ürünü. Site fiyatı = liste × 1,45 + 300 TL kargo (…9'a yuvarlı), liste fiyatı 200 TL altı alınmadı. Sitede Boy + Renk seçilir, seçilen rengin 4 görseli gösterilir (renkler katalog fotoğrafından renklendirildi). Saksılar → **Plastik Saksılar** sekmesi (grup sekmesi `GROUP_SUBCATEGORY_TABS`), Silindir vazo → Vazo ve Şamdanlar. `WEB-DKS-` de `WEB-BST-` gibi düz listede gizli (`GROUP_ONLY_MODEL_PREFIXES`). Görseller `florayapay/public/dekoratif-saksi/`. Genel grup kaydı: `SiteOnlyCatalogService.seedGroups`
- Kayıt servisi görselleri sadece hâlâ `www.erhanflowers.com/bostann|fiber-saksi|kaktus-sazlik|metal-saksi|dekoratif-saksi/` altındaysa günceller; elle değiştirilen görsele dokunmaz
- **WEB- ürünleri pazaryerine KESİNLİKLE gönderilmez** (sadece bu ürünler, diğerleri etkilenmez): ek olarak `IntegrationsService.pushPrice/pushProduct` WEB- kodlu yükü reddeder, Entegrasyon Merkezi `syncAllFromTrendyol` (Pazarama/İdefix/N11/HB/Trendrum toplu gönderim) WEB- ürünlerini almaz
- Web siparişinde fiyatı 0 olan kalem varsa sipariş reddedilir (`WebOrdersService.create`)

## Site Sipariş Akışı — Koruma Kuralları (11.2026 olayı)

- `POST /public/orders` = **sitenin sepet/ödeme siparişleri** (`backend/src/web-orders/web-orders.controller.ts`, + `/:orderNumber/payable`, `/payment-confirmed`). Başka controller bu adrese bağlanmamalı. `/hizli-siparis` formu `POST /public/quick-orders` (`backend/src/public-orders/`). 22–27.11.2026 arasında hızlı sipariş formu `public/orders`'a bağlıydı → site siparişleri "Ad soyad zorunludur" ile reddedildi
- NestJS aynı yöntem+adrese iki uç noktayı uyarmadan kabul eder (ilk kaydedilen kazanır). `node scripts/check-duplicate-routes.js` çakışmayı bulur; deploy'un ilk adımı bu, çakışma varsa deploy durur
- Deploy sonrası `scripts/smoke-test.sh` (workflow'daki `smoke-test` işi): site ana sayfa/sepet/sipariş, ürün API'si, `POST /public/orders` boş istekte 400 (ve "Ad soyad" değil), Tami testi. Başarısızsa iş kırmızı + GitHub e-postası
- Site güvenlik başlıkları (`florayapay/next.config.js`) `/api/payment/...` adreslerine uygulanmaz (3D Secure formu engelleniyordu). Kart seçeneği (`tamiAktif`) her zaman sunucu `.env`'indeki 5 `TAMI_*` değerinden hesaplanır; `/api/payment/tami/test` `force-dynamic`

## Veritabanı

- **PostgreSQL 16** Docker container'da (`erhan-flowers-postgres-prod`)
- Veritabanı adı: `erhan_flowers_panel`
- DB kullanıcı: `erhanflowers`
- Migration: deploy sırasında `prisma migrate deploy` otomatik çalışır

## Giriş Bilgileri

- Email: owner@erhanflowers.com
- Şifre sıfırlama:
```bash
docker exec erhan-flowers-backend-prod node -e "const b=require('bcryptjs');const{PrismaClient:P}=require('@prisma/client');const p=new P();b.hash('YENI_SIFRE',10).then(h=>p.user.upsert({where:{email:'owner@erhanflowers.com'},update:{passwordHash:h},create:{email:'owner@erhanflowers.com',passwordHash:h,role:'OWNER',name:'Erhan'}})).then(u=>{console.log('OK',u.email);p.\$disconnect()})"
```

## Hetzner Konsol Sorunları

- Alt çizgi `_` → tire `-` olarak yazılıyor olabilir
- Boru `|` karakteri çalışmayabilir
- Çözüm: inline node -e ile JavaScript çalıştır

## SSH Bağlantısı (PowerShell'den)

```powershell
ssh -i "C:\Users\Erhan Flowers\.ssh\github_actions" root@77.42.122.169
```

## Önemli Dosyalar

| Dosya | Açıklama |
|---|---|
| `backend/src/products/products.service.ts` | broadcastPriceStock, broadcastAll |
| `backend/src/integrations/adapters/trendyol.adapter.ts` | Trendyol pushPrice |
| `backend/src/integrations/adapters/n11.adapter.ts` | N11 pushPrice |
| `backend/src/integrations/adapters/hepsiburada.adapter.ts` | HB pushPrice |
| `backend/src/production-costs/production-costs.service.ts` | Maliyet onay + broadcast |
| `backend/src/integrations/services/order-sync.service.ts` | 15dk cron, markMissingAsDelivered |
| `backend/src/sales/sales.service.ts` | createSale, completeSale (force), searchProducts, proof photos |
| `backend/src/sales/sales.controller.ts` | /sales endpoint'leri |
| `backend/src/stock-cards/stock-cards.service.ts` | mergeStockCards |
| `frontend/src/app/hizli-satis/page.tsx` | Hızlı dükkan satışı |
| `frontend/src/app/staff/orders/page.tsx` | Personel sipariş ekranı (PWA) |
| `frontend/src/app/staff/photo-archive/page.tsx` | Fotoğraf arşivi |
| `frontend/src/app/stock-cards/merge/page.tsx` | Stok kartı birleştirme |
| `frontend/src/app/products/page.tsx` | Ürünler sayfası + toplu gönderim butonu |
| `frontend/src/app/integrations/sku-mapping/page.tsx` | SKU eşleştirme |
| `frontend/src/components/AdminShell.tsx` | Nav menüsü, route izinleri |
| `frontend/public/manifest.json` | PWA manifest (start_url: /staff/orders) |

## Kritik Teknik Notlar

### Sales (Satış) Sistemi
- `createSale` zorunlu alan: **`clientRequestId`** — her çağrıda unique string gönderilmeli (idempotency için)
- `completeSale(id, userId, { force: true })` — stok yetersiz olsa da tamamlar, negatife gidebilir
- Hızlı satış akışı: `POST /sales` → `POST /sales/:id/complete` (force: true) → stok anında düşer
- `searchProducts()` fiyat önceliği: `productCostDraft.salePrice` → `trendyolSalePrice` → `stockCard.salePrice` → `stockCard.purchasePrice` → 0

### Proof Photos (Kanıt Fotoğrafları)
- Depolama: `uploads/proof-photos/` klasörü, 90 gün saklama
- Çoklu yükleme: `POST /sales/:id/proof-photos` (FilesInterceptor, max 10 dosya, field adı: `files`)
- Arşiv arama: `GET /sales/proof-photos/archive?customerName=&saleNumber=&dateFrom=&dateTo=`
- Fotoğraf çekilince sipariş READY statüsüne geçer → personel ekranında "Kargo Bekleniyor" bölümüne taşınır

### Stok Kartı Birleştirme
- `POST /stock-cards/merge` — `{ sourceId, targetId }` — kaynak silinir, stok toplanır
- UI: `/stock-cards/merge`

### Personel Ekranı (PWA)
- URL: `/staff/orders`
- Telefona eklenebilir (PWA) — manifest.json'da start_url: /staff/orders
- Fotoğraf yüklenince sipariş otomatik READY olur, "Hazır — Kargo Bekleniyor" bölümüne geçer
- Bölümler: Aktif siparişler (CONFIRMED/PREPARING/IN_PRODUCTION) + Kargo Bekleniyor (READY)

### Git / Branch Stratejisi
- Geliştirme branch'i: `claude/product-cost-sync-vi8xzb` (veya yeni oturumda yeni branch)
- Her özellik için ayrı branch açılabilir, aynı anda paralel geliştirme yapılabilir
- PR oluşturduktan sonra `mcp__github__merge_pull_request` ile squash merge yap
- Branch reset gerekirse: `git checkout -B <branch> origin/main && git push --force-with-lease`

## Bugün Yapılanlar (18 Eylül 2026)

- [x] **Otomatik teslimat işaretleme**: Tüm platformlar (Trendyol, N11, HB) için 15dk cron'a `markMissingAsDelivered` eklendi
- [x] **Personel ekranı**: READY siparişler ayrı "Hazır — Kargo Bekleniyor" bölümüne taşındı
- [x] **PWA**: manifest.json start_url → /staff/orders, telefona yüklenebilir
- [x] **Fotoğraf arşivi**: 90 gün saklama, müşteri adı/tarih arama sayfası (`/staff/photo-archive`)
- [x] **Çoklu fotoğraf yükleme**: Aynı anda 2+ fotoğraf
- [x] **Hızlı satış URL düzeltmesi**: `/sales/products` → `/sales/products/search`
- [x] **Hızlı satış fiyat 0 sorunu**: `purchasePrice` fallback eklendi
- [x] **Hızlı satış clientRequestId**: Zorunlu alan eksikti, eklendi
- [x] **Anında stok düşümü**: Satış sonrası `/complete` çağrısı, `force: true` ile stok yetersizse de geçiyor
- [x] **Manuel adet girişi**: Hızlı satışta adet kutusuna doğrudan sayı yazılabiliyor
- [x] **Stok kartı birleştirme**: `POST /stock-cards/merge` + `/stock-cards/merge` UI sayfası

## Yapılacaklar / Açık Konular

- [ ] `/stock-cards/merge` sayfası 404 veriyor — deploy tamamlanınca tekrar dene (ya da `docker compose up -d --build frontend`)
- [ ] İki adet bambu yaprak stok kartını birleştir: `/stock-cards/merge` sayfasından yap
- [ ] Stok kartlarına satış fiyatı (`salePrice`) gir — şu an `purchasePrice` kullanılıyor fallback olarak
- [ ] EFT IBAN: gerçek IBAN sunucu `.env` dosyasına manuel eklenecek
- [ ] Push notification: personel siparişi hazır işaretleyince bildirim (henüz yapılmadı)
- [ ] SKU Mapping: Her platformdan Excel indir → SKU Mapping sayfasına yükle → "Tüm Ürünleri Platformlara Gönder"

## Teknoloji Stack

- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Frontend:** Next.js 14 (App Router), TailwindCSS
- **Deploy:** Docker Compose, Caddy (reverse proxy + SSL)
- **Hosting:** Hetzner Cloud
