import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname, join } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { StockCardsService } from './stock-cards.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard)
@Controller('stock-cards')
export class StockCardsController {
  constructor(private readonly stockCards: StockCardsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.stockCards.list(request.user?.role);
  }

  @Get('export/excel')
  exportExcel() {
    return this.stockCards.exportExcel();
  }

  @Get('export/pdf')
  exportPdf() {
    return this.stockCards.exportPdf();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.stockCards.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.stockCards.update(Number(id), body);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'stock-cards', '_temp');
          fs.mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname);
          const safeName = file.originalname.replace(extension, '').replace(/[^a-zA-Z0-9._-]/g, '-');
          callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}${extension}`);
        },
      }),
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('makeMain') makeMain?: string,
  ) {
    return this.stockCards.uploadImage(Number(id), file, makeMain === 'true');
  }

  @Post(':id/images/:imageId/main')
  setMainImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.stockCards.setMainImage(Number(id), Number(imageId));
  }

  @Post(':id/movements')
  addMovement(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.stockCards.addMovement(Number(id), body, request.user?.role);
  }

  @Get(':id/movements')
  movements(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.stockCards.listMovements(Number(id), request.user?.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('hard') hard?: string) {
    return this.stockCards.remove(Number(id), hard === 'true');
  }
}
