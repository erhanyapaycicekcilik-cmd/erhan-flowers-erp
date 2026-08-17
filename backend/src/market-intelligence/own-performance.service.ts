import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { TrendyolScraperService } from './trendyol-scraper.service';

@Injectable()
export class OwnPerformanceService {
  private readonly logger = new Logger(OwnPerformanceService.name);
  private syncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: TrendyolScraperService,
    private readonly config: ConfigService,
  ) {}

  // Uzun sürebileceği (yüzlerce ürün sayfası) için arka planda, HTTP isteğini
  // bekletmeden çalışır; çağıran taraf hemen "başladı" cevabı alır.
  triggerSync(limit?: number) {
    if (this.syncing) return { started: false, message: 'Senkronizasyon zaten çalışıyor.' };
    this.syncing = true;
    this.runSync(limit)
      .catch((error) => this.logger.error(`Ürün performans senkronizasyonu başarısız: ${(error as Error).message}`))
      .finally(() => {
        this.syncing = false;
      });
    return { started: true, message: 'Senkronizasyon arka planda başladı.' };
  }

  private async runSync(limit?: number) {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { trendyolProductUrl: { not: null } },
      select: { id: true, trendyolProductUrl: true },
      orderBy: { trendyolStatsSyncedAt: 'asc' },
      take: limit ?? 5000,
    });

    let updated = 0;
    for (const variant of variants) {
      const stats = await this.scraper.fetchOwnProductStats(variant.trendyolProductUrl!);
      if (stats) {
        await this.prisma.trendyolProductVariant.update({
          where: { id: variant.id },
          data: {
            trendyolRatingAverage: stats.ratingAverage,
            trendyolRatingCount: stats.ratingCount,
            trendyolCommentCount: stats.commentCount,
            trendyolFavoriteCount: stats.favoriteCount,
            trendyolStatsSyncedAt: new Date(),
          },
        });
        updated++;
      }
      await this.sleep(600);
    }
    this.logger.log(`Ürün performans senkronizasyonu tamamlandı: ${updated}/${variants.length}`);
  }

  syncStatus() {
    return { syncing: this.syncing };
  }

  async getTopFavorited(limit = 100) {
    return this.prisma.trendyolProductVariant.findMany({
      where: { trendyolStatsSyncedAt: { not: null } },
      orderBy: [{ trendyolFavoriteCount: 'desc' }, { trendyolRatingCount: 'desc' }],
      take: limit,
      select: {
        id: true,
        barcode: true,
        productName: true,
        currentModelCode: true,
        trendyolProductUrl: true,
        trendyolRatingAverage: true,
        trendyolRatingCount: true,
        trendyolCommentCount: true,
        trendyolFavoriteCount: true,
        trendyolStatsSyncedAt: true,
      },
    });
  }

  async getTopSellers(limit = 100) {
    return this.prisma.$queryRaw<Array<{ barcode: string; productName: string; totalQuantity: number; orderCount: number }>>`
      SELECT i.barcode, MAX(i.product_name_snapshot) AS "productName", SUM(i.quantity)::float AS "totalQuantity", COUNT(DISTINCT i.sale_id)::int AS "orderCount"
      FROM retail_sale_items i
      JOIN retail_sales s ON s.id = i.sale_id
      WHERE s.channel = 'TRENDYOL' AND i.barcode IS NOT NULL
      GROUP BY i.barcode
      ORDER BY SUM(i.quantity) DESC
      LIMIT ${limit}
    `;
  }

  // "Hepsini tek tek düzeltmek yerine silme/komple değişim mi?" sorusuna veri
  // temelli cevap vermek için: canlı, sıfır ilgi gören (satış+yorum+favori=0)
  // ürün oranını hesaplar ve Gemini ile Türkçe bir strateji önerisi üretir.
  async getDeadZoneAnalysis() {
    const [totalActive, statsCount, deadZone, topFavorited, topSellers] = await Promise.all([
      this.prisma.trendyolProductVariant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.trendyolProductVariant.count({ where: { trendyolStatsSyncedAt: { not: null } } }),
      this.prisma.trendyolProductVariant.count({
        where: { trendyolStatsSyncedAt: { not: null }, trendyolFavoriteCount: 0, trendyolRatingCount: 0 },
      }),
      this.getTopFavorited(10),
      this.getTopSellers(10),
    ]);

    const insight = await this.generateStrategyInsight({ totalActive, statsCount, deadZone, topFavorited, topSellers });
    return { totalActive, statsSyncedCount: statsCount, deadZoneCount: deadZone, deadZonePercent: statsCount ? Math.round((deadZone / statsCount) * 100) : 0, insight };
  }

  private async generateStrategyInsight(data: { totalActive: number; statsCount: number; deadZone: number; topFavorited: Awaited<ReturnType<OwnPerformanceService['getTopFavorited']>>; topSellers: Awaited<ReturnType<OwnPerformanceService['getTopSellers']>> }) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) return { summary: 'Gemini API anahtarı tanımlı değil.', recommendation: 'düzenle' as const, reasons: [] as string[] };
    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.6-flash';
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: [
          'Sen Erhan Flowers (yapay çiçek/ağaç/saksı e-ticaret) firmasının Trendyol katalog danışmanısın.',
          'Firma soruyor: "985 civarı ürünümüz var, çoğu ilgi görmüyor. Hepsini tek tek düzenlemek yerine sil/komple değiştir tarafına mı gitmeliyiz?"',
          'Yalnızca geçerli JSON döndür. Şema: {"summary":"...", "recommendation":"düzenle|sil-degistir|karma", "reasons":["..."]}',
          '- summary: 2-3 cümlelik Türkçe durum değerlendirmesi, verilen sayılara atıfla.',
          '- recommendation: üç seçenekten biri.',
          '- reasons: önerinin somut gerekçeleri (4-6 madde), en çok favorilenen/satılanlarla sıfır ilgi görenler arasındaki farka değin.',
          '',
          `VERİ: ${JSON.stringify({
            toplamAktifUrun: data.totalActive,
            istatistigiOlcumluUrun: data.statsCount,
            sifirIlgiliUrunSayisi: data.deadZone,
            enFazlaFavoriliIlk10: data.topFavorited.map((v) => ({ ad: v.productName, favori: v.trendyolFavoriteCount, puanSayisi: v.trendyolRatingCount })),
            enCokSatanIlk10: data.topSellers.map((v) => ({ ad: v.productName, adet: v.totalQuantity })),
          })}`,
        ].join('\n'),
        config: { responseMimeType: 'application/json' },
      });
      const cleaned = (response.text ?? '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as { summary?: string; recommendation?: string; reasons?: string[] };
      return {
        summary: parsed.summary || 'Özet üretilemedi.',
        recommendation: (parsed.recommendation as 'düzenle' | 'sil-degistir' | 'karma') || 'karma',
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      };
    } catch (error) {
      this.logger.error(`Gemini strateji analizi başarısız: ${(error as Error).message}`);
      return { summary: 'AI özeti şu anda üretilemedi.', recommendation: 'karma' as const, reasons: [] as string[] };
    }
  }

  // "Hepsini düzenlemek yerine sil/güncelle" kararını somut bir listeye döker:
  // her taranmış ürünü SİL (hiç ilgi yok), GÜNCELLE (ilgi var ama veri eksik/
  // bağlantısız) veya KORU (zaten iyi durumda) olarak sınıflandırır.
  async getActionPlan() {
    const [variants, salesRows] = await Promise.all([
      this.prisma.trendyolProductVariant.findMany({
        where: { trendyolStatsSyncedAt: { not: null } },
        select: {
          id: true,
          barcode: true,
          productName: true,
          currentModelCode: true,
          proposedModelCode: true,
          trendyolProductUrl: true,
          productId: true,
          trendyolRatingAverage: true,
          trendyolRatingCount: true,
          trendyolCommentCount: true,
          trendyolFavoriteCount: true,
          productCostDraft: { select: { status: true } },
        },
      }),
      this.prisma.$queryRaw<Array<{ barcode: string; totalQuantity: number }>>`
        SELECT i.barcode, SUM(i.quantity)::float AS "totalQuantity"
        FROM retail_sale_items i
        JOIN retail_sales s ON s.id = i.sale_id
        WHERE s.channel = 'TRENDYOL' AND i.barcode IS NOT NULL
        GROUP BY i.barcode
      `,
    ]);

    const soldByBarcode = new Map(salesRows.map((row) => [row.barcode, row.totalQuantity]));

    const rows = variants.map((variant) => {
      const sold = soldByBarcode.get(variant.barcode) ?? 0;
      const hasEngagement = sold > 0 || variant.trendyolRatingCount > 0 || variant.trendyolFavoriteCount > 0;
      const dataIncomplete = !variant.productId || variant.productCostDraft?.status !== 'APPROVED';
      const finalAction = hasEngagement ? (dataIncomplete ? 'GUNCELLE' : 'KORU') : 'SIL';
      return {
        id: variant.id,
        barcode: variant.barcode,
        productName: variant.productName,
        modelCode: variant.currentModelCode ?? variant.proposedModelCode ?? '',
        trendyolProductUrl: variant.trendyolProductUrl,
        sold,
        ratingAverage: variant.trendyolRatingAverage,
        ratingCount: variant.trendyolRatingCount,
        favoriteCount: variant.trendyolFavoriteCount,
        linked: Boolean(variant.productId),
        costApproved: variant.productCostDraft?.status === 'APPROVED',
        action: finalAction as 'SIL' | 'GUNCELLE' | 'KORU',
      };
    });

    const silList = rows.filter((row) => row.action === 'SIL');
    const guncelleList = rows.filter((row) => row.action === 'GUNCELLE');
    const koruList = rows.filter((row) => row.action === 'KORU');

    return {
      scannedCount: rows.length,
      silCount: silList.length,
      guncelleCount: guncelleList.length,
      koruCount: koruList.length,
      sil: silList,
      guncelle: guncelleList,
      koru: koruList,
    };
  }

  async exportActionPlanExcel() {
    const plan = await this.getActionPlan();
    const header = ['Aksiyon', 'Barkod', 'Ürün Adı', 'Model Kodu', 'Satış Adedi', 'Puan', 'Puan Sayısı', 'Favori', 'Ürün Merkezine Bağlı', 'Maliyet Onaylı', 'Trendyol Linki'];
    const allRows = [...plan.sil, ...plan.guncelle, ...plan.koru];
    const data = allRows.map((row) => [
      row.action === 'SIL' ? 'SİL / DEĞİŞTİR' : row.action === 'GUNCELLE' ? 'GÜNCELLE' : 'KORU',
      row.barcode,
      row.productName,
      row.modelCode,
      row.sold,
      row.ratingAverage ?? '',
      row.ratingCount,
      row.favoriteCount,
      row.linked ? 'Evet' : 'Hayır',
      row.costApproved ? 'Evet' : 'Hayır',
      row.trendyolProductUrl ?? '',
    ]);
    const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    sheet['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 45 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 50 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Ürün Aksiyon Planı');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    return {
      fileName: `Urun-Aksiyon-Plani-${date}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBase64: buffer.toString('base64'),
      total: allRows.length,
    };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
