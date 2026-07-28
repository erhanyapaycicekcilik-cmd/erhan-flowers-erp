# SPRINT-17C Migration Guvenligi ve Production Hazirlik Raporu

Tarih: 22.07.2026

## Kapsam ve Guvenlik

Bu calismada yalnizca development PostgreSQL veritabani (`localhost:5433 / erhan_flowers_panel_dev`) incelendi. Production veritabanina ve 3001/8001 servislerine baglanti kurulmadı; migration, `prisma migrate deploy`, `prisma db push`, schema degisikligi veya veri degisikligi yapilmadi.

## Development Yedegi

- Durum: Basarili
- Dosya: `backups/database/SPRINT-17C-DEV-20260722-232023.dump`
- Bicim: PostgreSQL custom archive (`pg_dump -Fc`, owner ve ACL haric)
- Boyut: 529.070 byte
- SHA-256: `2614E86BB4AC5B46832A91C727AA3E9A35ADFEAAE355E4596DC67A05D2A2B440`

### Geri Yukleme Testi

Yedek, development PostgreSQL container'i icinde gecici ve bagimsiz `sprint17c_restore_verify_20260722232050` veritabanina `pg_restore --exit-on-error` ile geri yuklendi. Test bittikten sonra yalnizca bu gecici dogrulama veritabani kaldirildi; ana development veritabanina dokunulmadi.

| Kontrol | Kaynak | Geri yuklenen |
|---|---:|---:|
| Public tablo | 62 | 62 |
| Kullanici | 2 | 2 |
| Stok karti | 291 | 291 |
| Trendyol varyasyonu | 938 | 938 |
| CRM musterisi | 2 | 2 |
| Satis | 2 | 2 |
| Bilgi analizi logu | 13 | 13 |
| Prisma migration kaydi | 1 | 1 |

Sonuc: Yedek okunabilir ve geri yuklenebilir; secili kritik sayimlar birebir eslesti.

## Prisma Migration Gecmisi

Prisma 5.22.0 ile yapilan `migrate status` kontrolunde dosya sisteminde 7 migration, development veritabanindaki `_prisma_migrations` tablosunda ise yalnizca 1 tamamlanmis kayit bulundu.

### Gecmiste Kayitli Migration

| Migration | Gecmis durumu | Gercek nesne durumu | Sonuc |
|---|---|---|---|
| `20260722123544_add_knowledge_base_core` | Tamamlanmis kayit var | Temel Knowledge Base nesneleri mevcut | Gecmiste kayitli, fakat checksum uyumsuz |

Dosyadaki SHA-256 `f0c1a504...ab2f3`, `_prisma_migrations` tablosundaki checksum `889b4f06...c67fe7` degeridir. Bu, migration dosyasinin uygulandiktan sonra degistirildigini gosterir.

### Prisma Gecmisinde Eksik Migrationlar

Asagidaki 6 migration dosyada var, ancak `_prisma_migrations` tablosunda kayitli degil:

1. `20260722_sprint_17b_sales`
2. `20260722_sprint_17c_crm_profile`
3. `20260722_sprint_17c_crm_v1`
4. `20260722_sprint_17c_customer_crm`
5. `20260722_sprint_17c_knowledge_center`
6. `20260722_sprint_17c_sales_lifecycle`

Nesne bazli kontrollerde bu migrationlarin beklenen tablolari, kolonlari ve enum degerleri development veritabaninda bulundu. Bu nedenle bunlar **veritabaninda uygulanmis, Prisma gecmisinde kayitsiz** durumdadir. `migrate deploy` ile tekrar calistirilmalari tablo/kolon zaten var hatasi verebilir.

### Kismen Uygulanmis Migrationlar

Migration SQL'lerinin ana tablo, kolon ve enum nesneleri acisindan kismen uygulanmis migration tespit edilmedi. Ancak iki nedenle zincir yine de guvenli degildir:

