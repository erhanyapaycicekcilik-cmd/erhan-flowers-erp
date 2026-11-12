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

## Fiyat/Stok Senkronizasyonu

- Ürün kaydedilince → tüm platformlara otomatik yayın (`broadcastPriceStock`)
- Maliyet onaylanınca → tüm platformlara otomatik yayın (`broadcastApprovedCost`)
- Toplu gönderim → `/products/broadcast-all` (ürünler sayfasında buton var)
- Eşleştirme: `barcode` yoksa `modelCode` kullanılır
- Platform bağlantı listesi 5dk TTL cache ile tutulur
- **15 dakikada bir cron**: `OrderSyncService.syncAllPlatforms()` — tüm platformlarda teslim edilmiş siparişleri otomatik DELIVERED yapar (`markMissingAsDelivered`)

## Katalog Stratejisi (`/katalog-stratejisi`, sadece OWNER)

- Backend: `backend/src/catalog-strategy/` — `GET /catalog-strategy/cleanup/preview?company=ERHAN|FLORA&days=&minSold=`, `POST /catalog-strategy/cleanup/apply` (onay metni `SATISA KAPAT`), `GET /catalog-strategy/bestsellers`, `POST /catalog-strategy/publish`
- Satmayanları kapatma = **silme değil**, stok 0 (Trendyol toplu, N11/HB ERP kaydı olanlar). ERHAN'da kapatılan varyant `PASSIVE` olur; `broadcastPriceStock` ve `broadcastApprovedCost` PASSIVE ürünleri tekrar açmaz
- Satış verisi `marketplace_orders` tablosundan; FLORA siparişleri `external_order_id LIKE 'FLORA\_%'`
- İki mağaza yayını: `PublishingService.sendToStores` (`POST /publishing/send-to-stores`). Varsayılan barkod iki mağazada aynı; FLORA'da model/stok kodu `FL-` ön ekli + %-3 fiyat. FLORA'da contentId/trendyolBarcode gönderilmez (yeni ürün açılır)
- **Yeni ürün açarken iki hesaba birden:** Ürün Merkezi'nde (hızlı kayıt + tam form) "Trendyol (Flora)" kanalı = platform kodu `TRENDYOL_FLORA`. `/publishing/send` bu kodu görünce ürünü FLORA Trendyol hesabına da gönderir (barkod aynı, model kodu FL- ön ekli, %-3 fiyat; `DEFAULT_STORES`). Varsayılan olarak işaretli
- `IntegrationCenterService.storeCredentials(platform, company)`: ERHAN dışı mağazada .env'e **düşmez**, eksik API bilgisi varsa hata verir (Flora işlemi yanlışlıkla Erhan mağazasına gitmesin)

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

## Sadece Sitede Satılan Ürünler (`WEB-` model kodu)

- Model kodu `WEB-` ile başlayan ürünler **sadece www.erhanflowers.com'da** satılır (`backend/src/common/site-only.ts`)
- Pazaryerlerine gönderilmez (`broadcastPriceStock`, `broadcastAll`, görsel yayını, platform Excel'i atlar) ve Trendyol ürün senkronu bunları PASİF yapmaz
- Bostann saksıları: `backend/src/site-only-catalog/` — backend açılışında eksikse eklenir (var olan kayda dokunmaz). 14 seri = 14 ürün grubu (`/urun-grubu/bostann-…-serisi-saksi`), her boyut×renk ayrı ürün (`WEB-BST-LUMEN140-BEJ`). Görseller `florayapay/public/bostann/`
- `WEB-BST-` ürünleri sitede düz listede gizli, sadece grup sayfasında (Boy + Renk seçimi) ve aramada görünür
- Kapatmak için: `SITE_ONLY_CATALOG_SEED=false` (yeni ekleme yapmaz) + ERP'den ürünleri/grupları pasif yap
- Fiber saksılar (`fiber-pots.data.ts`, `WEB-SRN-FBR…`): 69 ürün, Saksılar → Fiber Saksılar, site fiyatı 0 = **"Fiyat için iletişime geçin"** (API `priceOnRequest`, sepete eklenmez, WhatsApp'tan fiyat sor). ERP'den site fiyatı girilince normal satışa açılır. Görseller `florayapay/public/fiber-saksi/`
- Kaktüs & sazlıklar (`cactus-reeds.data.ts`, `WEB-CNP-…`): 57 ürün, Ağaçlar → Kaktüs ve Sazlıklar, fiyatsız ("Fiyat için iletişime geçin"). Görseller `florayapay/public/kaktus-sazlik/` (arka plan silinip beyaz zemin, %12 kenar boşluğu — ERP Photoroom standardı)
- Metal saksılar (`metal-pots.data.ts`, `WEB-OVV-…`): OOVV listesinden 86 ürün (metal saksı/vazo/şamdan/aranjman), Saksılar → Metal Saksılar, **normal satış**, site fiyatı = listedeki fiyat × 3. Renk/boy farkı açıklamada not. Görseller `florayapay/public/metal-saksi/` (her fotoğraftan tek ürün kırpıldı, beyaz zemin)
- Kayıt servisi görselleri sadece hâlâ `www.erhanflowers.com/bostann|fiber-saksi|kaktus-sazlik|metal-saksi/` altındaysa günceller; elle değiştirilen görsele dokunmaz
- **WEB- ürünleri pazaryerine KESİNLİKLE gönderilmez** (sadece bu ürünler, diğerleri etkilenmez): ek olarak `IntegrationsService.pushPrice/pushProduct` WEB- kodlu yükü reddeder, Entegrasyon Merkezi `syncAllFromTrendyol` (Pazarama/İdefix/N11/HB/Trendrum toplu gönderim) WEB- ürünlerini almaz
- Web siparişinde fiyatı 0 olan kalem varsa sipariş reddedilir (`WebOrdersService.create`)

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
