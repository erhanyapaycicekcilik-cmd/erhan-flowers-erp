import { Module } from '@nestjs/common';
import { PhotoroomService } from './photoroom.service';

@Module({
  providers: [PhotoroomService],
  exports: [PhotoroomService],
})
export class ImageProcessingModule {}

