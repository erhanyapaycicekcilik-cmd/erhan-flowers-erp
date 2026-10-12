import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { InternalKeyGuard } from '../auth/internal-key.guard';
import { ProductsService } from './products.service';

@UseGuards(InternalKeyGuard)
@Controller('products')
export class DriveSyncController {
  constructor(private readonly products: ProductsService) {}

  @Get('drive-sync-pending')
  driveSyncPending() {
    return this.products.getVariantsWithoutDriveFolder();
  }

  @Patch('variants/:id/drive-folder')
  setDriveFolder(@Param('id') id: string, @Body() body: { folderId: string }) {
    return this.products.setDriveFolderId(Number(id), body.folderId);
  }
}
