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

## Admin Şifre Sıfırlama
Hetzner konsolunda çalıştır (alt çizgi/boru yok, Hetzner uyumlu):
```
docker exec erhan-flowers-backend-prod node -e "const b=require('bcryptjs');const{PrismaClient:P}=require('@prisma/client');const p=new P();b.hash('YENI_SIFRE',10).then(h=>p.user.upsert({where:{email:'owner@erhanflowers.com'},update:{passwordHash:h},create:{email:'owner@erhanflowers.com',passwordHash:h,role:'OWNER',name:'Erhan'}})).then(u=>{console.log('OK',u.email);p.\$disconnect()})"
```
`YENI_SIFRE` yerine istediğin şifreyi yaz.

## Hetzner Konsol Sorunları
- Alt çizgi `_` → tire `-` olarak yazılıyor
- Boru `|` karakteri çalışmıyor
- `docker cp container:/path` kolon syntax'ı parse edilemiyor
- Çözüm: `docker exec -i container tee /tmp/dosya < /host/dosya` kullan
- Veya inline node -e ile JavaScript çalıştır

## Giriş Bilgileri
- Email: owner@erhanflowers.com
- Şifre: (şifre sıfırlama komutuyla belirlenir)

## SSH Bağlantısı (PowerShell'den)
```powershell
ssh -i "C:\Users\Erhan Flowers\.ssh\github_actions" root@77.42.122.169
```
NOT: SSH key sunucudaki authorized_keys ile eşleşmeli. Çalışmıyorsa Hetzner konsolunu kullan.
