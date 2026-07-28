/*
  ERHAN FLOWERS ERP - Stock identity repair preparation script

  This script is intentionally safe by default.
  - Dry run:  node scripts/repair-stock-identities.js
  - Apply:    node scripts/repair-stock-identities.js --apply --confirm=ERHAN-ONAY

  Do not run apply mode without owner approval.
*/

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const STOCK_IMAGE_ROOT = process.env.STOCK_IMAGE_ROOT || 'D:\\stok görseller';
const REPAIR_START = new Date('2026-07-20T00:00:00+03:00');
const APPLY = process.argv.includes('--apply');
const CONFIRMED = process.argv.includes('--confirm=ERHAN-ONAY');

const REVIEW_REQUIRED_IDS = new Set([235, 236, 237]);
const OLD_PLACEHOLDER_MODEL_RE = /^STOK-\d+$/;

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function safeSegment(value) {
  const cleaned = String(value || 'STOK_KARTI')
    .toLocaleUpperCase('tr-TR')
    .replaceAll('İ', 'I')
    .replaceAll('ı', 'I')
    .replaceAll('Ğ', 'G')
    .replaceAll('ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('ü', 'U')
    .replaceAll('Ş', 'S')
    .replaceAll('ş', 'S')
    .replaceAll('Ö', 'O')
    .replaceAll('ö', 'O')
    .replaceAll('Ç', 'C')
    .replaceAll('ç', 'C')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || 'STOK_KARTI';
}

function prefixFor(card) {
  const text = `${card.category || ''} ${card.name || ''}`.toLocaleLowerCase('tr-TR');
  if (text.includes('metal') && text.includes('saks')) return 'MSK';
  if ((text.includes('plastik') || text.includes('lale') || text.includes('lotus')) && text.includes('saks')) return 'PSK';
  if (text.includes('mdf') && text.includes('saks')) return null;
  if (text.includes('saks')) return 'MSK';
  if (text.includes('bambu') && (text.includes('gövde') || text.includes('govde'))) return 'BMG';
  if (text.includes('gövde') || text.includes('govde')) return 'GOV';
  if (text.includes('sarmaş') || text.includes('sarmas') || text.includes('çit') || text.includes('cit')) return 'SRM';
  if (text.includes('yaprak')) return 'YAP';
  if (text.includes('demet') || text.includes('çiçek') || text.includes('cicek') || text.includes('gül') || text.includes('gul') || text.includes('şakayık') || text.includes('sakayik')) return 'DMT';
  if (text.includes('silikon') || text.includes('yardımcı') || text.includes('yardimci')) return 'YRD';
  return null;
}

function scanFolderCounters() {
  const result = { prefixes: {}, maxBarcode: 869900000000230 };
  if (!fs.existsSync(STOCK_IMAGE_ROOT)) return result;

  for (const entry of fs.readdirSync(STOCK_IMAGE_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^([A-Z]{2,5})-(\d{4,})_(\d{13,15})_/);
    if (!match) continue;
    const prefix = match[1];
    const number = Number(match[2]);
    const barcode = Number(match[3]);
    result.prefixes[prefix] = Math.max(result.prefixes[prefix] || 0, number);
    result.maxBarcode = Math.max(result.maxBarcode, barcode);
  }

  return result;
}

async function buildPlan() {
  const folderCounters = scanFolderCounters();
  const allCards = await prisma.stockCard.findMany({ select: { sku: true, model: true, barcode: true } });
  const counters = { ...folderCounters.prefixes };
  let maxModel = 0;
  let maxBarcode = folderCounters.maxBarcode;

  for (const card of allCards) {
    const skuMatch = String(card.sku || '').match(/^([A-Z]{2,5})-(\d{4,})$/);
    if (skuMatch) counters[skuMatch[1]] = Math.max(counters[skuMatch[1]] || 0, Number(skuMatch[2]));

    const modelMatch = String(card.model || '').match(/^STK-(\d{6})$/);
    if (modelMatch) maxModel = Math.max(maxModel, Number(modelMatch[1]));

    const barcodeMatch = String(card.barcode || '').match(/^(\d{13,15})$/);
    if (barcodeMatch) maxBarcode = Math.max(maxBarcode, Number(barcodeMatch[1]));
  }

  const targets = await prisma.stockCard.findMany({
    where: {
      createdAt: { gte: REPAIR_START },
      OR: [
        { sku: null },
        { sku: '' },
        { model: null },
        { model: '' },
        { barcode: null },
        { barcode: '' },
      ],
    },
    include: { images: true },
    orderBy: { createdAt: 'asc' },
  });

  const plan = [];
  for (const card of targets) {
    const prefix = prefixFor(card);
    const needsReview = REVIEW_REQUIRED_IDS.has(card.id) || !prefix;

    let nextSku = card.sku;
    if (isBlank(nextSku) && prefix) {
      counters[prefix] = (counters[prefix] || 0) + 1;
      nextSku = `${prefix}-${String(counters[prefix]).padStart(4, '0')}`;
    }

    let nextModel = card.model;
    if (isBlank(nextModel) || OLD_PLACEHOLDER_MODEL_RE.test(String(nextModel))) {
      maxModel += 1;
      nextModel = `STK-${String(maxModel).padStart(6, '0')}`;
    }

    let nextBarcode = card.barcode;
    if (isBlank(nextBarcode)) {
      maxBarcode += 1;
      nextBarcode = String(maxBarcode);
    }

    const folderName = nextSku && nextBarcode
      ? `${nextSku}_${nextBarcode}_${safeSegment(card.name)}`
      : null;

    plan.push({
      id: card.id,
      name: card.name,
      current: { sku: card.sku, model: card.model, barcode: card.barcode },
      next: { sku: nextSku, model: nextModel, barcode: nextBarcode },
      needsReview,
      reviewReason: needsReview ? 'Stok kodu ön eki kullanıcı onayı istiyor.' : null,
      currentFolders: [...new Set(card.images.map((image) => image.folderName))],
      nextFolder: folderName ? path.join(STOCK_IMAGE_ROOT, folderName) : null,
    });
  }

  return plan;
}

async function main() {
  const plan = await buildPlan();
  const unsafe = plan.filter((item) => item.needsReview);

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'DRY_RUN_ONLY', count: plan.length, unsafeCount: unsafe.length, plan }, null, 2));
    return;
  }

  if (!CONFIRMED) throw new Error('Apply mode requires --confirm=ERHAN-ONAY');
  if (unsafe.length > 0) throw new Error(`Review required for stock card ids: ${unsafe.map((item) => item.id).join(', ')}`);

  const backupPath = path.join(process.cwd(), 'tmp', `stock-identity-repair-backup-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify({ createdAt: new Date(), plan }, null, 2), 'utf8');

  await prisma.$transaction(async (tx) => {
    for (const item of plan) {
      await tx.stockCard.update({
        where: { id: item.id },
        data: {
          sku: item.next.sku,
          model: item.next.model,
          barcode: item.next.barcode,
        },
      });
    }
  });

  console.log(JSON.stringify({ ok: true, changed: plan.length, backupPath }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
