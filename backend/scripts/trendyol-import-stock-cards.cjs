// Kullanim: node scripts/trendyol-import-stock-cards.cjs
// VPS'te: docker exec erhan-flowers-backend-prod node dist/scripts/trendyol-import-stock-cards.cjs
// Veya dogrudan: node /app/scripts/trendyol-import-stock-cards.cjs

const { PrismaClient } = require('../src/generated/prisma-client');

const prisma = new PrismaClient();

const API_URL    = process.env.TRENDYOL_API_URL    || 'https://api.trendyol.com/sapigw';
const API_KEY    = process.env.TRENDYOL_API_KEY;
const API_SECRET = process.env.TRENDYOL_API_SECRET;
const SUPPLIER_ID = process.env.TRENDYOL_SUPPLIER_ID;

if (!API_KEY || !API_SECRET || !SUPPLIER_ID) {
  console.error('HATA: TRENDYOL_API_KEY, TRENDYOL_API_SECRET, TRENDYOL_SUPPLIER_ID gerekli');
  process.exit(1);
}

const AUTH = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
const HEADERS = {
  Authorization: `Basic ${AUTH}`,
  'User-Agent': `${SUPPLIER_ID} - SelfIntegration`,
  Accept: 'application/json',
};

async function fetchPage(page, size = 200) {
  const url = `${API_URL}/product/sellers/${SUPPLIER_ID}/products?approved=true&page=${page}&size=${size}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trendyol API hatasi ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('Trendyol urunleri cekiliyor...');

  let page = 0;
  let totalPages = 1;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  while (page < totalPages) {
    const data = await fetchPage(page);
    totalPages = data.totalPages ?? 1;
    const items = data.content ?? [];
    console.log(`Sayfa ${page + 1}/${totalPages} — ${items.length} urun`);

    for (const item of items) {
      const barcode = item.barcode ? String(item.barcode) : null;
      const sku     = item.stockCode ? String(item.stockCode) : null;
      const name    = item.title || item.productName || sku || barcode || 'Isimsiz Urun';
      const images  = item.images ?? [];
      const imageUrl = images[0]?.url ? String(images[0].url) : null;
      const salePrice = item.salePrice ?? item.listPrice ?? 0;
      const brand = item.brand ?? null;

      if (!barcode && !sku) { skipped++; continue; }

      try {
        const existing = await prisma.stockCard.findFirst({
          where: { OR: [sku ? { sku } : undefined, barcode ? { barcode } : undefined].filter(Boolean) },
          select: { id: true },
        });

        if (existing) {
          // Sadece gorsel eksikse guncelle
          await prisma.stockCard.update({
            where: { id: existing.id },
            data: {
              ...(imageUrl ? { imagePath: imageUrl } : {}),
            },
          });
          updated++;
        } else {
          await prisma.stockCard.create({
            data: {
              name,
              sku:       sku   ?? undefined,
              barcode:   barcode ?? undefined,
              imagePath: imageUrl ?? undefined,
              brand:     brand ?? undefined,
              salePrice: Number(salePrice),
              unit:      'Adet',
              category:  'Trendyol',
            },
          });
          created++;
        }
      } catch (err) {
        console.warn(`  ATLANDI: ${sku ?? barcode} — ${err.message}`);
        skipped++;
      }
    }

    page++;
    // Rate limit icin kisa bekleme
    if (page < totalPages) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nTamamlandi: ${created} yeni, ${updated} guncellendi, ${skipped} atlandi`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
