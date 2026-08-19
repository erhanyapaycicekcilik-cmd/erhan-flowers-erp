import { Module } from '@nestjs/common';
import { GeminiImageService } from './gemini-image.service';
import { OpenAiImageService } from './openai-image.service';
import { PhotoroomService } from './photoroom.service';

@Module({
  providers: [GeminiImageService, OpenAiImageService, PhotoroomService],
  exports: [GeminiImageService, OpenAiImageService, PhotoroomService],
})
export class ImageProcessingModule {}
