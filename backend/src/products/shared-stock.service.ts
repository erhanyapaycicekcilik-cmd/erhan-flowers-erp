import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { isSiteOnlyModelCode } from '../common/site-only';
import {
  computeRecipeCapacities,
  listedQuantity,
  normalizeSharedStockSettings,
  readSharedStockSettings,
  SHARED_STOCK_LAST_RUN_KEY,
  SHARED_STOCK_SETTINGS_KEY,
  SharedStockSettings,
} from '../common/shared-stock';
import { ProductsService } from './products.service';

export interface SharedStockRow {
  variantId: number;
  store: string;
  productName: string;
  barcode: string;
  modelCode: string | null;
  currentStock: number;
  capacity: number;
  listed: number;
  change: number;
  limitingCard: { id: number; name: string; stock: number; need: number };
  components: Array<{ id: number; name: string; stock: number; need: number }>;
}

// Toplu kapanma koruması: tek turda bu kadardan fazla AÇIK ilan 0'a düşecekse hiçbir şey gönderilmez
// (sayılmayan bir stok kartı yüzünden ürünlerin topluca kapanmasını önler).
const MASS_ZERO_MIN = 20;
const MASS_ZERO_RATIO = 0.25;

@Injectable()
export class SharedStockService {
  private readonly logger = new Logger(SharedStockService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly products: ProductsService,
  ) {}

  async getSettings() {
    const [settings, lastRunRow] = await Promise.all([
      readSharedStockSettings(this.prisma),
      this.prisma.appSetting.findUnique({ where: { key: SHARED_STOCK_LAST_RUN_KEY } }),
    ]);
    let lastRun: unknown = null;
    try {
      lastRun = lastRunRow ? JSON.parse(lastRunRow.value) : null;
    } catch {
      lastRun = null;
    }
    return { ...settings, lastRun };
  }

  async updateSettings(body: Partial<SharedStockSettings>) {
    const current = await readSharedStockSettings(this.prisma);
    const next = normalizeSharedStockSettings({ ...current, ...body });
    if (body.mode && String(body.mode).toUpperCase() !== next.mode) throw new BadRequestException('Mod OFF, PREVIEW veya ON olmalıdır.');
    await this.prisma.appSetting.upsert({
      where: { key: SHARED_STOCK_SETTINGS_KEY },
      create: { key: SHARED_STOCK_SETTINGS_KEY, value: JSON.stringify(next) },
      update: { value: JSON.stringify(next) },
    });
    this.integrations.clearSharedStockCache();
    return next;
  }

  // Satıştaki (ACTIVE) ve onaylı reçetesi olan tüm ilanlar: şu anki adet → reçeteden hesaplanan adet
  async preview(params: { store?: string; onlyChanged?: boolean; search?: string } = {}) {
    const settings = await readSharedStockSettings(this.prisma);
    const rows = await this.computeRows(settings.buffer);
    const store = String(params.store ?? '').toUpperCase();
    const q = String(params.search ?? '').trim().toLocaleLowerCase('tr-TR');
    const filtered = rows.filter(
      (r) =>
        (!store || store === 'ALL' || r.store === store) &&
        (!params.onlyChanged || r.change !== 0) &&
        (!q || r.productName.toLocaleLowerCase('tr-TR').includes(q) || r.barcode.includes(q) || (r.modelCode ?? '').toLocaleLowerCase('tr-TR').includes(q) || r.limitingCard.name.toLocaleLowerCase('tr-TR').includes(q)),
    );
    const summary = {
      managed: rows.length,
      changed: rows.filter((r) => r.change !== 0).length,
      willClose: rows.filter((r) => r.currentStock > 0 && r.listed === 0).length,
      willOpen: rows.filter((r) => r.currentStock === 0 && r.listed > 0).length,
      byStore: {
        ERHAN: rows.filter((r) => r.store === 'ERHAN').length,
        FLORA: rows.filter((r) => r.store === 'FLORA').length,
      },
    };
    return { settings, summary, rows: filtered.slice(0, 1000), total: filtered.length };
  }

  @Cron('*/10 * * * *')
  async scheduledSync() {
    const settings = await readSharedStockSettings(this.prisma).catch(() => null);
    if (settings?.mode !== 'ON') return;
    await this.sync('CRON').catch((err) => this.logger.warn(`Ortak stok senkronu hatası: ${err instanceof Error ? err.message : String(err)}`));
  }

  // Elle "Şimdi gönder" (sadece ON modunda)
  async runNow() {
    const settings = await readSharedStockSettings(this.prisma);
    if (settings.mode !== 'ON') throw new BadRequestException('Ortak stok "Açık" modunda değil. Önce önizlemeyi kontrol edip modu Açık yapın.');
    return this.sync('MANUAL');
  }

