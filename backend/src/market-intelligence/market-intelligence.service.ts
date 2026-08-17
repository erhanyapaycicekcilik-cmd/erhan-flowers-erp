import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { TrendyolScraperService, ScrapedCompetitorProduct } from './trendyol-scraper.service';

const DEFAULT_KEYWORDS: Record<string, string> = {
  'Ağaçlar': 'yapay ağaç',
  'Bambu Saksılı': 'bambu saksılı yapay ağaç',
  'Bambu Tekli': 'yapay bambu',
  'Çiçekler': 'yapay çiçek',
  'Dikey Bahçe': 'yapay dikey bahçe',
  'Saksılar': 'dekoratif saksı',
};

const OUR_BRAND_MARKER = 'erhan flowers';
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

type KeywordComparison = {
  keyword: string;
  categoryName: string | null;
  rivalCount: number;
  rivalAvgPrice: number;
  rivalAvgRating: number | null;
  rivalFreeCargoPercent: number;
  rivalTopPromotions: string[];
  topRival: { name: string; brand: string | null; price: number; rating: number | null; ratingCount: number; promotions: string[] } | null;
  ourListingFound: boolean;
  ourRank: number | null;
  ourPrice: number | null;
  ourRating: number | null;
};

@Injectable()
export class MarketIntelligenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketIntelligenceService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: TrendyolScraperService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.ensureDefaultKeywords()
      .then(() => this.generateDailyReport().catch((error) => this.logger.error(`İlk pazar analizi başarısız: ${(error as Error).message}`)))
      .catch((error) => this.logger.error(`Varsayılan anahtar kelimeler oluşturulamadı: ${(error as Error).message}`));

    this.timer = setInterval(() => {
      this.generateDailyReport().catch((error) => this.logger.error(`Günlük pazar analizi başarısız: ${(error as Error).message}`));
    }, DAILY_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async ensureDefaultKeywords() {
    const existing = await this.prisma.competitorKeyword.count();
    if (existing > 0) return;
    const categories = await this.prisma.category.findMany({ select: { id: true, name: true } });
    const rows = categories
      .filter((category) => DEFAULT_KEYWORDS[category.name])
      .map((category) => ({ keyword: DEFAULT_KEYWORDS[category.name], categoryId: category.id }));
    if (!rows.length) return;
    await this.prisma.competitorKeyword.createMany({ data: rows, skipDuplicates: true });
    this.logger.log(`Varsayılan ${rows.length} rakip takip anahtar kelimesi oluşturuldu.`);
  }

  async listKeywords() {
    return this.prisma.competitorKeyword.findMany({ include: { category: { select: { name: true } } }, orderBy: { id: 'asc' } });
  }

  async addKeyword(keyword: string, categoryId?: number | null) {
    const clean = String(keyword ?? '').trim();
    if (!clean) throw new Error('Anahtar kelime zorunludur.');
    return this.prisma.competitorKeyword.create({ data: { keyword: clean, categoryId: categoryId ?? null } });
  }

  async setKeywordActive(id: number, isActive: boolean) {
    return this.prisma.competitorKeyword.update({ where: { id }, data: { isActive } });
  }

  async deleteKeyword(id: number) {
    await this.prisma.competitorKeyword.delete({ where: { id } });
    return { ok: true };
  }

  async getTodayReport() {
    const today = this.dateOnly(new Date());
    return this.prisma.marketInsightReport.findUnique({ where: { reportDate: today } });
  }

  async getReportHistory(limit = 30) {
    return this.prisma.marketInsightReport.findMany({ orderBy: { reportDate: 'desc' }, take: limit });
  }

  async generateDailyReport() {
    const keywords = await this.prisma.competitorKeyword.findMany({ where: { isActive: true }, include: { category: true } });
    if (!keywords.length) {
      this.logger.warn('Aktif rakip takip anahtar kelimesi yok, analiz atlandı.');
      return null;
    }

    const comparisons: KeywordComparison[] = [];
    for (const keyword of keywords) {
      const products = await this.scraper.searchTopProducts(keyword.keyword, 15);
      if (products.length) {
        await this.prisma.competitorSnapshot.createMany({
          data: products.map((product) => ({
            keywordId: keyword.id,
            rank: product.rank,
            trendyolProductId: product.trendyolProductId,
            sellerName: product.sellerName,
            productName: product.productName,
            brand: product.brand,
            priceCurrent: product.priceCurrent,
            priceOriginal: product.priceOriginal,
            ratingAverage: product.ratingAverage,
            ratingCount: product.ratingCount,
            favoriteCount: product.favoriteCount,
            imageCount: product.imageCount,
            freeCargo: product.freeCargo,
            promotions: product.promotions,
            productUrl: product.productUrl,
            raw: product.raw as any,
          })),
        });
      }
      comparisons.push(this.buildComparison(keyword.keyword, keyword.category?.name ?? null, products));
      // Trendyol'a art arda çok hızlı istek atmamak için kısa bir bekleme.
      await this.sleep(1500);
    }

    const insight = await this.generateInsightWithAi(comparisons);
    const today = this.dateOnly(new Date());
    return this.prisma.marketInsightReport.upsert({
      where: { reportDate: today },
      create: {
        reportDate: today,
        summary: insight.summary,
        strengths: insight.strengths,
        weaknesses: insight.weaknesses,
        suggestions: insight.suggestions,
        comparison: comparisons as any,
      },
      update: {
        summary: insight.summary,
        strengths: insight.strengths,
        weaknesses: insight.weaknesses,
        suggestions: insight.suggestions,
        comparison: comparisons as any,
        generatedAt: new Date(),
      },
    });
  }

  private buildComparison(keyword: string, categoryName: string | null, products: ScrapedCompetitorProduct[]): KeywordComparison {
    const ourEntry = products.find((product) => this.isOurListing(product));
    const rivals = products.filter((product) => !this.isOurListing(product));
    const rivalAvgPrice = rivals.length ? rivals.reduce((sum, p) => sum + (p.priceCurrent || p.priceOriginal), 0) / rivals.length : 0;
    const ratedRivals = rivals.filter((p) => p.ratingAverage != null);
    const rivalAvgRating = ratedRivals.length ? ratedRivals.reduce((sum, p) => sum + (p.ratingAverage ?? 0), 0) / ratedRivals.length : null;
    const rivalFreeCargoPercent = rivals.length ? Math.round((rivals.filter((p) => p.freeCargo).length / rivals.length) * 100) : 0;
    const promotionCounts = new Map<string, number>();
    rivals.forEach((p) => p.promotions.forEach((promo) => promotionCounts.set(promo, (promotionCounts.get(promo) ?? 0) + 1)));
    const rivalTopPromotions = [...promotionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
    const topRival = rivals[0]
      ? {
          name: rivals[0].productName,
          brand: rivals[0].brand,
          price: rivals[0].priceCurrent || rivals[0].priceOriginal,
          rating: rivals[0].ratingAverage,
          ratingCount: rivals[0].ratingCount,
          promotions: rivals[0].promotions,
        }
      : null;

    return {
      keyword,
      categoryName,
      rivalCount: rivals.length,
      rivalAvgPrice: Math.round(rivalAvgPrice * 100) / 100,
      rivalAvgRating: rivalAvgRating != null ? Math.round(rivalAvgRating * 100) / 100 : null,
      rivalFreeCargoPercent,
      rivalTopPromotions,
      topRival,
      ourListingFound: Boolean(ourEntry),
      ourRank: ourEntry?.rank ?? null,
      ourPrice: ourEntry ? ourEntry.priceCurrent || ourEntry.priceOriginal : null,
      ourRating: ourEntry?.ratingAverage ?? null,
    };
  }

  private isOurListing(product: ScrapedCompetitorProduct) {
    const brand = (product.brand ?? '').toLowerCase();
    const name = (product.sellerName ?? '').toLowerCase();
    return brand.includes(OUR_BRAND_MARKER) || name.includes(OUR_BRAND_MARKER);
  }

  private async generateInsightWithAi(comparisons: KeywordComparison[]) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      return this.fallbackInsight(comparisons, 'Gemini API anahtarı tanımlı değil, otomatik özet üretilemedi.');
    }
    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.6-flash';
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: this.prompt(comparisons),
        config: { responseMimeType: 'application/json' },
      });
      return this.parseInsight(response.text ?? '');
    } catch (error) {
      this.logger.error(`Gemini pazar analizi başarısız: ${(error as Error).message}`);
      return this.fallbackInsight(comparisons, 'AI özeti şu anda üretilemedi, ham karşılaştırma verisine bakınız.');
    }
  }

  private prompt(comparisons: KeywordComparison[]) {
    return [
      'Sen Erhan Flowers (yapay çiçek/ağaç/saksı e-ticaret) firmasının Trendyol pazaryeri danışmanısın.',
      'Aşağıda bugün Trendyol arama sonuçlarından toplanan kategori bazlı rakip karşılaştırma verisi var.',
      'Yalnızca geçerli JSON döndür, markdown veya kod bloğu kullanma.',
      'JSON şeması: {"summary":"...", "strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."]}',
      '- summary: 2-3 cümlelik günlük genel durum özeti (Türkçe).',
      '- strengths: rakiplerin doğru yaptığı, bizim de öğrenmemiz gereken somut şeyler (madde madde, 3-6 madde).',
      '- weaknesses: bizim muhtemelen hata yaptığımız / eksik olduğumuz noktalar (madde madde, 3-6 madde). "ourListingFound":false olan kategorilerde görünürlük sorununu mutlaka vurgula.',
      '- suggestions: bugün yapılabilecek somut, uygulanabilir satış artırma önerileri (madde madde, 4-8 madde). Fiyat, kampanya, ücretsiz kargo, görsel sayısı gibi verilerden yararlan.',
      'Genel geçer tavsiyeler yerine verideki somut sayılara (fiyat farkı, kampanya adı, sıra numarası) atıfta bulun.',
      '',
      `VERİ: ${JSON.stringify(comparisons)}`,
    ].join('\n');
  }

  private parseInsight(text: string) {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as { summary?: string; strengths?: string[]; weaknesses?: string[]; suggestions?: string[] };
      return {
        summary: parsed.summary || 'Özet üretilemedi.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch {
      return this.fallbackInsight([], 'AI yanıtı ayrıştırılamadı.');
    }
  }

  private fallbackInsight(comparisons: KeywordComparison[], reason: string) {
    const missingVisibility = comparisons.filter((c) => !c.ourListingFound).map((c) => c.keyword);
    return {
      summary: reason,
      strengths: [] as string[],
      weaknesses: missingVisibility.length ? [`Şu anahtar kelimelerde ilk sayfada görünmüyoruz: ${missingVisibility.join(', ')}`] : [],
      suggestions: [] as string[],
    };
  }

  private dateOnly(date: Date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
