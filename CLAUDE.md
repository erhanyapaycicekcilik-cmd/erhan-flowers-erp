# Erhan Flowers ERP - Proje Notları

## Sunucu Bilgileri
- **Hetzner sunucu IP:** 77.42.122.169
- **Kullanıcı:** root
- **Proje dizini:** /opt/erp
- **SSH key:** ~/.ssh/github_actions (kullanıcının Windows makinesinde)

## Deploy
```bash
# Sunucuda (Hetzner konsol veya SSH):
cd /opt/erp
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

## Önemli Bilgiler
- Docker compose dosyası: `docker-compose.prod.yml` (NOT: docker-compose.yml sadece postgres içeriyor)
- Backend port: 8001 (NestJS)
- Frontend port: 3000 (Next.js)
- Caddy reverse proxy: 80/443
- Veritabanı adı: `erhan_flowers_panel`
- DB kullanıcı: `erhanflowers`
- Hetzner konsolu alt çizgi (_) yerine tire (-) yazıyor — komutları dikkatli yaz

## GitHub Actions
- Workflow: `.github/workflows/deploy.yml`
- Secret gerekli: `SSH_PRIVATE_KEY` (kullanıcının oluşturduğu github_actions private key)
- Her main push'ta otomatik deploy olur

## URL'ler
- Frontend: https://erp.florayapaycicek.com
- Backend API: https://api.florayapaycicek.com

## Container İsimleri
- erhan-flowers-backend-prod
- erhan-flowers-frontend-prod
- erhan-flowers-caddy-prod
- erhan-flowers-postgres-prod
