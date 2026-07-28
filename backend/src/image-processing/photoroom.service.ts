import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';

type PhotoroomEditOptions = {
  sourcePath: string;
  fileType: string;
  backgroundColor?: string;
  padding?: string;
};

@Injectable()
export class PhotoroomService {
  constructor(private readonly config: ConfigService) {}

  async editImage(options: PhotoroomEditOptions) {
    const apiUrl =
      this.config.get<string>('PHOTOROOM_API_URL') ??
      this.config.get<string>('PHPTPROMM_API_URL') ??
      'https://image-api.photoroom.com/v2/edit';
    const apiKey = this.config.get<string>('PHOTOROOM_API_KEY') ?? this.config.get<string>('PHPTPROMM_API_KEY');

    if (!apiKey) {
      throw new BadRequestException('PhotoRoom bağlantısı kurulmamış. Ayarlar bölümünden API bağlantısını tamamlayın.');
    }

    const imageBuffer = await fs.readFile(options.sourcePath);
    const formData = new FormData();
    formData.append('imageFile', new Blob([new Uint8Array(imageBuffer)], { type: options.fileType }), 'source-image');
    formData.append('removeBackground', 'true');
    formData.append('background.color', options.backgroundColor ?? 'FFFFFF');
    formData.append('padding', options.padding ?? '0.1');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new ServiceUnavailableException(`Photoroom işlemi tamamlanamadı. ${message}`.trim());
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
