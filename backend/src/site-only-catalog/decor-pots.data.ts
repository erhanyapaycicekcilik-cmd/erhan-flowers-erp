import type { SiteOnlyGroup } from './site-only-catalog.types';

/**
 * Dekoratif plastik saksı kataloğu (tedarikçi fiyat listesi 09.09.2026) — sadece sitede satılır.
 * Site fiyatı = liste fiyatı × 1,45 + 300 TL kargo (…9'a yuvarlı). Liste fiyatı 200 TL altı ürünler alınmadı.
 * Her seri bir ürün grubu: müşteri Boy + Renk seçer, seçilen rengin görselleri gösterilir.
 */
export const DECOR_POT_GROUPS: SiteOnlyGroup[] = [
  {
    "name": "Atlas Saksı Serisi",
    "slug": "atlas-saksi-serisi-dekoratif",
    "sortOrder": 200,
    "description": "Atlas Saksı Serisi: 2 boy, 4 renk seçeneği (Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-ATL03-SIYAH",
        "productName": "3 No Atlas Saksı Takım Siyah",
        "sizeLabel": "3 No · Ø27×23 cm · 4 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl03-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Atlas Saksı Takım — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 27 cm, yükseklik 23 cm. Hacim: 4 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "23 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL03-SUTBEYAZ",
        "productName": "3 No Atlas Saksı Takım Süt Beyaz",
        "sizeLabel": "3 No · Ø27×23 cm · 4 L",
        "colorLabel": "Süt Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-sut-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-sut-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-sut-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl03-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Atlas Saksı Takım — Süt Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 27 cm, yükseklik 23 cm. Hacim: 4 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "23 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL03-KAYISITURUNCU",
        "productName": "3 No Atlas Saksı Takım Kayısı Turuncu",
        "sizeLabel": "3 No · Ø27×23 cm · 4 L",
        "colorLabel": "Kayısı Turuncu",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-kayisi-turuncu-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-kayisi-turuncu-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-kayisi-turuncu-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl03-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Atlas Saksı Takım — Kayısı Turuncu renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 27 cm, yükseklik 23 cm. Hacim: 4 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "23 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL03-ZEYTINYESILI",
        "productName": "3 No Atlas Saksı Takım Zeytin Yeşili",
        "sizeLabel": "3 No · Ø27×23 cm · 4 L",
        "colorLabel": "Zeytin Yeşili",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-zeytin-yesili-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-zeytin-yesili-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-zeytin-yesili-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl03-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Atlas Saksı Takım — Zeytin Yeşili renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 27 cm, yükseklik 23 cm. Hacim: 4 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "23 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL04-SIYAH",
        "productName": "4 No Atlas Saksı Takım Siyah",
        "sizeLabel": "4 No · Ø32×29 cm · 7 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl04-olcu.jpg"
        ],
        "sitePrice": 789,
        "description": "4 No Atlas Saksı Takım — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 29 cm. Hacim: 7 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL04-SUTBEYAZ",
        "productName": "4 No Atlas Saksı Takım Süt Beyaz",
        "sizeLabel": "4 No · Ø32×29 cm · 7 L",
        "colorLabel": "Süt Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-sut-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-sut-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-sut-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl04-olcu.jpg"
        ],
        "sitePrice": 789,
        "description": "4 No Atlas Saksı Takım — Süt Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 29 cm. Hacim: 7 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL04-KAYISITURUNCU",
        "productName": "4 No Atlas Saksı Takım Kayısı Turuncu",
        "sizeLabel": "4 No · Ø32×29 cm · 7 L",
        "colorLabel": "Kayısı Turuncu",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-kayisi-turuncu-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-kayisi-turuncu-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-kayisi-turuncu-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl04-olcu.jpg"
        ],
        "sitePrice": 789,
        "description": "4 No Atlas Saksı Takım — Kayısı Turuncu renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 29 cm. Hacim: 7 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-ATL04-ZEYTINYESILI",
        "productName": "4 No Atlas Saksı Takım Zeytin Yeşili",
        "sizeLabel": "4 No · Ø32×29 cm · 7 L",
        "colorLabel": "Zeytin Yeşili",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-zeytin-yesili-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-zeytin-yesili-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-22-zeytin-yesili-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/atlas-saksi-serisi-atl04-olcu.jpg"
        ],
        "sitePrice": 789,
        "description": "4 No Atlas Saksı Takım — Zeytin Yeşili renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 29 cm. Hacim: 7 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "32 cm"
      }
    ]
  },
  {
    "name": "Lotus Vazo Serisi",
    "slug": "lotus-vazo-serisi-dekoratif",
    "sortOrder": 201,
    "description": "Lotus Vazo Serisi: 1 boy, 5 renk seçeneği (Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili, Kum Beji). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-LTSA03-SIYAH",
        "productName": "Lotus Ayaklı Saksı 3 No Siyah",
        "sizeLabel": "3 No · 25,5×21,5×35 cm · 10,5 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-ltsa03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "Lotus Ayaklı Saksı 3 No — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 25,5 cm, derinlik 21,5 cm, yükseklik 35 cm. Hacim: 10,5 L. \nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili, Kum Beji. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "25,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LTSA03-SUTBEYAZ",
        "productName": "Lotus Ayaklı Saksı 3 No Süt Beyaz",
        "sizeLabel": "3 No · 25,5×21,5×35 cm · 10,5 L",
        "colorLabel": "Süt Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-sut-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-sut-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-sut-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-ltsa03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "Lotus Ayaklı Saksı 3 No — Süt Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 25,5 cm, derinlik 21,5 cm, yükseklik 35 cm. Hacim: 10,5 L. \nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili, Kum Beji. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "25,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LTSA03-KAYISITURUNCU",
        "productName": "Lotus Ayaklı Saksı 3 No Kayısı Turuncu",
        "sizeLabel": "3 No · 25,5×21,5×35 cm · 10,5 L",
        "colorLabel": "Kayısı Turuncu",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-kayisi-turuncu-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-kayisi-turuncu-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-kayisi-turuncu-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-ltsa03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "Lotus Ayaklı Saksı 3 No — Kayısı Turuncu renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 25,5 cm, derinlik 21,5 cm, yükseklik 35 cm. Hacim: 10,5 L. \nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili, Kum Beji. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "25,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LTSA03-ZEYTINYESILI",
        "productName": "Lotus Ayaklı Saksı 3 No Zeytin Yeşili",
        "sizeLabel": "3 No · 25,5×21,5×35 cm · 10,5 L",
        "colorLabel": "Zeytin Yeşili",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-zeytin-yesili-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-zeytin-yesili-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-zeytin-yesili-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-ltsa03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "Lotus Ayaklı Saksı 3 No — Zeytin Yeşili renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 25,5 cm, derinlik 21,5 cm, yükseklik 35 cm. Hacim: 10,5 L. \nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili, Kum Beji. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "25,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LTSA03-KUMBEJI",
        "productName": "Lotus Ayaklı Saksı 3 No Kum Beji",
        "sizeLabel": "3 No · 25,5×21,5×35 cm · 10,5 L",
        "colorLabel": "Kum Beji",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-kum-beji-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-kum-beji-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-24-kum-beji-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lotus-vazo-serisi-ltsa03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "Lotus Ayaklı Saksı 3 No — Kum Beji renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 25,5 cm, derinlik 21,5 cm, yükseklik 35 cm. Hacim: 10,5 L. \nRenk seçenekleri: Siyah, Süt Beyaz, Kayısı Turuncu, Zeytin Yeşili, Kum Beji. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "25,5 cm"
      }
    ]
  },
  {
    "name": "Lale Saksı Serisi",
    "slug": "lale-saksi-serisi-dekoratif",
    "sortOrder": 202,
    "description": "Lale Saksı Serisi: 3 boy, 3 renk seçeneği (Antrasit, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-LALE01-ANTRASIT",
        "productName": "Lale Saksı Takım 1 No Antrasit",
        "sizeLabel": "1 No · Ø32×28,5 cm · 15 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale01-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "Lale Saksı Takım 1 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 28,5 cm. Hacim: 15 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "28,5 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE01-BEYAZ",
        "productName": "Lale Saksı Takım 1 No Beyaz",
        "sizeLabel": "1 No · Ø32×28,5 cm · 15 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale01-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "Lale Saksı Takım 1 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 28,5 cm. Hacim: 15 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "28,5 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE01-MOCHA",
        "productName": "Lale Saksı Takım 1 No Mocha",
        "sizeLabel": "1 No · Ø32×28,5 cm · 15 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale01-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "Lale Saksı Takım 1 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 32 cm, yükseklik 28,5 cm. Hacim: 15 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "28,5 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE02-ANTRASIT",
        "productName": "Lale Saksı Takım 2 No Antrasit",
        "sizeLabel": "2 No · Ø38,5×26,5 cm · 25 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale02-olcu.jpg"
        ],
        "sitePrice": 1169,
        "description": "Lale Saksı Takım 2 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 38,5 cm, yükseklik 26,5 cm. Hacim: 25 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "26,5 cm",
        "potSize": "38,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE02-BEYAZ",
        "productName": "Lale Saksı Takım 2 No Beyaz",
        "sizeLabel": "2 No · Ø38,5×26,5 cm · 25 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale02-olcu.jpg"
        ],
        "sitePrice": 1169,
        "description": "Lale Saksı Takım 2 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 38,5 cm, yükseklik 26,5 cm. Hacim: 25 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "26,5 cm",
        "potSize": "38,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE02-MOCHA",
        "productName": "Lale Saksı Takım 2 No Mocha",
        "sizeLabel": "2 No · Ø38,5×26,5 cm · 25 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale02-olcu.jpg"
        ],
        "sitePrice": 1169,
        "description": "Lale Saksı Takım 2 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 38,5 cm, yükseklik 26,5 cm. Hacim: 25 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "26,5 cm",
        "potSize": "38,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE03-ANTRASIT",
        "productName": "Lale Saksı Takım 3 No Antrasit",
        "sizeLabel": "3 No · Ø48,5×43 cm · 52 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale03-olcu.jpg"
        ],
        "sitePrice": 2519,
        "description": "Lale Saksı Takım 3 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 48,5 cm, yükseklik 43 cm. Hacim: 52 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "43 cm",
        "potSize": "48,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE03-BEYAZ",
        "productName": "Lale Saksı Takım 3 No Beyaz",
        "sizeLabel": "3 No · Ø48,5×43 cm · 52 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale03-olcu.jpg"
        ],
        "sitePrice": 2519,
        "description": "Lale Saksı Takım 3 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 48,5 cm, yükseklik 43 cm. Hacim: 52 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "43 cm",
        "potSize": "48,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LALE03-MOCHA",
        "productName": "Lale Saksı Takım 3 No Mocha",
        "sizeLabel": "3 No · Ø48,5×43 cm · 52 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-27-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lale-saksi-serisi-lale03-olcu.jpg"
        ],
        "sitePrice": 2519,
        "description": "Lale Saksı Takım 3 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 48,5 cm, yükseklik 43 cm. Hacim: 52 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "43 cm",
        "potSize": "48,5 cm"
      }
    ]
  },
  {
    "name": "Palmiye Saksı Serisi",
    "slug": "palmiye-saksi-serisi-dekoratif",
    "sortOrder": 203,
    "description": "Palmiye Saksı Serisi: 1 boy, 3 renk seçeneği (Beyaz, Antrasit, Krem). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-beyaz-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-PALM3-BEYAZ",
        "productName": "Palmiye Saksı 3 No Beyaz",
        "sizeLabel": "3 No · Ø37×37,5 cm · 30 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-palm3-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "Palmiye Saksı 3 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 37,5 cm. Hacim: 30 L. \nRenk seçenekleri: Beyaz, Antrasit, Krem. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37,5 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-PALM3-ANTRASIT",
        "productName": "Palmiye Saksı 3 No Antrasit",
        "sizeLabel": "3 No · Ø37×37,5 cm · 30 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-palm3-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "Palmiye Saksı 3 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 37,5 cm. Hacim: 30 L. \nRenk seçenekleri: Beyaz, Antrasit, Krem. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37,5 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-PALM3-KREM",
        "productName": "Palmiye Saksı 3 No Krem",
        "sizeLabel": "3 No · Ø37×37,5 cm · 30 L",
        "colorLabel": "Krem",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-krem-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-krem-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-26-krem-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/palmiye-saksi-serisi-palm3-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "Palmiye Saksı 3 No — Krem renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 37,5 cm. Hacim: 30 L. \nRenk seçenekleri: Beyaz, Antrasit, Krem. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37,5 cm",
        "potSize": "37 cm"
      }
    ]
  },
  {
    "name": "Sahra Saksı ve Vazo Serisi",
    "slug": "sahra-saksi-ve-vazo-serisi-dekoratif",
    "sortOrder": 204,
    "description": "Sahra Saksı ve Vazo Serisi: 2 boy, 3 renk seçeneği (Antrasit, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-SKS02-ANTRASIT",
        "productName": "Sahra Kare Saksı 2 No Antrasit",
        "sizeLabel": "2 No Kare Saksı · 35×23,5×40 cm · 34 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-sks02-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "Sahra Kare Saksı 2 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 35 cm, derinlik 23,5 cm, yükseklik 40 cm. Hacim: 34 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "35 cm"
      },
      {
        "modelCode": "WEB-DKS-SKS02-BEYAZ",
        "productName": "Sahra Kare Saksı 2 No Beyaz",
        "sizeLabel": "2 No Kare Saksı · 35×23,5×40 cm · 34 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-sks02-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "Sahra Kare Saksı 2 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 35 cm, derinlik 23,5 cm, yükseklik 40 cm. Hacim: 34 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "35 cm"
      },
      {
        "modelCode": "WEB-DKS-SKS02-MOCHA",
        "productName": "Sahra Kare Saksı 2 No Mocha",
        "sizeLabel": "2 No Kare Saksı · 35×23,5×40 cm · 34 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-sks02-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "Sahra Kare Saksı 2 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 35 cm, derinlik 23,5 cm, yükseklik 40 cm. Hacim: 34 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "35 cm"
      },
      {
        "modelCode": "WEB-DKS-SKV01-ANTRASIT",
        "productName": "Sahra Kare Vazo 1 No Antrasit",
        "sizeLabel": "1 No Vazo · 30×20,5×57,5 cm · 35 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-skv01-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Sahra Kare Vazo 1 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 30 cm, derinlik 20,5 cm, yükseklik 57,5 cm. Hacim: 35 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "57,5 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-SKV01-BEYAZ",
        "productName": "Sahra Kare Vazo 1 No Beyaz",
        "sizeLabel": "1 No Vazo · 30×20,5×57,5 cm · 35 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-skv01-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Sahra Kare Vazo 1 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 30 cm, derinlik 20,5 cm, yükseklik 57,5 cm. Hacim: 35 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "57,5 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-SKV01-MOCHA",
        "productName": "Sahra Kare Vazo 1 No Mocha",
        "sizeLabel": "1 No Vazo · 30×20,5×57,5 cm · 35 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-25-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/sahra-serisi-skv01-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Sahra Kare Vazo 1 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 30 cm, derinlik 20,5 cm, yükseklik 57,5 cm. Hacim: 35 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "57,5 cm",
        "potSize": "30 cm"
      }
    ]
  },
  {
    "name": "Küre Saksı Serisi",
    "slug": "kure-saksi-serisi-dekoratif",
    "sortOrder": 205,
    "description": "Küre Saksı Serisi: 3 boy, 3 renk seçeneği (Beyaz, Mocha, Antrasit). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-KURS1-BEYAZ",
        "productName": "Küre Saksı 1 No Beyaz",
        "sizeLabel": "1 No · 19×15×19,5 cm · 7,5 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs1-olcu.jpg"
        ],
        "sitePrice": 759,
        "description": "Küre Saksı 1 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 19 cm, derinlik 15 cm, yükseklik 19,5 cm. Hacim: 7,5 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "19,5 cm",
        "potSize": "19 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS1-MOCHA",
        "productName": "Küre Saksı 1 No Mocha",
        "sizeLabel": "1 No · 19×15×19,5 cm · 7,5 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs1-olcu.jpg"
        ],
        "sitePrice": 759,
        "description": "Küre Saksı 1 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 19 cm, derinlik 15 cm, yükseklik 19,5 cm. Hacim: 7,5 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "19,5 cm",
        "potSize": "19 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS1-ANTRASIT",
        "productName": "Küre Saksı 1 No Antrasit",
        "sizeLabel": "1 No · 19×15×19,5 cm · 7,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs1-olcu.jpg"
        ],
        "sitePrice": 759,
        "description": "Küre Saksı 1 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 19 cm, derinlik 15 cm, yükseklik 19,5 cm. Hacim: 7,5 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "19,5 cm",
        "potSize": "19 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS2-BEYAZ",
        "productName": "Küre Saksı 2 No Beyaz",
        "sizeLabel": "2 No · 27×21×29 cm · 25 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs2-olcu.jpg"
        ],
        "sitePrice": 1029,
        "description": "Küre Saksı 2 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27 cm, derinlik 21 cm, yükseklik 29 cm. Hacim: 25 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS2-MOCHA",
        "productName": "Küre Saksı 2 No Mocha",
        "sizeLabel": "2 No · 27×21×29 cm · 25 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs2-olcu.jpg"
        ],
        "sitePrice": 1029,
        "description": "Küre Saksı 2 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27 cm, derinlik 21 cm, yükseklik 29 cm. Hacim: 25 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS2-ANTRASIT",
        "productName": "Küre Saksı 2 No Antrasit",
        "sizeLabel": "2 No · 27×21×29 cm · 25 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs2-olcu.jpg"
        ],
        "sitePrice": 1029,
        "description": "Küre Saksı 2 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27 cm, derinlik 21 cm, yükseklik 29 cm. Hacim: 25 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "29 cm",
        "potSize": "27 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS3-BEYAZ",
        "productName": "Küre Saksı 3 No Beyaz",
        "sizeLabel": "3 No · 36,7×33×40,5 cm · 62 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs3-olcu.jpg"
        ],
        "sitePrice": 2329,
        "description": "Küre Saksı 3 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,7 cm, derinlik 33 cm, yükseklik 40,5 cm. Hacim: 62 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40,5 cm",
        "potSize": "36,7 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS3-MOCHA",
        "productName": "Küre Saksı 3 No Mocha",
        "sizeLabel": "3 No · 36,7×33×40,5 cm · 62 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs3-olcu.jpg"
        ],
        "sitePrice": 2329,
        "description": "Küre Saksı 3 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,7 cm, derinlik 33 cm, yükseklik 40,5 cm. Hacim: 62 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40,5 cm",
        "potSize": "36,7 cm"
      },
      {
        "modelCode": "WEB-DKS-KURS3-ANTRASIT",
        "productName": "Küre Saksı 3 No Antrasit",
        "sizeLabel": "3 No · 36,7×33×40,5 cm · 62 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-30-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kure-saksi-kurs3-olcu.jpg"
        ],
        "sitePrice": 2329,
        "description": "Küre Saksı 3 No — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,7 cm, derinlik 33 cm, yükseklik 40,5 cm. Hacim: 62 L. \nRenk seçenekleri: Beyaz, Mocha, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40,5 cm",
        "potSize": "36,7 cm"
      }
    ]
  },
  {
    "name": "Kuple Saksı Serisi",
    "slug": "kuple-saksi-serisi-dekoratif",
    "sortOrder": 206,
    "description": "Kuple Saksı Serisi: 2 boy, 4 renk seçeneği (Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-KUP4-SUTBEYAZ",
        "productName": "Kuple Saksı Takım 4 No Süt Beyaz",
        "sizeLabel": "4 No · 27,5×22,1×24,2 cm · 11 L",
        "colorLabel": "Süt Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup4-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "Kuple Saksı Takım 4 No — Süt Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27,5 cm, derinlik 22,1 cm, yükseklik 24,2 cm. Hacim: 11 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "27,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP4-SIMLISIYAH",
        "productName": "Kuple Saksı Takım 4 No Simli Siyah",
        "sizeLabel": "4 No · 27,5×22,1×24,2 cm · 11 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup4-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "Kuple Saksı Takım 4 No — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27,5 cm, derinlik 22,1 cm, yükseklik 24,2 cm. Hacim: 11 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "27,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP4-KIRLIBEYAZ",
        "productName": "Kuple Saksı Takım 4 No Kirli Beyaz",
        "sizeLabel": "4 No · 27,5×22,1×24,2 cm · 11 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup4-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "Kuple Saksı Takım 4 No — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27,5 cm, derinlik 22,1 cm, yükseklik 24,2 cm. Hacim: 11 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "27,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP4-MOCHA",
        "productName": "Kuple Saksı Takım 4 No Mocha",
        "sizeLabel": "4 No · 27,5×22,1×24,2 cm · 11 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup4-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "Kuple Saksı Takım 4 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 27,5 cm, derinlik 22,1 cm, yükseklik 24,2 cm. Hacim: 11 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "27,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP5-SUTBEYAZ",
        "productName": "Kuple Saksı Takım 5 No Süt Beyaz",
        "sizeLabel": "5 No · 36,5×29,3×32,1 cm · 26 L",
        "colorLabel": "Süt Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-sut-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup5-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "Kuple Saksı Takım 5 No — Süt Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 29,3 cm, yükseklik 32,1 cm. Hacim: 26 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,1 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP5-SIMLISIYAH",
        "productName": "Kuple Saksı Takım 5 No Simli Siyah",
        "sizeLabel": "5 No · 36,5×29,3×32,1 cm · 26 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup5-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "Kuple Saksı Takım 5 No — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 29,3 cm, yükseklik 32,1 cm. Hacim: 26 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,1 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP5-KIRLIBEYAZ",
        "productName": "Kuple Saksı Takım 5 No Kirli Beyaz",
        "sizeLabel": "5 No · 36,5×29,3×32,1 cm · 26 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup5-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "Kuple Saksı Takım 5 No — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 29,3 cm, yükseklik 32,1 cm. Hacim: 26 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,1 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-KUP5-MOCHA",
        "productName": "Kuple Saksı Takım 5 No Mocha",
        "sizeLabel": "5 No · 36,5×29,3×32,1 cm · 26 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-32-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kuple-saksi-kup5-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "Kuple Saksı Takım 5 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 29,3 cm, yükseklik 32,1 cm. Hacim: 26 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Süt Beyaz, Simli Siyah, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,1 cm",
        "potSize": "36,5 cm"
      }
    ]
  },
  {
    "name": "Lilyum Vazo Saksı Serisi",
    "slug": "lilyum-vazo-saksi-serisi-dekoratif",
    "sortOrder": 207,
    "description": "Lilyum Vazo Saksı Serisi: 2 boy, 3 renk seçeneği (Beyaz, Kahve, Siyah). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-LVT1-BEYAZ",
        "productName": "Lilyum Vazo Saksı Takım 1 No Beyaz",
        "sizeLabel": "1 No · Ø31,5×58 cm",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-lvt1-olcu.jpg"
        ],
        "sitePrice": 1039,
        "description": "Lilyum Vazo Saksı Takım 1 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 31,5 cm, yükseklik 58 cm. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Beyaz, Kahve, Siyah. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "58 cm",
        "potSize": "31,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LVT1-KAHVE",
        "productName": "Lilyum Vazo Saksı Takım 1 No Kahve",
        "sizeLabel": "1 No · Ø31,5×58 cm",
        "colorLabel": "Kahve",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-kahve-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-kahve-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-kahve-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-lvt1-olcu.jpg"
        ],
        "sitePrice": 1039,
        "description": "Lilyum Vazo Saksı Takım 1 No — Kahve renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 31,5 cm, yükseklik 58 cm. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Beyaz, Kahve, Siyah. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "58 cm",
        "potSize": "31,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LVT1-SIYAH",
        "productName": "Lilyum Vazo Saksı Takım 1 No Siyah",
        "sizeLabel": "1 No · Ø31,5×58 cm",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-lvt1-olcu.jpg"
        ],
        "sitePrice": 1039,
        "description": "Lilyum Vazo Saksı Takım 1 No — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 31,5 cm, yükseklik 58 cm. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Beyaz, Kahve, Siyah. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "58 cm",
        "potSize": "31,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LVT2-BEYAZ",
        "productName": "Lilyum Vazo Saksı Takım 2 No Beyaz",
        "sizeLabel": "2 No · Ø37×70 cm",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-lvt2-olcu.jpg"
        ],
        "sitePrice": 1289,
        "description": "Lilyum Vazo Saksı Takım 2 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 70 cm. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Beyaz, Kahve, Siyah. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "70 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-LVT2-KAHVE",
        "productName": "Lilyum Vazo Saksı Takım 2 No Kahve",
        "sizeLabel": "2 No · Ø37×70 cm",
        "colorLabel": "Kahve",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-kahve-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-kahve-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-kahve-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-lvt2-olcu.jpg"
        ],
        "sitePrice": 1289,
        "description": "Lilyum Vazo Saksı Takım 2 No — Kahve renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 70 cm. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Beyaz, Kahve, Siyah. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "70 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-LVT2-SIYAH",
        "productName": "Lilyum Vazo Saksı Takım 2 No Siyah",
        "sizeLabel": "2 No · Ø37×70 cm",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-31-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/lilyum-vazo-saksi-serisi-lvt2-olcu.jpg"
        ],
        "sitePrice": 1289,
        "description": "Lilyum Vazo Saksı Takım 2 No — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 70 cm. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Beyaz, Kahve, Siyah. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "70 cm",
        "potSize": "37 cm"
      }
    ]
  },
  {
    "name": "Kumsal Vazo Serisi",
    "slug": "kumsal-vazo-serisi-dekoratif",
    "sortOrder": 208,
    "description": "Kumsal Vazo Serisi: 3 boy, 3 renk seçeneği (Antrasit, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-KVT1-ANTRASIT",
        "productName": "1 No Kumsal Vazo Saksı Takım Antrasit",
        "sizeLabel": "1 No · Ø30×57 cm · 51 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt1-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "1 No Kumsal Vazo Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 30 cm, yükseklik 57 cm. Hacim: 51 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "57 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT1-BEYAZ",
        "productName": "1 No Kumsal Vazo Saksı Takım Beyaz",
        "sizeLabel": "1 No · Ø30×57 cm · 51 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt1-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "1 No Kumsal Vazo Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 30 cm, yükseklik 57 cm. Hacim: 51 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "57 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT1-MOCHA",
        "productName": "1 No Kumsal Vazo Saksı Takım Mocha",
        "sizeLabel": "1 No · Ø30×57 cm · 51 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt1-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "1 No Kumsal Vazo Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 30 cm, yükseklik 57 cm. Hacim: 51 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "57 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT2-ANTRASIT",
        "productName": "2 No Kumsal Vazo Saksı Takım Antrasit",
        "sizeLabel": "2 No · Ø35×69 cm · 85 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt2-olcu.jpg"
        ],
        "sitePrice": 1249,
        "description": "2 No Kumsal Vazo Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35 cm, yükseklik 69 cm. Hacim: 85 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "69 cm",
        "potSize": "35 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT2-BEYAZ",
        "productName": "2 No Kumsal Vazo Saksı Takım Beyaz",
        "sizeLabel": "2 No · Ø35×69 cm · 85 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt2-olcu.jpg"
        ],
        "sitePrice": 1249,
        "description": "2 No Kumsal Vazo Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35 cm, yükseklik 69 cm. Hacim: 85 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "69 cm",
        "potSize": "35 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT2-MOCHA",
        "productName": "2 No Kumsal Vazo Saksı Takım Mocha",
        "sizeLabel": "2 No · Ø35×69 cm · 85 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt2-olcu.jpg"
        ],
        "sitePrice": 1249,
        "description": "2 No Kumsal Vazo Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35 cm, yükseklik 69 cm. Hacim: 85 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "69 cm",
        "potSize": "35 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT3-ANTRASIT",
        "productName": "3 No Kumsal Vazo Saksı Takım Antrasit",
        "sizeLabel": "3 No · Ø40×79 cm · 128 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt3-olcu.jpg"
        ],
        "sitePrice": 1509,
        "description": "3 No Kumsal Vazo Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 40 cm, yükseklik 79 cm. Hacim: 128 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "79 cm",
        "potSize": "40 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT3-BEYAZ",
        "productName": "3 No Kumsal Vazo Saksı Takım Beyaz",
        "sizeLabel": "3 No · Ø40×79 cm · 128 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt3-olcu.jpg"
        ],
        "sitePrice": 1509,
        "description": "3 No Kumsal Vazo Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 40 cm, yükseklik 79 cm. Hacim: 128 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "79 cm",
        "potSize": "40 cm"
      },
      {
        "modelCode": "WEB-DKS-KVT3-MOCHA",
        "productName": "3 No Kumsal Vazo Saksı Takım Mocha",
        "sizeLabel": "3 No · Ø40×79 cm · 128 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-35-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kumsal-vazo-serisi-kvt3-olcu.jpg"
        ],
        "sitePrice": 1509,
        "description": "3 No Kumsal Vazo Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 40 cm, yükseklik 79 cm. Hacim: 128 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "79 cm",
        "potSize": "40 cm"
      }
    ]
  },
  {
    "name": "Luna Saksı Serisi",
    "slug": "luna-saksi-serisi-dekoratif",
    "sortOrder": 209,
    "description": "Luna Saksı Serisi: 1 boy, 3 renk seçeneği (Siyah, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-LNS3-SIYAH",
        "productName": "Luna Saksı 3 No Siyah",
        "sizeLabel": "3 No · 36,5×23×37 cm · 27 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-lns3-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Luna Saksı 3 No — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 23 cm, yükseklik 37 cm. Hacim: 27 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LNS3-BEYAZ",
        "productName": "Luna Saksı 3 No Beyaz",
        "sizeLabel": "3 No · 36,5×23×37 cm · 27 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-lns3-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Luna Saksı 3 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 23 cm, yükseklik 37 cm. Hacim: 27 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-LNS3-MOCHA",
        "productName": "Luna Saksı 3 No Mocha",
        "sizeLabel": "3 No · 36,5×23×37 cm · 27 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-34-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/luna-saksi-lns3-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Luna Saksı 3 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 23 cm, yükseklik 37 cm. Hacim: 27 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37 cm",
        "potSize": "36,5 cm"
      }
    ]
  },
  {
    "name": "Vega Saksı Serisi",
    "slug": "vega-saksi-serisi-dekoratif",
    "sortOrder": 210,
    "description": "Vega Saksı Serisi: 2 boy, 3 renk seçeneği (Siyah, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-VGS2-SIYAH",
        "productName": "Vega Saksı 2 No Siyah",
        "sizeLabel": "2 No · 30×25×32 cm · 20 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-vgs2-olcu.jpg"
        ],
        "sitePrice": 959,
        "description": "Vega Saksı 2 No — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 30 cm, derinlik 25 cm, yükseklik 32 cm. Hacim: 20 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-VGS2-BEYAZ",
        "productName": "Vega Saksı 2 No Beyaz",
        "sizeLabel": "2 No · 30×25×32 cm · 20 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-vgs2-olcu.jpg"
        ],
        "sitePrice": 959,
        "description": "Vega Saksı 2 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 30 cm, derinlik 25 cm, yükseklik 32 cm. Hacim: 20 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-VGS2-MOCHA",
        "productName": "Vega Saksı 2 No Mocha",
        "sizeLabel": "2 No · 30×25×32 cm · 20 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-vgs2-olcu.jpg"
        ],
        "sitePrice": 959,
        "description": "Vega Saksı 2 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 30 cm, derinlik 25 cm, yükseklik 32 cm. Hacim: 20 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32 cm",
        "potSize": "30 cm"
      },
      {
        "modelCode": "WEB-DKS-VGS3-SIYAH",
        "productName": "Vega Saksı 3 No Siyah",
        "sizeLabel": "3 No · 36,5×30×36,5 cm · 27 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-vgs3-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Vega Saksı 3 No — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 30 cm, yükseklik 36,5 cm. Hacim: 27 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36,5 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-VGS3-BEYAZ",
        "productName": "Vega Saksı 3 No Beyaz",
        "sizeLabel": "3 No · 36,5×30×36,5 cm · 27 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-vgs3-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Vega Saksı 3 No — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 30 cm, yükseklik 36,5 cm. Hacim: 27 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36,5 cm",
        "potSize": "36,5 cm"
      },
      {
        "modelCode": "WEB-DKS-VGS3-MOCHA",
        "productName": "Vega Saksı 3 No Mocha",
        "sizeLabel": "3 No · 36,5×30×36,5 cm · 27 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-33-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vega-saksi-vgs3-olcu.jpg"
        ],
        "sitePrice": 1189,
        "description": "Vega Saksı 3 No — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 36,5 cm, derinlik 30 cm, yükseklik 36,5 cm. Hacim: 27 L. \nRenk seçenekleri: Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36,5 cm",
        "potSize": "36,5 cm"
      }
    ]
  },
  {
    "name": "Papatya Saksı Serisi",
    "slug": "papatya-saksi-serisi-dekoratif",
    "sortOrder": 211,
    "description": "Papatya Saksı Serisi: 2 boy, 3 renk seçeneği (Simli Siyah, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-P006-SIMLISIYAH",
        "productName": "6 No Papatya Saksı Simli Siyah",
        "sizeLabel": "6 No · Ø35,1×32,9 cm · 22 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-p006-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "6 No Papatya Saksı — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35,1 cm, yükseklik 32,9 cm. Hacim: 22 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,9 cm",
        "potSize": "35,1 cm"
      },
      {
        "modelCode": "WEB-DKS-P006-BEYAZ",
        "productName": "6 No Papatya Saksı Beyaz",
        "sizeLabel": "6 No · Ø35,1×32,9 cm · 22 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-p006-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "6 No Papatya Saksı — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35,1 cm, yükseklik 32,9 cm. Hacim: 22 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,9 cm",
        "potSize": "35,1 cm"
      },
      {
        "modelCode": "WEB-DKS-P006-MOCHA",
        "productName": "6 No Papatya Saksı Mocha",
        "sizeLabel": "6 No · Ø35,1×32,9 cm · 22 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-p006-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "6 No Papatya Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35,1 cm, yükseklik 32,9 cm. Hacim: 22 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,9 cm",
        "potSize": "35,1 cm"
      },
      {
        "modelCode": "WEB-DKS-P007-SIMLISIYAH",
        "productName": "7 No Papatya Saksı Simli Siyah",
        "sizeLabel": "7 No · Ø45×42 cm · 46 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-p007-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "7 No Papatya Saksı — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 45 cm, yükseklik 42 cm. Hacim: 46 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "42 cm",
        "potSize": "45 cm"
      },
      {
        "modelCode": "WEB-DKS-P007-BEYAZ",
        "productName": "7 No Papatya Saksı Beyaz",
        "sizeLabel": "7 No · Ø45×42 cm · 46 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-p007-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "7 No Papatya Saksı — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 45 cm, yükseklik 42 cm. Hacim: 46 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "42 cm",
        "potSize": "45 cm"
      },
      {
        "modelCode": "WEB-DKS-P007-MOCHA",
        "productName": "7 No Papatya Saksı Mocha",
        "sizeLabel": "7 No · Ø45×42 cm · 46 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-41-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/papatya-saksi-serisi-p007-olcu.jpg"
        ],
        "sitePrice": 1049,
        "description": "7 No Papatya Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 45 cm, yükseklik 42 cm. Hacim: 46 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "42 cm",
        "potSize": "45 cm"
      }
    ]
  },
  {
    "name": "Yalı Saksı Serisi",
    "slug": "yali-saksi-serisi-dekoratif",
    "sortOrder": 212,
    "description": "Yalı Saksı Serisi: 3 boy, 3 renk seçeneği (Antrasit, Kirli Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-YS06-ANTRASIT",
        "productName": "6 No Yalı Saksı Takım Antrasit",
        "sizeLabel": "6 No · Ø37×34 cm · 23 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys06-olcu.jpg"
        ],
        "sitePrice": 779,
        "description": "6 No Yalı Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 34 cm. Hacim: 23 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-YS06-KIRLIBEYAZ",
        "productName": "6 No Yalı Saksı Takım Kirli Beyaz",
        "sizeLabel": "6 No · Ø37×34 cm · 23 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys06-olcu.jpg"
        ],
        "sitePrice": 779,
        "description": "6 No Yalı Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 34 cm. Hacim: 23 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-YS06-MOCHA",
        "productName": "6 No Yalı Saksı Takım Mocha",
        "sizeLabel": "6 No · Ø37×34 cm · 23 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys06-olcu.jpg"
        ],
        "sitePrice": 779,
        "description": "6 No Yalı Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 37 cm, yükseklik 34 cm. Hacim: 23 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-YS07-ANTRASIT",
        "productName": "7 No Yalı Saksı Takım Antrasit",
        "sizeLabel": "7 No · Ø46,5×42,5 cm · 46 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys07-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "7 No Yalı Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 46,5 cm, yükseklik 42,5 cm. Hacim: 46 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "42,5 cm",
        "potSize": "46,5 cm"
      },
      {
        "modelCode": "WEB-DKS-YS07-KIRLIBEYAZ",
        "productName": "7 No Yalı Saksı Takım Kirli Beyaz",
        "sizeLabel": "7 No · Ø46,5×42,5 cm · 46 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys07-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "7 No Yalı Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 46,5 cm, yükseklik 42,5 cm. Hacim: 46 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "42,5 cm",
        "potSize": "46,5 cm"
      },
      {
        "modelCode": "WEB-DKS-YS07-MOCHA",
        "productName": "7 No Yalı Saksı Takım Mocha",
        "sizeLabel": "7 No · Ø46,5×42,5 cm · 46 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys07-olcu.jpg"
        ],
        "sitePrice": 1129,
        "description": "7 No Yalı Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 46,5 cm, yükseklik 42,5 cm. Hacim: 46 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "42,5 cm",
        "potSize": "46,5 cm"
      },
      {
        "modelCode": "WEB-DKS-YS08-ANTRASIT",
        "productName": "8 No Yalı Saksı Takım Antrasit",
        "sizeLabel": "8 No · Ø55×55,5 cm · 76 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys08-olcu.jpg"
        ],
        "sitePrice": 1639,
        "description": "8 No Yalı Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 55 cm, yükseklik 55,5 cm. Hacim: 76 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "55,5 cm",
        "potSize": "55 cm"
      },
      {
        "modelCode": "WEB-DKS-YS08-KIRLIBEYAZ",
        "productName": "8 No Yalı Saksı Takım Kirli Beyaz",
        "sizeLabel": "8 No · Ø55×55,5 cm · 76 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys08-olcu.jpg"
        ],
        "sitePrice": 1639,
        "description": "8 No Yalı Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 55 cm, yükseklik 55,5 cm. Hacim: 76 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "55,5 cm",
        "potSize": "55 cm"
      },
      {
        "modelCode": "WEB-DKS-YS08-MOCHA",
        "productName": "8 No Yalı Saksı Takım Mocha",
        "sizeLabel": "8 No · Ø55×55,5 cm · 76 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-44-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yali-saksi-serisi-ys08-olcu.jpg"
        ],
        "sitePrice": 1639,
        "description": "8 No Yalı Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 55 cm, yükseklik 55,5 cm. Hacim: 76 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "55,5 cm",
        "potSize": "55 cm"
      }
    ]
  },
  {
    "name": "Yakut Saksı Serisi",
    "slug": "yakut-saksi-serisi-dekoratif",
    "sortOrder": 213,
    "description": "Yakut Saksı Serisi: 6 boy, 2 renk seçeneği (Siyah, Kirli Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-YK05-SIYAH",
        "productName": "5 No Yakut Saksı Takım Siyah",
        "sizeLabel": "5 No · 34×34×31 cm · 22 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yk05-olcu.jpg"
        ],
        "sitePrice": 799,
        "description": "5 No Yakut Saksı Takım — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34 cm, derinlik 34 cm, yükseklik 31 cm. Hacim: 22 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "34 cm"
      },
      {
        "modelCode": "WEB-DKS-YK05-KIRLIBEYAZ",
        "productName": "5 No Yakut Saksı Takım Kirli Beyaz",
        "sizeLabel": "5 No · 34×34×31 cm · 22 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yk05-olcu.jpg"
        ],
        "sitePrice": 799,
        "description": "5 No Yakut Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34 cm, derinlik 34 cm, yükseklik 31 cm. Hacim: 22 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "34 cm"
      },
      {
        "modelCode": "WEB-DKS-YK06-SIYAH",
        "productName": "6 No Yakut Saksı Takım Siyah",
        "sizeLabel": "6 No · 39×39×39 cm · 33 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yk06-olcu.jpg"
        ],
        "sitePrice": 1469,
        "description": "6 No Yakut Saksı Takım — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 39 cm, derinlik 39 cm, yükseklik 39 cm. Hacim: 33 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "39 cm",
        "potSize": "39 cm"
      },
      {
        "modelCode": "WEB-DKS-YK06-KIRLIBEYAZ",
        "productName": "6 No Yakut Saksı Takım Kirli Beyaz",
        "sizeLabel": "6 No · 39×39×39 cm · 33 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yk06-olcu.jpg"
        ],
        "sitePrice": 1469,
        "description": "6 No Yakut Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 39 cm, derinlik 39 cm, yükseklik 39 cm. Hacim: 33 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "39 cm",
        "potSize": "39 cm"
      },
      {
        "modelCode": "WEB-DKS-YK07-SIYAH",
        "productName": "7 No Yakut Saksı Takım Siyah",
        "sizeLabel": "7 No · 49×49×45 cm · 66 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yk07-olcu.jpg"
        ],
        "sitePrice": 1979,
        "description": "7 No Yakut Saksı Takım — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 49 cm, derinlik 49 cm, yükseklik 45 cm. Hacim: 66 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "45 cm",
        "potSize": "49 cm"
      },
      {
        "modelCode": "WEB-DKS-YK07-KIRLIBEYAZ",
        "productName": "7 No Yakut Saksı Takım Kirli Beyaz",
        "sizeLabel": "7 No · 49×49×45 cm · 66 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yk07-olcu.jpg"
        ],
        "sitePrice": 1979,
        "description": "7 No Yakut Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 49 cm, derinlik 49 cm, yükseklik 45 cm. Hacim: 66 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "45 cm",
        "potSize": "49 cm"
      },
      {
        "modelCode": "WEB-DKS-YAS5-SIYAH",
        "productName": "5 No Yakut Akıllı Saksı Siyah",
        "sizeLabel": "5 No Akıllı Saksı · 34×34×31 cm · 22 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yas5-olcu.jpg"
        ],
        "sitePrice": 1219,
        "description": "5 No Yakut Akıllı Saksı — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34 cm, derinlik 34 cm, yükseklik 31 cm. Hacim: 22 L. \nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "34 cm"
      },
      {
        "modelCode": "WEB-DKS-YAS5-KIRLIBEYAZ",
        "productName": "5 No Yakut Akıllı Saksı Kirli Beyaz",
        "sizeLabel": "5 No Akıllı Saksı · 34×34×31 cm · 22 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yas5-olcu.jpg"
        ],
        "sitePrice": 1219,
        "description": "5 No Yakut Akıllı Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34 cm, derinlik 34 cm, yükseklik 31 cm. Hacim: 22 L. \nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "34 cm"
      },
      {
        "modelCode": "WEB-DKS-YAS6-SIYAH",
        "productName": "6 No Yakut Akıllı Saksı Siyah",
        "sizeLabel": "6 No Akıllı Saksı · 39×39×39 cm · 33 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yas6-olcu.jpg"
        ],
        "sitePrice": 1979,
        "description": "6 No Yakut Akıllı Saksı — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 39 cm, derinlik 39 cm, yükseklik 39 cm. Hacim: 33 L. \nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "39 cm",
        "potSize": "39 cm"
      },
      {
        "modelCode": "WEB-DKS-YAS6-KIRLIBEYAZ",
        "productName": "6 No Yakut Akıllı Saksı Kirli Beyaz",
        "sizeLabel": "6 No Akıllı Saksı · 39×39×39 cm · 33 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yas6-olcu.jpg"
        ],
        "sitePrice": 1979,
        "description": "6 No Yakut Akıllı Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 39 cm, derinlik 39 cm, yükseklik 39 cm. Hacim: 33 L. \nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "39 cm",
        "potSize": "39 cm"
      },
      {
        "modelCode": "WEB-DKS-YAS7-SIYAH",
        "productName": "7 No Yakut Akıllı Saksı Siyah",
        "sizeLabel": "7 No Akıllı Saksı · 49×49×45 cm · 66 L",
        "colorLabel": "Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yas7-olcu.jpg"
        ],
        "sitePrice": 2529,
        "description": "7 No Yakut Akıllı Saksı — Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 49 cm, derinlik 49 cm, yükseklik 45 cm. Hacim: 66 L. \nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "45 cm",
        "potSize": "49 cm"
      },
      {
        "modelCode": "WEB-DKS-YAS7-KIRLIBEYAZ",
        "productName": "7 No Yakut Akıllı Saksı Kirli Beyaz",
        "sizeLabel": "7 No Akıllı Saksı · 49×49×45 cm · 66 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-39-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/yakut-serisi-yas7-olcu.jpg"
        ],
        "sitePrice": 2529,
        "description": "7 No Yakut Akıllı Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 49 cm, derinlik 49 cm, yükseklik 45 cm. Hacim: 66 L. \nRenk seçenekleri: Siyah, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "45 cm",
        "potSize": "49 cm"
      }
    ]
  },
  {
    "name": "Klasik Salon Saksı Serisi",
    "slug": "klasik-salon-saksi-serisi-dekoratif",
    "sortOrder": 214,
    "description": "Klasik Salon Saksı Serisi: 1 boy, 3 renk seçeneği (Antrasit, Kirli Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-S212-ANTRASIT",
        "productName": "12 No Klasik Saksı Antrasit",
        "sizeLabel": "12 No · Ø38×31 cm · 25 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-s212-olcu.jpg"
        ],
        "sitePrice": 669,
        "description": "12 No Klasik Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 38 cm, yükseklik 31 cm. Hacim: 25 L. \nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "38 cm"
      },
      {
        "modelCode": "WEB-DKS-S212-KIRLIBEYAZ",
        "productName": "12 No Klasik Saksı Kirli Beyaz",
        "sizeLabel": "12 No · Ø38×31 cm · 25 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-s212-olcu.jpg"
        ],
        "sitePrice": 669,
        "description": "12 No Klasik Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 38 cm, yükseklik 31 cm. Hacim: 25 L. \nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "38 cm"
      },
      {
        "modelCode": "WEB-DKS-S212-MOCHA",
        "productName": "12 No Klasik Saksı Mocha",
        "sizeLabel": "12 No · Ø38×31 cm · 25 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-58-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-salon-saksi-serisi-s212-olcu.jpg"
        ],
        "sitePrice": 669,
        "description": "12 No Klasik Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 38 cm, yükseklik 31 cm. Hacim: 25 L. \nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "38 cm"
      }
    ]
  },
  {
    "name": "İstanbul Saksı Serisi",
    "slug": "istanbul-saksi-serisi-dekoratif",
    "sortOrder": 215,
    "description": "İstanbul Saksı Serisi: 2 boy, 3 renk seçeneği (Simli Siyah, Beyaz, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-IS03-SIMLISIYAH",
        "productName": "3 No İstanbul Saksı Takım Simli Siyah",
        "sizeLabel": "3 No · Ø26×24 cm · 6,6 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-is03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "3 No İstanbul Saksı Takım — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 26 cm, yükseklik 24 cm. Hacim: 6,6 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24 cm",
        "potSize": "26 cm"
      },
      {
        "modelCode": "WEB-DKS-IS03-BEYAZ",
        "productName": "3 No İstanbul Saksı Takım Beyaz",
        "sizeLabel": "3 No · Ø26×24 cm · 6,6 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-is03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "3 No İstanbul Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 26 cm, yükseklik 24 cm. Hacim: 6,6 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24 cm",
        "potSize": "26 cm"
      },
      {
        "modelCode": "WEB-DKS-IS03-YESIL",
        "productName": "3 No İstanbul Saksı Takım Yeşil",
        "sizeLabel": "3 No · Ø26×24 cm · 6,6 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-is03-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "3 No İstanbul Saksı Takım — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 26 cm, yükseklik 24 cm. Hacim: 6,6 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24 cm",
        "potSize": "26 cm"
      },
      {
        "modelCode": "WEB-DKS-IS04-SIMLISIYAH",
        "productName": "4 No İstanbul Saksı Takım Simli Siyah",
        "sizeLabel": "4 No · Ø33×31 cm · 14,1 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-is04-olcu.jpg"
        ],
        "sitePrice": 889,
        "description": "4 No İstanbul Saksı Takım — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 33 cm, yükseklik 31 cm. Hacim: 14,1 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "33 cm"
      },
      {
        "modelCode": "WEB-DKS-IS04-BEYAZ",
        "productName": "4 No İstanbul Saksı Takım Beyaz",
        "sizeLabel": "4 No · Ø33×31 cm · 14,1 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-is04-olcu.jpg"
        ],
        "sitePrice": 889,
        "description": "4 No İstanbul Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 33 cm, yükseklik 31 cm. Hacim: 14,1 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "33 cm"
      },
      {
        "modelCode": "WEB-DKS-IS04-YESIL",
        "productName": "4 No İstanbul Saksı Takım Yeşil",
        "sizeLabel": "4 No · Ø33×31 cm · 14,1 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-57-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-saksi-serisi-is04-olcu.jpg"
        ],
        "sitePrice": 889,
        "description": "4 No İstanbul Saksı Takım — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 33 cm, yükseklik 31 cm. Hacim: 14,1 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "33 cm"
      }
    ]
  },
  {
    "name": "İstanbul Balkon Serisi",
    "slug": "istanbul-balkon-serisi-dekoratif",
    "sortOrder": 216,
    "description": "İstanbul Balkon Serisi: 2 boy, 3 renk seçeneği (Simli Siyah, Beyaz, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-IB02-SIMLISIYAH",
        "productName": "2 No İstanbul Balkon Saksı Takım Simli Siyah",
        "sizeLabel": "2 No · 53,5×19×17 cm · 9 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-ib02-olcu.jpg"
        ],
        "sitePrice": 799,
        "description": "2 No İstanbul Balkon Saksı Takım — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 53,5 cm, derinlik 19 cm, yükseklik 17 cm. Hacim: 9 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17 cm",
        "potSize": "53,5 cm"
      },
      {
        "modelCode": "WEB-DKS-IB02-BEYAZ",
        "productName": "2 No İstanbul Balkon Saksı Takım Beyaz",
        "sizeLabel": "2 No · 53,5×19×17 cm · 9 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-ib02-olcu.jpg"
        ],
        "sitePrice": 799,
        "description": "2 No İstanbul Balkon Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 53,5 cm, derinlik 19 cm, yükseklik 17 cm. Hacim: 9 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17 cm",
        "potSize": "53,5 cm"
      },
      {
        "modelCode": "WEB-DKS-IB02-YESIL",
        "productName": "2 No İstanbul Balkon Saksı Takım Yeşil",
        "sizeLabel": "2 No · 53,5×19×17 cm · 9 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-ib02-olcu.jpg"
        ],
        "sitePrice": 799,
        "description": "2 No İstanbul Balkon Saksı Takım — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 53,5 cm, derinlik 19 cm, yükseklik 17 cm. Hacim: 9 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17 cm",
        "potSize": "53,5 cm"
      },
      {
        "modelCode": "WEB-DKS-IB03-SIMLISIYAH",
        "productName": "3 No İstanbul Balkon Saksı Takım Simli Siyah",
        "sizeLabel": "3 No · 77,5×19×17 cm · 14 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-ib03-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "3 No İstanbul Balkon Saksı Takım — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 77,5 cm, derinlik 19 cm, yükseklik 17 cm. Hacim: 14 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17 cm",
        "potSize": "77,5 cm"
      },
      {
        "modelCode": "WEB-DKS-IB03-BEYAZ",
        "productName": "3 No İstanbul Balkon Saksı Takım Beyaz",
        "sizeLabel": "3 No · 77,5×19×17 cm · 14 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-ib03-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "3 No İstanbul Balkon Saksı Takım — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 77,5 cm, derinlik 19 cm, yükseklik 17 cm. Hacim: 14 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17 cm",
        "potSize": "77,5 cm"
      },
      {
        "modelCode": "WEB-DKS-IB03-YESIL",
        "productName": "3 No İstanbul Balkon Saksı Takım Yeşil",
        "sizeLabel": "3 No · 77,5×19×17 cm · 14 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-60-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/istanbul-balkon-serisi-ib03-olcu.jpg"
        ],
        "sitePrice": 999,
        "description": "3 No İstanbul Balkon Saksı Takım — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 77,5 cm, derinlik 19 cm, yükseklik 17 cm. Hacim: 14 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Simli Siyah, Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17 cm",
        "potSize": "77,5 cm"
      }
    ]
  },
  {
    "name": "Zümrüt Saksı Serisi",
    "slug": "zumrut-saksi-serisi-dekoratif",
    "sortOrder": 217,
    "description": "Zümrüt Saksı Serisi: 1 boy, 3 renk seçeneği (Antrasit, Kirli Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-ZS02-ANTRASIT",
        "productName": "2 No Zümrüt Saksı Antrasit",
        "sizeLabel": "2 No · 58×29×24 cm · 15,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-zs02-olcu.jpg"
        ],
        "sitePrice": 839,
        "description": "2 No Zümrüt Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 58 cm, derinlik 29 cm, yükseklik 24 cm. Hacim: 15,5 L. \nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24 cm",
        "potSize": "58 cm"
      },
      {
        "modelCode": "WEB-DKS-ZS02-KIRLIBEYAZ",
        "productName": "2 No Zümrüt Saksı Kirli Beyaz",
        "sizeLabel": "2 No · 58×29×24 cm · 15,5 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-zs02-olcu.jpg"
        ],
        "sitePrice": 839,
        "description": "2 No Zümrüt Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 58 cm, derinlik 29 cm, yükseklik 24 cm. Hacim: 15,5 L. \nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24 cm",
        "potSize": "58 cm"
      },
      {
        "modelCode": "WEB-DKS-ZS02-MOCHA",
        "productName": "2 No Zümrüt Saksı Mocha",
        "sizeLabel": "2 No · 58×29×24 cm · 15,5 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-48-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/zumrut-saksi-serisi-zs02-olcu.jpg"
        ],
        "sitePrice": 839,
        "description": "2 No Zümrüt Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 58 cm, derinlik 29 cm, yükseklik 24 cm. Hacim: 15,5 L. \nRenk seçenekleri: Antrasit, Kirli Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24 cm",
        "potSize": "58 cm"
      }
    ]
  },
  {
    "name": "Safir Balkon Serisi",
    "slug": "safir-balkon-serisi-dekoratif",
    "sortOrder": 218,
    "description": "Safir Balkon Serisi: 2 boy, 1 renk seçeneği (Antrasit). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-SB01-ANTRASIT",
        "productName": "1 No Safir Balkon Saksı Antrasit",
        "sizeLabel": "1 No · 31×31×25 cm · 10 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-sb01-olcu.jpg"
        ],
        "sitePrice": 609,
        "description": "1 No Safir Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 31 cm, derinlik 31 cm, yükseklik 25 cm. Hacim: 10 L. \nRenk seçenekleri: Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "25 cm",
        "potSize": "31 cm"
      },
      {
        "modelCode": "WEB-DKS-SB02-ANTRASIT",
        "productName": "2 No Safir Balkon Saksı Antrasit",
        "sizeLabel": "2 No · 59×36×25 cm · 22,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-54-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/safir-balkon-serisi-sb02-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "2 No Safir Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 59 cm, derinlik 36 cm, yükseklik 25 cm. Hacim: 22,5 L. \nRenk seçenekleri: Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "25 cm",
        "potSize": "59 cm"
      }
    ]
  },
  {
    "name": "Kapadokya Kristal Saksı Serisi",
    "slug": "kapadokya-kristal-saksi-serisi-dekoratif",
    "sortOrder": 219,
    "description": "Kapadokya Kristal Saksı Serisi: 1 boy, 1 renk seçeneği (Şeffaf). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/kapadokya-saksi-kristal-serisi-56-seffaf-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-KAP4-SEFFAF",
        "productName": "4 No Kapadokya Saksı Kristal Şeffaf",
        "sizeLabel": "4 No · Ø21,6×19,2 cm · 5 L",
        "colorLabel": "Şeffaf",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kapadokya-saksi-kristal-serisi-56-seffaf-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kapadokya-saksi-kristal-serisi-56-seffaf-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kapadokya-saksi-kristal-serisi-56-seffaf-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kapadokya-saksi-kristal-serisi-kap4-olcu.jpg"
        ],
        "sitePrice": 609,
        "description": "4 No Kapadokya Saksı Kristal — Şeffaf renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 21,6 cm, yükseklik 19,2 cm. Hacim: 5 L. \nRenk seçenekleri: Şeffaf. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "19,2 cm",
        "potSize": "21,6 cm"
      }
    ]
  },
  {
    "name": "Klasik Balkon Saksı Serisi",
    "slug": "klasik-balkon-saksi-serisi-dekoratif",
    "sortOrder": 220,
    "description": "Klasik Balkon Saksı Serisi: 1 boy, 3 renk seçeneği (Antrasit, Beyaz, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-S233-ANTRASIT",
        "productName": "Büyük Balkon Saksı Antrasit",
        "sizeLabel": "Büyük · 75×16,5×14,5 cm · 11,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-s233-olcu.jpg"
        ],
        "sitePrice": 699,
        "description": "Büyük Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 75 cm, derinlik 16,5 cm, yükseklik 14,5 cm. Hacim: 11,5 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "14,5 cm",
        "potSize": "75 cm"
      },
      {
        "modelCode": "WEB-DKS-S233-BEYAZ",
        "productName": "Büyük Balkon Saksı Beyaz",
        "sizeLabel": "Büyük · 75×16,5×14,5 cm · 11,5 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-s233-olcu.jpg"
        ],
        "sitePrice": 699,
        "description": "Büyük Balkon Saksı — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 75 cm, derinlik 16,5 cm, yükseklik 14,5 cm. Hacim: 11,5 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "14,5 cm",
        "potSize": "75 cm"
      },
      {
        "modelCode": "WEB-DKS-S233-MOCHA",
        "productName": "Büyük Balkon Saksı Mocha",
        "sizeLabel": "Büyük · 75×16,5×14,5 cm · 11,5 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-69-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/klasik-balkon-saksi-serisi-s233-olcu.jpg"
        ],
        "sitePrice": 699,
        "description": "Büyük Balkon Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 75 cm, derinlik 16,5 cm, yükseklik 14,5 cm. Hacim: 11,5 L. \nRenk seçenekleri: Antrasit, Beyaz, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "14,5 cm",
        "potSize": "75 cm"
      }
    ]
  },
  {
    "name": "6 Ayaklı Balkon Saksı Serisi",
    "slug": "6-ayakli-balkon-saksi-serisi-dekoratif",
    "sortOrder": 221,
    "description": "6 Ayaklı Balkon Saksı Serisi: 2 boy, 3 renk seçeneği (Antrasit, Kiremit, Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-S230-ANTRASIT",
        "productName": "1 No 6 Ayaklı Balkon Saksı Antrasit",
        "sizeLabel": "1 No · 75×25×21 cm · 26 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-s230-olcu.jpg"
        ],
        "sitePrice": 659,
        "description": "1 No 6 Ayaklı Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 75 cm, derinlik 25 cm, yükseklik 21 cm. Hacim: 26 L. \nRenk seçenekleri: Antrasit, Kiremit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "21 cm",
        "potSize": "75 cm"
      },
      {
        "modelCode": "WEB-DKS-S230-KIREMIT",
        "productName": "1 No 6 Ayaklı Balkon Saksı Kiremit",
        "sizeLabel": "1 No · 75×25×21 cm · 26 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-s230-olcu.jpg"
        ],
        "sitePrice": 659,
        "description": "1 No 6 Ayaklı Balkon Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 75 cm, derinlik 25 cm, yükseklik 21 cm. Hacim: 26 L. \nRenk seçenekleri: Antrasit, Kiremit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "21 cm",
        "potSize": "75 cm"
      },
      {
        "modelCode": "WEB-DKS-S230B-BEYAZ",
        "productName": "1 No 6 Ayaklı Balkon Saksı Beyaz",
        "sizeLabel": "1 No · 75×25×21 cm · 26 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-67-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/6-ayakli-balkon-saksi-serisi-s230b-olcu.jpg"
        ],
        "sitePrice": 769,
        "description": "1 No 6 Ayaklı Balkon Saksı — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 75 cm, derinlik 25 cm, yükseklik 21 cm. Hacim: 26 L. \nRenk seçenekleri: Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "21 cm",
        "potSize": "75 cm"
      }
    ]
  },
  {
    "name": "Premium Yalı Saksı Serisi",
    "slug": "premium-yali-saksi-serisi-dekoratif",
    "sortOrder": 222,
    "description": "Premium Yalı Saksı Serisi: 3 boy, 3 renk seçeneği (Kiremit Mermer, Siyah Mermer, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-PYL2-KIREMITMERMER",
        "productName": "Premium Yalı Saksı 200 Lt Kiremit Mermer",
        "sizeLabel": "200 Lt · 77×39×69 cm",
        "colorLabel": "Kiremit Mermer",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl2-olcu.jpg"
        ],
        "sitePrice": 6359,
        "description": "Premium Yalı Saksı 200 Lt — Kiremit Mermer renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 77 cm, derinlik 39 cm, yükseklik 69 cm. Hacim: 200 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "69 cm",
        "potSize": "77 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL2-SIYAHMERMER",
        "productName": "Premium Yalı Saksı 200 Lt Siyah Mermer",
        "sizeLabel": "200 Lt · 77×39×69 cm",
        "colorLabel": "Siyah Mermer",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl2-olcu.jpg"
        ],
        "sitePrice": 6359,
        "description": "Premium Yalı Saksı 200 Lt — Siyah Mermer renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 77 cm, derinlik 39 cm, yükseklik 69 cm. Hacim: 200 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "69 cm",
        "potSize": "77 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL2-MOCHA",
        "productName": "Premium Yalı Saksı 200 Lt Mocha",
        "sizeLabel": "200 Lt · 77×39×69 cm",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl2-olcu.jpg"
        ],
        "sitePrice": 6359,
        "description": "Premium Yalı Saksı 200 Lt — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 77 cm, derinlik 39 cm, yükseklik 69 cm. Hacim: 200 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "69 cm",
        "potSize": "77 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL5-KIREMITMERMER",
        "productName": "Premium Yalı Saksı 500 Lt Kiremit Mermer",
        "sizeLabel": "500 Lt · 103×52×92 cm",
        "colorLabel": "Kiremit Mermer",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl5-olcu.jpg"
        ],
        "sitePrice": 11409,
        "description": "Premium Yalı Saksı 500 Lt — Kiremit Mermer renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 103 cm, derinlik 52 cm, yükseklik 92 cm. Hacim: 500 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "92 cm",
        "potSize": "103 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL5-SIYAHMERMER",
        "productName": "Premium Yalı Saksı 500 Lt Siyah Mermer",
        "sizeLabel": "500 Lt · 103×52×92 cm",
        "colorLabel": "Siyah Mermer",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl5-olcu.jpg"
        ],
        "sitePrice": 11409,
        "description": "Premium Yalı Saksı 500 Lt — Siyah Mermer renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 103 cm, derinlik 52 cm, yükseklik 92 cm. Hacim: 500 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "92 cm",
        "potSize": "103 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL5-MOCHA",
        "productName": "Premium Yalı Saksı 500 Lt Mocha",
        "sizeLabel": "500 Lt · 103×52×92 cm",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl5-olcu.jpg"
        ],
        "sitePrice": 11409,
        "description": "Premium Yalı Saksı 500 Lt — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 103 cm, derinlik 52 cm, yükseklik 92 cm. Hacim: 500 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "92 cm",
        "potSize": "103 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL8-KIREMITMERMER",
        "productName": "Premium Yalı Saksı 800 Lt Kiremit Mermer",
        "sizeLabel": "800 Lt · 126×62×118 cm",
        "colorLabel": "Kiremit Mermer",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-kiremit-mermer-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl8-olcu.jpg"
        ],
        "sitePrice": 19279,
        "description": "Premium Yalı Saksı 800 Lt — Kiremit Mermer renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 126 cm, derinlik 62 cm, yükseklik 118 cm. Hacim: 800 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "118 cm",
        "potSize": "126 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL8-SIYAHMERMER",
        "productName": "Premium Yalı Saksı 800 Lt Siyah Mermer",
        "sizeLabel": "800 Lt · 126×62×118 cm",
        "colorLabel": "Siyah Mermer",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-siyah-mermer-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl8-olcu.jpg"
        ],
        "sitePrice": 19279,
        "description": "Premium Yalı Saksı 800 Lt — Siyah Mermer renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 126 cm, derinlik 62 cm, yükseklik 118 cm. Hacim: 800 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "118 cm",
        "potSize": "126 cm"
      },
      {
        "modelCode": "WEB-DKS-PYL8-MOCHA",
        "productName": "Premium Yalı Saksı 800 Lt Mocha",
        "sizeLabel": "800 Lt · 126×62×118 cm",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-75-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/premium-yali-saksi-serisi-pyl8-olcu.jpg"
        ],
        "sitePrice": 19279,
        "description": "Premium Yalı Saksı 800 Lt — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 126 cm, derinlik 62 cm, yükseklik 118 cm. Hacim: 800 L. \nRenk seçenekleri: Kiremit Mermer, Siyah Mermer, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "118 cm",
        "potSize": "126 cm"
      }
    ]
  },
  {
    "name": "Nergiz Saksı Serisi",
    "slug": "nergiz-saksi-serisi-dekoratif",
    "sortOrder": 223,
    "description": "Nergiz Saksı Serisi: 3 boy, 3 renk seçeneği (Antrasit, Mocha, Kirli Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-N001-ANTRASIT",
        "productName": "1 No Nergiz Saksı Antrasit",
        "sizeLabel": "1 No · 34,3×35×24,2 cm · 9,8 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n001-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "1 No Nergiz Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34,3 cm, derinlik 35 cm, yükseklik 24,2 cm. Hacim: 9,8 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "34,3 cm"
      },
      {
        "modelCode": "WEB-DKS-N001-MOCHA",
        "productName": "1 No Nergiz Saksı Mocha",
        "sizeLabel": "1 No · 34,3×35×24,2 cm · 9,8 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n001-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "1 No Nergiz Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34,3 cm, derinlik 35 cm, yükseklik 24,2 cm. Hacim: 9,8 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "34,3 cm"
      },
      {
        "modelCode": "WEB-DKS-N001-KIRLIBEYAZ",
        "productName": "1 No Nergiz Saksı Kirli Beyaz",
        "sizeLabel": "1 No · 34,3×35×24,2 cm · 9,8 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n001-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "1 No Nergiz Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 34,3 cm, derinlik 35 cm, yükseklik 24,2 cm. Hacim: 9,8 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "24,2 cm",
        "potSize": "34,3 cm"
      },
      {
        "modelCode": "WEB-DKS-N002-ANTRASIT",
        "productName": "2 No Nergiz Saksı Antrasit",
        "sizeLabel": "2 No · 47,4×47,6×33,6 cm · 25,3 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n002-olcu.jpg"
        ],
        "sitePrice": 929,
        "description": "2 No Nergiz Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 47,4 cm, derinlik 47,6 cm, yükseklik 33,6 cm. Hacim: 25,3 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "33,6 cm",
        "potSize": "47,4 cm"
      },
      {
        "modelCode": "WEB-DKS-N002-MOCHA",
        "productName": "2 No Nergiz Saksı Mocha",
        "sizeLabel": "2 No · 47,4×47,6×33,6 cm · 25,3 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n002-olcu.jpg"
        ],
        "sitePrice": 929,
        "description": "2 No Nergiz Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 47,4 cm, derinlik 47,6 cm, yükseklik 33,6 cm. Hacim: 25,3 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "33,6 cm",
        "potSize": "47,4 cm"
      },
      {
        "modelCode": "WEB-DKS-N002-KIRLIBEYAZ",
        "productName": "2 No Nergiz Saksı Kirli Beyaz",
        "sizeLabel": "2 No · 47,4×47,6×33,6 cm · 25,3 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n002-olcu.jpg"
        ],
        "sitePrice": 929,
        "description": "2 No Nergiz Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 47,4 cm, derinlik 47,6 cm, yükseklik 33,6 cm. Hacim: 25,3 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "33,6 cm",
        "potSize": "47,4 cm"
      },
      {
        "modelCode": "WEB-DKS-N003-ANTRASIT",
        "productName": "3 No Nergiz Saksı Antrasit",
        "sizeLabel": "3 No · 58,9×58,8×41,1 cm · 47 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n003-olcu.jpg"
        ],
        "sitePrice": 1569,
        "description": "3 No Nergiz Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 58,9 cm, derinlik 58,8 cm, yükseklik 41,1 cm. Hacim: 47 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41,1 cm",
        "potSize": "58,9 cm"
      },
      {
        "modelCode": "WEB-DKS-N003-MOCHA",
        "productName": "3 No Nergiz Saksı Mocha",
        "sizeLabel": "3 No · 58,9×58,8×41,1 cm · 47 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n003-olcu.jpg"
        ],
        "sitePrice": 1569,
        "description": "3 No Nergiz Saksı — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 58,9 cm, derinlik 58,8 cm, yükseklik 41,1 cm. Hacim: 47 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41,1 cm",
        "potSize": "58,9 cm"
      },
      {
        "modelCode": "WEB-DKS-N003-KIRLIBEYAZ",
        "productName": "3 No Nergiz Saksı Kirli Beyaz",
        "sizeLabel": "3 No · 58,9×58,8×41,1 cm · 47 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-66-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/nergiz-saksi-serisi-n003-olcu.jpg"
        ],
        "sitePrice": 1569,
        "description": "3 No Nergiz Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 58,9 cm, derinlik 58,8 cm, yükseklik 41,1 cm. Hacim: 47 L. \nRenk seçenekleri: Antrasit, Mocha, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41,1 cm",
        "potSize": "58,9 cm"
      }
    ]
  },
  {
    "name": "Ayaklı Bahçe Serisi",
    "slug": "ayakli-bahce-serisi-dekoratif",
    "sortOrder": 224,
    "description": "Ayaklı Bahçe Serisi: 4 boy, 3 renk seçeneği (Antrasit, Kirli Beyaz, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-AB02-ANTRASIT",
        "productName": "2 No Ayaklı Bahçe Saksı Antrasit",
        "sizeLabel": "2 No · 76×37,5×65,5 cm · 60 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-ab02-olcu.jpg"
        ],
        "sitePrice": 1449,
        "description": "2 No Ayaklı Bahçe Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 76 cm, derinlik 37,5 cm, yükseklik 65,5 cm. Hacim: 60 L. \nRenk seçenekleri: Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "65,5 cm",
        "potSize": "76 cm"
      },
      {
        "modelCode": "WEB-DKS-AB03-KIRLIBEYAZ",
        "productName": "3 No Ayaklı Bahçe Saksı (Demonte Ayak) Kirli Beyaz",
        "sizeLabel": "3 No Demonte Ayak · 76×37,5×65,5 cm · 60 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-ab03-olcu.jpg"
        ],
        "sitePrice": 1519,
        "description": "3 No Ayaklı Bahçe Saksı (Demonte Ayak) — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 76 cm, derinlik 37,5 cm, yükseklik 65,5 cm. Hacim: 60 L. \nRenk seçenekleri: Kirli Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "65,5 cm",
        "potSize": "76 cm"
      },
      {
        "modelCode": "WEB-DKS-AB03-YESIL",
        "productName": "3 No Ayaklı Bahçe Saksı (Demonte Ayak) Yeşil",
        "sizeLabel": "3 No Demonte Ayak · 76×37,5×65,5 cm · 60 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-85-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-ab03-olcu.jpg"
        ],
        "sitePrice": 1519,
        "description": "3 No Ayaklı Bahçe Saksı (Demonte Ayak) — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 76 cm, derinlik 37,5 cm, yükseklik 65,5 cm. Hacim: 60 L. \nRenk seçenekleri: Kirli Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "65,5 cm",
        "potSize": "76 cm"
      },
      {
        "modelCode": "WEB-DKS-ABS2-KIRLIBEYAZ",
        "productName": "Ayaklı Bahçe Saksı 2 No Set Kirli Beyaz",
        "sizeLabel": "2 No Set",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-abs2-olcu.jpg"
        ],
        "sitePrice": 2089,
        "description": "Ayaklı Bahçe Saksı 2 No Set — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\n\nRenk seçenekleri: Kirli Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": null,
        "potSize": null
      },
      {
        "modelCode": "WEB-DKS-ABS2-YESIL",
        "productName": "Ayaklı Bahçe Saksı 2 No Set Yeşil",
        "sizeLabel": "2 No Set",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-abs2-olcu.jpg"
        ],
        "sitePrice": 2089,
        "description": "Ayaklı Bahçe Saksı 2 No Set — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\n\nRenk seçenekleri: Kirli Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": null,
        "potSize": null
      },
      {
        "modelCode": "WEB-DKS-ABS3-KIRLIBEYAZ",
        "productName": "Ayaklı Bahçe Saksı 3 No Set Kirli Beyaz",
        "sizeLabel": "3 No Set",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-abs3-olcu.jpg"
        ],
        "sitePrice": 2159,
        "description": "Ayaklı Bahçe Saksı 3 No Set — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\n\nRenk seçenekleri: Kirli Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": null,
        "potSize": null
      },
      {
        "modelCode": "WEB-DKS-ABS3-YESIL",
        "productName": "Ayaklı Bahçe Saksı 3 No Set Yeşil",
        "sizeLabel": "3 No Set",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-84-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/ayakli-bahce-serisi-abs3-olcu.jpg"
        ],
        "sitePrice": 2159,
        "description": "Ayaklı Bahçe Saksı 3 No Set — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\n\nRenk seçenekleri: Kirli Beyaz, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": null,
        "potSize": null
      }
    ]
  },
  {
    "name": "Pamukkale Saksı Serisi",
    "slug": "pamukkale-saksi-serisi-dekoratif",
    "sortOrder": 225,
    "description": "Pamukkale Saksı Serisi: 1 boy, 2 renk seçeneği (Kiremit, Antrasit). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-PKS3-KIREMIT",
        "productName": "3 No Pamukkale Saksı 4'lü Set Kiremit",
        "sizeLabel": "3 No 4'lü Set · Ø42,5×17,5 cm · 12,5 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-pks3-olcu.jpg"
        ],
        "sitePrice": 929,
        "description": "3 No Pamukkale Saksı 4'lü Set — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 42,5 cm, yükseklik 17,5 cm. Hacim: 12,5 L. \nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "42,5 cm"
      },
      {
        "modelCode": "WEB-DKS-PKS3-ANTRASIT",
        "productName": "3 No Pamukkale Saksı 4'lü Set Antrasit",
        "sizeLabel": "3 No 4'lü Set · Ø42,5×17,5 cm · 12,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-87-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/pamukkale-saksi-serisi-pks3-olcu.jpg"
        ],
        "sitePrice": 929,
        "description": "3 No Pamukkale Saksı 4'lü Set — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 42,5 cm, yükseklik 17,5 cm. Hacim: 12,5 L. \nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "42,5 cm"
      }
    ]
  },
  {
    "name": "Silindir Kesme Çiçek Vazosu",
    "slug": "silindir-kesme-cicek-vazosu-dekoratif",
    "sortOrder": 226,
    "description": "Silindir Kesme Çiçek Vazosu: 1 boy, 3 renk seçeneği (Simli Siyah, Beyaz, Altın). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-simli-siyah-1.jpg",
    "catalogCategory": "Vazo ve Şamdanlar",
    "groupSubCategory": "Vazolar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-V005-SIMLISIYAH",
        "productName": "Silindir Kesme Çiçek Vazosu 2 Simli Siyah",
        "sizeLabel": "2 No · Ø18×40 cm · 5,7 L",
        "colorLabel": "Simli Siyah",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-simli-siyah-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-simli-siyah-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-simli-siyah-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-v005-olcu.jpg"
        ],
        "sitePrice": 599,
        "description": "Silindir Kesme Çiçek Vazosu 2 — Simli Siyah renk. Dayanıklı plastikten üretilmiş dekoratif vazo; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 18 cm, yükseklik 40 cm. Hacim: 5,7 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Altın. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "18 cm"
      },
      {
        "modelCode": "WEB-DKS-V005-BEYAZ",
        "productName": "Silindir Kesme Çiçek Vazosu 2 Beyaz",
        "sizeLabel": "2 No · Ø18×40 cm · 5,7 L",
        "colorLabel": "Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-v005-olcu.jpg"
        ],
        "sitePrice": 599,
        "description": "Silindir Kesme Çiçek Vazosu 2 — Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif vazo; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 18 cm, yükseklik 40 cm. Hacim: 5,7 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Altın. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "18 cm"
      },
      {
        "modelCode": "WEB-DKS-V005-ALTIN",
        "productName": "Silindir Kesme Çiçek Vazosu 2 Altın",
        "sizeLabel": "2 No · Ø18×40 cm · 5,7 L",
        "colorLabel": "Altın",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-altin-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-altin-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-97-altin-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vazo-serisi-v005-olcu.jpg"
        ],
        "sitePrice": 599,
        "description": "Silindir Kesme Çiçek Vazosu 2 — Altın renk. Dayanıklı plastikten üretilmiş dekoratif vazo; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 18 cm, yükseklik 40 cm. Hacim: 5,7 L. \nRenk seçenekleri: Simli Siyah, Beyaz, Altın. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "18 cm"
      }
    ]
  },
  {
    "name": "Aranjman Saksı Serisi",
    "slug": "aranjman-saksi-serisi-dekoratif",
    "sortOrder": 227,
    "description": "Aranjman Saksı Serisi: 2 boy, 2 renk seçeneği (Kiremit, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-A004-KIREMIT",
        "productName": "4 No Aranjman Saksı Takım Kiremit",
        "sizeLabel": "4 No · Ø50×19 cm · 19 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-a004-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "4 No Aranjman Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 50 cm, yükseklik 19 cm. Hacim: 19 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "19 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-A004-YESIL",
        "productName": "4 No Aranjman Saksı Takım Yeşil",
        "sizeLabel": "4 No · Ø50×19 cm · 19 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-a004-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "4 No Aranjman Saksı Takım — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 50 cm, yükseklik 19 cm. Hacim: 19 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "19 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-A005-KIREMIT",
        "productName": "5 No Aranjman Saksı Takım Kiremit",
        "sizeLabel": "5 No · Ø60×22 cm · 40 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-a005-olcu.jpg"
        ],
        "sitePrice": 769,
        "description": "5 No Aranjman Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 60 cm, yükseklik 22 cm. Hacim: 40 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "22 cm",
        "potSize": "60 cm"
      },
      {
        "modelCode": "WEB-DKS-A005-YESIL",
        "productName": "5 No Aranjman Saksı Takım Yeşil",
        "sizeLabel": "5 No · Ø60×22 cm · 40 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-90-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/arajman-saksi-serisi-a005-olcu.jpg"
        ],
        "sitePrice": 769,
        "description": "5 No Aranjman Saksı Takım — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 60 cm, yükseklik 22 cm. Hacim: 40 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "22 cm",
        "potSize": "60 cm"
      }
    ]
  },
  {
    "name": "Damla Saksı Serisi",
    "slug": "damla-saksi-serisi-dekoratif",
    "sortOrder": 228,
    "description": "Damla Saksı Serisi: 2 boy, 2 renk seçeneği (Kiremit, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-D010-KIREMIT",
        "productName": "10 No Damla Saksı Kiremit",
        "sizeLabel": "10 No · Ø46×35 cm · 25 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-d010-olcu.jpg"
        ],
        "sitePrice": 649,
        "description": "10 No Damla Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 46 cm, yükseklik 35 cm. Hacim: 25 L. \nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "46 cm"
      },
      {
        "modelCode": "WEB-DKS-D010-YESIL",
        "productName": "10 No Damla Saksı Yeşil",
        "sizeLabel": "10 No · Ø46×35 cm · 25 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-d010-olcu.jpg"
        ],
        "sitePrice": 649,
        "description": "10 No Damla Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 46 cm, yükseklik 35 cm. Hacim: 25 L. \nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "35 cm",
        "potSize": "46 cm"
      },
      {
        "modelCode": "WEB-DKS-D011-KIREMIT",
        "productName": "11 No Damla Saksı Kiremit",
        "sizeLabel": "11 No · Ø51×40 cm · 37 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-d011-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "11 No Damla Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 51 cm, yükseklik 40 cm. Hacim: 37 L. \nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "51 cm"
      },
      {
        "modelCode": "WEB-DKS-D011-YESIL",
        "productName": "11 No Damla Saksı Yeşil",
        "sizeLabel": "11 No · Ø51×40 cm · 37 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-100-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/damla-saksi-serisi-d011-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "11 No Damla Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 51 cm, yükseklik 40 cm. Hacim: 37 L. \nRenk seçenekleri: Kiremit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "51 cm"
      }
    ]
  },
  {
    "name": "Villa Saksı Serisi",
    "slug": "villa-saksi-serisi-dekoratif",
    "sortOrder": 229,
    "description": "Villa Saksı Serisi: 5 boy, 3 renk seçeneği (Kiremit, Antrasit, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-V510-KIREMIT",
        "productName": "10 No Villa Saksı Kiremit",
        "sizeLabel": "10 No · Ø48×36 cm · 35 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v510-olcu.jpg"
        ],
        "sitePrice": 649,
        "description": "10 No Villa Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 48 cm, yükseklik 36 cm. Hacim: 35 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36 cm",
        "potSize": "48 cm"
      },
      {
        "modelCode": "WEB-DKS-V510-ANTRASIT",
        "productName": "10 No Villa Saksı Antrasit",
        "sizeLabel": "10 No · Ø48×36 cm · 35 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v510-olcu.jpg"
        ],
        "sitePrice": 649,
        "description": "10 No Villa Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 48 cm, yükseklik 36 cm. Hacim: 35 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36 cm",
        "potSize": "48 cm"
      },
      {
        "modelCode": "WEB-DKS-V510-YESIL",
        "productName": "10 No Villa Saksı Yeşil",
        "sizeLabel": "10 No · Ø48×36 cm · 35 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v510-olcu.jpg"
        ],
        "sitePrice": 649,
        "description": "10 No Villa Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 48 cm, yükseklik 36 cm. Hacim: 35 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36 cm",
        "potSize": "48 cm"
      },
      {
        "modelCode": "WEB-DKS-V511-KIREMIT",
        "productName": "11 No Villa Saksı Kiremit",
        "sizeLabel": "11 No · Ø53×41 cm · 45 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v511-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "11 No Villa Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 53 cm, yükseklik 41 cm. Hacim: 45 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41 cm",
        "potSize": "53 cm"
      },
      {
        "modelCode": "WEB-DKS-V511-ANTRASIT",
        "productName": "11 No Villa Saksı Antrasit",
        "sizeLabel": "11 No · Ø53×41 cm · 45 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v511-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "11 No Villa Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 53 cm, yükseklik 41 cm. Hacim: 45 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41 cm",
        "potSize": "53 cm"
      },
      {
        "modelCode": "WEB-DKS-V511-YESIL",
        "productName": "11 No Villa Saksı Yeşil",
        "sizeLabel": "11 No · Ø53×41 cm · 45 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v511-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "11 No Villa Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 53 cm, yükseklik 41 cm. Hacim: 45 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41 cm",
        "potSize": "53 cm"
      },
      {
        "modelCode": "WEB-DKS-V512-KIREMIT",
        "productName": "12 No Villa Saksı Kiremit",
        "sizeLabel": "12 No · Ø58×41 cm · 54 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v512-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "12 No Villa Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 58 cm, yükseklik 41 cm. Hacim: 54 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41 cm",
        "potSize": "58 cm"
      },
      {
        "modelCode": "WEB-DKS-V512-ANTRASIT",
        "productName": "12 No Villa Saksı Antrasit",
        "sizeLabel": "12 No · Ø58×41 cm · 54 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v512-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "12 No Villa Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 58 cm, yükseklik 41 cm. Hacim: 54 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41 cm",
        "potSize": "58 cm"
      },
      {
        "modelCode": "WEB-DKS-V512-YESIL",
        "productName": "12 No Villa Saksı Yeşil",
        "sizeLabel": "12 No · Ø58×41 cm · 54 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v512-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "12 No Villa Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 58 cm, yükseklik 41 cm. Hacim: 54 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "41 cm",
        "potSize": "58 cm"
      },
      {
        "modelCode": "WEB-DKS-V513-KIREMIT",
        "productName": "13 No Villa Saksı Kiremit",
        "sizeLabel": "13 No · Ø64×46 cm · 76 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v513-olcu.jpg"
        ],
        "sitePrice": 1119,
        "description": "13 No Villa Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 64 cm, yükseklik 46 cm. Hacim: 76 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "46 cm",
        "potSize": "64 cm"
      },
      {
        "modelCode": "WEB-DKS-V513-ANTRASIT",
        "productName": "13 No Villa Saksı Antrasit",
        "sizeLabel": "13 No · Ø64×46 cm · 76 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v513-olcu.jpg"
        ],
        "sitePrice": 1119,
        "description": "13 No Villa Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 64 cm, yükseklik 46 cm. Hacim: 76 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "46 cm",
        "potSize": "64 cm"
      },
      {
        "modelCode": "WEB-DKS-V513-YESIL",
        "productName": "13 No Villa Saksı Yeşil",
        "sizeLabel": "13 No · Ø64×46 cm · 76 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v513-olcu.jpg"
        ],
        "sitePrice": 1119,
        "description": "13 No Villa Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 64 cm, yükseklik 46 cm. Hacim: 76 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "46 cm",
        "potSize": "64 cm"
      },
      {
        "modelCode": "WEB-DKS-V514-KIREMIT",
        "productName": "14 No Villa Saksı Kiremit",
        "sizeLabel": "14 No · Ø68×53 cm · 110 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v514-olcu.jpg"
        ],
        "sitePrice": 1429,
        "description": "14 No Villa Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 68 cm, yükseklik 53 cm. Hacim: 110 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "53 cm",
        "potSize": "68 cm"
      },
      {
        "modelCode": "WEB-DKS-V514-ANTRASIT",
        "productName": "14 No Villa Saksı Antrasit",
        "sizeLabel": "14 No · Ø68×53 cm · 110 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v514-olcu.jpg"
        ],
        "sitePrice": 1429,
        "description": "14 No Villa Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 68 cm, yükseklik 53 cm. Hacim: 110 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "53 cm",
        "potSize": "68 cm"
      },
      {
        "modelCode": "WEB-DKS-V514-YESIL",
        "productName": "14 No Villa Saksı Yeşil",
        "sizeLabel": "14 No · Ø68×53 cm · 110 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-108-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-saksi-serisi-v514-olcu.jpg"
        ],
        "sitePrice": 1429,
        "description": "14 No Villa Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 68 cm, yükseklik 53 cm. Hacim: 110 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "53 cm",
        "potSize": "68 cm"
      }
    ]
  },
  {
    "name": "Villa Balkon Saksı Serisi",
    "slug": "villa-balkon-saksi-serisi-dekoratif",
    "sortOrder": 230,
    "description": "Villa Balkon Saksı Serisi: 1 boy, 3 renk seçeneği (Kiremit, Antrasit, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-V630-KIREMIT",
        "productName": "3 No Villa Balkon Saksı Kiremit",
        "sizeLabel": "3 No · 72×19,5×17,5 cm · 14 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-v630-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Villa Balkon Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 19,5 cm, yükseklik 17,5 cm. Hacim: 14 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-V630-ANTRASIT",
        "productName": "3 No Villa Balkon Saksı Antrasit",
        "sizeLabel": "3 No · 72×19,5×17,5 cm · 14 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-v630-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Villa Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 19,5 cm, yükseklik 17,5 cm. Hacim: 14 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-V630-YESIL",
        "productName": "3 No Villa Balkon Saksı Yeşil",
        "sizeLabel": "3 No · 72×19,5×17,5 cm · 14 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-112-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-balkon-saksi-serisi-v630-olcu.jpg"
        ],
        "sitePrice": 619,
        "description": "3 No Villa Balkon Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 19,5 cm, yükseklik 17,5 cm. Hacim: 14 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "72 cm"
      }
    ]
  },
  {
    "name": "Villa Bahçe Saksı Serisi",
    "slug": "villa-bahce-saksi-serisi-dekoratif",
    "sortOrder": 231,
    "description": "Villa Bahçe Saksı Serisi: 3 boy, 3 renk seçeneği (Kiremit, Antrasit, Yeşil). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-V691-KIREMIT",
        "productName": "1 No Villa Bahçe Saksı Kiremit",
        "sizeLabel": "1 No · 72×32×26 cm · 39 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v691-olcu.jpg"
        ],
        "sitePrice": 859,
        "description": "1 No Villa Bahçe Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 32 cm, yükseklik 26 cm. Hacim: 39 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "26 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-V691-ANTRASIT",
        "productName": "1 No Villa Bahçe Saksı Antrasit",
        "sizeLabel": "1 No · 72×32×26 cm · 39 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v691-olcu.jpg"
        ],
        "sitePrice": 859,
        "description": "1 No Villa Bahçe Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 32 cm, yükseklik 26 cm. Hacim: 39 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "26 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-V691-YESIL",
        "productName": "1 No Villa Bahçe Saksı Yeşil",
        "sizeLabel": "1 No · 72×32×26 cm · 39 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v691-olcu.jpg"
        ],
        "sitePrice": 859,
        "description": "1 No Villa Bahçe Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 32 cm, yükseklik 26 cm. Hacim: 39 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "26 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-V692-KIREMIT",
        "productName": "2 No Villa Bahçe Saksı Kiremit",
        "sizeLabel": "2 No · 86×38×30 cm · 62 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v692-olcu.jpg"
        ],
        "sitePrice": 1239,
        "description": "2 No Villa Bahçe Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 86 cm, derinlik 38 cm, yükseklik 30 cm. Hacim: 62 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "30 cm",
        "potSize": "86 cm"
      },
      {
        "modelCode": "WEB-DKS-V692-ANTRASIT",
        "productName": "2 No Villa Bahçe Saksı Antrasit",
        "sizeLabel": "2 No · 86×38×30 cm · 62 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v692-olcu.jpg"
        ],
        "sitePrice": 1239,
        "description": "2 No Villa Bahçe Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 86 cm, derinlik 38 cm, yükseklik 30 cm. Hacim: 62 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "30 cm",
        "potSize": "86 cm"
      },
      {
        "modelCode": "WEB-DKS-V692-YESIL",
        "productName": "2 No Villa Bahçe Saksı Yeşil",
        "sizeLabel": "2 No · 86×38×30 cm · 62 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v692-olcu.jpg"
        ],
        "sitePrice": 1239,
        "description": "2 No Villa Bahçe Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 86 cm, derinlik 38 cm, yükseklik 30 cm. Hacim: 62 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "30 cm",
        "potSize": "86 cm"
      },
      {
        "modelCode": "WEB-DKS-V693-KIREMIT",
        "productName": "3 No Villa Bahçe Saksı Kiremit",
        "sizeLabel": "3 No · 97×44×34,5 cm · 95 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v693-olcu.jpg"
        ],
        "sitePrice": 1589,
        "description": "3 No Villa Bahçe Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 97 cm, derinlik 44 cm, yükseklik 34,5 cm. Hacim: 95 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34,5 cm",
        "potSize": "97 cm"
      },
      {
        "modelCode": "WEB-DKS-V693-ANTRASIT",
        "productName": "3 No Villa Bahçe Saksı Antrasit",
        "sizeLabel": "3 No · 97×44×34,5 cm · 95 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v693-olcu.jpg"
        ],
        "sitePrice": 1589,
        "description": "3 No Villa Bahçe Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 97 cm, derinlik 44 cm, yükseklik 34,5 cm. Hacim: 95 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34,5 cm",
        "potSize": "97 cm"
      },
      {
        "modelCode": "WEB-DKS-V693-YESIL",
        "productName": "3 No Villa Bahçe Saksı Yeşil",
        "sizeLabel": "3 No · 97×44×34,5 cm · 95 L",
        "colorLabel": "Yeşil",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-105-yesil-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-saksi-serisi-v693-olcu.jpg"
        ],
        "sitePrice": 1589,
        "description": "3 No Villa Bahçe Saksı — Yeşil renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 97 cm, derinlik 44 cm, yükseklik 34,5 cm. Hacim: 95 L. \nRenk seçenekleri: Kiremit, Antrasit, Yeşil. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34,5 cm",
        "potSize": "97 cm"
      }
    ]
  },
  {
    "name": "Villa Bahçe Ayaklı Saksı Serisi",
    "slug": "villa-bahce-ayakli-saksi-serisi-dekoratif",
    "sortOrder": 232,
    "description": "Villa Bahçe Ayaklı Saksı Serisi: 2 boy, 2 renk seçeneği (Antrasit, Kirli Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-VBA01A-ANTRASIT",
        "productName": "1 No Villa Bahçe Ayaklı Saksı Antrasit",
        "sizeLabel": "1 No · 68×29,5×63 cm · 33 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-vba01a-olcu.jpg"
        ],
        "sitePrice": 1069,
        "description": "1 No Villa Bahçe Ayaklı Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 68 cm, derinlik 29,5 cm, yükseklik 63 cm. Hacim: 33 L. \nRenk seçenekleri: Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "63 cm",
        "potSize": "68 cm"
      },
      {
        "modelCode": "WEB-DKS-VBA01B-KIRLIBEYAZ",
        "productName": "1 No Villa Bahçe Ayaklı Saksı Kirli Beyaz",
        "sizeLabel": "1 No · 68×29,5×63 cm · 33 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-113-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-bahce-ayakli-saksi-serisi-vba01b-olcu.jpg"
        ],
        "sitePrice": 1209,
        "description": "1 No Villa Bahçe Ayaklı Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 68 cm, derinlik 29,5 cm, yükseklik 63 cm. Hacim: 33 L. \nRenk seçenekleri: Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "63 cm",
        "potSize": "68 cm"
      }
    ]
  },
  {
    "name": "Villa Kare Saksı Serisi",
    "slug": "villa-kare-saksi-serisi-dekoratif",
    "sortOrder": 233,
    "description": "Villa Kare Saksı Serisi: 8 boy, 3 renk seçeneği (Kiremit, Antrasit, Kirli Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-VK03-KIREMIT",
        "productName": "3 No Villa Kare Saksı Takım Kiremit",
        "sizeLabel": "3 No · 32×32×30 cm · 17 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk03-olcu.jpg"
        ],
        "sitePrice": 609,
        "description": "3 No Villa Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 32 cm, derinlik 32 cm, yükseklik 30 cm. Hacim: 17 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "30 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-VK03-ANTRASIT",
        "productName": "3 No Villa Kare Saksı Takım Antrasit",
        "sizeLabel": "3 No · 32×32×30 cm · 17 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk03-olcu.jpg"
        ],
        "sitePrice": 609,
        "description": "3 No Villa Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 32 cm, derinlik 32 cm, yükseklik 30 cm. Hacim: 17 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "30 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-VK04-KIREMIT",
        "productName": "4 No Villa Kare Saksı Takım Kiremit",
        "sizeLabel": "4 No · 40×40×36 cm · 32 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk04-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "4 No Villa Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 40 cm, derinlik 40 cm, yükseklik 36 cm. Hacim: 32 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36 cm",
        "potSize": "40 cm"
      },
      {
        "modelCode": "WEB-DKS-VK04-ANTRASIT",
        "productName": "4 No Villa Kare Saksı Takım Antrasit",
        "sizeLabel": "4 No · 40×40×36 cm · 32 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk04-olcu.jpg"
        ],
        "sitePrice": 829,
        "description": "4 No Villa Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 40 cm, derinlik 40 cm, yükseklik 36 cm. Hacim: 32 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36 cm",
        "potSize": "40 cm"
      },
      {
        "modelCode": "WEB-DKS-VK05-KIREMIT",
        "productName": "5 No Villa Kare Saksı Takım Kiremit",
        "sizeLabel": "5 No · 50×50×46,5 cm · 64 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk05-olcu.jpg"
        ],
        "sitePrice": 1259,
        "description": "5 No Villa Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 50 cm, derinlik 50 cm, yükseklik 46,5 cm. Hacim: 64 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "46,5 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-VK05-ANTRASIT",
        "productName": "5 No Villa Kare Saksı Takım Antrasit",
        "sizeLabel": "5 No · 50×50×46,5 cm · 64 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk05-olcu.jpg"
        ],
        "sitePrice": 1259,
        "description": "5 No Villa Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 50 cm, derinlik 50 cm, yükseklik 46,5 cm. Hacim: 64 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "46,5 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-VK06-KIREMIT",
        "productName": "6 No Villa Kare Saksı Takım Kiremit",
        "sizeLabel": "6 No · 60×60×56 cm · 110 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk06-olcu.jpg"
        ],
        "sitePrice": 1859,
        "description": "6 No Villa Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 60 cm, derinlik 60 cm, yükseklik 56 cm. Hacim: 110 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "56 cm",
        "potSize": "60 cm"
      },
      {
        "modelCode": "WEB-DKS-VK06-ANTRASIT",
        "productName": "6 No Villa Kare Saksı Takım Antrasit",
        "sizeLabel": "6 No · 60×60×56 cm · 110 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk06-olcu.jpg"
        ],
        "sitePrice": 1859,
        "description": "6 No Villa Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 60 cm, derinlik 60 cm, yükseklik 56 cm. Hacim: 110 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "56 cm",
        "potSize": "60 cm"
      },
      {
        "modelCode": "WEB-DKS-VK03B-KIRLIBEYAZ",
        "productName": "3 No Villa Kare Saksı Takım Kirli Beyaz",
        "sizeLabel": "3 No · 32×32×30 cm · 17 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk03b-olcu.jpg"
        ],
        "sitePrice": 739,
        "description": "3 No Villa Kare Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 32 cm, derinlik 32 cm, yükseklik 30 cm. Hacim: 17 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "30 cm",
        "potSize": "32 cm"
      },
      {
        "modelCode": "WEB-DKS-VK04B-KIRLIBEYAZ",
        "productName": "4 No Villa Kare Saksı Takım Kirli Beyaz",
        "sizeLabel": "4 No · 40×40×36 cm · 32 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk04b-olcu.jpg"
        ],
        "sitePrice": 1059,
        "description": "4 No Villa Kare Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 40 cm, derinlik 40 cm, yükseklik 36 cm. Hacim: 32 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "36 cm",
        "potSize": "40 cm"
      },
      {
        "modelCode": "WEB-DKS-VK05B-KIRLIBEYAZ",
        "productName": "5 No Villa Kare Saksı Takım Kirli Beyaz",
        "sizeLabel": "5 No · 50×50×46,5 cm · 64 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk05b-olcu.jpg"
        ],
        "sitePrice": 1689,
        "description": "5 No Villa Kare Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 50 cm, derinlik 50 cm, yükseklik 46,5 cm. Hacim: 64 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "46,5 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-VK06B-KIRLIBEYAZ",
        "productName": "6 No Villa Kare Saksı Takım Kirli Beyaz",
        "sizeLabel": "6 No · 60×60×56 cm · 110 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-110-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/villa-kare-saksi-serisi-vk06b-olcu.jpg"
        ],
        "sitePrice": 2599,
        "description": "6 No Villa Kare Saksı Takım — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 60 cm, derinlik 60 cm, yükseklik 56 cm. Hacim: 110 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "56 cm",
        "potSize": "60 cm"
      }
    ]
  },
  {
    "name": "Hisar Kare Saksı Serisi",
    "slug": "hisar-kare-saksi-serisi-dekoratif",
    "sortOrder": 234,
    "description": "Hisar Kare Saksı Serisi: 3 boy, 3 renk seçeneği (Kiremit, Antrasit, Mocha). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-HK03-KIREMIT",
        "productName": "3 No Hisar Kare Saksı Takım Kiremit",
        "sizeLabel": "3 No · 37×37×33,5 cm · 25,5 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk03-olcu.jpg"
        ],
        "sitePrice": 659,
        "description": "3 No Hisar Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 37 cm, derinlik 37 cm, yükseklik 33,5 cm. Hacim: 25,5 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "33,5 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-HK03-ANTRASIT",
        "productName": "3 No Hisar Kare Saksı Takım Antrasit",
        "sizeLabel": "3 No · 37×37×33,5 cm · 25,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk03-olcu.jpg"
        ],
        "sitePrice": 659,
        "description": "3 No Hisar Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 37 cm, derinlik 37 cm, yükseklik 33,5 cm. Hacim: 25,5 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "33,5 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-HK03-MOCHA",
        "productName": "3 No Hisar Kare Saksı Takım Mocha",
        "sizeLabel": "3 No · 37×37×33,5 cm · 25,5 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk03-olcu.jpg"
        ],
        "sitePrice": 659,
        "description": "3 No Hisar Kare Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 37 cm, derinlik 37 cm, yükseklik 33,5 cm. Hacim: 25,5 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "33,5 cm",
        "potSize": "37 cm"
      },
      {
        "modelCode": "WEB-DKS-HK04-KIREMIT",
        "productName": "4 No Hisar Kare Saksı Takım Kiremit",
        "sizeLabel": "4 No · 44,2×44,2×40 cm · 44 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk04-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "4 No Hisar Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 44,2 cm, derinlik 44,2 cm, yükseklik 40 cm. Hacim: 44 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "44,2 cm"
      },
      {
        "modelCode": "WEB-DKS-HK04-ANTRASIT",
        "productName": "4 No Hisar Kare Saksı Takım Antrasit",
        "sizeLabel": "4 No · 44,2×44,2×40 cm · 44 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk04-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "4 No Hisar Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 44,2 cm, derinlik 44,2 cm, yükseklik 40 cm. Hacim: 44 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "44,2 cm"
      },
      {
        "modelCode": "WEB-DKS-HK04-MOCHA",
        "productName": "4 No Hisar Kare Saksı Takım Mocha",
        "sizeLabel": "4 No · 44,2×44,2×40 cm · 44 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk04-olcu.jpg"
        ],
        "sitePrice": 899,
        "description": "4 No Hisar Kare Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 44,2 cm, derinlik 44,2 cm, yükseklik 40 cm. Hacim: 44 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "44,2 cm"
      },
      {
        "modelCode": "WEB-DKS-HK05-KIREMIT",
        "productName": "5 No Hisar Kare Saksı Takım Kiremit",
        "sizeLabel": "5 No · 53,4×53,4×47 cm · 74,3 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk05-olcu.jpg"
        ],
        "sitePrice": 1239,
        "description": "5 No Hisar Kare Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 53,4 cm, derinlik 53,4 cm, yükseklik 47 cm. Hacim: 74,3 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "47 cm",
        "potSize": "53,4 cm"
      },
      {
        "modelCode": "WEB-DKS-HK05-ANTRASIT",
        "productName": "5 No Hisar Kare Saksı Takım Antrasit",
        "sizeLabel": "5 No · 53,4×53,4×47 cm · 74,3 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk05-olcu.jpg"
        ],
        "sitePrice": 1239,
        "description": "5 No Hisar Kare Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 53,4 cm, derinlik 53,4 cm, yükseklik 47 cm. Hacim: 74,3 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "47 cm",
        "potSize": "53,4 cm"
      },
      {
        "modelCode": "WEB-DKS-HK05-MOCHA",
        "productName": "5 No Hisar Kare Saksı Takım Mocha",
        "sizeLabel": "5 No · 53,4×53,4×47 cm · 74,3 L",
        "colorLabel": "Mocha",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-111-mocha-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hisar-kare-saksi-serisi-hk05-olcu.jpg"
        ],
        "sitePrice": 1239,
        "description": "5 No Hisar Kare Saksı Takım — Mocha renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 53,4 cm, derinlik 53,4 cm, yükseklik 47 cm. Hacim: 74,3 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit, Mocha. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "47 cm",
        "potSize": "53,4 cm"
      }
    ]
  },
  {
    "name": "Hasır Saksı Serisi",
    "slug": "hasir-saksi-serisi-dekoratif",
    "sortOrder": 235,
    "description": "Hasır Saksı Serisi: 3 boy, 3 renk seçeneği (Antrasit, Kiremit, Kirli Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-HS04-ANTRASIT",
        "productName": "4 No Hasır Saksı Antrasit",
        "sizeLabel": "4 No · Ø35,5×27 cm · 15 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs04-olcu.jpg"
        ],
        "sitePrice": 679,
        "description": "4 No Hasır Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35,5 cm, yükseklik 27 cm. Hacim: 15 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "27 cm",
        "potSize": "35,5 cm"
      },
      {
        "modelCode": "WEB-DKS-HS04-KIREMIT",
        "productName": "4 No Hasır Saksı Kiremit",
        "sizeLabel": "4 No · Ø35,5×27 cm · 15 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs04-olcu.jpg"
        ],
        "sitePrice": 679,
        "description": "4 No Hasır Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35,5 cm, yükseklik 27 cm. Hacim: 15 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "27 cm",
        "potSize": "35,5 cm"
      },
      {
        "modelCode": "WEB-DKS-HS04-KIRLIBEYAZ",
        "productName": "4 No Hasır Saksı Kirli Beyaz",
        "sizeLabel": "4 No · Ø35,5×27 cm · 15 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs04-olcu.jpg"
        ],
        "sitePrice": 679,
        "description": "4 No Hasır Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 35,5 cm, yükseklik 27 cm. Hacim: 15 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "27 cm",
        "potSize": "35,5 cm"
      },
      {
        "modelCode": "WEB-DKS-HS05-ANTRASIT",
        "productName": "5 No Hasır Saksı Antrasit",
        "sizeLabel": "5 No · Ø41,5×31 cm · 25 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs05-olcu.jpg"
        ],
        "sitePrice": 779,
        "description": "5 No Hasır Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 41,5 cm, yükseklik 31 cm. Hacim: 25 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "41,5 cm"
      },
      {
        "modelCode": "WEB-DKS-HS05-KIREMIT",
        "productName": "5 No Hasır Saksı Kiremit",
        "sizeLabel": "5 No · Ø41,5×31 cm · 25 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs05-olcu.jpg"
        ],
        "sitePrice": 779,
        "description": "5 No Hasır Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 41,5 cm, yükseklik 31 cm. Hacim: 25 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "41,5 cm"
      },
      {
        "modelCode": "WEB-DKS-HS05-KIRLIBEYAZ",
        "productName": "5 No Hasır Saksı Kirli Beyaz",
        "sizeLabel": "5 No · Ø41,5×31 cm · 25 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs05-olcu.jpg"
        ],
        "sitePrice": 779,
        "description": "5 No Hasır Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 41,5 cm, yükseklik 31 cm. Hacim: 25 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "31 cm",
        "potSize": "41,5 cm"
      },
      {
        "modelCode": "WEB-DKS-HS06-ANTRASIT",
        "productName": "6 No Hasır Saksı Antrasit",
        "sizeLabel": "6 No · Ø50×37,5 cm · 42 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs06-olcu.jpg"
        ],
        "sitePrice": 1029,
        "description": "6 No Hasır Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 50 cm, yükseklik 37,5 cm. Hacim: 42 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37,5 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-HS06-KIREMIT",
        "productName": "6 No Hasır Saksı Kiremit",
        "sizeLabel": "6 No · Ø50×37,5 cm · 42 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs06-olcu.jpg"
        ],
        "sitePrice": 1029,
        "description": "6 No Hasır Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 50 cm, yükseklik 37,5 cm. Hacim: 42 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37,5 cm",
        "potSize": "50 cm"
      },
      {
        "modelCode": "WEB-DKS-HS06-KIRLIBEYAZ",
        "productName": "6 No Hasır Saksı Kirli Beyaz",
        "sizeLabel": "6 No · Ø50×37,5 cm · 42 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-123-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-saksi-serisi-hs06-olcu.jpg"
        ],
        "sitePrice": 1029,
        "description": "6 No Hasır Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 50 cm, yükseklik 37,5 cm. Hacim: 42 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "37,5 cm",
        "potSize": "50 cm"
      }
    ]
  },
  {
    "name": "Hasır Balkon Serisi",
    "slug": "hasir-balkon-serisi-dekoratif",
    "sortOrder": 236,
    "description": "Hasır Balkon Serisi: 2 boy, 3 renk seçeneği (Antrasit, Kiremit, Kirli Beyaz). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-HB02-ANTRASIT",
        "productName": "2 No Hasır Balkon Saksı Antrasit",
        "sizeLabel": "2 No · 54×20×17,5 cm · 12 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-hb02-olcu.jpg"
        ],
        "sitePrice": 689,
        "description": "2 No Hasır Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 54 cm, derinlik 20 cm, yükseklik 17,5 cm. Hacim: 12 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "54 cm"
      },
      {
        "modelCode": "WEB-DKS-HB02-KIREMIT",
        "productName": "2 No Hasır Balkon Saksı Kiremit",
        "sizeLabel": "2 No · 54×20×17,5 cm · 12 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-hb02-olcu.jpg"
        ],
        "sitePrice": 689,
        "description": "2 No Hasır Balkon Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 54 cm, derinlik 20 cm, yükseklik 17,5 cm. Hacim: 12 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "54 cm"
      },
      {
        "modelCode": "WEB-DKS-HB02-KIRLIBEYAZ",
        "productName": "2 No Hasır Balkon Saksı Kirli Beyaz",
        "sizeLabel": "2 No · 54×20×17,5 cm · 12 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-hb02-olcu.jpg"
        ],
        "sitePrice": 689,
        "description": "2 No Hasır Balkon Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 54 cm, derinlik 20 cm, yükseklik 17,5 cm. Hacim: 12 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "54 cm"
      },
      {
        "modelCode": "WEB-DKS-HB03-ANTRASIT",
        "productName": "3 No Hasır Balkon Saksı Antrasit",
        "sizeLabel": "3 No · 72×20×17,5 cm · 16,5 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-hb03-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "3 No Hasır Balkon Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 20 cm, yükseklik 17,5 cm. Hacim: 16,5 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-HB03-KIREMIT",
        "productName": "3 No Hasır Balkon Saksı Kiremit",
        "sizeLabel": "3 No · 72×20×17,5 cm · 16,5 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-hb03-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "3 No Hasır Balkon Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 20 cm, yükseklik 17,5 cm. Hacim: 16,5 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "72 cm"
      },
      {
        "modelCode": "WEB-DKS-HB03-KIRLIBEYAZ",
        "productName": "3 No Hasır Balkon Saksı Kirli Beyaz",
        "sizeLabel": "3 No · 72×20×17,5 cm · 16,5 L",
        "colorLabel": "Kirli Beyaz",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kirli-beyaz-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kirli-beyaz-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-124-kirli-beyaz-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/hasir-balkon-serisi-hb03-olcu.jpg"
        ],
        "sitePrice": 809,
        "description": "3 No Hasır Balkon Saksı — Kirli Beyaz renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 72 cm, derinlik 20 cm, yükseklik 17,5 cm. Hacim: 16,5 L. \nRenk seçenekleri: Antrasit, Kiremit, Kirli Beyaz. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "17,5 cm",
        "potSize": "72 cm"
      }
    ]
  },
  {
    "name": "Kemer Saksı Serisi",
    "slug": "kemer-saksi-serisi-dekoratif",
    "sortOrder": 237,
    "description": "Kemer Saksı Serisi: 1 boy, 2 renk seçeneği (Kiremit, Antrasit). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-KM07-KIREMIT",
        "productName": "7 No Yeni Kemer Saksı Takım Kiremit",
        "sizeLabel": "7 No · Ø45×34 cm · 31 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-km07-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "7 No Yeni Kemer Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 45 cm, yükseklik 34 cm. Hacim: 31 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34 cm",
        "potSize": "45 cm"
      },
      {
        "modelCode": "WEB-DKS-KM07-ANTRASIT",
        "productName": "7 No Yeni Kemer Saksı Takım Antrasit",
        "sizeLabel": "7 No · Ø45×34 cm · 31 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-119-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-saksi-serisi-km07-olcu.jpg"
        ],
        "sitePrice": 639,
        "description": "7 No Yeni Kemer Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 45 cm, yükseklik 34 cm. Hacim: 31 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "34 cm",
        "potSize": "45 cm"
      }
    ]
  },
  {
    "name": "Kemer Bahçe Saksı Serisi",
    "slug": "kemer-bahce-saksi-serisi-dekoratif",
    "sortOrder": 238,
    "description": "Kemer Bahçe Saksı Serisi: 4 boy, 2 renk seçeneği (Kiremit, Antrasit). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-KBT02-KIREMIT",
        "productName": "2 No Kemer Bahçe Saksı Takım Kiremit",
        "sizeLabel": "2 No · 61×25,8×22,5 cm · 22 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt02-olcu.jpg"
        ],
        "sitePrice": 669,
        "description": "2 No Kemer Bahçe Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 61 cm, derinlik 25,8 cm, yükseklik 22,5 cm. Hacim: 22 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "22,5 cm",
        "potSize": "61 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT02-ANTRASIT",
        "productName": "2 No Kemer Bahçe Saksı Takım Antrasit",
        "sizeLabel": "2 No · 61×25,8×22,5 cm · 22 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt02-olcu.jpg"
        ],
        "sitePrice": 669,
        "description": "2 No Kemer Bahçe Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 61 cm, derinlik 25,8 cm, yükseklik 22,5 cm. Hacim: 22 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "22,5 cm",
        "potSize": "61 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT03-KIREMIT",
        "productName": "3 No Kemer Bahçe Saksı Takım Kiremit",
        "sizeLabel": "3 No · 76×31×28 cm · 42 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt03-olcu.jpg"
        ],
        "sitePrice": 939,
        "description": "3 No Kemer Bahçe Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 76 cm, derinlik 31 cm, yükseklik 28 cm. Hacim: 42 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "28 cm",
        "potSize": "76 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT03-ANTRASIT",
        "productName": "3 No Kemer Bahçe Saksı Takım Antrasit",
        "sizeLabel": "3 No · 76×31×28 cm · 42 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt03-olcu.jpg"
        ],
        "sitePrice": 939,
        "description": "3 No Kemer Bahçe Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 76 cm, derinlik 31 cm, yükseklik 28 cm. Hacim: 42 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "28 cm",
        "potSize": "76 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT04-KIREMIT",
        "productName": "4 No Kemer Bahçe Saksı Takım Kiremit",
        "sizeLabel": "4 No · 88,6×37×32,7 cm · 70 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt04-olcu.jpg"
        ],
        "sitePrice": 1389,
        "description": "4 No Kemer Bahçe Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 88,6 cm, derinlik 37 cm, yükseklik 32,7 cm. Hacim: 70 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,7 cm",
        "potSize": "88,6 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT04-ANTRASIT",
        "productName": "4 No Kemer Bahçe Saksı Takım Antrasit",
        "sizeLabel": "4 No · 88,6×37×32,7 cm · 70 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt04-olcu.jpg"
        ],
        "sitePrice": 1389,
        "description": "4 No Kemer Bahçe Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 88,6 cm, derinlik 37 cm, yükseklik 32,7 cm. Hacim: 70 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "32,7 cm",
        "potSize": "88,6 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT05-KIREMIT",
        "productName": "5 No Kemer Bahçe Saksı Takım Kiremit",
        "sizeLabel": "5 No · 110×48×40 cm · 136 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt05-olcu.jpg"
        ],
        "sitePrice": 2549,
        "description": "5 No Kemer Bahçe Saksı Takım — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 110 cm, derinlik 48 cm, yükseklik 40 cm. Hacim: 136 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "110 cm"
      },
      {
        "modelCode": "WEB-DKS-KBT05-ANTRASIT",
        "productName": "5 No Kemer Bahçe Saksı Takım Antrasit",
        "sizeLabel": "5 No · 110×48×40 cm · 136 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-120-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/kemer-bahce-saksi-serisi-kbt05-olcu.jpg"
        ],
        "sitePrice": 2549,
        "description": "5 No Kemer Bahçe Saksı Takım — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: en 110 cm, derinlik 48 cm, yükseklik 40 cm. Hacim: 136 L. \nTakım: saksı + altlık tabağı birlikte gönderilir.\nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "40 cm",
        "potSize": "110 cm"
      }
    ]
  },
  {
    "name": "Vaha Saksı Serisi",
    "slug": "vaha-saksi-serisi-dekoratif",
    "sortOrder": 239,
    "description": "Vaha Saksı Serisi: 1 boy, 2 renk seçeneği (Kiremit, Antrasit). Boy ve rengi seçin; görsel seçiminize göre değişir. Sadece erhanflowers.com'da.",
    "mainImage": "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-kiremit-1.jpg",
    "catalogCategory": "Saksılar",
    "groupSubCategory": "Plastik Saksılar",
    "categoryName": "Saksı",
    "variants": [
      {
        "modelCode": "WEB-DKS-VHS8-KIREMIT",
        "productName": "8 No Vaha Saksı Kiremit",
        "sizeLabel": "8 No · Ø54,5×44,5 cm · 54 L",
        "colorLabel": "Kiremit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-kiremit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-kiremit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-kiremit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-vhs8-olcu.jpg"
        ],
        "sitePrice": 719,
        "description": "8 No Vaha Saksı — Kiremit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 54,5 cm, yükseklik 44,5 cm. Hacim: 54 L. \nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "44,5 cm",
        "potSize": "54,5 cm"
      },
      {
        "modelCode": "WEB-DKS-VHS8-ANTRASIT",
        "productName": "8 No Vaha Saksı Antrasit",
        "sizeLabel": "8 No · Ø54,5×44,5 cm · 54 L",
        "colorLabel": "Antrasit",
        "images": [
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-antrasit-1.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-antrasit-2.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-117-antrasit-3.jpg",
          "https://www.erhanflowers.com/dekoratif-saksi/vaha-saksi-serisi-vhs8-olcu.jpg"
        ],
        "sitePrice": 719,
        "description": "8 No Vaha Saksı — Antrasit renk. Dayanıklı plastikten üretilmiş dekoratif saksı; iç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.\n\nÖlçüler: çap 54,5 cm, yükseklik 44,5 cm. Hacim: 54 L. \nRenk seçenekleri: Kiremit, Antrasit. Renk tonu ekran ayarına göre küçük farklılık gösterebilir.\nToptan alım için bizimle iletişime geçebilirsiniz.",
        "productHeight": "44,5 cm",
        "potSize": "54,5 cm"
      }
    ]
  }
];
