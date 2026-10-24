#!/bin/sh
set -e

echo "Veritabani migration'lari uygulaniyor..."
# Eger onceki bir deploy hatali migration biraktiysа, bunu "geri alindi" olarak isaretle
# ki prisma migrate deploy tekrar calisabilsin.
npx prisma migrate resolve --rolled-back 20261024_new_categories 2>/dev/null || true

npx prisma migrate deploy

echo "Backend baslatiliyor..."
exec node dist/main