- Altı migrationin hic migration gecmis kaydi yoktur.
- Gercek veritabani ile guncel `schema.prisma` arasinda bes semantik fark vardir.

## Drift Analizi

`prisma migrate diff --from-url <development> --to-schema-datamodel prisma/schema.prisma --script` salt okunur calistirildi.

### Tespit Edilen Schema Drift

1. `retail_customer_reminders.updated_at` veritabaninda `CURRENT_TIMESTAMP` varsayilanina sahip; Prisma modelinde varsayilan yok.
2. `retail_customer_source_definitions.updated_at` veritabaninda `CURRENT_TIMESTAMP` varsayilanina sahip; Prisma modelinde varsayilan yok.
3. `retail_customer_tag_definitions.updated_at` veritabaninda `CURRENT_TIMESTAMP` varsayilanina sahip; Prisma modelinde varsayilan yok.
4. `retail_sale_status_history.sale_id` FK veritabaninda `ON DELETE CASCADE` olsa da Prisma beklenen constraint yeniden uretiminde `ON UPDATE CASCADE` farki bulunuyor.
5. `retail_sale_status_history.changed_by_id` FK veritabaninda varsayilan davranislara sahip; Prisma `ON DELETE RESTRICT ON UPDATE CASCADE` bekliyor.

Sonuc: **Schema drift var.** Bunun yaninda daha kritik olan **migration history drift** de vardir.

## Migration Sirasi Riski

Dosya adlarinin alfabetik/timestamp sirasi bagimlilik sirasiyla uyumlu degildir:

- `sprint_17c_crm_profile`, henuz `sprint_17c_crm_v1` tarafindan olusturulmamis kaynak ve etiket tablolarina veri eklemeye calisiyor.
- `sprint_17c_crm_v1`, `sprint_17c_customer_crm` tarafindan eklenecek `retail_customers.source` kolonunu okuyor.
- `sprint_17c_sales_lifecycle`, temel satis tablolarini olusturan `sprint_17b_sales` migrationindan once siralanabiliyor.

Bu zincir bos bir veritabaninda bastan `migrate deploy` edilmeden production'a uygun kabul edilemez.

## Onerilen Guvenli Duzeltme Yontemi

Su anda hicbir komut uygulanmamalidir. Onerilen yontem:

1. Mevcut migration klasorlerini ve development yedegini degistirilemez referans olarak sakla.
2. Ayrı bir onarim dalinda migrationlari gercek bagimlilik sirasina gore yeniden adlandir veya tek, denetlenebilir Sprint-17C forward migration halinde birlestir.
3. `schema.prisma` ile SQL migrationlarindaki `updated_at` varsayilanlari ve FK referential action kararlarini tek kaynaga gore esitle.
4. Yeni migration zincirini bos bir gecici PostgreSQL veritabanina bastan uygula ve Prisma schema diff sonucunun bos oldugunu dogrula.
5. Mevcut development DB icin tum nesneler ve checksum'lar dogrulandiktan sonra yalnizca kayitsiz ama tam uygulanmis migrationlar icin kontrollu `prisma migrate resolve --applied` plani hazirla. Bu komut bu analizde calistirilmadi.
6. Production icin `resolve --applied` kullanma; production şeması ayrica salt okunur cikarilmadan hangi degisikliklerin mevcut oldugu bilinmiyor.
7. Production'ın gercek mevcut şemasindan hedef şemaya veri koruyan tek yonlu forward SQL uret, staging kopyasinda test et ve ancak onaydan sonra uygula.
8. Uygulama oncesi production tam yedegi, geri yukleme provasi ve geri donus suresi olculmelidir.

## Production Hazirlik Karari

**Hazir degiliz.** CRM/Satis nesnelerinin development DB'de bulunmasi yeterli degildir. Migration gecmisi eksik, kayitli migration checksum'u farkli, schema drift mevcut ve migration dosya sirasi temiz kurulumda hataya aciktir.

