import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { geminiModelCandidates, resolveGeminiModel } from '../common/gemini-model';

type GeminiContentPayload = {
  productName?: string;
  productHeight?: string;
  potType?: string;
  potSize?: string;
  potVolumeLitre?: string;
  fillerMaterial?: string;
  stemCount?: string;
  branchCount?: string;
  leavesPerBranch?: string;
  leafCount?: string;
  comesInTwoParts?: boolean;
  comesWith?: string;
  cleaningTip?: string;
  extraNotes?: string;
};

type GeminiContentResult = {
  productName: string;
  description: string;
  hashtags?: string[];
};

type GeminiReferenceSearchPayload = {
  productName?: string;
  productStockName?: string;
  potStockName?: string;
  productKind?: string;
};

const careInstructions =
  'Yapay çiçek ve ağaç ürünlerinde temizlik için nemli ve yumuşak bir bez kullanınız. Kimyasal temizleyici, çamaşır suyu ve aşındırıcı malzemeler kullanmayınız. Ürünü doğrudan yoğun güneş ışığına, aşırı neme ve yüksek ısıya uzun süre maruz bırakmayınız. Formunu korumak için dalları ve yaprakları nazikçe şekillendiriniz.';

@Injectable()
export class GeminiContentService {
  private readonly logger = new Logger(GeminiContentService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(payload: unknown): Promise<GeminiContentResult> {
    const data = this.normalize(payload);
    if (!data.productName) {
      throw new BadRequestException('İçerik üretimi için ürün adı zorunludur.');
    }

    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('Gemini API anahtarı tanımlı değil. GEMINI_API_KEY değerini .env dosyasına ekleyin.');
    }

    const models = this.candidateModels();
    const ai = new GoogleGenAI({ apiKey });
    let lastError: unknown;
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: this.prompt(data),
          config: {
            responseMimeType: 'application/json',
          },
        });
        return this.parseResponse(response.text ?? '', data.productName);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Gemini içerik üretimi başarısız, sıradaki model denenecek. model=${model} apiKeyLength=${apiKey.length}`, this.errorDetails(error));
      }
    }
    this.logger.error(`Gemini içerik üretimi tüm modellerde başarısız. models=${models.join(',')}`, this.errorDetails(lastError));
    throw new ServiceUnavailableException('Gemini içerik üretimi tamamlanamadı. Backend loglarında detaylı Gemini hata kaydı oluşturuldu.');
  }

  /** Ayarlı model kapatılmış/erişilemez olsa bile güncel modellerle tekrar dene. */
  private candidateModels() {
    return geminiModelCandidates(this.config.get<string>('GEMINI_MODEL'));
  }

  async generateReferenceSearch(payload: unknown) {
    const data = this.normalizeReferenceSearch(payload);
    const fallbackQuery = this.referenceFallbackQuery(data);
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      return this.referenceSearchResult(fallbackQuery, 'Gemini API anahtarı tanımlı değil; sistem kendi arama kelimesini hazırladı.');
    }

    const model = resolveGeminiModel(this.config.get<string>('GEMINI_MODEL'));
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: this.referenceSearchPrompt(data),
        config: { responseMimeType: 'application/json' },
      });
      const parsed = this.parseReferenceSearchResponse(response.text ?? '', fallbackQuery);
      return this.referenceSearchResult(parsed.query, parsed.note);
    } catch (error) {
      this.logger.error(`Gemini referans görsel araması başarısız. model=${model} apiKeyLength=${apiKey.length}`, this.errorDetails(error));
      return this.referenceSearchResult(fallbackQuery, 'Gemini cevap vermedi; sistem kendi arama kelimesini hazırladı.');
    }
  }

  private normalize(payload: unknown): GeminiContentPayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      productName: this.text(body.productName),
      productHeight: this.text(body.productHeight),
      potType: this.text(body.potType),
      potSize: this.text(body.potSize),
      fillerMaterial: this.text(body.fillerMaterial),
      stemCount: this.text(body.stemCount),
      branchCount: this.text(body.branchCount),
      leavesPerBranch: this.text(body.leavesPerBranch),
      leafCount: this.text(body.leafCount),
      potVolumeLitre: this.text(body.potVolumeLitre),
      comesInTwoParts: body.comesInTwoParts === true || body.comesInTwoParts === 'true',
      comesWith: this.text(body.comesWith),
      cleaningTip: this.text(body.cleaningTip),
      extraNotes: this.text(body.extraNotes),
    };
  }

  private normalizeReferenceSearch(payload: unknown): GeminiReferenceSearchPayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      productName: this.text(body.productName),
      productStockName: this.text(body.productStockName),
      potStockName: this.text(body.potStockName),
      productKind: this.text(body.productKind),
    };
  }

  private prompt(data: GeminiContentPayload) {
    const lines = [
      'Erhan Flowers ERP için Türkçe e-ticaret ürün içeriği üret.',
      'Yalnızca geçerli JSON döndür. Markdown, açıklama veya kod bloğu kullanma.',
      'JSON şeması: {"productName":"...","description":"...","hashtags":["#etiket1","#etiket2"]}',
      'productName: SEO uyumlu, doğal, aranabilir ve Trendyol/N11/HB pazaryeri formatına uygun olsun.',
      'productName kuralı: Verilen ürün adındaki bitki/ağaç/çiçek türünü (ör. Muz Ağacı, Benjamin, Orkide) ASLA değiştirme ve başka bir tür adı (ör. Zeytin Ağacı) ekleme. Ölçü, yaprak sayısı ve saksı bilgisini koru.',
      'description: Zengin, satış odaklı, soruları yanıtlayan düz metin. Teknik detayları doğal şekilde yaz.',
      'Açıklamada saksı ölçüsü, boy, gövde/yaprak sayısı, montaj bilgisi ve aksesuar detaylarını doğal dilde kullan.',
      'hashtags: 8-12 adet Türkçe Instagram/TikTok hashtag listesi. # işareti ile başlasın.',
      `Açıklamanın sonunda bu bakım paragrafını aynen dahil et: ${careInstructions}`,
      '',
      `Ürün adı: ${data.productName ?? '-'}`,
      `Ürün boyu: ${data.productHeight ?? '-'}`,
      `Saksı tipi/modeli: ${data.potType ?? '-'}`,
      `Saksı ölçüsü: ${data.potSize ?? '-'}`,
      `Saksı içi dolgu malzemesi: ${data.fillerMaterial ?? '-'}`,
    ];
    if (data.stemCount) lines.push(`Gövde sayısı: ${data.stemCount}`);
    if (data.branchCount) lines.push(`Dal sayısı: ${data.branchCount}`);
    if (data.leavesPerBranch) lines.push(`Dal başına yaprak: ${data.leavesPerBranch}`);
    if (data.leafCount) {
      const detail = data.branchCount && data.leavesPerBranch
        ? ` (${data.branchCount} dal × ${data.leavesPerBranch} yaprak/dal)`
        : '';
      lines.push(`Toplam yaprak sayısı: ${data.leafCount}${detail}`);
    }
    if (data.potVolumeLitre) lines.push(`Saksı hacmi: ${data.potVolumeLitre} litre`);
    if (data.comesInTwoParts) lines.push('Montaj: Ürün iki parça halinde gönderilir, kolay monte edilir.');
    if (data.comesWith) lines.push(`Birlikte geldiği aksesuarlar: ${data.comesWith}`);
    if (data.cleaningTip) lines.push(`Temizlik notu: ${data.cleaningTip}`);
    if (data.extraNotes) lines.push(`Ek notlar: ${data.extraNotes}`);
    return lines.join('\n');
  }

  private referenceSearchPrompt(data: GeminiReferenceSearchPayload) {
    return [
      'Erhan Flowers ERP için benzer ürün görseli bulmaya uygun kısa arama kelimesi üret.',
      'Yalnızca geçerli JSON döndür. Markdown veya açıklama kullanma.',
      'JSON şeması: {"query":"...","note":"..."}',
      'Arama kelimesi Türkçe olabilir, gerekirse İngilizce ürün terimi de ekle.',
      'Amaç: yapay ağaç/bitki ile saksının birleşmiş satılık ürün görseline benzer referans bulmak.',
      'Marka adı, fiyat, kampanya, site adı yazma.',
      '',
      `Satış ürün adı: ${data.productName ?? '-'}`,
      `Ürün tipi: ${data.productKind ?? '-'}`,
      `Ürün/bitki stok adı: ${data.productStockName ?? '-'}`,
      `Saksı stok adı: ${data.potStockName ?? '-'}`,
    ].join('\n');
  }

  private parseReferenceSearchResponse(text: string, fallbackQuery: string) {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as { query?: unknown; note?: unknown };
      return {
        query: this.text(parsed.query) ?? fallbackQuery,
        note: this.text(parsed.note),
      };
    } catch {
      return { query: this.text(cleaned) ?? fallbackQuery, note: undefined };
    }
  }

  private referenceFallbackQuery(data: GeminiReferenceSearchPayload) {
    return [
      data.productName,
      data.productStockName,
      data.potStockName,
      'yapay dekoratif bitki saksılı ürün görseli',
    ].filter(Boolean).join(' ');
  }

  private referenceSearchResult(query: string, note?: string) {
    const cleanQuery = query.replace(/\s+/g, ' ').trim();
    return {
      query: cleanQuery,
      googleImagesUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(cleanQuery)}`,
      note,
    };
  }

  private parseResponse(text: string, fallbackName: string): GeminiContentResult {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as Partial<GeminiContentResult & { hashtags?: unknown[] }>;
      return {
        productName: this.keepsPlantType(fallbackName, this.text(parsed.productName)) ?? fallbackName,
        description: this.ensureCareInstructions(this.text(parsed.description) ?? ''),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
      };
    } catch {
      return {
        productName: fallbackName,
        description: this.ensureCareInstructions(cleaned),
        hashtags: [],
      };
    }
  }

  /** Gemini adı farklı bir türe çevirdiyse (Muz Ağacı → Zeytin Ağacı) üretilen adı kullanma. */
  private keepsPlantType(sourceName: string, generatedName?: string) {
    if (!generatedName) return undefined;
    const normalize = (value: string) => value.toLocaleLowerCase('tr-TR');
    const source = normalize(sourceName);
    const generated = normalize(generatedName);
    const typeWords = [...source.matchAll(/([a-zçğıöşü]{3,})\s+(?:ağacı|ağaç|çiçeği|bitkisi|yaprağı)/g)].map((match) => match[1]);
    if (typeWords.some((word) => !generated.includes(word))) return undefined;
    return generatedName;
  }

  private ensureCareInstructions(description: string) {
    if (description.includes(careInstructions)) return description;
    return [description, careInstructions].filter(Boolean).join('\n\n');
  }

  private text(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private errorDetails(error: unknown) {
    if (error instanceof Error) {
      const candidate = error as Error & { status?: number; code?: string };
      return JSON.stringify({
        name: error.name,
        message: error.message,
        status: candidate.status,
        code: candidate.code,
        stack: error.stack,
      });
    }
    return JSON.stringify(error);
  }
}
