# ERHAN FLOWERS ERP - Calisma Kurallari

## Ana Kural

Bu proje artik sirket icinde kullanilan ERP sistemidir. Yeni gelistirme yaparken calisan sistemi kesmek, veriyi riske atmak veya mevcut akisleri bozmak kabul edilemez.

## Oncelik Sirasi

1. Login ve erisim calisacak.
2. PostgreSQL ve mevcut veriler korunacak.
3. Stok karti, model kodu, barkod, stok hareketi ve gorsel klasor zinciri bozulmayacak.
4. Yeni ozellik gelistirme, stabil sistem korunmadan baslamayacak.
5. Canli kullanim ortami ile gelistirme ortami ayrilmadan riskli degisiklik uygulanmayacak.

## Kesinlikle Yapilmayacaklar

- Kullanici onayi olmadan veritabani sifirlama.
- Kullanici onayi olmadan migration calistirma.
- Kullanici onayi olmadan gercek kayit silme.
- Kullanici onayi olmadan klasor tasima veya gorsel silme.
- Calisan frontend/backend sureclerini gerekmedikce durdurma.
- Canli veritabani uzerinde test kaydi birakma.
- Eski stok kodlarini, barkodlari veya model kodlarini toplu degistirme.
- Yeni ozellik icin mevcut calisan modulun davranisini bozma.

## Degisiklik Yapmadan Once

- Ilgili dosyalari oku.
- Mevcut portlari ve calisan surecleri kontrol et.
- Hangi dosyalarin degisecegini belirle.
- Veri etkisi varsa once yedek al.
- Dar kapsamli cozum uygula; gereksiz refactor yapma.

## Test Kurallari

- Backend build kontrol edilecek.
- Frontend build kontrol edilecek.
- Login sistem sahibi ve personel ile test edilecek.
- Stok degisikligi varsa stok karti olusturma, stok giris/cikis, barkod/model/stok kodu ve gorsel klasoru test edilecek.
- Test kaydi kullanildiysa test sonunda temizlenecek.

## Canli ve Gelistirme Ayrimi

- Canli kullanim icin sabit portlar korunacak:
  - Frontend: 3001
  - Backend: 8001
  - PostgreSQL: 5432
- Gelistirme icin ayri portlar ve ayri veritabani kullanilmali:
  - Frontend dev: 3101
  - Backend dev: 8101
  - PostgreSQL dev: 5433 veya ayri database adi
- Gelistirme sirasinda canli servisler durdurulmayacak.
- Testler development veritabani uzerinde yapilacak.

## Raporlama

Her is sonunda kisa rapor ver:

- Ne degisti?
- Hangi dosyalar degisti?
- Hangi testler yapildi?
- Veri kaybi var mi?
- Canli sistem calisiyor mu?
