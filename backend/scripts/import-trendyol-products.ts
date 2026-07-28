import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

type ImportReport = {
  sourceFile: string;
  totalRows: number;
  added: number;
  updated: number;
  failed: number;
  skipped: number;
  familyCandidateCounts: Record<string, number>;
  errors: Array<{ rowNumber: number; barcode?: string; error: string }>;
};

async function main() {
  const sourceFile = findSourceFile();
  const workbook = XLSX.readFile(sourceFile, { cellDates: false });
  const worksheet = workbook.Sheets['Ürünler'] ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });

  const existing = new Map(
    (
      await prisma.trendyolProductVariant.findMany({
        select: { barcode: true, familyId: true, templateId: true, recipeStatus: true, costStatus: true },
      })
    ).map((item) => [item.barcode, item]),
  );

  const report: ImportReport = {
    sourceFile,
    totalRows: rows.length,
    added: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    familyCandidateCounts: {},
    errors: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const barcode = text(cell(row, 'Barkod'));
    const productName = text(cell(row, 'Ürün Adı'));

    if (!barcode || !productName) {
      report.skipped += 1;
      report.errors.push({ rowNumber, barcode, error: 'Barkod veya ürün adı boş.' });
      continue;
    }

    try {
      const detected = detectProduct(productName, text(cell(row, 'Ürün Rengi')));
      const images = imageFields(row);
      if (detected.familyName) {
        report.familyCandidateCounts[detected.familyName] = (report.familyCandidateCounts[detected.familyName] ?? 0) + 1;
      }

      const old = existing.get(barcode);
      const baseData = {
        productName,
        currentModelCode: text(cell(row, 'Model Kodu')),
        supplierStockCode: text(cell(row, 'Tedarikçi Stok Kodu')),
        brand: text(cell(row, 'Marka')),
        trendyolCategoryName: text(cell(row, 'Kategori İsmi')),
        productColor: text(cell(row, 'Ürün Rengi')),
        productDescription: text(cell(row, 'Ürün Açıklaması')),
        stockQuantity: integer(cell(row, 'Ürün Stok Adedi')),
        trendyolSalePrice: decimal(cell(row, "Trendyol'da Satılacak Fiyat (KDV Dahil)")),
        commissionPercent: decimal(cell(row, 'Komisyon Oranı')),
        trendyolProductUrl: text(cell(row, 'Trendyol.com Linki')),
        images,
        suggestedFamilyName: detected.familyName,
        detectedSize: detected.size,
        detectedPot: detected.pot,
        importSource: path.basename(sourceFile),
        importedAt: new Date(),
        status: 'ACTIVE' as const,
      };

      if (old) {
        await prisma.trendyolProductVariant.update({
          where: { barcode },
          data: {
            ...baseData,
            recipeStatus: old.familyId ? old.recipeStatus : detected.familyName ? 'Aday - Onay Bekliyor' : 'Eşleşmedi',
            costStatus: old.familyId ? old.costStatus : 'Bekliyor',
            seoProductName: null,
            seoApprovalStatus: 'Eksik Bilgi',
            seoApprovedAt: null,
          },
        });
        report.updated += 1;
      } else {
        await prisma.trendyolProductVariant.create({
          data: {
            barcode,
            ...baseData,
            recipeStatus: detected.familyName ? 'Aday - Onay Bekliyor' : 'Eşleşmedi',
            costStatus: 'Bekliyor',
          },
        });
        existing.set(barcode, { barcode, familyId: null, templateId: null, recipeStatus: 'Eşleşmedi', costStatus: 'Bekliyor' });
        report.added += 1;
      }
    } catch (error) {
      report.failed += 1;
      report.errors.push({
        rowNumber,
        barcode,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
    }
  }

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
}

function findSourceFile() {
  const arg = process.argv[2];
  if (arg && fs.existsSync(path.resolve(arg))) return path.resolve(arg);

  const downloads = path.join(process.env.USERPROFILE ?? '', 'Downloads');
  const dynamic = fs
    .readdirSync(downloads)
    .filter((name) => name.endsWith('.xlsx') && !name.startsWith('~$') && name.includes('Ürünleriniz'))
    .sort()
    .at(-1);

  if (dynamic) return path.join(downloads, dynamic);
  throw new Error('Trendyol Excel dosyası bulunamadı.');
}

function cell(row: Record<string, unknown>, key: string) {
  if (key in row) return row[key];
  const normalizedKey = normalize(key);
  const found = Object.keys(row).find((item) => normalize(item) === normalizedKey);
  return found ? row[found] : '';
}

function detectProduct(productName: string, color: string) {
  const combined = `${productName} ${color}`;
  const normalized = normalize(combined);
  const familyName = detectFamily(normalized);
  const size = combined.match(/\b(\d{2,3})\s*cm\b/i)?.[0]?.replace(/\s+/g, ' ') ?? null;
  const pot = detectPot(normalized);
  return { familyName, size, pot };
}

function detectFamily(normalized: string) {
  if (normalized.includes('ficus')) return 'Yapay Ficus Ağacı';
  if (normalized.includes('benjamin')) return 'Benjamin';
  if (normalized.includes('areka')) return 'Areka';
  if (normalized.includes('bambu')) return 'Bambu Tekli';
  return null;
}

function detectPot(normalized: string) {
  const potSize = normalized.includes('25x25') ? '25x25' : '30x30';
  const rules = [
    ['beyaz plastik', 'Beyaz Plastik Saksı'],
    ['siyah plastik', 'Siyah Plastik Saksı'],
    ['plastik', 'Plastik Saksı'],
    ['siyah gold', `Siyah Gold ${potSize}`],
    ['siyah gumus', `Siyah Gümüş ${potSize}`],
    ['beyaz gold', `Beyaz Gold ${potSize}`],
    ['beyaz gumus', `Beyaz Gümüş ${potSize}`],
    ['beyaz vega', 'Beyaz Vega'],
    ['siyah vega', 'Siyah Vega'],
    ['vega', 'Vega Saksı'],
    ['siyah lilyum', 'Siyah Lilyum 31x58'],
    ['beyaz lilyum', 'Beyaz Lilyum 31x58'],
    ['beyaz lilyum', 'Beyaz Lilyum'],
    ['siyah lilyum', 'Siyah Lilyum'],
    ['lilyum', 'Lilyum Saksı'],
    ['beyaz kure', 'Beyaz Küre'],
    ['siyah kure', 'Siyah Küre'],
    ['kure', 'Küre Saksı'],
    ['siyah luna', 'Siyah Luna'],
    ['luna', 'Luna Saksı'],
    ['nergiz', 'Nergiz Saksı'],
    ['metal', `Metal Saksı ${potSize}`],
  ] as const;

  return rules.find(([keyword]) => normalized.includes(keyword))?.[1] ?? null;
}

function imageFields(row: Record<string, unknown>) {
  return Array.from({ length: 8 }, (_, index) => text(cell(row, `Görsel ${index + 1}`))).filter(Boolean);
}

function text(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function integer(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function decimal(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function writeReport(report: ImportReport) {
  const reportDir = path.join(process.cwd(), 'import-reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `trendyol-import-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
