import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { calcPlatformPrice } from '../integrations/platform-fees.config';
import { isSiteOnlyModelCode } from '../common/site-only';

// Toplu zam / indirim: Erhan Flowers Trendyol ürünlerine (aktif varyantlar) yüzde veya TL
// ekler, ERP fiyatlarını günceller ve bağlı tüm pazaryerlerine (Trendyol, N11, HB…) sadece
// fiyat/stok olarak gönderir. Site fiyatı Trendyol fiyatından hesaplandığı için kendiliğinden değişir.
// Son uygulamanın eski fiyatları app_settings'te saklanır → "Geri al".

export type BulkPriceParams = {
  mode: 'PERCENT' | 'AMOUNT';
  value: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  roundTo9?: boolean;
};

type Row = {
  variantId: number;
  barcode: string;
  modelCode: string | null;
  name: string;
  stock: number;
  oldPrice: number;
  newPrice: number;
};

type JobStatus = {
  running: boolean;
  kind: 'APPLY' | 'UNDO' | null;
  total: number;
  done: number;
  ok: number;
  failed: number;
  errors: string[];
  startedAt: string | null;
  finishedAt: string | null;
};

const UNDO_KEY = 'bulk_price_last';
const MAX_ABS_PERCENT = 100;

@Injectable()
export class BulkPriceService {
  private readonly logger = new Logger(BulkPriceService.name);
  private job: JobStatus = { running: false, kind: null, total: 0, done: 0, ok: 0, failed: 0, errors: [], startedAt: null, finishedAt: null };

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  status() {
    return this.job;
  }

  private validate(p: BulkPriceParams): BulkPriceParams {
    const mode = p?.mode === 'AMOUNT' ? 'AMOUNT' : p?.mode === 'PERCENT' ? 'PERCENT' : null;
    if (!mode) throw new BadRequestException('Tür PERCENT (yüzde) veya AMOUNT (TL) olmalı.');
    const value = Number(p.value);
    if (!Number.isFinite(value) || value === 0) throw new BadRequestException('Zam miktarı 0 olamaz.');
    if (mode === 'PERCENT' && Math.abs(value) > MAX_ABS_PERCENT) throw new BadRequestException(`Yüzde en fazla ±${MAX_ABS_PERCENT} olabilir.`);
    const num = (v: unknown) => (v === null || v === undefined || v === '' ? undefined : Number(v));
    return {
      mode,
      value,
      search: String(p.search ?? '').trim() || undefined,
      minPrice: num(p.minPrice),
      maxPrice: num(p.maxPrice),
      roundTo9: Boolean(p.roundTo9),
    };
  }

  static computeNewPrice(oldPrice: number, mode: 'PERCENT' | 'AMOUNT', value: number, roundTo9 = false): number {
    let price = mode === 'PERCENT' ? oldPrice * (1 + value / 100) : oldPrice + value;
    price = Math.round(price);
    if (roundTo9 && price >= 10) {
      // …9'a yuvarla (en yakın): 1243 → 1239, 1246 → 1249
      const up = Math.ceil((price + 1) / 10) * 10 - 1;
      const down = up - 10;
      price = up - price <= price - down ? up : down;
    }
    return Math.max(1, price);
  }

