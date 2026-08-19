import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { MarketIntelligenceService } from './market-intelligence.service';
import { OwnPerformanceService } from './own-performance.service';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class ClaudeChatService {
  private readonly logger = new Logger(ClaudeChatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly marketIntelligence: MarketIntelligenceService,
    private readonly ownPerformance: OwnPerformanceService,
  ) {}

  async chat(message: string, history: ChatMessage[] = []): Promise<{ reply: string }> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('Claude API anahtarı tanımlı değil. ANTHROPIC_API_KEY değerini .env dosyasına ekleyin.');
    }

    const model = this.config.get<string>('ANTHROPIC_MODEL')?.trim() || 'claude-sonnet-5';
    const system = await this.buildSystemPrompt();

    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system,
        messages: [...history, { role: 'user', content: message }],
      });

      const reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return { reply: reply || 'Yanıt üretilemedi, lütfen tekrar deneyin.' };
    } catch (error) {
      this.logger.error(`Claude sohbet isteği başarısız. model=${model}`, error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException('Claude sohbet isteği tamamlanamadı. Backend loglarında detaylı hata kaydı oluşturuldu.');
    }
  }

  private async buildSystemPrompt() {
    const [report, deadZone, topFavorited, topSellers] = await Promise.all([
      this.marketIntelligence.getTodayReport(),
      this.ownPerformance.getDeadZoneAnalysis(),
      this.ownPerformance.getTopFavorited(5),
      this.ownPerformance.getTopSellers(5),
    ]);

    const lines = [
      'Sen Erhan Flowers (yapay çiçek/ağaç/saksı e-ticaret) firmasının Trendyol rakip analizi danışmanısın.',
      'Aşağıdaki güncel verilere dayanarak Türkçe, kısa ve somut cevaplar ver. Veride olmayan bir şeyi uydurma; bilmiyorsan söyle.',
      '',
      '--- Günün Rakip Analizi Raporu ---',
      report
        ? [
            `Özet: ${report.summary ?? '-'}`,
            `Güçlü yönler: ${this.formatList(report.strengths)}`,
            `Zayıf yönler: ${this.formatList(report.weaknesses)}`,
            `Öneriler: ${this.formatList(report.suggestions)}`,
          ].join('\n')
        : 'Bugün için henüz rapor üretilmedi.',
      '',
      '--- Kendi Ürün Performansımız (Trendyol) ---',
      `Toplam aktif ürün: ${deadZone.totalActive}, istatistik senkronu tamamlanan: ${deadZone.statsSyncedCount}, hiç ilgi görmeyen (satış+yorum+favori=0): ${deadZone.deadZoneCount} (%${deadZone.deadZonePercent})`,
      `Strateji önerisi: ${deadZone.insight?.summary ?? '-'}`,
      '',
      'En çok favorilenen 5 ürün:',
      this.formatProducts(topFavorited.map((p) => `${p.productName} — favori: ${p.trendyolFavoriteCount}, puan: ${p.trendyolRatingAverage ?? '-'} (${p.trendyolRatingCount} oy)`)),
      '',
      'En çok satan 5 ürün (Trendyol kanalı):',
      this.formatProducts(topSellers.map((p) => `${p.productName} — ${p.totalQuantity} adet, ${p.orderCount} sipariş`)),
    ];

    return lines.join('\n');
  }

  private formatList(value: unknown) {
    if (Array.isArray(value) && value.length) return value.join('; ');
    return '-';
  }

  private formatProducts(lines: string[]) {
    return lines.length ? lines.map((line) => `- ${line}`).join('\n') : '(veri yok)';
  }
}
