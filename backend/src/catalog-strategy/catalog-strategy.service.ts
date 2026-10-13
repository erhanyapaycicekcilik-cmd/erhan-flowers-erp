import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HepsiburadaAdapter } from '../integrations/adapters/hepsiburada.adapter';
import { IntegrationPlatform } from '../integrations/adapters/integration-adapter.interface';
import { N11Adapter } from '../integrations/adapters/n11.adapter';
import { TrendyolAdapter } from '../integrations/adapters/trendyol.adapter';
import { IntegrationCenterService } from '../integrations/services/integration-center.service';
import { TrendyolScraperService } from '../market-intelligence/trendyol-scraper.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingService, StorePublishOption } from '../publishing/publishing.service';

export const CLEANUP_CONFIRM_TEXT = 'SATISA KAPAT';
const STORE_CODES = ['ERHAN', 'FLORA'] as const;
const STORE_BARCODE_PREFIXES = ['FL-'];
const CLOSE_PLATFORMS: IntegrationPlatform[] = ['TRENDYOL', 'N11', 'HEPSIBURADA'];

type CleanupItem = {
  barcode: string;
  title: string;
  stockCode: string | null;
  salePrice: number;
  listPrice: number;
  quantity: number;
  soldQuantity: number;
  orderCount: number;
  productUrl: string | null;
};

// Katalog stratejisi:
//  1) Satışta olup son N günde satmayan ürünleri bulup tüm pazaryerlerinde satışa kapatır (stok 0),
//  2) Trendyol'da en çok satan ürünleri ve kendi çok satanlarımızı uygun fiyat önerisiyle listeler,
//  3) Seçilen ürünleri Erhan Flowers + Flora mağazalarına aynı anda açar.
@Injectable()
export class CatalogStrategyService {
  private readonly logger = new Logger(CatalogStrategyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationCenter: IntegrationCenterService,
    private readonly scraper: TrendyolScraperService,
    private readonly publishing: PublishingService,
  ) {}

  // ---------- 1) Satmayan ürünleri kapatma ----------

  async cleanupPreview(companyValue: unknown, daysValue: unknown, minSoldValue: unknown) {
    const companyCode = this.company(companyValue);
    const days = this.clampInt(daysValue, 90, 7, 365);
    const minSold = this.clampInt(minSoldValue, 1, 1, 1000);

    const adapter = new TrendyolAdapter(await this.integrationCenter.storeCredentials('TRENDYOL', companyCode));
    const listings = await adapter.fetchSellerProducts();
    const sales = await this.salesByKey(companyCode, days);

    const keep: CleanupItem[] = [];
    const close: CleanupItem[] = [];
    let outOfStock = 0;
    for (const listing of listings) {
      const barcode = this.text(listing.barcode);
      if (!barcode) continue;
      const quantity = Number(listing.quantity ?? 0);
      if (quantity <= 0 || listing.archived === true || listing.locked === true) {
        outOfStock += 1;
        continue;
      }
      const stockCode = this.text(listing.stockCode) || this.text(listing.productMainId) || null;
      const sold = this.lookupSales(sales, [barcode, stockCode]);
      const item: CleanupItem = {
        barcode,
        title: this.text(listing.title) || barcode,
        stockCode,
        salePrice: Number(listing.salePrice ?? 0),
        listPrice: Number(listing.listPrice ?? listing.salePrice ?? 0),
        quantity,
        soldQuantity: sold.quantity,
        orderCount: sold.orders,
        productUrl: this.text(listing.productUrl) || null,
      };
      (sold.quantity >= minSold ? keep : close).push(item);
    }
    keep.sort((a, b) => b.soldQuantity - a.soldQuantity);
    close.sort((a, b) => a.title.localeCompare(b.title, 'tr'));

    return {
      companyCode,
      days,
      minSold,
      totalListings: listings.length,
      onSale: keep.length + close.length,
      alreadyClosed: outOfStock,
      keep,
      close,
      confirmText: CLEANUP_CONFIRM_TEXT,
    };
  }

