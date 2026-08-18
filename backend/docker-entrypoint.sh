#!/bin/sh
set -e

echo "Veritabani migration'lari uygulaniyor..."
npx prisma migrate deploy

echo "Backend baslatiliyor..."
exec node dist/main
