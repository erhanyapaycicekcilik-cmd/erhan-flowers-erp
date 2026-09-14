/**
 * Trendyol'da satışta olan tüm ürünlerin kapak fotoğraflarını
 * /tmp/trendyol-covers/ klasörüne kopyalar ve zip arşivi oluşturur.
 *
 * Çalıştırma (VPS'te /opt/erp/backend dizininde):
 *   node scripts/export-trendyol-cover-photos.mjs
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

const OUTPUT_DIR = '/tmp/trendyol-covers';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'products');
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

async function main() {
  console.log('Trendyol ürünleri sorgulanıyor...');

  // Trendyol'da fiyatı olan (satışa açık) tüm ürünleri getir
  // productId aracılığıyla Product.mediaFiles'a bağlı olanlar
  const variants = await prisma.trendyolProductVariant.findMany({
    where: {
      trendyolSalePrice: { gt: 0 },
      status: 'ACTIVE',
      productId: { not: null },
    },
    select: {
      id: true,
      barcode: true,
      productName: true,
      currentModelCode: true,
      images: true,
      product: {
        select: {
          mediaFiles: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: {
              fileName: true,
              filePath: true,
            },
          },
        },
      },
    },
  });

  console.log(`${variants.length} ürün bulundu.`);

  // Çıktı klasörünü hazırla
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let copied = 0;
  let missing = 0;
  const report = [];

  for (const v of variants) {
    const mediaFile = v.product?.mediaFiles?.[0];
    let sourceFile = null;

    if (mediaFile?.filePath) {
      // filePath genellikle "products/dosyaadi.jpg" veya "dosyaadi.jpg" şeklinde
      const candidates = [
        path.join(UPLOADS_ROOT, mediaFile.filePath),
        path.join(UPLOADS_DIR, mediaFile.fileName),
        path.join(UPLOADS_ROOT, mediaFile.fileName),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) { sourceFile = c; break; }
      }
    }

    // mediaFiles yoksa images JSON'undan ilk URL'yi dene (eski format)
    if (!sourceFile && v.images) {
      const imgs = Array.isArray(v.images) ? v.images : [];
      const firstImg = imgs[0];
      if (firstImg?.url || firstImg) {
        const url = typeof firstImg === 'string' ? firstImg : firstImg.url;
        report.push({ barcode: v.barcode, name: v.productName, status: 'URL_ONLY', url });
        missing++;
        continue;
      }
    }

    if (!sourceFile) {
      report.push({ barcode: v.barcode, name: v.productName, status: 'MISSING', url: null });
      missing++;
      continue;
    }

    // Dosyayı kopyala — barkod_modelkod_orijinalisim.jpg formatında
    const ext = path.extname(sourceFile);
    const safeName = (v.currentModelCode || v.barcode).replace(/[^a-zA-Z0-9_-]/g, '_');
    const destName = `${safeName}${ext}`;
    const destFile = path.join(OUTPUT_DIR, destName);
    fs.copyFileSync(sourceFile, destFile);
    report.push({ barcode: v.barcode, name: v.productName, status: 'OK', file: destName });
    copied++;
  }

  // Rapor yaz
  const reportPath = path.join(OUTPUT_DIR, '_rapor.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  // Zip arşivi oluştur
  const zipPath = '/tmp/trendyol-covers.zip';
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execSync(`cd /tmp && zip -r trendyol-covers.zip trendyol-covers/`);

  console.log(`\n✅ Tamamlandı:`);
  console.log(`   Kopyalanan : ${copied}`);
  console.log(`   Eksik      : ${missing}`);
  console.log(`   Zip dosyası: ${zipPath}`);
  console.log(`\nBilgisayarınıza indirmek için:`);
  console.log(`   scp root@77.42.122.169:/tmp/trendyol-covers.zip .\\trendyol-covers.zip`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
