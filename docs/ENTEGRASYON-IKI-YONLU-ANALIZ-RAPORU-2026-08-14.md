# Entegrasyon Iki Yonlu Analiz Raporu - 2026-08-14

## Bugunku hedef

Odak tek: siparislerin ERP'ye guvenli gelmesi ve hazir urunlerin kanallara guvenli gitmesi.

Canli sistemi bozmamak icin bu rapor yalniz okuma ve kod incelemesi ile hazirlandi. Veritabani, migration, stok, gorsel klasorleri ve canli servisler degistirilmedi.

## Mevcut durum

- Development servisleri aktif: frontend 3101, backend 8101, PostgreSQL dev 5433.
- Trendyol baglantisi gecmiste CONNECTED durumda ve son senkron tarihi kayitli.
- Hepsiburada hesap kaydi ve credential kaydi var, ancak gercek entegrasyon testi/durumu henuz dry-run/mock seviyesinde.
- N11 ve Ticimax hesaplari henuz tam yapilandirilmamis.
- Ticimax icin UyeKodu eksik gorunuyor.
- Entegrasyon siparisleri yerelde 106 adet.
- 106 siparisin tamami MATCHING_REQUIRED durumunda; yani barkod/model/stok karti eslestirme bekliyor.
- Siparis durum dagilimi: 1 CONFIRMED, 25 PREPARING, 9 OUT_FOR_DELIVERY, 67 DELIVERED, 4 CANCELLED.
- Publishing listesindeki ilk 300 urunun 0 tanesi hazir, 300 tanesi blokeli.
- Bloke nedenleri: 300 SEO onayi, 293 satis fiyati, 291 Trendyol kategori adi, 9 uzun aciklama, 2 urun gorseli.

## Sistemde hazir olan parcalar

- Siparis cekme altyapisi var.
- Trendyol siparislerini ERP satis kaydina ceviren akis var.
- Mukerrer siparis engeli icin idempotency key var.
- Bilinen siparis durumlari ERP durumlarina map ediliyor.
- Eslesen urunlerde stok rezervasyonu olusturma mantigi var.
- Entegrasyon loglari ve hata listesi var.
- Kanal hesabi, credential kasasi, maskeleme ve dry-run altyapisi var.
- Urun gonderme oncesi eksik alan kontrolu var.
- Excel cikti akisi Trendyol, Hepsiburada, N11 ve Ticimax icin mevcut.
- Public gorsel URL ihtiyaci kodda tanimlanmis.

## Ana eksikler

1. Siparis tarafinda eslestirme merkezi eksik

   106 siparisin tumu MATCHING_REQUIRED oldugu icin sistem siparisi goruyor ama urunu stok kartina kesin baglayamiyor. Bugunku ilk is, barkod/model/SKU ile otomatik eslestirme ve kalanlari manuel eslestirme ekranina almak olmali.

2. Urun hazir olunca otomatik gonderim kurali eksik

   Hazirlik kriteri su an parca parca var: barkod, model kodu, aciklama, kategori, fiyat, gorsel, SEO onayi. Bunun tek bir "Yayina Hazir" kuralina baglanmasi gerekiyor.

3. Canli gonderim guvenlik katmani eksik

   Urunleri direkt canli API'ye basmadan once dry-run, payload onizleme, tek urun test, kucuk parti, batch sonucu takibi ve geri alma/yeniden deneme akisi olmali.

4. Kanal bazli gercek API sozlesmeleri tamamlanmali

   Trendyol icin en ileri seviye kod var. Hepsiburada, N11 ve Ticimax icin generic/dry-run yapilar var; gercek endpoint, auth, payload, hata cevabi ve batch takipleri kesinlestirilmeli.

5. Kredi/masraf kontrolu ayrilmali

   Gemini ile gorselden credential okuma ve icerik uretimi, PhotoRoom ile gorsel isleme ucretli/limitli olabilir. Entegrasyon cekirdegi bunlara bagli olmamali. Varsayilan akis manuel/dry-run calismali; ucretli servisler sadece kullanici butona bastiginda calismali.

## Gereken bilgiler

- Trendyol: supplier id, API key, API secret, kategori ID'leri, kategori ozellikleri, marka ID, kargo/desi kurallari, public gorsel URL.
- Hepsiburada: merchant id, API key/secret veya portalin guncel auth bilgisi, User-Agent/entegrator bilgisi, urun ve siparis endpointleri, kategori/sablon alanlari.
- N11: appkey, appsecret, magaza ID, teslimat sablonu, kategori ve attribute kurallari.
- Ticimax: site URL, servis endpoint, WSDL URL, UyeKodu, urun/siparis servis metodlari.
- Ortak: barkod, model kodu, stok karti, satis fiyati, KDV, komisyon, kargo/desi, gorsel public linkleri, kanal bazli kategori eslesmesi.

