# ERHAN FLOWERS ERP - SPRINT 17C TAM RAPOR

Tarih: 22.07.2026

## 1. Ortam ve Guvenlik

- Canli frontend: `3001`
- Canli backend: `8001`
- Canli PostgreSQL: `5432`
- Development frontend: `3101`
- Development backend: `8101`
- Development PostgreSQL: `5433`
- Gelistirmeler yalnizca development veritabanina uygulandi.
- Canli veritabanina CRM veya Bilgi Merkezi migration'i uygulanmadi.
- Canli kayit silinmedi veya degistirilmedi.
- Test kayitlari development ortaminda olusturuldu ve test sonunda temizlendi.

## 2. Development ve Canli Ayrimi

- Frontend ve backend icin ayri development portlari hazirlandi.
- Development backend icin `.env.dev` yukleme ve `start:dev:development` komutu hazirlandi.
- Development frontend ayri build klasoru kullanacak sekilde ayrildi.
- Development build islemlerinin canli frontend build klasorune yazmasi engellendi.
- Canli ve development servislerinin ayni anda calismasi test edildi.
- Development ve canli veritabanlarinin ayri oldugu dogrulandi.
- Canli ve development gorsel klasoru ayrimi korundu.

## 3. Stable Snapshot ve Yedekler

- `STABLE-DEV-LIVE-SEPARATION-001` geri donus noktasi hazirlandi.
- Kaynak kodu, Prisma, migration, Docker ve baslatma dosyalari snapshot kapsaminda tutuldu.
- `node_modules`, `.next` ve `dist` snapshot disinda birakildi.
- Canli veritabani ve gizli `.env` degerleri raporlara yazilmadi.

## 4. Bilgi Merkezi

ERP ana yapisina veri odakli Bilgi Merkezi eklendi.

Ekranlar:

- Bitki Aileleri
- Es Anlamlilar
- Receteler
- Boy Kurallari
- Saksilar
- Yaprak Kurallari
- Govde Kurallari
- Tas Kurallari
- Silikon Kurallari
- Iscilik Kurallari
- Analiz Loglari

Yapilanlar:

- Aile, recete, saksı ve malzeme kurallari veritabanindan yonetilebilir hale getirildi.
- Rule Engine aile, boy, saksı ve recete eslestirmelerini veriden okuyor.
- Confidence seviyeleri eklendi: otomatik uygula, oner, inceleme gerekli.
- Kullanici duzeltmeleri feedback kaydi olarak saklaniyor.
- Analiz sonucu, normalize metin, bulunan aile, boy, saksı ve recete loglaniyor.
- Bambu urun adi analizlerinde aile, boy, saksı ve recete eslesmesi test edildi.

## 5. Satis Merkezi

- Yeni bireysel ve kurumsal satis akisi gelistirildi.
- Musteri, adres, urun, odeme ve teslimat ayni satis akisi icinde calisiyor.
- Barkod, model kodu ve urun adiyla urun arama destekleniyor.
- Satis numarasi `EF-YIL-6 HANELI SIRA` standardina baglandi.
- Yeni satis numarasi sabit deger yerine veritabanindaki son numaradan hesaplanıyor.
- Ornek: `EF-2026-000001`, `EF-2026-000020`.
- Musteri ve siparis birlikte transaction icinde kaydedilebiliyor.
- Musteri siparisten bagimsiz kaydedilebiliyor.
- Magazadan teslimde adres istege bagli, teslimat siparislerinde zorunlu.
- Kayitli adres secimi ve ayni musteriye yeni adres ekleme destekleniyor.
- Satis sonrasinda adres etiketi, A5 teslimat ve A4 siparis ciktilari bulunuyor.
- Yazdirma islemleri print log tablosuna kaydediliyor.

## 6. Satis ve Stok Entegrasyonu

- Satis tamamlamada stok hareketi, finans ve teslimat kaydi olusturma akisi korundu.
- Hazir urun stok hareketlerinde `referenceType`, `referenceId`, `eventKey` ve kullanici baglantilari kullaniliyor.
- Tekrarlanan istemci isteklerinin mukerrer satis olusturmasi advisory lock ve event key ile engelleniyor.
- Testlerde stok veya finans etkilememesi gereken senaryolar `NON_STOCK_SERVICE` ve taslak satisla calistirildi.

## 7. CRM v1.0

ERP ana menusune CRM eklendi.

CRM ana yapisi:

- CRM Dashboard
- Musteri Listesi
- Musteri Karti
- Adres Yonetimi
- Siparis Gecmisi
- Musteri Notlari
- Hatirlatmalar
- Etiket Yonetimi
- Musteri Kaynagi Yonetimi
- CRM Raporlari

