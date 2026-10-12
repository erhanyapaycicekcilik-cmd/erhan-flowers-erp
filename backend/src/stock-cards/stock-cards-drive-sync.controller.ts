import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { InternalKeyGuard } from '../auth/internal-key.guard';
import { StockCardsService } from './stock-cards.service';

@UseGuards(InternalKeyGuard)
@Controller('stock-cards')
export class StockCardsDriveSyncController {
  constructor(private readonly stockCards: StockCardsService) {}

  @Get('drive-sync-pending')
  driveSyncPending() {
    return this.stockCards.getCardsWithoutDriveFolder();
  }

  @Patch(':id/drive-folder')
  setDriveFolder(@Param('id') id: string, @Body() body: { folderId: string }) {
    return this.stockCards.setDriveFolderId(Number(id), body.folderId);
  }
}
