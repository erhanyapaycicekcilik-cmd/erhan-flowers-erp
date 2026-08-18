# Hosting'e Geçiş Rehberi

Bu rehber, sunucu (ör. DigitalOcean Droplet) ve domain hazır olduğunda izlenecek adımları anlatır. Repo içindeki Docker yapılandırması zaten hazır — sunucuda yapılacaklar sadece kurulum ve doldurma.

## İlk Kurulum

1. Sunucuya Docker ve Docker Compose kurun (Ubuntu 24.04 için):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. Bu repoyu sunucuya çekin (`git clone` veya dosya kopyalama).
3. Env dosyalarını doldurun:
   ```bash
   cp backend/.env.production.example backend/.env.production
   cp frontend/.env.production.example frontend/.env.production
   ```
   `backend/.env.production` içindeki tüm `CHANGE_ME_*` değerlerini ve API anahtarlarını (Trendyol, Hepsiburada, PhotoRoom, Gemini) gerçek değerlerle doldurun.
4. Kök dizinde `.env` dosyası oluşturup Postgres şifresini belirleyin:
   ```bash
   echo "POSTGRES_PASSWORD=guclu-bir-sifre-buraya" > .env
   ```
5. `Caddyfile` içindeki domain adlarını (`erhanflowers.com`, `florayapaycicek.com`, `api.erhanflowers.com`) gerçek domain'lerinizle eşleştiğinden emin olun; domain DNS A kaydı sunucu IP'sine yönlendirilmiş olmalı.
6. Servisleri başlatın:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
   Backend, container başlarken otomatik olarak `prisma migrate deploy` çalıştırır (bkz. `backend/docker-entrypoint.sh`) — veritabanı şeması otomatik kurulur.
7. Caddy, DNS doğru yönlendirildiyse SSL sertifikalarını otomatik alır (birkaç dakika sürebilir). `docker compose -f docker-compose.prod.yml logs caddy` ile takip edebilirsiniz.

## Güncelleme Akışı (kod değişikliği sonrası)

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Yeni bir Prisma migration'ı varsa otomatik olarak entrypoint içinde uygulanır, elle bir şey yapmanıza gerek yok.

## Notlar

- `uploads/` klasörü (ürün görselleri) `backend_uploads` adlı kalıcı bir Docker volume'de tutulur — container silinse bile veriler kaybolmaz.
- Mevcut geçici Cloudflare Tunnel (`gorseller.florayapaycicek.com`) hosting'e geçince gereksiz hale gelir; backend artık kendi domain'inden (`api.erhanflowers.com`) doğrudan erişilebilir olacaktır. Bu tünelin kaldırılması ayrı bir adımdır, bu rehberin kapsamında değildir.
- Yerel geliştirme ortamınız (`docker-compose.yml`, `docker-compose.dev.yml`, `scripts/start-everything.ps1`) bu değişikliklerden etkilenmez, olduğu gibi çalışmaya devam eder.
