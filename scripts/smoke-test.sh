#!/usr/bin/env bash
# Deploy sonrası duman testi: müşterinin sipariş verebilmesi için gereken adresler çalışıyor mu?
# Bir kontrol başarısızsa çıkış kodu 1 → GitHub Actions deploy'u kırmızı gösterir ve e-posta atar.
set -u
SITE="${SITE_URL:-https://www.erhanflowers.com}"
API="${API_URL:-https://api.erhanflowers.com}"
fail=0

# Konteynerler yeniden başlarken 502 dönebilir: en fazla ~3 dk hazır olmasını bekle
for i in $(seq 1 18); do
  s=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/") || s=000
  a=$(curl -s -o /dev/null -w '%{http_code}' "$API/public/catalog/products?limit=1") || a=000
  [ "$s" = 200 ] && [ "$a" = 200 ] && break
  sleep 10
done

check() { # ad, beklenen kod, gerçek kod, [gövde]
  if [ "$2" = "$3" ]; then echo "✅ $1 ($3)"; else echo "❌ $1: beklenen $2, gelen $3 ${4:-}"; fail=1; fi
}

check "Site ana sayfa" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/")"
check "Sepet sayfası" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/sepet")"
check "Sipariş sayfası" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/siparis")"
check "Ürün listesi (API)" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$API/public/catalog/products?limit=1")"

# Sipariş adresi: boş istek doğrulamada 400 ile reddedilmeli (kayıt oluşmaz).
# Hızlı sipariş formunun cevabı ("Ad soyad zorunludur") gelirse adres yanlış kontrole bağlı demektir.
body=$(curl -s -X POST "$API/public/orders" -H 'Content-Type: application/json' -d '{}' -w '\n%{http_code}')
code=$(echo "$body" | tail -n1)
check "Site sipariş adresi (POST /public/orders)" 400 "$code" "$(echo "$body" | head -n1 | cut -c1-200)"
if echo "$body" | grep -q "Ad soyad zorunludur"; then
  echo "❌ Site sipariş adresi hızlı sipariş formuna bağlanmış (site siparişleri reddedilir)"; fail=1
fi

# Kart ödemesi: Tami bilgileri sunucudaysa bağlantı testi ok:true dönmeli (yoksa kart seçeneği zaten gizli)
tami=$(curl -s "$SITE/api/payment/tami/test")
if echo "$tami" | grep -q '"envVarsSet":true'; then
  if echo "$tami" | grep -q '"ok":true'; then echo "✅ Tami bağlantısı"; else echo "❌ Tami bağlantısı: $(echo "$tami" | cut -c1-200)"; fail=1; fi
else
  echo "⚠️  Tami bilgileri sunucuda yok — kart ödemesi kapalı"
fi

[ "$fail" = 0 ] && echo "Tüm kontroller geçti." || echo "DUMAN TESTİ BAŞARISIZ — sitede müşteri sipariş veremiyor olabilir."
exit "$fail"
