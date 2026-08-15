# Stok Kategori Dinamik Form Raporu

## Degistirilen dosyalar

- `frontend/src/app/stock-cards/page.tsx`
- `backend/src/stock-cards/stock-cards.service.ts`
- `docs/STOK-KATEGORI-DINAMIK-FORM-RAPORU.md`

## Veri modeli degisikligi

Veritabani semasi degistirilmedi. Yeni kolon veya tablo eklenmedi.

Kategoriye ozel teknik alanlar mevcut `stock_cards.technical_specs` alaninda saklaniyor. Bu alan zaten stok karti modelinde oldugu icin mevcut veriye risk olusturacak bir migration uygulanmadi.

## Migration

Migration olusturulmadi ve calistirilmadi.

## Yeni kategori sistemi

Stok karti formuna zorunlu `Stok kategorisi` dropdown alani eklendi.

Kategori secenekleri su kaynaklardan birlestiriliyor:

- Sistem icindeki varsayilan stok kategorileri
- Mevcut `/categories` API kayitlari
- Mevcut stok kartlarinda kullanilan kategori degerleri

Bu sayede yeni kategori ileride kategori sistemine eklendiginde stok karti ekraninda gorunebilir.

## Dinamik alanlarin saklanmasi

Kategoriye ozel alanlar, `technicalSpecs` icinde JSON formatinda saklanir:

```json
{
  "version": 1,
  "category": "Saksılar",
  "attributes": {
    "material": "Fiber",
    "diameter": "35 cm",
    "height": "40 cm",
    "color": "Siyah"
  }
}
```

Eski stok kartlarinda `technicalSpecs` duz metin ise silinmez; duzenleme sirasinda not olarak korunur.

## Tas hizli hazirlik sistemi

Mevcut tas hizli hazirlik butonlari korundu.

Bu alan artik yalnizca kategori `Tas` / `Taslar` olarak algilandiginda gorunur. Diger kategorilerde gizlenir.

## Mevcut stok kartlariyla uyumluluk

Mevcut stok kartlari listelenmeye ve acilmaya devam eder. Kategorisiz eski kartlar listede `Kategorisiz` grubunda kalir.

Yeni kayit olustururken kategori zorunludur. API seviyesinde de kategorisiz yeni stok karti kaydi engellenir.

## Test sonuclari

- Backend build: basarili.
- Frontend TypeScript kontrolu (`npx tsc --noEmit`): basarili.
- Frontend build (`npm run build`): basarili.
- Veritabani migration: calistirilmadi.
- Canli servisler: durdurulmadi veya yeniden baslatilmadi.

## Kalan riskler

- Bu turnde canli/dev arayuz uzerinden manuel tiklama testi yapilmadi.
- Kategoriye ozel gelismis filtreler bu sprint kapsaminda eklenmedi; veri yapisi ileride bu filtrelere uygun olacak sekilde `attributes` yapisinda tutuluyor.
