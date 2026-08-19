import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

type GeminiContentPayload = {
  productName?: string;
  productHeight?: string;
  potType?: string;
  potSize?: string;
  fillerMaterial?: string;
};

type GeminiContentResult = {
  productName: string;
  description: string;
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

    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.6-flash';

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: this.prompt(data),
        config: {
          responseMimeType: 'application/json',
        },
      });

      return this.parseResponse(response.text ?? '', data.productName);
    } catch (error) {
      this.logger.error(`Gemini içerik üretimi başarısız. model=${model} apiKeyLength=${apiKey.length}`, this.errorDetails(error));
      throw new ServiceUnavailableException('Gemini içerik üretimi tamamlanamadı. Backend loglarında detaylı Gemini hata kaydı oluşturuldu.');
    }
  }

  async generateReferenceSearch(payload: unknown) {
    const data = this.normalizeReferenceSearch(payload);
    const fallbackQuery = this.referenceFallbackQuery(data);
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      return this.referenceSearchResult(fallbackQuery, 'Gemini API anahtarı tanımlı değil; sistem kendi arama kelimesini hazırladı.');
    }

    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.6-flash';
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
    return [
      'Erhan Flowers ERP için Türkçe e-ticaret ürün içeriği üret.',
      'Yalnızca geçerli JSON döndür. Markdown, açıklama veya kod bloğu kullanma.',
      'JSON şeması: {"productName":"...","description":"..."}',
      'Ürün adı SEO uyumlu, doğal, aranabilir ve pazaryeri formatına uygun olsun.',
      'Açıklama zengin, satış odaklı ve ürün detaylarını içeren düz metin olsun.',
      'Açıklamada saksı ölçüsü, saksı tipi/modeli ve dolgu malzemesi bilgilerini doğal şekilde kullan.',
      `Açıklamanın sonunda bu bakım paragrafını aynen dahil et: ${careInstructions}`,
      '',
      `Ürün adı: ${data.productName ?? '-'}`,
      `Ürün boyu: ${data.productHeight ?? '-'}`,
      `Saksı tipi/modeli: ${data.potType ?? '-'}`,
      `Saksı ölçüsü: ${data.potSize ?? '-'}`,
      `Saksı içi dolgu malzemesi: ${data.fillerMaterial ?? '-'}`,
    ].join('\n');
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
      const parsed = JSON.parse(cleaned) as Partial<GeminiContentResult>;
      return {
        productName: this.text(parsed.productName) ?? fallbackName,
        description: this.ensureCareInstructions(this.text(parsed.description) ?? ''),
      };
    } catch {
      return {
        productName: fallbackName,
        description: this.ensureCareInstructions(cleaned),
      };
    }
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
