import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';

type OpenAiImageEditOptions = {
  sourcePath?: string;
  sourcePaths?: string[];
  sourceFiles?: Array<{ path: string; fileType: string }>;
  fileType: string;
  prompt: string;
};

@Injectable()
export class OpenAiImageService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.config.get<string>('OPENAI_API_KEY')?.trim());
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new BadRequestException('ChatGPT görsel bağlantısı kurulmamış. OPENAI_API_KEY ayarı eklenmelidir.');
    }
  }

  async editImage(options: OpenAiImageEditOptions) {
    this.ensureConfigured();

    const apiUrl = this.config.get<string>('OPENAI_IMAGE_API_URL') ?? 'https://api.openai.com/v1/images/edits';
    const apiKey = this.config.get<string>('OPENAI_API_KEY')!;
    const model = this.config.get<string>('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1';
    const sourceFiles = options.sourceFiles?.length
      ? options.sourceFiles
      : (options.sourcePaths?.length ? options.sourcePaths : options.sourcePath ? [options.sourcePath] : [])
        .map((sourcePath) => ({ path: sourcePath, fileType: options.fileType }));
    if (sourceFiles.length === 0) {
      throw new BadRequestException('ChatGPT görsel üretimi için en az bir kaynak görsel gerekir.');
    }

    const formData = new FormData();
    formData.append('model', model);
    for (const [index, sourceFile] of sourceFiles.entries()) {
      const imageBuffer = await fs.readFile(sourceFile.path);
      formData.append('image', new Blob([new Uint8Array(imageBuffer)], { type: sourceFile.fileType }), `source-image-${index + 1}`);
    }
    formData.append('prompt', options.prompt);
    formData.append('size', '1024x1024');
    formData.append('quality', 'medium');
    formData.append('background', 'opaque');
    formData.append('output_format', 'png');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new ServiceUnavailableException(`ChatGPT görsel üretimi tamamlanamadı. ${message}`.trim());
    }

    const payload = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
    const firstImage = payload.data?.find((item) => item.b64_json || item.url);
    if (!firstImage) {
      throw new ServiceUnavailableException('ChatGPT görsel üretimi boş döndü.');
    }
    if (firstImage.b64_json) {
      return Buffer.from(firstImage.b64_json, 'base64');
    }

    const imageResponse = await fetch(firstImage.url!);
    if (!imageResponse.ok) {
      throw new ServiceUnavailableException('ChatGPT görsel çıktısı indirilemedi.');
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }
}