## Production Deployment Sirasi

1. Kod ve migration klasorunu snapshot/tag ile sabitle.
2. Migration zincirini development disinda gecici bos DB üzerinde onar ve bastan sona test et.
3. Onarilmis zincir icin `migrate status` ve schema diff sonucunu sifir farkla dogrula.
4. Production veritabanindan tam yedek al; SHA-256 kaydet.
5. Production yedegini bagimsiz staging veritabanina geri yukle.
6. Production schema envanterini staging kopyasindan cikar; hedefle read-only diff yap.
7. Veri kaybi olusturmayan forward migration SQL'ini staging kopyasinda uygula.
8. Satir sayilari, FK'ler, indexler, login, stok, maliyet, satis ve CRM smoke testlerini yap.
9. Bakim penceresi ve rollback esigi belirle.
10. Production servislerini kontrollu bakim moduna al; yeni tam yedek al.
11. Onayli migrationi tek operator ile uygula; migration logunu sakla.
12. Backend sonra frontend surumunu yayinla.
13. Smoke testleri ve veri sayimlarini tekrar yap.
14. Hata halinde yeni yazimlari durdur, onayli yedekten geri don ve uygulama surumunu onceki snapshot'a al.

## Kritik Riskler

- Kayitsiz altı migration nedeniyle `migrate deploy` ayni nesneleri yeniden olusturmaya calisabilir.
- Kayitli migration checksum farki, migration dosyasinin tarihsel guvenilirligini bozar.
- Yanlis migration sirasi bos/staging kurulumunu yarida birakabilir.
- Schema ile SQL arasindaki FK ve default farklari davranis degisikligi yaratabilir.
- Migration SQL'lerindeki bazi Turkce seed metinlerinde karakter bozulmasi (`MaÄŸaza` vb.) vardir.
- Production şeması bu gorevde incelenmedigi icin production'a ozel drift ve veri uyumlulugu bilinmiyor.
- Prisma major surumunu kendiliginden 7.x'e cikarmak ek uyumluluk riski tasir; mevcut proje 5.22.0 ile analiz edildi.

## Sorularin Dogrudan Cevaplari

- Development veritabaninin yedegi alindi mi? **Evet.**
- Yedek geri yukleme testi basarili oldu mu? **Evet.**
- Prisma migration gecmisi ile veritabani uyumlu mu? **Hayir.**
- Prisma drift tespit edildi mi? **Evet; hem schema hem migration history drift var.**
- Hangi migrationlar eksik? **Yukarida listelenen altı Sprint-17B/17C migrationi Prisma gecmisinde eksik.**
- Hangi migrationlar kismen uygulanmis? **Nesne bazinda kismen uygulanmis migration tespit edilmedi; fakat schema drift ve kayitsiz uygulama var.**
- Hangi migrationlar tamamen uygulanmis? **Core migration gecmiste kayitli; altı migrationin beklenen ana nesneleri DB'de mevcut, fakat Prisma gecmisinde kayitsiz.**
- Migration gecmisini duzeltmek icin onerilen yontem nedir? **Once zinciri sirala/baseline et ve bos DB'de dogrula; sonra development icin kanitli kayitlari kontrollu `migrate resolve --applied` ile uzlastir. Production'a resolve uygulama.**
- Production ortamına gecis icin hazir miyiz? **Hayir.**
- En kritik riskler nelerdir? **Gecmis eksigi, checksum farki, yanlis bagimlilik sirasi, schema drift ve production şemasinin henuz bilinmemesi.**
- Production deployment sirasi nasil olmali? **Yedek -> restore provasi -> staging diff -> forward migration testi -> onay -> bakim penceresi -> migration -> backend/frontend -> smoke test -> izleme/rollback.**
- Bir sonraki gorev nedir? **Migration zincirini production disinda onaracak, bos DB ve production yedegi klonu üzerinde test edilecek ayri bir Migration Repair sprinti.**

