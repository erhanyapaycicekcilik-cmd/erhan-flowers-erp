# LIVE-DB-BEFORE-KNOWLEDGE-ENGINE-001

## Tarih

22.07.2026

## Veritabani Ortami

Canli PostgreSQL veritabani yedeklendi.

Canli ortam:

- Frontend: 3001
- Backend: 8001
- PostgreSQL: 5432

## Yedek Dosyasi

Konum:

`backups/database/LIVE-DB-BEFORE-KNOWLEDGE-ENGINE-001/erhan_flowers_panel_live.dump`

Dosya boyutu:

`437005 byte` yaklasik `0.42 MB`

## Kullanilan Yedekleme Yontemi

PostgreSQL custom dump formati kullanildi.

Yedekleme canli veritabani durdurulmadan alindi.

## Geri Yukleme Yontemi

Geri yukleme yalnizca kullanici onayi ile yapilmalidir.

Ornek genel yontem:

```powershell
docker cp backups/database/LIVE-DB-BEFORE-KNOWLEDGE-ENGINE-001/erhan_flowers_panel_live.dump <postgres-container>:/tmp/erhan_flowers_panel_live.dump
docker exec <postgres-container> pg_restore -U <user> -d <target_database> --clean --if-exists /tmp/erhan_flowers_panel_live.dump
```

Canli veritabani uzerine geri yukleme yapmadan once ayrica yeni bir yedek alinmalidir.

## Guvenlik Uyarilari

- Bu belgede parola veya gizli baglanti bilgisi tutulmaz.
- Bu yedek canli veri icerir; yetkisiz kisiyle paylasilmaz.
- Development veritabani uzerine yazilmadi.
- Canli veritabani resetlenmedi, silinmedi veya durdurulmadi.
- DROP, TRUNCATE veya veri silme islemi yapilmadi.
