# STABLE-DEV-LIVE-SEPARATION-001

## Tarih

22.07.2026

## Canli Portlar

- Frontend: 3001
- Backend: 8001
- PostgreSQL: 5432

## Development Portlari

- Frontend: 3101
- Backend: 8101
- PostgreSQL: 5433

## Database Ayrimi

- Canli PostgreSQL container: erhan-flowers-postgres
- Canli database: erhan_flowers_panel_mvp
- Development PostgreSQL container: erhan-flowers-postgres-dev
- Development database: erhan_flowers_panel_dev

Development ortami ayri database kullanir. Canli veritabani resetlenmedi, silinmedi veya degistirilmedi.

## Gorsel Klasoru Ayrimi

- Canli gorsel klasoru: D:\stok görseller
- Development gorsel klasoru: D:\stok-gorseller-dev

## Test Sonuclari

- Canli frontend login sayfasi: 200
- Development frontend login sayfasi: 200
- Canli backend login API: basarili
- Development backend login API: basarili
- Canli ve development ayni anda calisiyor: evet
- Development database ayrimi: dogrulandi
- Gorsel klasorleri ayri: dogrulandi

## Snapshot Konumu

snapshots\STABLE-DEV-LIVE-SEPARATION-001

## Snapshot Icerigi

- Backend kaynak kodu
- Frontend kaynak kodu
- Prisma schema ve seed dosyalari
- Docker Compose dosyalari
- Baslatma scriptleri
- AGENTS.md
- Ortam dosyasi sablonlari

## Snapshot Disinda Birakilanlar

- node_modules
- .next
- .next-dev
- .next-build-test
- dist
- log dosyalari
- gercek .env dosyalari
- yuklenen medya ve calisma ciktilari

## Geri Donus Yontemi

1. Canli sistemde mevcut klasoru silmeden once farkli bir yere tasiyin veya adini degistirin.
2. snapshots\STABLE-DEV-LIVE-SEPARATION-001 klasorunu proje klasoru olarak geri kopyalayin.
3. backend\.env.example dosyasindan backend\.env olusturun ve gercek canli bilgileri girin.
4. frontend\.env.example dosyasindan frontend\.env olusturun.
5. Docker PostgreSQL container calisiyorsa veritabanina dokunmadan uygulamayi baslatin.
6. Canli linki kontrol edin: http://localhost:3001/login

## Bilinen Riskler

- Git komutu sistemde bulunmuyor; Git etiketi olusturulamadi.
- Eski 3000/8000 Docker servisleri bu gorevde bilerek durdurulmadi.
- Snapshot kod ve ayar dosyalarini kapsar; PostgreSQL veri yedegi degildir.
- Gercek .env dosyalari guvenlik nedeniyle snapshot icine alinmadi.
