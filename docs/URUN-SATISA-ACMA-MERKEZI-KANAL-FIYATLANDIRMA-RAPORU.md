# Urun Satisa Acma Merkezi ve Kanal Fiyatlandirma Raporu

## Degistirilen dosyalar

- `frontend/src/app/products/page.tsx`
- `docs/URUN-SATISA-ACMA-MERKEZI-KANAL-FIYATLANDIRMA-RAPORU.md`

## Veri modeli degisti mi?

Hayir. Veritabani semasi, Prisma modeli ve migration dosyalari degistirilmedi.

## Migration olusturuldu mu?

Hayir. Migration olusturulmadi ve calistirilmadi.

## %45 gercek net kar formulu

Kural su sekilde uygulandi:

```text
net kar = KDV dahil satis fiyati
  - KDV
  - komisyon
  - kargo yukunun isletmede kalan kismi
  - odeme komisyonu
  - hizmet bedeli
  - diger giderler
  - gercek urun maliyeti

gercek net kar marji = net kar / KDV dahil satis fiyati
```

Minimum satis fiyati geriye dogru cozulur:

```text
minimum KDV dahil satis =
  sabit maliyetler /
  (1 - hedef net marj - KDV dahil oran - komisyon oranlari)
```

Bu nedenle hesap `maliyet x 1.45` mantigiyla calismaz.

## Kanal fiyatlandirma nasil calisiyor?

Urun Merkezi icinde kanal bazli fiyat kartlari ve karsilastirma tablosu eklendi:

- Dukkan / Fiziki Magaza
- Magaza Web Sitesi
- Trendyol
- Hepsiburada
- N11
- Diger Pazaryeri / Ticimax

Her kanal icin KDV dahil satis, KDV haric fiyat, KDV, komisyon, kargo yuku, POS/hizmet giderleri, net kazanc, gercek kar marji ve onerilen minimum satis fiyati gosterilir.

%45 altindaki kanallar kirmizi uyarilir. Yayinlama adiminda `Owner ozel onayi` kapaliysa %45 alti veya eksik veri olan kanallarda gonderim durdurulur.

## Stok eslestirme nasil korundu?

Mevcut stok karti secimi ve maliyet taslagi akisi korundu. Reçete/Malzeme ve Maliyet/Fiyat adimlari Urun Merkezi icinde gorunur hale getirildi.

Stok karti secildiginde mevcut otomatik birim maliyet bilgisi kullanilmaya devam eder. Manuel maliyet secenegi korunur.

## Mevcut Urun Merkeziyle uyumluluk

Mevcut product-center, production-costs, media, model kodu, barkod ve publishing API akislari korunmustur.

Dukkan ve web sitesi kanal kontrolleri fiyat/marj ekraninda gosterilir. Publishing API'ye yalniz mevcut entegrasyon kanallari gonderilir: Trendyol, Hepsiburada, N11, Ticimax.

## Test sonuclari

- Frontend typecheck: basarili.
- Frontend build: basarili.
- Backend build: basarili.
- Veritabani migration: calistirilmadi.
- Production servisleri: durdurulmadi veya yeniden baslatilmadi.

## Kalan riskler

- Bu turnde canli tarayici uzerinden manuel tiklama testi yapilmadi.
- Kanal bazli fiyatlar su an mevcut satis fiyati uzerinden canli hesaplanir; her kanal icin ayri kalici fiyat kaydi eklenmedi.
- Owner/Staff rol ayrimina gore backend seviyesinde %45 alti fiyat kayit engeli bu turnde eklenmedi; yayinlama oncesi frontend kontrolu eklendi.