  async cleanupApply(body: { companyCode?: unknown; items?: Array<{ barcode?: unknown; stockCode?: unknown; salePrice?: unknown; listPrice?: unknown }>; platforms?: unknown; confirmText?: unknown }, userId: number) {
    const companyCode = this.company(body.companyCode);
    if (this.text(body.confirmText).toUpperCase() !== CLEANUP_CONFIRM_TEXT) {
      throw new BadRequestException(`Onay için "${CLEANUP_CONFIRM_TEXT}" yazılmalıdır.`);
    }
    const items = (Array.isArray(body.items) ? body.items : [])
      .map((item) => {
        const salePrice = Number(item.salePrice ?? 0);
        const listPrice = Math.max(Number(item.listPrice ?? 0), salePrice);
        return { barcode: this.text(item.barcode), stockCode: this.text(item.stockCode) || null, salePrice, listPrice };
      })
      .filter((item) => item.barcode && item.salePrice > 0);
    if (items.length === 0) throw new BadRequestException('Kapatılacak ürün seçilmedi.');
    if (items.length > 5000) throw new BadRequestException('Tek seferde en fazla 5000 ürün kapatılabilir.');
    const platforms = this.platforms(body.platforms);

    const results: Array<{ platform: IntegrationPlatform; ok: boolean; message: string; closed: number; skipped: number }> = [];
    for (const platform of platforms) {
      try {
        results.push(await this.closeOnPlatform(platform, companyCode, items));
      } catch (error) {
        results.push({ platform, ok: false, message: this.errorMessage(error), closed: 0, skipped: 0 });
      }
    }

    // ERP'de pasife al: ürün kaydı/toplu gönderim bu ürünleri tekrar satışa açmasın.
    const plainBarcodes = items.map((item) => this.stripStorePrefix(item.barcode));
    const passivated = companyCode === 'ERHAN'
      ? (await this.prisma.trendyolProductVariant.updateMany({ where: { barcode: { in: plainBarcodes }, status: 'ACTIVE' }, data: { status: 'PASSIVE' } })).count
      : 0;

    await this.log('CATALOG_CLEANUP', results.every((item) => item.ok) ? 'SUCCESS' : 'PARTIAL', `${companyCode}: ${items.length} ürün satışa kapatıldı.`, {
      companyCode, userId, platforms, count: items.length, passivated, results, barcodes: items.map((item) => item.barcode).slice(0, 500),
    });

    return { companyCode, requested: items.length, passivated, results };
  }

