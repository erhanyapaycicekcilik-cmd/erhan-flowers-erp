import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import * as fs from 'fs'
import { Response } from 'express'
import { AuthGuard } from '../auth/auth.guard'
import { ReturnsService } from './returns.service'

@UseGuards(AuthGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly svc: ReturnsService) {}

  @Get()
  list(@Query('page') page = '1', @Query('limit') limit = '50', @Query('q') q = '') {
    return this.svc.listReturns(Number(page) || 1, Number(limit) || 50, q ?? '')
  }

  /** Platformlardan iadeleri çek (Trendyol Erhan + Flora) */
  @Post('sync')
  sync(@Query('days') days?: string) {
    return this.svc.syncFromPlatforms(Number(days) || 30)
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.getReturn(Number(id))
  }

  @Patch(':id/return-status')
  setStatus(@Param('id') id: string, @Body() body: { status: string | null }) {
    return this.svc.setReturnStatus(Number(id), body?.status ?? null)
  }

  @Patch(':id/note')
  updateNote(@Param('id') id: string, @Body() body: { note: string }) {
    return this.svc.updateReturnNote(Number(id), body.note ?? '')
  }

  @Post(':id/videos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dest = join(process.cwd(), 'uploads', 'return-videos')
          fs.mkdirSync(dest, { recursive: true })
          cb(null, dest)
        },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`)
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('note') note?: string,
  ) {
    return this.svc.addVideo(Number(id), file, note)
  }

  @Delete('videos/:videoId')
  deleteVideo(@Param('videoId') videoId: string) {
    return this.svc.deleteVideo(Number(videoId))
  }

  @Get('videos/:filename/stream')
  async streamVideo(@Param('filename') filename: string, @Query('download') download: string | undefined, @Res() res: Response) {
    const filePath = this.svc.getVideoPath(filename)
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    // ?download=1 → platforma yüklemek için anlaşılır adla indir
    if (download) return res.download(filePath, await this.svc.videoOriginalName(filename))
    res.sendFile(filePath)
  }
}
