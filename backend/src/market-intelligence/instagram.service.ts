import { Injectable, BadRequestException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialVaultService } from '../integrations/services/credential-vault.service';

const PLATFORM = 'INSTAGRAM';
const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class InstagramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstagramService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: CredentialVaultService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.generateDailyReport().catch((error) => this.logger.error(`İlk sosyal medya analizi başarısız: ${(error as Error).message}`));
    this.timer = setInterval(() => {
      this.generateDailyReport().catch((error) => this.logger.error(`Günlük sosyal medya analizi başarısız: ${(error as Error).message}`));
    }, DAILY_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async getStatus() {
    const connection = await this.prisma.socialAccountConnection.findUnique({ where: { platform: PLATFORM } });
    if (!connection) return { connected: false };
    return {
      connected: true,
      accountName: connection.accountName,
      externalAccountId: connection.externalAccountId,
      connectedAt: connection.connectedAt,
    };
  }

  async connect(accessToken: string, instagramBusinessId: string) {
    const cleanToken = String(accessToken ?? '').trim();
    const cleanId = String(instagramBusinessId ?? '').trim();
    if (!cleanToken || !cleanId) {
      throw new BadRequestException('Access token ve Instagram Business hesap ID zorunludur.');
    }

    const url = `${GRAPH_API_BASE}/${cleanId}?fields=username,followers_count&access_token=${encodeURIComponent(cleanToken)}`;
    const response = await fetch(url);
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const message = (body?.error as Record<string, unknown>)?.message ?? 'Bilinmeyen hata';
      throw new BadRequestException(`Instagram bağlantısı doğrulanamadı: ${message}`);
    }

    await this.prisma.socialAccountConnection.upsert({
      where: { platform: PLATFORM },
      create: {
        platform: PLATFORM,
        externalAccountId: cleanId,
        accountName: String(body.username ?? ''),
        accessTokenEncrypted: this.vault.encrypt(cleanToken),
      },
      update: {
        externalAccountId: cleanId,
        accountName: String(body.username ?? ''),
        accessTokenEncrypted: this.vault.encrypt(cleanToken),
      },
    });

    return { connected: true, accountName: body.username };
  }

  async disconnect() {
    await this.prisma.socialAccountConnection.deleteMany({ where: { platform: PLATFORM } });
    return { ok: true };
  }

  async getTodayReport() {
    const today = this.dateOnly(new Date());
    return this.prisma.socialInsightReport.findUnique({ where: { platform_reportDate: { platform: PLATFORM, reportDate: today } } });
  }

  async getReportHistory(limit = 30) {
    return this.prisma.socialInsightReport.findMany({ where: { platform: PLATFORM }, orderBy: { reportDate: 'desc' }, take: limit });
  }

  async generateDailyReport() {
    const connection = await this.prisma.socialAccountConnection.findUnique({ where: { platform: PLATFORM } });
    if (!connection) return null;

    const accessToken = this.vault.decrypt(connection.accessTokenEncrypted);
    const snapshot = await this.fetchInsights(connection.externalAccountId, accessToken);
    if (!snapshot) return null;

    await this.prisma.socialInsightSnapshot.create({
      data: {
        platform: PLATFORM,
        followersCount: snapshot.followersCount,
        followsCount: snapshot.followsCount,
        mediaCount: snapshot.mediaCount,
        impressions: snapshot.impressions,
        reach: snapshot.reach,
        profileViews: snapshot.profileViews,
        raw: snapshot.raw as any,
      },
    });

    const previous = await this.prisma.socialInsightSnapshot.findFirst({
      where: { platform: PLATFORM, capturedAt: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
      orderBy: { capturedAt: 'desc' },
    });

    const insight = await this.generateInsightWithAi(snapshot, previous);
    const today = this.dateOnly(new Date());
    return this.prisma.socialInsightReport.upsert({
      where: { platform_reportDate: { platform: PLATFORM, reportDate: today } },
      create: { platform: PLATFORM, reportDate: today, summary: insight.summary, suggestions: insight.suggestions },
      update: { summary: insight.summary, suggestions: insight.suggestions, generatedAt: new Date() },
    });
  }

  private async fetchInsights(businessId: string, accessToken: string) {
    try {
      const profileUrl = `${GRAPH_API_BASE}/${businessId}?fields=followers_count,follows_count,media_count&access_token=${encodeURIComponent(accessToken)}`;
      const insightsUrl = `${GRAPH_API_BASE}/${businessId}/insights?metric=impressions,reach,profile_views&period=day&access_token=${encodeURIComponent(accessToken)}`;
      const [profileRes, insightsRes] = await Promise.all([fetch(profileUrl), fetch(insightsUrl)]);
      const profile = (await profileRes.json().catch(() => ({}))) as Record<string, unknown>;
      const insights = (await insightsRes.json().catch(() => ({}))) as { data?: Array<{ name: string; values: Array<{ value: number }> }> };

      const metric = (name: string) => insights.data?.find((entry) => entry.name === name)?.values?.[0]?.value ?? 0;

      return {
        followersCount: Number(profile.followers_count ?? 0),
        followsCount: Number(profile.follows_count ?? 0),
        mediaCount: Number(profile.media_count ?? 0),
        impressions: metric('impressions'),
        reach: metric('reach'),
        profileViews: metric('profile_views'),
        raw: { profile, insights },
      };
    } catch (error) {
      this.logger.error(`Instagram insight verisi alınamadı: ${(error as Error).message}`);
      return null;
    }
  }

  private async generateInsightWithAi(
    snapshot: { followersCount: number; followsCount: number; mediaCount: number; impressions: number; reach: number; profileViews: number },
    previous: { followersCount: number; mediaCount: number } | null,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    const followerGrowth = previous ? snapshot.followersCount - previous.followersCount : null;
    if (!apiKey) {
      return { summary: 'Gemini API anahtarı tanımlı değil, otomatik özet üretilemedi.', suggestions: [] as string[] };
    }
    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.6-flash';
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: [
          'Sen Erhan Flowers (yapay çiçek/ağaç/saksı e-ticaret) firmasının sosyal medya büyüme danışmanısın.',
          'Aşağıda Instagram Business hesabının bugünkü metrikleri var. Yalnızca geçerli JSON döndür.',
          'JSON şeması: {"summary":"...", "suggestions": ["..."]}',
          '- summary: 2-3 cümlelik Türkçe günlük özet, takipçi/etkileşim değişimini yorumla.',
          '- suggestions: bugün yapılabilecek somut, uygulanabilir büyüme ve satışa yönlendirme önerileri (4-8 madde, Türkçe).',
          '',
          `Bugünkü veri: ${JSON.stringify(snapshot)}`,
          `Takipçi değişimi (önceki ölçüme göre): ${followerGrowth ?? 'veri yok'}`,
        ].join('\n'),
        config: { responseMimeType: 'application/json' },
      });
      const cleaned = (response.text ?? '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as { summary?: string; suggestions?: string[] };
      return { summary: parsed.summary || 'Özet üretilemedi.', suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] };
    } catch (error) {
      this.logger.error(`Gemini sosyal medya analizi başarısız: ${(error as Error).message}`);
      return { summary: 'AI özeti şu anda üretilemedi.', suggestions: [] as string[] };
    }
  }

  private dateOnly(date: Date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }
}
