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

PR main'e merge edilince otomatik deploy olur.

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
| `frontend/src/app/products/page.tsx` | Ürünler sayfası + toplu gönderim butonu |
| `frontend/src/app/integrations/sku-mapping/page.tsx` | SKU eşleştirme |

## Yapılacaklar Listesi

- [x] GitHub Actions deploy kuruldu
- [ ] SSH_HOST secret'ını 77.42.122.169 olarak güncelle
- [ ] PR #7 merge et → otomatik deploy başlar
- [ ] Her platformdan Excel indir → SKU Mapping yükle
- [ ] "Tüm Ürünleri Platformlara Gönder" butonuna bas → ilk senkronizasyon

## Teknoloji Stack

- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Frontend:** Next.js 14 (App Router), TailwindCSS
- **Deploy:** Docker Compose, Caddy (reverse proxy + SSL)
- **Hosting:** Hetzner Cloud
