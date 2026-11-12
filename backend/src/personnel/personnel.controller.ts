import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { PersonnelService, ensurePersonnelDir } from './personnel.service';

type AuthedRequest = Request & { user?: { id: number } };

const storage = diskStorage({
  destination: (_req, _file, cb) => cb(null, ensurePersonnelDir()),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase().slice(0, 10)}`),
});

/** Personel özlük dosyası — kişisel veri: sadece sistem sahibi (OWNER) */
@UseGuards(AuthGuard, OwnerGuard)
@Controller('personnel')
export class PersonnelController {
  constructor(private readonly svc: PersonnelService) {}

  @Get()
  list(@Query() query: { status?: string; q?: string; year?: string }) {
    return this.svc.list(query);
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: AuthedRequest) {
    return this.svc.create(body, req.user!.id);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', {
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(file.mimetype.startsWith('image/') ? null : new BadRequestException('Sadece resim yüklenebilir.'), file.mimetype.startsWith('image/')),
  }))
  photo(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    return this.svc.setPhoto(id, file);
  }

  @Get(':id/photo')
  async getPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(await this.svc.photoPath(id));
  }

  @Post(':id/attendance')
  addAttendance(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: AuthedRequest) {
    return this.svc.addAttendance(id, body, req.user!.id);
  }

  @Delete('attendance/:attendanceId')
  deleteAttendance(@Param('attendanceId', ParseIntPipe) attendanceId: number) {
    return this.svc.deleteAttendance(attendanceId);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 25 * 1024 * 1024 } }))
  addDocument(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @Body('title') title: string, @Req() req: AuthedRequest) {
    return this.svc.addDocument(id, file, title, req.user!.id);
  }

  @Get('documents/:docId/file')
  async documentFile(@Param('docId', ParseIntPipe) docId: number, @Res() res: Response) {
    const doc = await this.svc.documentFile(docId);
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`);
    res.sendFile(doc.path);
  }

  @Delete('documents/:docId')
  deleteDocument(@Param('docId', ParseIntPipe) docId: number) {
    return this.svc.deleteDocument(docId);
  }
}
