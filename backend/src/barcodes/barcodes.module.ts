import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BarcodesController } from './barcodes.controller';
import { BarcodesService } from './barcodes.service';

@Module({
  imports: [AuthModule],
  controllers: [BarcodesController],
  providers: [BarcodesService],
})
export class BarcodesModule {}