  private async closeOnPlatform(platform: IntegrationPlatform, companyCode: string, items: Array<{ barcode: string; stockCode: string | null; salePrice: number; listPrice: number }>) {
    const credentials = await this.integrationCenter.storeCredentials(platform, companyCode);
    if (platform === 'TRENDYOL') {
      const adapter = new TrendyolAdapter(credentials);
      const result = await adapter.pushInventoryBatch(items.map((item) => ({ barcode: item.barcode, quantity: 0, salePrice: item.salePrice, listPrice: item.listPrice })));
      return { platform, ok: result.ok, message: result.message, closed: result.ok ? items.length : 0, skipped: 0 };
    }

    // N11/Hepsiburada: yalnızca ERP'de kaydı olan (o platformda yayınlanmış) ürünler kapatılır;
    // N11'in fiyat uç noktası ürün oluşturabildiği için bilinmeyen barkodlarla çağrı yapılmaz.
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { barcode: { in: items.map((item) => this.stripStorePrefix(item.barcode)) } },
      select: { barcode: true, proposedModelCode: true, currentModelCode: true, n11SalePrice: true, hepsiburadaSalePrice: true, trendyolSalePrice: true },
    });
    const prefix = companyCode === 'ERHAN' ? '' : 'FL-';
    const adapter = platform === 'N11' ? new N11Adapter(credentials) : new HepsiburadaAdapter(credentials);
    let closed = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const variant of variants) {
      const modelCode = variant.proposedModelCode || variant.currentModelCode;
      const price = Number(platform === 'N11' ? variant.n11SalePrice : variant.hepsiburadaSalePrice) || Number(variant.trendyolSalePrice) || 0;
      if (platform === 'N11' && !price) continue;
      const payload = {
        barcode: variant.barcode,
        modelCode: modelCode ? `${prefix}${modelCode}` : undefined,
        // Hepsiburada'da fiyat gönderilmezse sadece stok güncellenir.
        salePrice: platform === 'N11' ? price : undefined,
        stockQuantity: 0,
      };
      try {
        const result = await adapter.pushPrice(payload);
        if (result.ok) closed += 1;
        else {
          failed += 1;
          if (errors.length < 5) errors.push(`${variant.barcode}: ${result.message}`);
        }
      } catch (error) {
        failed += 1;
        if (errors.length < 5) errors.push(`${variant.barcode}: ${this.errorMessage(error)}`);
      }
    }
    const skipped = Math.max(items.length - closed - failed, 0);
    return {
      platform,
      ok: failed === 0,
      message: failed
        ? `${closed} ürün kapatıldı, ${failed} ürün kapatılamadı: ${errors.join(' | ')}`
        : `${closed} ürün stok 0 yapıldı (${skipped} ürün bu platformda ERP kaydı olmadığı için atlandı).`,
      closed,
      skipped,
    };
  }

  // ---------- 2) En çok satanlar + fiyat önerisi ----------

  async bestsellers(query: { keywords?: unknown; limit?: unknown; discountPercent?: unknown; minMarginPercent?: unknown; days?: unknown }) {
    const limit = this.clampInt(query.limit, 20, 5, 48);
    const discountPercent = this.clampNumber(query.discountPercent, 5, 0, 50);
    const minMarginPercent = this.clampNumber(query.minMarginPercent, 25, 0, 300);
    const days = this.clampInt(query.days, 90, 7, 365);

    let keywords = this.text(query.keywords).split(',').map((item) => item.trim()).filter(Boolean);
    if (keywords.length === 0) {
      const saved = await this.prisma.competitorKeyword.findMany({ where: { isActive: true }, orderBy: { id: 'asc' }, take: 10 });
      keywords = saved.map((item) => item.keyword);
    }
    if (keywords.length === 0) keywords = ['yapay çiçek', 'yapay ağaç', 'yapay orkide'];
    keywords = Array.from(new Set(keywords)).slice(0, 10);

    const market = new Map<string, Record<string, unknown>>();
    const failedKeywords: string[] = [];
    for (const keyword of keywords) {
      const products = await this.scraper.searchTopProducts(keyword, limit).catch(() => []);
      if (products.length === 0) failedKeywords.push(keyword);
      for (const product of products) {
        const key = product.trendyolProductId || product.productUrl || `${keyword}-${product.rank}`;
        const score = Math.round(product.ratingCount + product.favoriteCount * 0.05 + (limit - product.rank + 1) * 3);
        const current = market.get(key);
        if (current && Number(current.score) >= score) continue;
        market.set(key, {
          keyword,
          rank: product.rank,
          productName: product.productName,
          brand: product.brand,
          productUrl: product.productUrl,
          price: product.priceCurrent,
          ratingAverage: product.ratingAverage,
          ratingCount: product.ratingCount,
          favoriteCount: product.favoriteCount,
          freeCargo: product.freeCargo,
          score,
          suggestedPrice: this.psychPrice(product.priceCurrent * (1 - discountPercent / 100)),
        });
      }
    }

    const marketList = Array.from(market.values()).sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 100);
    const own = await this.ownBestsellers(days, minMarginPercent, discountPercent, marketList);

    return { keywords, failedKeywords, discountPercent, minMarginPercent, days, market: marketList, own };
  }

  private async ownBestsellers(days: number, minMarginPercent: number, discountPercent: number, market: Array<Record<string, unknown>>) {
    const rows = await this.prisma.$queryRaw<Array<{ key: string; productName: string; quantity: number; orders: number; floraQuantity: number }>>`
      SELECT
        COALESCE(NULLIF(i.barcode, ''), i.sku) AS key,
        MAX(i.product_name) AS "productName",
        SUM(i.quantity)::float AS quantity,
        COUNT(DISTINCT o.id)::int AS orders,
        SUM(CASE WHEN o.external_order_id LIKE 'FLORA\\_%' THEN i.quantity ELSE 0 END)::float AS "floraQuantity"
      FROM marketplace_order_items i
      JOIN marketplace_orders o ON o.id = i.order_id
      WHERE COALESCE(o.order_date, o.created_at) >= NOW() - make_interval(days => ${days}::int)
        AND o.status !~* '(cancel|iptal|return|iade|undeliver)'
        AND COALESCE(NULLIF(i.barcode, ''), i.sku) IS NOT NULL
      GROUP BY 1
      ORDER BY 3 DESC
      LIMIT 150
    `;
    const merged = new Map<string, { productName: string; quantity: number; orders: number; floraQuantity: number }>();
    for (const row of rows) {
      const key = this.stripStorePrefix(row.key);
      const current = merged.get(key) ?? { productName: row.productName, quantity: 0, orders: 0, floraQuantity: 0 };
      current.quantity += Number(row.quantity);
      current.orders += Number(row.orders);
      current.floraQuantity += Number(row.floraQuantity);
      merged.set(key, current);
    }

    const keys = Array.from(merged.keys());
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { OR: [{ barcode: { in: keys } }, { currentModelCode: { in: keys } }, { proposedModelCode: { in: keys } }] },
      include: { productCostDraft: true },
    });
    const byKey = new Map<string, (typeof variants)[number]>();
    for (const variant of variants) {
      for (const key of [variant.barcode, variant.currentModelCode, variant.proposedModelCode]) if (key) byKey.set(key, variant);
    }

    const result = [];
    const seenVariant = new Set<number>();
    for (const [key, sale] of merged) {
      const variant = byKey.get(key);
      if (variant && seenVariant.has(variant.id)) continue;
      if (variant) seenVariant.add(variant.id);
      const cost = Number(variant?.productCostDraft?.totalCost ?? 0);
      const commission = Number(variant?.commissionPercent ?? 20);
      const floorPrice = cost > 0 ? this.psychPrice((cost * (1 + minMarginPercent / 100)) / Math.max(0.05, 1 - commission / 100), true) : null;
      const competitor = this.closestCompetitor(variant?.productName ?? sale.productName, market);
      const competitorPrice = competitor ? Number(competitor.price) : null;
      const target = competitorPrice ? this.psychPrice(competitorPrice * (1 - discountPercent / 100)) : Number(variant?.trendyolSalePrice ?? 0) || null;
      const suggestedPrice = floorPrice && target ? Math.max(floorPrice, target) : (target ?? floorPrice);
      result.push({
        key,
        variantId: variant?.id ?? null,
        status: variant?.status ?? null,
        productName: variant?.productName ?? sale.productName,
        soldQuantity: sale.quantity,
        floraSoldQuantity: sale.floraQuantity,
        orderCount: sale.orders,
        currentPrice: variant ? Number(variant.trendyolSalePrice) : null,
        cost: cost || null,
        commissionPercent: commission,
        floorPrice,
        competitorPrice,
        competitorName: competitor ? String(competitor.productName) : null,
        competitorUrl: competitor ? (competitor.productUrl as string | null) : null,
        suggestedPrice,
        imageReady: Array.isArray(variant?.images) ? (variant!.images as unknown[]).length > 0 : false,
      });
      if (result.length >= 60) break;
    }
    return result;
  }

  // ---------- 3) İki mağazaya aynı anda açma ----------

  async publishToStores(body: { items?: Array<{ variantId?: unknown; salePrice?: unknown }>; platforms?: unknown; stores?: StorePublishOption[]; allowIncomplete?: unknown }, userId: number) {
    const items = (Array.isArray(body.items) ? body.items : [])
      .map((item) => ({ variantId: Number(item.variantId), salePrice: Number(item.salePrice ?? 0) }))
      .filter((item) => Number.isInteger(item.variantId) && item.variantId > 0);
    if (items.length === 0) throw new BadRequestException('Mağazalara açılacak ürün seçilmedi.');
    if (items.length > 200) throw new BadRequestException('Tek seferde en fazla 200 ürün açılabilir.');

    // Seçilen fiyatı ERP'ye işle (tek fiyat politikası: tüm pazaryerleri aynı taban fiyat),
    // pasife alınmış ürünleri tekrar aktif et.
    for (const item of items) {
      const price = item.salePrice > 0 ? Math.round(item.salePrice * 100) / 100 : null;
      await this.prisma.trendyolProductVariant.update({
        where: { id: item.variantId },
        data: price ? { status: 'ACTIVE', trendyolSalePrice: price, n11SalePrice: price, hepsiburadaSalePrice: price } : { status: 'ACTIVE' },
      });
    }

    return this.publishing.sendToStores(items.map((item) => item.variantId), userId, {
      platforms: this.platforms(body.platforms),
      stores: body.stores,
      allowIncomplete: body.allowIncomplete === true,
    });
  }

  // ---------- yardımcılar ----------

  private async salesByKey(companyCode: string, days: number) {
    const floraPattern = 'FLORA\\_%';
    const rows = companyCode === 'FLORA'
      ? await this.prisma.$queryRaw<Array<{ key: string; quantity: number; orders: number }>>`
          SELECT k.key, SUM(k.quantity)::float AS quantity, COUNT(DISTINCT k.order_id)::int AS orders FROM (
            SELECT i.barcode AS key, i.quantity, o.id AS order_id FROM marketplace_order_items i JOIN marketplace_orders o ON o.id = i.order_id
            WHERE o.external_order_id LIKE ${floraPattern} AND COALESCE(o.order_date, o.created_at) >= NOW() - make_interval(days => ${days}::int) AND o.status !~* '(cancel|iptal|return|iade|undeliver)'
            UNION ALL
            SELECT i.sku AS key, i.quantity, o.id FROM marketplace_order_items i JOIN marketplace_orders o ON o.id = i.order_id
            WHERE o.external_order_id LIKE ${floraPattern} AND COALESCE(o.order_date, o.created_at) >= NOW() - make_interval(days => ${days}::int) AND o.status !~* '(cancel|iptal|return|iade|undeliver)' AND i.sku IS DISTINCT FROM i.barcode
          ) k WHERE k.key IS NOT NULL AND k.key <> '' GROUP BY k.key`
      : await this.prisma.$queryRaw<Array<{ key: string; quantity: number; orders: number }>>`
          SELECT k.key, SUM(k.quantity)::float AS quantity, COUNT(DISTINCT k.order_id)::int AS orders FROM (
            SELECT i.barcode AS key, i.quantity, o.id AS order_id FROM marketplace_order_items i JOIN marketplace_orders o ON o.id = i.order_id
            WHERE o.external_order_id NOT LIKE ${floraPattern} AND COALESCE(o.order_date, o.created_at) >= NOW() - make_interval(days => ${days}::int) AND o.status !~* '(cancel|iptal|return|iade|undeliver)'
            UNION ALL
            SELECT i.sku AS key, i.quantity, o.id FROM marketplace_order_items i JOIN marketplace_orders o ON o.id = i.order_id
            WHERE o.external_order_id NOT LIKE ${floraPattern} AND COALESCE(o.order_date, o.created_at) >= NOW() - make_interval(days => ${days}::int) AND o.status !~* '(cancel|iptal|return|iade|undeliver)' AND i.sku IS DISTINCT FROM i.barcode
          ) k WHERE k.key IS NOT NULL AND k.key <> '' GROUP BY k.key`;
    const map = new Map<string, { quantity: number; orders: number }>();
    for (const row of rows) {
      const key = this.stripStorePrefix(row.key).toUpperCase();
      const current = map.get(key) ?? { quantity: 0, orders: 0 };
      current.quantity += Number(row.quantity);
      current.orders += Number(row.orders);
      map.set(key, current);
    }
    return map;
  }

  private lookupSales(sales: Map<string, { quantity: number; orders: number }>, keys: Array<string | null>) {
    let best = { quantity: 0, orders: 0 };
    for (const key of keys) {
      if (!key) continue;
      const found = sales.get(this.stripStorePrefix(key).toUpperCase());
      if (found && found.quantity > best.quantity) best = found;
    }
    return best;
  }

  private closestCompetitor(name: string, market: Array<Record<string, unknown>>) {
    const tokens = this.tokens(name);
    if (tokens.size === 0) return null;
    let best: Record<string, unknown> | null = null;
    let bestScore = 0;
    for (const item of market) {
      const other = this.tokens(String(item.productName ?? ''));
      let common = 0;
      for (const token of tokens) if (other.has(token)) common += 1;
      const score = common / Math.max(tokens.size, 1);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return bestScore >= 0.5 ? best : null;
  }

  private tokens(text: string) {
    const stop = new Set(['yapay', 'cicek', 'çiçek', 've', 'ile', 'icin', 'için', 'cm', 'adet', 'li', 'lı', 'saksı', 'saksi', 'dekoratif']);
    return new Set(
      text.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9 ]/gi, ' ').split(/\s+/).filter((token) => token.length > 2 && !stop.has(token)),
    );
  }

  // Fiyatı ,90 ile biten tutara çevirir: 437.30 → 436.90 (aşağı) / 437.90 (yukarı, taban fiyat için).
  private psychPrice(value: number, roundUp = false) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    let candidate = Math.floor(value) + 0.9;
    if (roundUp && candidate < value) candidate += 1;
    if (!roundUp && candidate > value) candidate -= 1;
    return Math.max(0.9, Math.round(candidate * 100) / 100);
  }

  private stripStorePrefix(value: string) {
    const text = this.text(value);
    for (const prefix of STORE_BARCODE_PREFIXES) if (text.toUpperCase().startsWith(prefix)) return text.slice(prefix.length);
    return text;
  }

  private company(value: unknown) {
    const code = this.text(value).toUpperCase() || 'ERHAN';
    if (!(STORE_CODES as readonly string[]).includes(code)) throw new BadRequestException('Mağaza ERHAN veya FLORA olmalıdır.');
    return code;
  }

  private platforms(value: unknown): IntegrationPlatform[] {
    const list = Array.isArray(value) ? value.map((item) => this.text(item).toUpperCase()) : [];
    const selected = CLOSE_PLATFORMS.filter((platform) => list.includes(platform));
    return selected.length > 0 ? selected : ['TRENDYOL'];
  }

  private async log(action: string, status: string, message: string, payload: unknown) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO integration_sync_logs (platform, action, status, message, completed_at, payload_summary)
        VALUES ('CATALOG', ${action}, ${status}, ${message}, NOW(), ${JSON.stringify(payload)}::jsonb)
      `;
    } catch (error) {
      this.logger.warn(`Katalog log yazılamadı: ${this.errorMessage(error)}`);
    }
  }

  private clampInt(value: unknown, fallback: number, min: number, max: number) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && String(value ?? '') !== '' ? Math.min(max, Math.max(min, number)) : fallback;
  }

  private clampNumber(value: unknown, fallback: number, min: number, max: number) {
    const number = Number(value);
    return Number.isFinite(number) && String(value ?? '') !== '' ? Math.min(max, Math.max(min, number)) : fallback;
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
