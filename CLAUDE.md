# Erhan Flowers ERP — Claude Bağlam Dosyası

Bu dosya her yeni Claude oturumunda otomatik okunur. Sunucu, deploy ve proje bilgilerini içerir.

## Sunucu Bilgileri

- **Hosting:** Hetzner Cloud (Helsinki DC Park 1)
- **IP:** 78.46.123.45
- **Kullanıcı:** root
- **SSH şifresi:** GitHub Secrets'ta `SSH_PASSWORD` olarak kayıtlı (güvenlik nedeniyle buraya yazılmadı)
- **Hetzner Console:** console.hetzner.cloud → sunucuya tıkla → >_ Console (şifresiz giriş)

## Deploy Komutu

Sunucuda (`/root/erhan-flowers-erp` dizininde):

```bash
cd /root/erhan-flowers-erp
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Proje Yapısı

```
erhan-flowers-erp/
├── backend/          NestJS API (port 8000)
├── frontend/         Next.js 14 App Router
├── docker-compose.prod.yml   Production deploy
├── docker-compose.yml        Sadece PostgreSQL (local)
├── Caddyfile         Reverse proxy + SSL
└── docs/             Proje dokümanları
```

## Aktif Branch

- **Geliştirme branchi:** `claude/product-cost-sync-vi8xzb`
- **Açık PR:** https://github.com/erhanyapaycicekcilik-cmd/erhan-flowers-erp/pull/7
- Deploy sonrası PR merge edilecek → main'e alınacak

## Domain & URL'ler

- **Frontend:** https://erhanflowers.com
- **Backend API:** https://api.erhanflowers.com
- **Görsel CDN:** https://gorseller.florayapaycicek.com (geçici Cloudflare Tunnel)

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

## SKU Eşleştirme (Yapılacak)

Platformlardaki ürünler ERP model kodlarıyla eşleşmiyor.
Çözüm: Her platformdan Excel indir → SKU Mapping sayfasına yükle.

- Trendyol: Seller Center → Ürünlerim → Excel İndir
- N11: Mağaza Paneli → Ürünlerim → Excel İndir  
- Hepsiburada: Merchant → Ürünlerim → Excel İndir
- ERP SKU Mapping sayfası: `/integrations/sku-mapping`

## Veritabanı

- **PostgreSQL 16** Docker container'da (`erhan-flowers-postgres`)
- Bağlantı: `postgresql://erhanflowers:...@postgres:5432/erhan_flowers_panel`
- Migration: deploy sırasında `prisma migrate deploy` otomatik çalışır

## Önemli Dosyalar

| Dosya | Açıklama |
|---|---|
| `backend/src/products/products.service.ts` | broadcastPriceStock, broadcastAll |
| `backend/src/integrations/adapters/trendyol.adapter.ts` | Trendyol pushPrice |
| `backend/src/integrations/adapters/n11.adapter.ts` | N11 pushPrice |
| `backend/src/integrations/adapters/hepsiburada.adapter.ts` | HB pushPrice |
| `backend/src/production-costs/production-costs.service.ts` | Maliyet onay + broadcast |
| `frontend/src/app/products/page.tsx` | Ürünler sayfası + toplu gönderim butonu |
| `frontend/src/app/integrations/sku-mapping/page.tsx` | SKU eşleştirme |

## GitHub Actions Deploy (Otomatik)

PR main'e merge edilince otomatik deploy olur. Bir kere kuruldu, tekrar kurma.

**Gerekli Secrets** (github.com/erhanyapaycicekcilik-cmd/erhan-flowers-erp/settings/secrets/actions):
- `SSH_HOST` = `78.46.123.45`
- `SSH_PASSWORD` = sunucu root şifresi
- `GH_TOKEN` = GitHub Personal Access Token (repo yetkili)

**Token oluşturma:** github.com/settings/tokens → Generate new token (classic) → repo işaretle → Generate

## Yapılacaklar Listesi

- [ ] GitHub Secrets ekle (SSH_HOST, SSH_PASSWORD, GH_TOKEN)
- [ ] PR #7 merge et → otomatik deploy başlar
- [ ] Her platformdan Excel indir → SKU Mapping yükle
- [ ] "Tüm Ürünleri Platformlara Gönder" butonuna bas → ilk senkronizasyon
- [ ] İsteğe bağlı: `.env.production` dosyasına `HB_WEBHOOK_SECRET=...` ekle

## Teknoloji Stack

- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Frontend:** Next.js 14 (App Router), TailwindCSS
- **Deploy:** Docker Compose, Caddy (reverse proxy + SSL)
- **Hosting:** Hetzner Cloud
