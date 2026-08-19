import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';

type GeminiImageEditOptions = {
  sourceFiles: Array<{ path: string; fileType: string }>;
  prompt: string;
};

type GeminiImageBlock = {
  type?: string;
  data?: string;
  mime_type?: string;
  mimeType?: string;
};

type GeminiInteractionResponse = {
  output_image?: GeminiImageBlock;
  outputImage?: GeminiImageBlock;
  steps?: Array<{ type?: string; content?: GeminiImageBlock[] }>;
};

@Injectable()
export class GeminiImageService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.config.get<string>('GEMINI_API_KEY')?.trim());
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new BadRequestException('Görsel üretim bağlantısı eksik. OPENAI_API_KEY veya GEMINI_API_KEY ayarı eklenmelidir.');
    }
  }

  async editImage(options: GeminiImageEditOptions) {
    this.ensureConfigured();
    if (!options.sourceFiles.length) {
      throw new BadRequestException('Görsel üretimi için en az bir kaynak görsel gerekir.');
    }

    const apiKey = this.config.get<string>('GEMINI_API_KEY')!.trim();
    const model = this.config.get<string>('GEMINI_IMAGE_MODEL')?.trim() || 'gemini-3.1-flash-image';
    const ai = new GoogleGenAI({ apiKey });
    const input = [
      { type: 'text', text: options.prompt },
      ...await Promise.all(options.sourceFiles.map(async (sourceFile) => ({
        type: 'image',
        mime_type: sourceFile.fileType,
        data: (await fs.readFile(sourceFile.path)).toString('base64'),
      }))),
    ];

    try {
      const interaction = await this.withTimeout(ai.interactions.create({
        model,
        input,
        response_format: {
          type: 'image',
          aspect_ratio: '1:1',
        },
      } as never), 120000);

      const image = this.findImage(interaction as GeminiInteractionResponse);
      if (!image?.data) {
        throw new ServiceUnavailableException('Gemini görsel üretimi boş döndü.');
      }

      return Buffer.from(image.data, 'base64');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
      throw new ServiceUnavailableException(`Gemini görsel üretimi tamamlanamadı. ${message}`);
    }
  }

  private findImage(payload: GeminiInteractionResponse) {
    if (payload.output_image?.data) return payload.output_image;
    if (payload.outputImage?.data) return payload.outputImage;
    for (const step of payload.steps ?? []) {
      const image = step.content?.find((item) => item.type === 'image' && item.data);
      if (image) return image;
    }
    return null;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new ServiceUnavailableException('Gemini görsel üretimi zaman aşımına uğradı. Lütfen tekrar deneyin.')), timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
