import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type ScrapedCompetitorProduct = {
  rank: number;
  trendyolProductId: string;
  sellerName: string | null;
  productName: string;
  brand: string | null;
  priceCurrent: number;
  priceOriginal: number;
  ratingAverage: number | null;
  ratingCount: number;
  favoriteCount: number;
  imageCount: number;
  freeCargo: boolean;
  promotions: string[];
  productUrl: string | null;
  raw: Record<string, unknown>;
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PROPS_KEY = '__single-search-result__PROPS';

// Trendyol'un arama sonucu sayfası, sonuçları sunucu tarafında
// `window["__single-search-result__PROPS"] = {...}` içine gömerek üretiyor.
// Bu, herkese açık HTML üzerinden okunabilen bir veri; ekstra kimlik doğrulama gerekmiyor.
@Injectable()
export class TrendyolScraperService {
  private readonly logger = new Logger(TrendyolScraperService.name);

  async searchTopProducts(keyword: string, limit = 10): Promise<ScrapedCompetitorProduct[]> {
    const html = await this.fetchHtml(keyword);
    if (!html) return [];
    const props = this.extractProps(html);
    const products = Array.isArray(props?.data?.products) ? (props.data.products as Record<string, unknown>[]) : [];
    return products.slice(0, limit).map((product, index) => this.mapProduct(product, index + 1));
  }

  // Node'un yerleşik fetch()'i (undici), Cloudflare'in Trendyol önünde çalışan
  // bot korumasına takılıyor (TLS parmak izi farkı); sistem curl.exe ile aynı
  // istek gerçek tarayıcı gibi geçiyor. Bu yüzden fetch yerine curl kullanılıyor.
  private async fetchHtml(keyword: string): Promise<string | null> {
    const url = `https://www.trendyol.com/sr?q=${encodeURIComponent(keyword)}`;
    try {
      const { stdout } = await execFileAsync(
        'curl',
        ['-s', '-A', USER_AGENT, '-H', 'Accept-Language: tr-TR,tr;q=0.9', url],
        { maxBuffer: 1024 * 1024 * 20, timeout: 20000 },
      );
      return stdout;
    } catch (error) {
      this.logger.warn(`Trendyol arama sayfası alınamadı. keyword=${keyword} error=${(error as Error).message}`);
      return null;
    }
  }

  private extractProps(html: string): { data?: { products?: unknown[] } } | null {
    const marker = `window["${PROPS_KEY}"]=`;
    const start = html.indexOf(marker);
    if (start === -1) return null;
    const jsonStart = start + marker.length;
    const jsonText = this.extractBalancedJson(html, jsonStart);
    if (!jsonText) return null;
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      this.logger.warn(`Trendyol JSON parse hatası: ${(error as Error).message}`);
      return null;
    }
  }

  // İlk "{" karakterinden başlayarak, string içi kaçış karakterlerini dikkate alan
  // basit bir parantez dengeleme taraması ile objenin tam sınırını bulur.
  private extractBalancedJson(html: string, startIndex: number): string | null {
    let i = startIndex;
    while (i < html.length && html[i] !== '{') i++;
    if (i >= html.length) return null;
    const objectStart = i;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; i < html.length; i++) {
      const char = html[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return html.slice(objectStart, i + 1);
        }
      }
    }
    return null;
  }

  private mapProduct(product: Record<string, unknown>, rank: number): ScrapedCompetitorProduct {
    const price = (product.price ?? {}) as Record<string, unknown>;
    const rating = (product.ratingScore ?? {}) as Record<string, unknown>;
    const socialProof = Array.isArray(product.socialProof) ? (product.socialProof as Record<string, unknown>[]) : [];
    const favoriteEntry = socialProof.find((entry) => entry.key === 'favoriteCount');
    const promotions = Array.isArray(product.promotions)
      ? (product.promotions as Record<string, unknown>[]).map((promo) => String(promo.name ?? promo.shortName ?? '')).filter(Boolean)
      : [];
    const images = Array.isArray(product.images) ? product.images : [];

    return {
      rank,
      trendyolProductId: String(product.contentId ?? product.id ?? ''),
      sellerName: this.text(product.brand) || null,
      productName: this.text(product.name) || 'Bilinmeyen ürün',
      brand: this.text(product.brand) || null,
      priceCurrent: this.number(price.discountedPrice ?? price.current),
      priceOriginal: this.number(price.originalPrice ?? price.current),
      ratingAverage: rating.averageRating != null ? this.number(rating.averageRating) : null,
      ratingCount: this.number(rating.totalCount),
      favoriteCount: this.parseFavoriteCount(favoriteEntry?.value),
      imageCount: images.length,
      freeCargo: Boolean(product.freeCargo),
      promotions,
      productUrl: product.url ? `https://www.trendyol.com${this.text(product.url)}` : null,
      raw: product,
    };
  }

  private parseFavoriteCount(value: unknown): number {
    const text = this.text(value);
    if (!text) return 0;
    const match = text.match(/^([\d.,]+)\s*(K|B)?$/i);
    if (!match) return this.number(text.replace(/[^\d]/g, ''));
    const base = Number(match[1].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(base)) return 0;
    if (match[2]?.toUpperCase() === 'K') return Math.round(base * 1000);
    if (match[2]?.toUpperCase() === 'B') return Math.round(base * 1_000_000_000);
    return Math.round(base);
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private number(value: unknown) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
}
