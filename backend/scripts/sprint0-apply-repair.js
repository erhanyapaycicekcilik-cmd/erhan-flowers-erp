require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const root = process.env.STOCK_IMAGE_ROOT || 'D:\\stok görseller';
const repoBackend = process.cwd();
const todayStart = new Date('2026-07-20T00:00:00+03:00');
const apply = process.argv.includes('--apply');

function blank(value) {
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

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function prefixFor(card) {
  const text = normalizeText(`${card.category || ''} ${card.productFamily || ''} ${card.productType || ''} ${card.name || ''}`);
  if (text.includes('mdf') && text.includes('saksi')) return 'MDF';
  if (text.includes('metal') && text.includes('saksi')) return 'MSK';
  if ((text.includes('plastik') || text.includes('lale') || text.includes('lotus')) && text.includes('saksi')) return 'PSK';
  if (text.includes('saksi')) return 'MSK';
  if (text.includes('bambu') && text.includes('govde')) return 'BMG';
  if (text.includes('govde')) return 'GOV';
  if (text.includes('sarmas') || text.includes('cit')) return 'SRM';
  if (text.includes('yaprak')) return 'YAP';
  if (text.includes('demet') || text.includes('cicek') || text.includes('gul') || text.includes('sakayik')) return 'DMT';
  if (text.includes('silikon') || text.includes('yardimci')) return 'YRD';
  return 'STK';
}

function scanFolders() {
  const result = { prefixes: {}, maxBarcode: 869900000000000 };
  if (!fs.existsSync(root)) return result;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^([A-Z]{2,5})-(\d{4,})_(\d{13,15})_/);
    if (!match) continue;
    result.prefixes[match[1]] = Math.max(result.prefixes[match[1]] || 0, Number(match[2]));
    result.maxBarcode = Math.max(result.maxBarcode, Number(match[3]));
  }
  return result;
}

async function counters() {
  const folder = scanFolders();
  const cards = await prisma.stockCard.findMany({ select: { sku: true, model: true, barcode: true } });
  const prefixes = { ...folder.prefixes };
  let maxModel = 0;
  let maxBarcode = folder.maxBarcode;
  for (const card of cards) {
    const sku = String(card.sku || '').match(/^([A-Z]{2,5})-(\d{4,})$/);
    if (sku) prefixes[sku[1]] = Math.max(prefixes[sku[1]] || 0, Number(sku[2]));
    const model = String(card.model || '').match(/^STK-(\d{6})$/);
    if (model) maxModel = Math.max(maxModel, Number(model[1]));
    const barcode = Number(card.barcode);
    if (Number.isFinite(barcode)) maxBarcode = Math.max(maxBarcode, barcode);
  }
  return { prefixes, maxModel, maxBarcode };
}

function sourcePathFor(image) {
  if (image.filePath?.startsWith('/stock-images/')) {
    return path.join(root, image.filePath.replace('/stock-images/', '').replaceAll('/', path.sep));
  }
  if (image.filePath?.startsWith('/uploads/')) {
    return path.join(repoBackend, image.filePath.replace('/uploads/', 'uploads/').replaceAll('/', path.sep));
  }
  if (image.folderName) return path.join(image.folderName, image.fileName);
  return null;
}

function moveFileSafe(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (!source || !fs.existsSync(source)) return false;
  if (fs.existsSync(destination)) {
    const parsed = path.parse(destination);
    destination = path.join(parsed.dir, `${parsed.name}-${Date.now()}${parsed.ext}`);
  }
  try {
    fs.renameSync(source, destination);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      fs.copyFileSync(source, destination);
      fs.unlinkSync(source);
    } else {
      throw error;
    }
  }
  return destination;
}

