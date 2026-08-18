import { Module } from '@nestjs/common';
import { OpenAiImageService } from './openai-image.service';
import { PhotoroomService } from './photoroom.service';

@Module({
  providers: [OpenAiImageService, PhotoroomService],
  exports: [OpenAiImageService, PhotoroomService],
})
export class ImageProcessingModule {}
