# Urun Merkezi Stok Karti Ayrimi Raporu

## Urun Merkezi artik stok karti olusturuyor mu?

Hayir. Urun Merkezi hizli urun kaydi artik satis urunu icin otomatik `stockCard`, `stockMovement` veya `stockCardImage` olusturmaz.

Hizli kayit akisi yalnizca sunlari olusturur/gunceller:

- Product kaydi
- TrendyolProductVariant / satis kanali varyant kaydi
- Product media kaydi
- Model kodu, stok kodu ve barkod kimligi

## Hangi otomatik stok olusturma kodu kaldirildi?

`backend/src/product-center/product-center.service.ts` icindeki `quickSaveEntry` akisi degistirildi.

Kaldirilan davranislar:

- `tx.stockCard.create(...)`
- Var olan eslesmede `tx.stockCard.update(...)`
- Baslangic stogu icin `tx.stockMovement.create(...)`
- Urun gorselini `tx.stockCardImage.create(...)` ile stok kartina baglama

## Urunler nerede listeleniyor?

Satis urunleri `frontend/src/app/products/page.tsx` icindeki Urun Merkezi listesinde kalir.

Liste alaninda su bilgiler gorunur:

- Urun adi
- Model kodu
- Barkod
- Gorsel
- Kategori
- Maliyet durumu
- Fiyat / kanal durumu alanlari
- Aktif / pasif durumu

Stok Kartlari ekrani sadece gercek stok/malzeme kartlari icin kullanilmaya devam eder.

## Stok recete baglantisi nasil korunuyor?

Urun maliyeti ve recete satirlari mevcut stok kartlarina `stockCardId` ile baglanmaya devam eder.

Satis urununun kendisi stok karti olmaz. Recete icinde sadece gercek malzemeler secilir:

- Agac / govde
- Yaprak
- Saksi
- Tas / dolgu
- Ambalaj
- Sarf malzeme
- Yardimci malzeme

## Eski deneme stok kartlari nasil tespit ediliyor?

Urun Merkezi icine `Deneme Urun Stok Kartlari` bolumu eklendi.

Backend endpointleri:

- `GET /product-center/cleanup/auto-stock-cards`
- `POST /product-center/cleanup/auto-stock-cards/:id`

Tespit su izlere gore yapilir:

- Stok karti barkod/model/stok kodu satis urunu veya varyant ile eslesiyor.
- Alis maliyeti ve otomatik birim maliyeti sifir gorunuyor.
- Kart satis urunu biciminde, yani gercek malzeme maliyeti tasimiyor.

## Silme/pasife alma guvenlik kurallari

Kalici silme sadece su sartlarin tamami saglanirsa aktif olur:

- Stok hareketi yok.
- Stok sayim kaydi yok.
- Stok kullanim logu yok.
- Urun recetesi/maliyet baglantisi yok.
- Gercek stok miktari 0.
- Kart Urun Merkezi otomatik deneme karti olarak tespit edilebiliyor.
- Islem Owner endpointinden yapiliyor.

Bu sartlardan biri yoksa kart sadece pasife alinabilir.

Gorsel dosyalari otomatik silinmez.

## Test sonuclari

- Frontend typecheck: basarili.
- Frontend build: basarili.
- Backend build: basarili.
- Migration: olusturulmadi ve calistirilmadi.
- Production servisleri: durdurulmadi veya yeniden baslatilmadi.

## Kalan riskler

- Eski otomatik stok kartlarinda kalici kaynak etiketi olmadigi icin tespit guvenli eslesme kurallariyla yapilir.
- Canli tarayici uzerinden manuel temizlik tiklama testi bu turnde yapilmadi.
- Temizlik aksiyonu gorsel dosyalarini silmez; yalniz veritabani stok karti kaydini veya pasif durumunu etkiler.
