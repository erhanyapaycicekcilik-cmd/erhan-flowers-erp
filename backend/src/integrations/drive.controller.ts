import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { DriveSyncService } from './services/drive-sync.service';

// Google Drive — Flora saksısız ağaç fotoğrafları ("Flora Saksısız" klasörü).
// Bağlanma: GET /integrations/gmail/auth?purpose=drive (Gmail ile aynı Google uygulaması)
@UseGuards(AuthGuard)
@Controller('integrations/drive')
export class DriveController {
  constructor(private readonly drive: DriveSyncService) {}

  @Get('status')
  status() {
    return this.drive.status();
  }

  @Post('sync')
  @UseGuards(OwnerGuard)
  sync() {
    return this.drive.syncPending();
  }
}