## Kredi sorunu yasamamak icin kural

- Gemini/PhotoRoom otomatik calismasin.
- Toplu analiz veya toplu gorsel isleme varsayilan kapali olsun.
- Bir ekranda "kredi kullanacak" islem varsa adet ve tahmini maliyet gosterilsin.
- Credential gorsel okuma yerine manuel alan girisi ana akis olsun.
- SEO/aciklama icin once yerel sablon, sonra gerekirse tek tek AI uretim kullanilsin.
- Gorsel arka plan/duzenleme entegrasyonun zorunlu parcasi olmasin.

## Onerilen bugunku is sirasi

1. Siparis eslestirme merkezi
   - 106 MATCHING_REQUIRED siparisi listele.
   - Barkod/model/SKU ile otomatik eslestirme yap.
   - Eslesmeyenleri manuel secim ekranina al.
   - Eslesen sipariste stok rezervasyonunu dogrula.

2. Trendyol iki yonlu pilot
   - Siparis cekme testini sadece dry-run/dev ortamda dogrula.
   - Tek urun icin payload preview al.
   - Trendyol Product V2 gerekliliklerini kontrol edip mevcut V1 endpoint riskini kapat.
   - Canli gonderim kapisini owner onayi ve tek urun limiti ile ac.

3. Hazir urun kurali
   - "Yayina Hazir" icin zorunlu alanlari tek servis fonksiyonunda topla.
   - Eksik kategori/fiyat/SEO/gorsel listesini ekranda is listesine cevir.
   - 0 hazir urun durumunu once 5 pilot urunle coz.

4. Gonderim kuyrugu
   - Urun gonderimi, stok guncelleme, fiyat guncelleme ve siparis durum guncelleme ayri job olarak calissin.
   - Her job dry-run, test ve live mod ayrimina sahip olsun.
   - Her canli job idempotency key, log, hata cevabi ve yeniden deneme kaydi tutsun.

5. Hepsiburada / N11 / Ticimax ikinci faz
   - Once credential ve test connection gerceklensin.
   - Sonra siparis cekme.
   - En son urun/stok/fiyat gonderme.

## Riskler

- Trendyol urun endpointlerinde V1 kullanim disi kalma tarihi 10 Agustos 2026 olarak dokumanda gorunuyor; Product V2'ye gecis acil risk.
- Public gorsel URL olmadan pazaryerine gorsel gonderimi basarisiz olur.
- Eslesmeyen siparisler stok rezervasyonu dogru uretmez.
- Yanlis kategori/attribute ile urun gonderimi batch seviyesinde reddedilir.
- Hepsiburada ve N11 generic adapter ile canliya cikmak risklidir; platforma ozel adapter tamamlanmali.
- Ticimax SOAP payload'i minimum seviyede; gercek site yapisina gore metod ve alanlar dogrulanmali.

## Resmi kaynak notlari

- Trendyol dokumani urun aktarimi, stok/fiyat guncelleme, siparis islemleri ve fatura gibi modulleri destekledigini belirtiyor.
- Trendyol urun V1 endpoint sayfasinda V1 servislerin 10 Agustos 2026 itibariyle kullanim disi kalacagi ve Product V2'ye gecilmesi gerektigi uyari olarak yer aliyor.
- Hepsiburada developer portali siparis, fatura, urun feed ve katalog entegrasyonlarini ayri API urunleri olarak sunuyor.
- N11 magazadestek dokumaninda REST API urun sorgulama icin appkey/appsecret header kullanimi ve page/size pagination bilgisi yer aliyor.
- Ticimax web servis API sayfasi urun ekleme, urun bilgisi getirme, kategori, resim ekleme, magaza bazli stok ve siparis aktarimi gibi islemleri destekledigini belirtiyor.

## Sonuc

Sistem iki yonlu entegrasyona baslamak icin altyapi olarak yakin durumda; fakat canli gonderim icin henuz "hazir" degil. Bugunku en dogru hedef Trendyol uzerinden dar pilot: once 106 siparisi stok kartlarina eslestirmek, sonra 5 pilot urunu hazir hale getirip dry-run ve tek urun test gonderimi yapmak.
