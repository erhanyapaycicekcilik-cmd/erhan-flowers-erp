# SPRINT 16C - Frontend Build Izolasyonu

## Amac

Development build islemlerinin canli frontend'i etkilemesini engellemek.

## Tespit

- Canli frontend varsayilan Next.js klasoru olan `frontend/.next` ile calisiyor.
- Development frontend calisma sirasinda `NEXT_DIST_DIR=.next-dev` kullaniyor.
- Eski `npm run build` komutu herhangi bir ortam ayrimi yapmadan `frontend/.next` klasorune yaziyordu.
- Bu nedenle development icin build alinirken canli frontend'in kullandigi build dosyalari degisebiliyor ve canli ekranda eksik chunk / server error olusabiliyordu.

## Yeni Kural

- Canli build klasoru: `frontend/.next`
- Development calisma klasoru: `frontend/.next-dev`
- Development build test klasoru: `frontend/.next-dev-build`

## Komutlar

- Canli build: `npm run build:live`
- Development build: `npm run build:dev`
- Canli start: `npm run start:live -- -H 0.0.0.0 -p 3001`
- Development build start: `npm run start:dev-build`

## Not

`npm run build` eski aliskanliklarla uyumlu kalmasi icin canli build olarak birakildi. Development icin mutlaka `npm run build:dev` kullanilmalidir.

## Uygulanan Degisiklikler

- `frontend/package.json` icine canli ve development build komutlari ayrildi.
- `scripts/build-dev-frontend.ps1` eklendi.
- `scripts/start-dev-build-frontend.ps1` eklendi.
- Development build klasoru `.next-dev-build` olarak ayrildi.

## Test Sonuclari

Tarih: 22.07.2026

Development build komutu art arda 5 kez calistirildi:

| Build | Sonuc | Canli login build oncesi | Canli login build sonrasi | Development login |
| --- | --- | --- | --- | --- |
| 1 | Basarili | 200 | 200 | 200 |
| 2 | Basarili | 200 | 200 | 200 |
| 3 | Basarili | 200 | 200 | 200 |
| 4 | Basarili | 200 | 200 | 200 |
| 5 | Basarili | 200 | 200 | 200 |

Kontrol edilen ek sonuclar:

- Canli backend login API: 201
- Development backend login API: 201
- Canli frontend portu: 3001 dinlemede
- Development frontend portu: 3101 dinlemede
- Canli backend portu: 8001 dinlemede
- Development backend portu: 8101 dinlemede
- Canli PostgreSQL portu: 5432 dinlemede
- Development PostgreSQL portu: 5433 dinlemede

## Build Klasoru Kontrolu

- Canli `.next` klasoru build testleri boyunca degismedi.
- Development build ciktilari `.next-dev-build` klasorune yazildi.

## Kalan Risk

`npm run build` komutu bilerek canli build olarak kaldi. Development calismalarinda yanlislikla bu komut kullanilirsa yine canli `.next` klasorune yazilir. Development icin dogru komut `npm run build:dev` olmalidir.
