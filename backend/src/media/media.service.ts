import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { PhotoroomService } from '../image-processing/photoroom.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoroom: PhotoroomService,
  ) {
    fs.mkdirSync(path.join(process.cwd(), 'uploads', 'products'), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), 'uploads', 'photoroom'), { recursive: true });
  }

  list() {
    return this.prisma.mediaFile.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(file: Express.Multer.File | undefined, body: { productId?: string; folderName?: string }) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenemedi.');
    }

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = body.folderName?.trim() || 'Genel';
    const filePath = `/uploads/products/${file.filename}`;

    return this.prisma.mediaFile.create({
      data: {
        productId: productId && Number.isFinite(productId) ? productId : null,
        fileName: file.originalname,
        filePath,
        folderName,
        fileType: file.mimetype,
      },
      include: { product: true },
    });
  }

  async processWithPhotoroom(id: number) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!media) {
      throw new NotFoundException('Görsel bulunamadı.');
    }
    if (!media.fileType.startsWith('image/')) {
      throw new BadRequestException('Sadece görsel dosyaları işlenebilir.');
    }

    const sourcePath = this.resolveUploadPath(media.filePath);
    const editedBuffer = await this.photoroom.editImage({
      sourcePath,
      fileType: media.fileType,
    });

    const outputFileName = `${Date.now()}-photoroom-${path.parse(media.fileName).name}.png`;
    const outputDir = path.join(process.cwd(), 'uploads', 'photoroom');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFileName);
    await fsPromises.writeFile(outputPath, editedBuffer);

    return this.prisma.mediaFile.create({
      data: {
        productId: media.productId,
        fileName: outputFileName,
        filePath: `/uploads/photoroom/${outputFileName}`,
        folderName: `${media.folderName} / Photoroom`,
        fileType: 'image/png',
      },
      include: { product: true },
    });
  }

  private resolveUploadPath(filePath: string) {
    const relativePath = filePath.replace(/^\/?uploads[\\/]/, '');
    const absolutePath = path.normalize(path.join(process.cwd(), 'uploads', relativePath));
    const uploadRoot = path.normalize(path.join(process.cwd(), 'uploads'));

    if (!absolutePath.startsWith(uploadRoot)) {
      throw new BadRequestException('Geçersiz dosya yolu.');
    }

    return absolutePath;
  }
}
