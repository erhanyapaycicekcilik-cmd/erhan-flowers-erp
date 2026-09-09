import {
  Body, Controller, Get, Param, Post, Req, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { EftService } from './eft.service';

type AuthRequest = Request & { user?: { id: number; role: string } };

// Personel endpoint'leri — kimlik doğrulama gerekli
@UseGuards(AuthGuard)
@Controller('eft')
export class EftController {
  constructor(private readonly eft: EftService) {}

  // Sipariş için EFT talebi oluştur
  @Post('create/:saleId')
  create(@Param('saleId') saleId: string) {
    return this.eft.createRequest(Number(saleId));
  }

  // Bekleyen EFT ödemeleri listesi
  @Get('pending')
  pending() {
    return this.eft.listPending();
  }

  // EFT onayla
  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { staffNote?: string },
  ) {
    return this.eft.confirm(Number(id), req.user!.id, body.staffNote);
  }

  // EFT reddet
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { staffNote: string },
  ) {
    return this.eft.reject(Number(id), req.user!.id, body.staffNote);
  }
}

// Müşteri endpoint'leri — public, sadece token ile
@Controller('eft-public')
export class EftPublicController {
  constructor(private readonly eft: EftService) {}

  // Token ile EFT talep bilgisi
  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.eft.getByToken(token);
  }

  // Dekont yükleme
  @Post(':token/dekont')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), '..', 'uploads', 'dekont'),
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, `dekont-${unique}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
      cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
    },
  }))
  uploadDekont(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { customerNote?: string },
  ) {
    if (!file) throw new Error('Dosya yüklenemedi.');
    const path = `/uploads/dekont/${file.filename}`;
    return this.eft.uploadDekont(token, path, body.customerNote);
  }
}
