# Stok Gorsel ve Kayip Kart Kontrol Raporu

Tarih: 2026-08-10

## Ozet

Stok kartlari, eski gorsel klasorleri ve maliyet/reçete baglantilari uzerinde sadece okuma denetimi yapildi. Gercek stok verisi, gorsel dosyasi veya hareket kaydi degistirilmedi.

## Pamuk Bulgusu

`PAMUT DEMET 10 LU` gorsel klasoru mevcut:

- `backend/uploads/DMT-0021_869900000000024_PAMUT_DEMET_10_LU`
- 2 adet gorsel dosyasi var.

Ancak gelistirme veritabaninda `pamuk` adinda bir stok karti bulunamadi.

Klasor kodlari:

- Stok kodu: `DMT-0021`
- Barkod: `869900000000024`
- Klasor urun adi: `PAMUT DEMET 10 LU`

Ayni kodlar veritabaninda baska bir stok kartiyla eslesiyor:

- Stok karti ID: `26`
- Stok karti adi: `CROTON CALATHEA 48 CM SARI YESIL`
- Durum: `ACTIVE`

Bu nedenle pamuk gorseli, kendi stok karti olarak gorunmuyor. Sorun gorselin silinmesi degil; stok karti kaydi yok veya eski aktarim sirasinda ayni kod/barkod baska urune baglanmis.

## Pamuk Duzeltmesi

Kullanici geri bildirimi sonrasinda `PAMUT DEMET 10 LU` icin yeni stok karti olusturuldu.

- Yeni stok karti ID: `344`
- Yeni stok kodu: `DMT-0133`
- Ad: `PAMUT DEMET 10 LU`
- Kategori: `Yapay Demetler`
- Durum: `ACTIVE`
- Stok miktari: `0`
- Baglanan gorsel sayisi: `2`

Eski `DMT-0021` kodu Croton kartinda kullanildigi icin pamuk kartina tekrar verilmedi. Eski barkod da yeni karta yazilmadi; gorsel klasoru korunarak sadece gorsel baglantisi yapildi.

## Genel Denetim Sonuclari

- Stok karti sayisi: `294`
- Eski gorsel klasoru sayisi: `272`
- Stok karti karsiligi bulunmayan klasor: `3`
- Klasor adi ile eslesen stok karti adi farkli gorunen klasor: `16`
- Ayni stok kodunu kullanan klasor grubu: `5`
- Fiziksel gorsel yolu sorunlu gorunen stok karti: `17`

## Karsiligi Bulunmayan Gorsel Klasorleri

- `DMT-0129_869900000000244_TEST_SPRINT0_GUL_DEMETI`
- `SRM-0001_869900000000032_FREZYA_YASEMIN_MOR_35_CM`
- `SRM-0001_869900000000032_FREZYA_YASEMIN_SOMON_35_CM`

## Ayni Stok Koduyla Birden Fazla Klasor

- `DMT-0019`
- `DMT-0021`
- `DMT-0072`
- `DMT-0105`
- `SRM-0001`

## Yapilan Kod Duzeltmesi

Eski stok gorsel yollari `/uploads/stock-cards/...` seklinde geldiginde tarayicida kiriliyordu. Stok gorselleri artik `/stock-images/stock-cards/...` adresine cevriliyor.

Duzeltilen dosyalar:

- `backend/src/stock-cards/stock-cards.service.ts`
- `frontend/src/lib/api.ts`

Ek duzeltmeler:

- Uygulama artik birden fazla eski stok gorsel klasorunu okuyabilir.
- `D:\stok görseller`, `D:\stok-gorseller-dev` ve `D:\stok görseller-dev` klasorleri geriye donuk okuma kaynagi olarak desteklenir.
- `/uploads/products/...` medya yollari backend tarafindan statik olarak yayinlanir.
- Stok karti servisindeki eski gorsel klasor taramasi sadece yeni klasore degil, fallback eski klasorlere de bakar.

## Veri Duzeltmesi Icin Onerilen Guvenli Yol

1. Once kayip/supheli klasorler ekranda listelenmeli.
2. Kullanici her satir icin karar vermeli:
   - Yeni stok karti olustur
   - Mevcut stok kartina gorsel olarak bagla
   - Yoksay / arsivde tut
3. Ayni stok kodu veya barkod varsa otomatik eslestirme yapilmamali.
4. Stok karti olusturulacaksa yeni ve benzersiz stok kodu/barkod verilmeli.
5. Gorsel dosyalari silinmemeli.
6. Reçete veya stok hareketi olan kartlarda kalici silme yapilmamali.

## Kalan Risk

`PAMUT DEMET 10 LU` icin ayni `DMT-0021` ve `869900000000024` kodlari Croton kartinda kullanildigi icin otomatik duzeltme risklidir. Bu kart manuel onayla yeni stok karti olarak acilmali veya dogru eski stok karti bulunursa ona baglanmalidir.

## Ek Toplu Denetim

`D:\stok görseller`, `D:\stok-gorseller-dev`, `backend/uploads` ve `backend/uploads/stock-cards/legacy` klasorleri kontrol edildi.

- Stok karti sayisi: `295`
- Gorselli klasor sayisi: `772`
- Gorseli olup stok karti karsiligi olmayan klasor: `7`
- Kod/barkod baska urune gidiyor, ad uyusmuyor: `8`
- Kendi stok karti var ama eski klasor kodu baska karta denk geliyor: `2`

Gorseli olup stok karti karsiligi olmayan adaylar:

- `TAS-0002_869900000000294_PONZA_TASI_CURUF`
- `TAS-0003_869900000000295_BEYAZ_DOLOMIT_TASI`
- `TAS-0004_869900000000296_PALET_STREC_17.MIC_300_MT`
- `SRM-0001_869900000000032_FREZYA_YASEMIN_SOMON_35_CM`
- `DMT-0129_869900000000244_TEST_SPRINT0_GUL_DEMETI`

Not: `DMT-0129` ve `SRM-0001` hem ana arsivde hem backend/uploads kopyasinda gorundugu icin teknik sayida iki kez gorunebilir. Gercek tekil aday listesi yukaridaki 5 urundur.

Ad/kod eslesmesi supheli adaylar:

- `MDF-0002_869900000000232_MDF_SAKSI_70X18X15` -> mevcut kart `Mdf Saksı 15x18x70 SIYAH`
- `PSK-0001_869900000000130_MAT_ANTRASIT_PLASTIK_SAKSI_130X125` -> mevcut kart `MANOLYA DIJON GRI 13x12 PLASTIK SAKSI`
- `PSK-0003_869900000000132_FULYA_MAT_ANTRASIT_SERT_PLASTIK_SAKSI_19X18CM` -> mevcut kart `FULYA DIJON PLASTIK SAKSI GRI19x18CM`
- `TAS-0001_869900000000291_PALMIYE_LIFI_NATUREL` -> mevcut kart `SIMSIR PANEL 40X60CM`

Makine okunabilir tam denetim ciktisi:

- `docs/STOK-GORSEL-KART-ESLESME-DENETIMI.json`