Dashboard kartlari:

- Toplam Musteri
- Aktif Musteri
- Kurumsal
- Bireysel
- Bu Ay Yeni
- Tekrar Siparis Veren
- VIP
- WhatsApp Izni Olan
- Son 30 Gun Siparis Vermeyen

Musteri listesi alanlari:

- Musteri kodu
- Ad soyad
- Firma
- Telefon
- WhatsApp
- Il
- Ilce
- Musteri tipi
- Kaynak
- Son siparis
- Siparis sayisi
- Toplam alisveris
- Durum
- Etiketler

Arama ve filtreler:

- Ad, firma, telefon ve e-posta arama
- Bireysel/kurumsal filtresi
- Aktif/pasif filtresi
- Il filtresi
- Musteri kaynagi altyapisi

## 8. Musteri Karti

Musteri karti dokuz sekmeli yapida hazirlandi:

- Genel
- Iletisim
- Adresler
- Siparisler
- Notlar
- Hatirlatmalar
- Etiketler
- Dosyalar
- Izinler

Profil ozeti:

- Yildiz puani
- Ad soyad
- Toplam harcama
- Toplam siparis
- Ilk siparis
- Son siparis
- Son gorusme
- Risk durumu

Musteri silinmiyor. Aktif veya pasif yapiliyor.

## 9. Adres, Not, Hatirlatma ve Dosya Altyapisi

- Bir musteriye birden fazla adres eklenebiliyor.
- Ev, is, sube, teslimat ve fatura gibi adres basliklari kullanilabiliyor.
- Varsayilan adres transaction icinde degistiriliyor.
- Serbest musteri notlari ayri kayitlarda tutuluyor.
- Tarih ve saatli hatirlatmalar olusturulabiliyor ve tamamlanabiliyor.
- Dosya metadata altyapisi teklif, sozlesme, gorsel ve PDF turlerini destekliyor.
- Bu sprintte fiziksel CRM dosya yukleme servisi ve kampanya gonderimi aktif edilmedi.

## 10. Iletisim Izinleri

- Siparis ve teslimat iletisimi
- WhatsApp kampanya izni
- SMS kampanya izni
- E-posta kampanya izni
- Izin tarihi
- Izin kaynagi
- Izin geri cekilme tarihi

Kampanya izni olmayan musteriler izinli listeye dahil edilmiyor.

## 11. Etiket ve Musteri Kaynagi Yonetimi

- Etiketler kod icine sabitlenmeden veritabanindan yonetiliyor.
- Etiketler fiziksel silinmeden aktif/pasif yapiliyor.
- VIP, Instagram, Google, WhatsApp, Mimar, Peyzaj, Kurumsal ve Magaza gibi etiketler destekleniyor.
- Musteri kaynaklari ayri master tabloda yonetiliyor.
- Magaza, Telefon, WhatsApp, Instagram, Facebook, Google, Web Sitesi, Trendyol, Hepsiburada, N11, Amazon ve Diger kaynaklari hazirlandi.
- Ozel kaynak ekleme ve pasife alma destekleniyor.
- Satis ekrani aktif musteri kaynagi listesini veritabanindan okuyor.

## 12. CRM ve Satis Entegrasyonu

- Satis ekraninda olusan musteri dogrudan CRM kaydi olarak kullaniliyor.
- Telefon normalize edilerek tekil eslestirme yapiliyor.
- Ayni telefonla ikinci musteri olusturulmuyor.
- Mevcut musterinin yeni siparisi ayni CRM kartina baglaniyor.
- Siparis sayisi, toplam alisveris, ilk ve son siparis bilgileri satis kayitlarindan hesaplanıyor.
- Kurumsal musterinin firma unvani tekrar sipariste korunuyor.

## 13. CRM Raporlama Hazirligi

Hazirlanan rapor API ve ekranlari:

- Sehirlere gore musteriler
- Kaynaga gore musteriler
- WhatsApp izin durumuna gore musteriler
- Yeni musteri ve tekrar alisveris metrikleri
- En cok alisveris ve pasif musteri segmentleri icin gerekli toplam alanlari

Bu sprintte kampanya gonderimi yapilmadi.

## 14. Prisma ve Veritabani Degisiklikleri

Yeni veya genisletilen CRM tablolari:

- `retail_customer_tag_definitions`
- `retail_customer_tags`
- `retail_customer_notes`
- `retail_customer_reminders`
- `retail_customer_source_definitions`
- `retail_customer_files`

Musteri tablosuna eklenen baslica alanlar:

- WhatsApp telefonu
- Musteri kaynagi
- Iletisim ve kampanya izinleri
- Izin tarihleri
- Dogum tarihi
- Web sitesi
- Instagram
- Yildiz puani
- Risk durumu
- Son gorusme tarihi

Migration dosyalari sadece development veritabanina uygulandi.

## 15. Test Sonuclari

- Development login: Basarili
- Canli login sayfasi: Basarili
- Canli ve development ayni anda calisma: Basarili
- Yeni bireysel musteri: Basarili
- Ayni telefonla mevcut musteri bulma: Basarili
- Kurumsal musteri: Basarili
- Iki adres: Basarili
- Varsayilan adres: Basarili
- Magazadan teslim, adressiz: Basarili
- Teslimat siparisi, adres zorunlulugu: Basarili
- Ayni musterinin iki siparisi: Basarili
- CRM toplam siparis ve toplam harcama: Basarili
- Musteri notu: Basarili
- Hatirlatma olusturma ve tamamlama: Basarili
- Etiket ve ozel kaynak: Basarili
- Aktif/pasif musteri: Basarili
- Dosya metadata kaydi: Basarili
- CRM dashboard: Basarili
- Liste arama ve filtreler: Basarili
- Siparis gecmisi: Basarili
- 10x15, A5 ve A4 cikti baglantilari: Basarili
- Frontend production build: Basarili
- Backend TypeScript ve Nest build: Basarili
- Test verisi temizligi: Basarili

## 16. Degistirilen Baslica Dosyalar

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260722_sprint_17c_customer_crm/migration.sql`
- `backend/prisma/migrations/20260722_sprint_17c_crm_v1/migration.sql`
- `backend/prisma/migrations/20260722_sprint_17c_crm_profile/migration.sql`
- `backend/src/sales/sales.controller.ts`
- `backend/src/sales/sales.service.ts`
- `backend/src/knowledge-base/knowledge-base.controller.ts`
- `backend/src/knowledge-base/knowledge-base.service.ts`
- `backend/src/knowledge-base/services/knowledge-analysis.service.ts`
- `frontend/src/components/AdminShell.tsx`
- `frontend/src/app/sales/page.tsx`
- `frontend/src/app/crm/page.tsx`
- `frontend/src/app/crm/reminders/page.tsx`
- `frontend/src/app/crm/tags/page.tsx`
- `frontend/src/app/crm/sources/page.tsx`
- `frontend/src/app/crm/reports/page.tsx`
- `frontend/src/app/customers/[id]/page.tsx`
- `frontend/src/app/knowledge-center/page.tsx`
- `frontend/src/app/reports/page.tsx`

## 17. Bilinen Riskler ve Eksikler

- Tarihi migration klasorlerinin bir bolumunde Prisma migration adlandirma uyumsuzlugu bulunuyor. Development migration'lari kontrollu `prisma db execute` ile uygulandi; canliya gecmeden migration gecmisi duzeltilmeli.
- CRM dosya altyapisi metadata seviyesinde. Fiziksel dosya yukleme ve dosya guvenligi ayri sprint gerektiriyor.
- Teklif, gorev, WhatsApp, e-posta, B2B ve pazaryeri CRM entegrasyonlari bu sprintte aktif degil; veri modeli bunlara genisletilebilir.
- CRM liste limiti su an ilk 100 kayittir. Buyuk veri icin sayfalama eklenmeli.
- Gelismis KVKK izin gecmisi icin degisiklik log tablosu sonraki asamada eklenmeli.
- Development backend icin eski watch sureclerinin birikmesi build DLL kilidine neden olabiliyor. Son kontrolde gereksiz development surecleri kapatildi ve tek `8101` sureci birakildi.

## 18. Son Sistem Durumu

- Canli frontend `3001`: Calisiyor.
- Canli backend `8001`: Calisiyor.
- Development frontend `3101`: Calisiyor.
- Development backend `8101`: Calisiyor.
- Canli CRM tablolari: Olusturulmadi.
- Development CRM tablolari: Olusturuldu.
- Canli veri kaybi: Yok.
- Development test kayitlari: Temizlendi.

## 19. Sabah Icin Onerilen Sonraki Adim

1. Development CRM ekranlarini kullanici olarak gozden gecir.
2. Müşteri listesi ve müşteri karti alanlarini onayla.
3. Canliya gecis karari verilirse once veritabani backup al.
4. Migration gecmisini standart Prisma migration akisi icin duzenle.
5. Canliya gecis icin ayri, geri alinabilir deployment plani hazirla.
6. Kullanici onayi olmadan canli migration veya deployment yapma.
