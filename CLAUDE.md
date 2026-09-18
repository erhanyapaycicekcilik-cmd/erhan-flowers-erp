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
├── frontend/         Next.js 14 App Router (port 3000)
├── docker-compose.prod.yml   Production deploy
├── docker-compose.yml        Sadece PostgreSQL (local)
├── Caddyfile         Reverse proxy + SSL
└── docs/             Proje dokümanları
```

## Domain & URL'ler

- **Frontend:** https://erp.florayapaycicek.com
- **Backend API:** https://api.florayapaycicek.com

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

## Fiyat/Stok Senkronizasyonu

- Ürün kaydedilince → tüm platformlara otomatik yayın (`broadcastPriceStock`)
- Maliyet onaylanınca → tüm platformlara otomatik yayın (`broadcastApprovedCost`)
- Toplu gönderim → `/products/broadcast-all` (ürünler sayfasında buton var)
- Eşleştirme: `barcode` yoksa `modelCode` kullanılır
- Platform bağlantı listesi 5dk TTL cache ile tutulur
- **15 dakikada bir cron**: `OrderSyncService.syncAllPlatforms()` — tüm platformlarda teslim edilmiş siparişleri otomatik DELIVERED yapar (`markMissingAsDelivered`)

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
