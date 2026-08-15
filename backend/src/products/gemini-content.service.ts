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