  private async sync(trigger: 'CRON' | 'MANUAL') {
    if (this.running) return { ok: false, message: 'Senkron zaten çalışıyor.' };
    this.running = true;
    const startedAt = new Date().toISOString();
    try {
      const settings = await readSharedStockSettings(this.prisma);
      const rows = await this.computeRows(settings.buffer);
      const changes = rows.filter((r) => r.change !== 0);
      const closing = changes.filter((r) => r.currentStock > 0 && r.listed === 0).length;
      const openListings = rows.filter((r) => r.currentStock > 0).length;
      const limit = Math.max(MASS_ZERO_MIN, Math.ceil(openListings * MASS_ZERO_RATIO));
      if (closing > limit) {
        const message = `Toplu kapanma koruması: ${closing} açık ilan 0'a düşecekti (sınır ${limit}). Hiçbir şey gönderilmedi — Ortak Stok ekranından sınırlayan stok kartlarını kontrol edin.`;
        this.logger.warn(message);
        await this.saveLastRun({ startedAt, trigger, ok: false, message, changed: changes.length, sent: 0, failed: 0 });
        return { ok: false, message };
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const row of changes) {
        try {
          const variant = await this.prisma.trendyolProductVariant.findUnique({
            where: { id: row.variantId },
            select: { barcode: true, currentModelCode: true, trendyolSalePrice: true, productCostDraft: { select: { marketplaceSalePrice: true, salePrice: true } } },
          });
          if (!variant) continue;
          const price =
            Number(variant.trendyolSalePrice ?? 0) ||
            Number(variant.productCostDraft?.marketplaceSalePrice ?? 0) ||
            Number(variant.productCostDraft?.salePrice ?? 0);
          await this.prisma.trendyolProductVariant.update({ where: { id: row.variantId }, data: { stockQuantity: row.listed } });
          if (!(price > 0)) {
            failed += 1;
            if (errors.length < 10) errors.push(`${row.productName}: fiyat bilinmiyor, stok gönderilemedi`);
            continue;
          }
          await this.products.broadcastPriceStockPublic({ barcode: variant.barcode, modelCode: variant.currentModelCode, marketPrice: price, stockQuantity: row.listed });
          sent += 1;
        } catch (err) {
          failed += 1;
          if (errors.length < 10) errors.push(`${row.productName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      const message = `${changes.length} ilanın adedi değişti, ${sent} gönderildi${failed ? `, ${failed} hata` : ''}.`;
      await this.saveLastRun({ startedAt, trigger, ok: failed === 0, message, changed: changes.length, sent, failed, errors });
      return { ok: failed === 0, message, changed: changes.length, sent, failed, errors };
    } finally {
      this.running = false;
    }
  }

  private async saveLastRun(value: Record<string, unknown>) {
    const json = JSON.stringify({ ...value, finishedAt: new Date().toISOString() });
    await this.prisma.appSetting
      .upsert({ where: { key: SHARED_STOCK_LAST_RUN_KEY }, create: { key: SHARED_STOCK_LAST_RUN_KEY, value: json }, update: { value: json } })
      .catch(() => undefined);
  }

  private async computeRows(buffer: number): Promise<SharedStockRow[]> {
    const capacities = await computeRecipeCapacities(this.prisma);
    if (!capacities.size) return [];
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { id: { in: [...capacities.keys()] }, status: 'ACTIVE' },
      select: { id: true, storeCode: true, productName: true, barcode: true, currentModelCode: true, stockQuantity: true },
    });
    const rows: SharedStockRow[] = [];
    for (const v of variants) {
      if (isSiteOnlyModelCode(v.currentModelCode)) continue;
      const cap = capacities.get(v.id);
      if (!cap) continue;
      const listed = listedQuantity(cap.capacity, buffer);
      const currentStock = Number(v.stockQuantity ?? 0);
      rows.push({
        variantId: v.id,
        store: v.storeCode,
        productName: v.productName,
        barcode: v.barcode,
        modelCode: v.currentModelCode,
        currentStock,
        capacity: cap.capacity,
        listed,
        change: listed - currentStock,
        limitingCard: { id: cap.limiting.stockCardId, name: cap.limiting.name, stock: cap.limiting.stock, need: cap.limiting.need },
        components: cap.components.map((c) => ({ id: c.stockCardId, name: c.name, stock: c.stock, need: c.need })),
      });
    }
    rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.productName.localeCompare(b.productName, 'tr'));
    return rows;
  }
}