  private async rows(params: BulkPriceParams): Promise<Row[]> {
    const where: Prisma.TrendyolProductVariantWhereInput = { status: 'ACTIVE' };
    if (params.search) {
      where.OR = [
        { productName: { contains: params.search, mode: 'insensitive' } },
        { currentModelCode: { contains: params.search, mode: 'insensitive' } },
        { barcode: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where,
      select: {
        id: true, barcode: true, currentModelCode: true, productName: true, stockQuantity: true,
        trendyolSalePrice: true, productCostDraft: { select: { marketplaceSalePrice: true } },
      },
      orderBy: { productName: 'asc' },
    });
    const out: Row[] = [];
    for (const v of variants) {
      if (isSiteOnlyModelCode(v.currentModelCode) || isSiteOnlyModelCode(v.barcode)) continue;
      // Güncel Trendyol fiyatı (her gece senkronlanır); yoksa maliyet ekranındaki pazaryeri fiyatı
      const oldPrice = Number(v.trendyolSalePrice) > 0 ? Number(v.trendyolSalePrice) : Number(v.productCostDraft?.marketplaceSalePrice ?? 0);
      if (!(oldPrice > 0)) continue;
      if (params.minPrice !== undefined && oldPrice < params.minPrice) continue;
      if (params.maxPrice !== undefined && oldPrice > params.maxPrice) continue;
      out.push({
        variantId: v.id,
        barcode: v.barcode,
        modelCode: v.currentModelCode,
        name: v.productName,
        stock: Number(v.stockQuantity ?? 0),
        oldPrice,
        newPrice: BulkPriceService.computeNewPrice(oldPrice, params.mode, params.value, params.roundTo9),
      });
    }
    return out;
  }

  async preview(raw: BulkPriceParams) {
    const params = this.validate(raw);
    const rows = await this.rows(params);
    const sum = (k: 'oldPrice' | 'newPrice') => rows.reduce((s, r) => s + r[k], 0);
    return {
      count: rows.length,
      totalOld: sum('oldPrice'),
      totalNew: sum('newPrice'),
      rows: rows.map(({ variantId, barcode, modelCode, name, stock, oldPrice, newPrice }) => ({ variantId, barcode, modelCode, name, stock, oldPrice, newPrice })),
    };
  }

  async apply(raw: BulkPriceParams & { variantIds?: number[] }) {
    if (this.job.running) throw new BadRequestException('Devam eden bir toplu fiyat işlemi var, bitmesini bekleyin.');
    const params = this.validate(raw);
    let rows = await this.rows(params);
    if (Array.isArray(raw.variantIds) && raw.variantIds.length) {
      const allow = new Set(raw.variantIds.map(Number));
      rows = rows.filter((r) => allow.has(r.variantId));
    }
    if (!rows.length) throw new BadRequestException('Uygulanacak ürün bulunamadı.');

    // Geri alma için eski fiyatları sakla
    const undo = { at: new Date().toISOString(), params, items: rows.map((r) => ({ variantId: r.variantId, price: r.oldPrice })) };
    await this.prisma.appSetting.upsert({ where: { key: UNDO_KEY }, create: { key: UNDO_KEY, value: JSON.stringify(undo) }, update: { value: JSON.stringify(undo) } });

    this.start('APPLY', rows.length);
    setImmediate(() => this.run(rows.map((r) => ({ variantId: r.variantId, price: r.newPrice }))).catch((e) => this.logger.error('Toplu fiyat hatası', e)));
    return { started: true, count: rows.length };
  }

  async lastUndo() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: UNDO_KEY } });
    if (!row) return null;
    try {
      const data = JSON.parse(row.value) as { at: string; params: BulkPriceParams; items: unknown[] };
      return { at: data.at, params: data.params, count: data.items.length };
    } catch {
      return null;
    }
  }

  async undo() {
    if (this.job.running) throw new BadRequestException('Devam eden bir toplu fiyat işlemi var, bitmesini bekleyin.');
    const row = await this.prisma.appSetting.findUnique({ where: { key: UNDO_KEY } });
    if (!row) throw new BadRequestException('Geri alınacak toplu fiyat işlemi yok.');
    const data = JSON.parse(row.value) as { items: Array<{ variantId: number; price: number }> };
    await this.prisma.appSetting.delete({ where: { key: UNDO_KEY } });
    this.start('UNDO', data.items.length);
    setImmediate(() => this.run(data.items).catch((e) => this.logger.error('Toplu fiyat geri alma hatası', e)));
    return { started: true, count: data.items.length };
  }

  /** Haftalık otomatik zam gibi iç kullanım: önizlemesiz, tüm ürünlere uygular ve bitmesini bekler. */
  async applyNow(raw: BulkPriceParams) {
    if (this.job.running) return { skipped: true };
    const params = this.validate(raw);
    const rows = await this.rows(params);
    if (!rows.length) return { count: 0 };
    this.start('APPLY', rows.length);
    await this.run(rows.map((r) => ({ variantId: r.variantId, price: r.newPrice })));
    return { count: rows.length, ok: this.job.ok, failed: this.job.failed };
  }

  private start(kind: 'APPLY' | 'UNDO', total: number) {
    this.job = { running: true, kind, total, done: 0, ok: 0, failed: 0, errors: [], startedAt: new Date().toISOString(), finishedAt: null };
  }

  private async run(items: Array<{ variantId: number; price: number }>) {
    try {
      const platforms = await this.connectedPlatforms();
      const BATCH = 10;
      for (let i = 0; i < items.length; i += BATCH) {
        await Promise.all(items.slice(i, i + BATCH).map((it) => this.applyOne(it.variantId, it.price, platforms)));
        if (i + BATCH < items.length) await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      this.job.running = false;
      this.job.finishedAt = new Date().toISOString();
      this.logger.log(`Toplu fiyat (${this.job.kind}) bitti: ${this.job.ok} başarılı, ${this.job.failed} hatalı`);
    }
  }

  private async applyOne(variantId: number, price: number, platforms: string[]) {
    try {
      const v = await this.prisma.trendyolProductVariant.findUnique({
        where: { id: variantId },
        select: { id: true, barcode: true, currentModelCode: true, productName: true, stockQuantity: true, status: true, productCostDraft: { select: { id: true } } },
      });
      if (!v || v.status !== 'ACTIVE') throw new Error('ürün aktif değil');
      if (isSiteOnlyModelCode(v.currentModelCode)) throw new Error('WEB- ürünü');

      // ERP fiyatları: sonraki yayınlar eski fiyata döndürmesin
      await this.prisma.trendyolProductVariant.update({ where: { id: v.id }, data: { trendyolSalePrice: price } });
      if (v.productCostDraft) {
        await this.prisma.productCostDraft.update({ where: { id: v.productCostDraft.id }, data: { marketplaceSalePrice: price } });
      }
      const productWhere: Prisma.ProductWhereInput[] = [{ barcode: v.barcode }];
      if (v.currentModelCode) productWhere.push({ modelCode: v.currentModelCode });
      await this.prisma.product.updateMany({
        where: { OR: productWhere, NOT: { modelCode: { startsWith: 'WEB-' } } },
        data: { marketPrice: price, listPrice: Math.ceil(price * 1.1) },
      });

      // Pazaryerlerine sadece fiyat/stok
      const failures: string[] = [];
      for (const platform of platforms) {
        const salePrice = calcPlatformPrice(price, platform);
        const res = await this.integrations
          .pushPrice(platform, { barcode: v.barcode, salePrice, listPrice: Math.ceil(salePrice * 1.1), stockQuantity: Number(v.stockQuantity ?? 0) })
          .catch((e: unknown) => ({ ok: false, message: e instanceof Error ? e.message : String(e) }));
        if (!res.ok) failures.push(`${platform}: ${String(res.message ?? '').slice(0, 120)}`);
      }
      if (failures.length && failures.length === platforms.length) throw new Error(failures.join(' | '));
      this.job.ok++;
      if (failures.length) this.pushError(`${v.productName}: ${failures.join(' | ')}`);
    } catch (e) {
      this.job.failed++;
      this.pushError(`#${variantId}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.job.done++;
    }
  }

  private pushError(msg: string) {
    if (this.job.errors.length < 50) this.job.errors.push(msg);
  }

  private async connectedPlatforms(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ platform: string }>>`
      SELECT platform FROM integration_connections
      WHERE status = 'CONNECTED' AND platform IN ('TRENDYOL', 'N11', 'HEPSIBURADA', 'TRENDRUM', 'PAZARAMA', 'AMAZON', 'KOCTAS')
    `.catch(() => [] as Array<{ platform: string }>);
    return rows.map((r) => r.platform);
  }
}
