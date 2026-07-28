import { Body, Controller, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { BarcodesService } from './barcodes.service';

@UseGuards(AuthGuard)
@Controller('barcodes')
export class BarcodesController {
  constructor(private readonly barcodes: BarcodesService) {}

  @Post('generate')
  generate(@Body() body: { productId: number }) {
    return this.barcodes.generate(Number(body.productId));
  }

  @Post(':productId/pdf')
  async exportPdf(@Param('productId') productId: string, @Res() response: Response) {
    const result = await this.barcodes.exportPdf(Number(productId));
    response.download(result.absolutePath);
  }
}

