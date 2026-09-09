import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { ImageProcessingModule } from '../image-processing/image-processing.module';
import { MediaController, NamedImageController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule, ImageProcessingModule, MulterModule.register({})],
  controllers: [MediaController, NamedImageController],
  providers: [MediaService],
})
export class MediaModule {}