async function main() {
  const count = await counters();
  const targets = await prisma.stockCard.findMany({
    where: {
      createdAt: { gte: todayStart },
      id: { not: 237 },
      OR: [{ sku: null }, { sku: '' }, { model: null }, { model: '' }, { barcode: null }, { barcode: '' }],
    },
    include: { images: true },
    orderBy: { createdAt: 'asc' },
  });
  const yapayMa = await prisma.stockCard.findUnique({ where: { id: 237 }, include: { images: true } });
  const plan = [];

  for (const card of targets) {
    const prefix = prefixFor(card);
    count.prefixes[prefix] = (count.prefixes[prefix] || 0) + 1;
    count.maxModel += 1;
    count.maxBarcode += 1;
    const sku = blank(card.sku) ? `${prefix}-${String(count.prefixes[prefix]).padStart(4, '0')}` : card.sku;
    const model = blank(card.model) || /^STOK-\d+$/i.test(String(card.model)) ? `STK-${String(count.maxModel).padStart(6, '0')}` : card.model;
    const barcode = blank(card.barcode) ? String(count.maxBarcode) : card.barcode;
    const folderName = `${sku}_${barcode}_${safeSegment(card.name)}`;
    plan.push({ card, sku, model, barcode, folderName, destination: path.join(root, folderName) });
  }

  const report = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    updateCount: plan.length,
    deleteYapayMa: Boolean(yapayMa),
    updates: plan.map((item) => ({
      id: item.card.id,
      name: item.card.name,
      from: { sku: item.card.sku, model: item.card.model, barcode: item.card.barcode },
      to: { sku: item.sku, model: item.model, barcode: item.barcode, folder: item.destination },
      images: item.card.images.map((image) => ({ id: image.id, source: sourcePathFor(image), fileName: image.fileName })),
    })),
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const backupDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `sprint0-repair-applied-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(report, null, 2), 'utf8');

  for (const item of plan) {
    const movedImages = [];
    let index = 1;
    for (const image of item.card.images) {
      const source = sourcePathFor(image);
      const extension = path.extname(image.fileName) || '.jpg';
      const fileName = `${safeSegment(item.card.name)}-${index}${extension.toLowerCase()}`;
      const destination = path.join(item.destination, fileName);
      const moved = moveFileSafe(source, destination);
      movedImages.push({ image, fileName: path.basename(moved || destination), filePath: `/stock-images/${item.folderName}/${path.basename(moved || destination)}`, folderName: item.destination });
      index += 1;
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockCard.update({
        where: { id: item.card.id },
        data: {
          sku: item.sku,
          model: item.model,
          barcode: item.barcode,
          imagePath: movedImages[0]?.filePath ?? item.card.imagePath,
        },
      });
      for (const moved of movedImages) {
        await tx.stockCardImage.update({
          where: { id: moved.image.id },
          data: { fileName: moved.fileName, filePath: moved.filePath, folderName: moved.folderName },
        });
        await tx.mediaFile.updateMany({
          where: { filePath: moved.image.filePath },
          data: { fileName: moved.fileName, filePath: moved.filePath, folderName: moved.folderName },
        });
      }
    });
  }

  if (yapayMa) {
    for (const image of yapayMa.images) {
      const source = sourcePathFor(image);
      if (source && fs.existsSync(source)) fs.rmSync(source, { force: true });
    }
    const oldDir = path.join(repoBackend, 'uploads', 'stock-cards', 'stok-237');
    if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true, force: true });
    await prisma.$transaction(async (tx) => {
      await tx.mediaFile.deleteMany({ where: { filePath: { contains: 'stok-237' } } });
      await tx.stockCardImage.deleteMany({ where: { stockCardId: 237 } });
      await tx.stockMovement.deleteMany({ where: { stockCardId: 237 } });
      await tx.stockCountItem.deleteMany({ where: { stockCardId: 237 } });
      await tx.stockUsageLog.deleteMany({ where: { stockCardId: 237 } });
      await tx.productCostItem.updateMany({ where: { stockCardId: 237 }, data: { stockCardId: null } });
      await tx.productPotItem.updateMany({ where: { stockCardId: 237 }, data: { stockCardId: null } });
      await tx.stockCard.delete({ where: { id: 237 } });
    });
  }

  const emptyRemoved = [];
  if (fs.existsSync(root)) {
    const dirs = fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name));
    for (const dir of dirs) {
      const children = fs.readdirSync(dir);
      if (children.length === 0) {
        fs.rmSync(dir, { recursive: true, force: true });
        emptyRemoved.push(dir);
      }
    }
  }

  console.log(JSON.stringify({ ok: true, backupFile, updated: plan.length, deletedYapayMa: Boolean(yapayMa), emptyRemoved }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
