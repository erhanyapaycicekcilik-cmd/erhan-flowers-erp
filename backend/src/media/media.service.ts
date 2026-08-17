import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { cleanMojibakeDeep } from '../common/mojibake';
import { PhotoroomService } from '../image-processing/photoroom.service';
import { PrismaService } from '../prisma/prisma.service';
import { productImageRoot } from '../product-image-paths';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoroom: PhotoroomService,
  ) {
    fs.mkdirSync(productImageRoot(), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), 'uploads', 'products'), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), 'uploads', 'photoroom'), { recursive: true });
  }

  async list() {
    return cleanMojibakeDeep(await this.prisma.mediaFile.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    }));
  }

  async create(file: Express.Multer.File | undefined, body: { productId?: string; folderName?: string }) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenemedi.');
    }

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = this.safeFolderName(body.folderName?.trim() || 'Genel');
    const targetDir = path.join(productImageRoot(), folderName, 'images');
    fs.mkdirSync(targetDir, { recursive: true });

    const safeFileName = this.safeFileName(file.originalname || file.filename);
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeFileName}`;
    const targetPath = path.join(targetDir, uniqueFileName);
    await fsPromises.rename(file.path, targetPath);

    const filePath = `/uploads/products/${folderName}/images/${uniqueFileName}`;

    return cleanMojibakeDeep(await this.prisma.mediaFile.create({
      data: {
        productId: productId && Number.isFinite(productId) ? productId : null,
        fileName: file.originalname,
        filePath,
        folderName,
        fileType: file.mimetype,
      },
      include: { product: true },
    }));
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

    return cleanMojibakeDeep(await this.prisma.mediaFile.create({
      data: {
        productId: media.productId,
        fileName: outputFileName,
        filePath: `/uploads/photoroom/${outputFileName}`,
        folderName: `${media.folderName} / Photoroom`,
        fileType: 'image/png',
      },
      include: { product: true },
    }));
  }

  async createTreeStandardSet(body: { imagePath?: string; productId?: string; folderName?: string }) {
    const imagePath = String(body.imagePath || '').trim();
    if (!imagePath) throw new BadRequestException('Standart set için ana görsel seçilmelidir.');

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = this.safeFolderName(body.folderName?.trim() || 'Agac Standart Gorsel');
    const sourcePath = this.resolveUploadPath(imagePath);
    const sourceType = this.fileTypeFromPath(imagePath);
    const outputDir = path.join(process.cwd(), 'uploads', 'tree-standard', folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    const slots = [
      { key: '01-beyaz-ana-gorsel', title: '01 Beyaz ana görsel', mode: 'photoroom' },
      { key: '02-otel-lobisi-dukkan', title: '02 Otel lobisi / dükkan', mode: 'copy' },
      { key: '03-modern-salon', title: '03 Modern salon', mode: 'copy' },
      { key: '04-ofis-kurumsal-alan', title: '04 Ofis / kurumsal alan', mode: 'copy' },
      { key: '05-yakin-detay', title: '05 Yakın detay', mode: 'copy' },
      { key: '06-giris-olcu-algisi', title: '06 Giriş / ölçü algısı', mode: 'copy' },
    ];

    const created = [];
    for (const slot of slots) {
      const outputFileName = `${Date.now()}-${slot.key}.png`;
      const outputPath = path.join(outputDir, outputFileName);
      if (slot.mode === 'photoroom') {
        try {
          const editedBuffer = await this.photoroom.editImage({
            sourcePath,
            fileType: sourceType,
            backgroundColor: 'FFFFFF',
            padding: '0.12',
          });
          await fsPromises.writeFile(outputPath, editedBuffer);
        } catch (error) {
          await fsPromises.copyFile(sourcePath, outputPath);
        }
      } else {
        await fsPromises.copyFile(sourcePath, outputPath);
      }

      const publicPath = `/uploads/tree-standard/${folderName}/${outputFileName}`;
      created.push(await this.prisma.mediaFile.create({
        data: {
          productId: productId && Number.isFinite(productId) ? productId : null,
          fileName: `${slot.key}.png`,
          filePath: publicPath,
          folderName: `${folderName} / Ağaç Standart`,
          fileType: 'image/png',
        },
        include: { product: true },
      }));
    }

    return cleanMojibakeDeep({
      images: created.map((item) => item.filePath),
      mediaFiles: created,
      note: 'Ağaç standart seti hazırlandı. Dekor sahneleri için görsel üretim servisi bağlanınca 02-06 otomatik sahne görseli olarak üretilecek.',
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

  private safeFolderName(value: string) {
    return value
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'Genel';
  }

  private safeFileName(value: string) {
    const parsed = path.parse(value);
    const name = (parsed.name || 'gorsel')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 80);
    const ext = (parsed.ext || '.jpg').replace(/[^A-Za-z0-9.]/g, '').slice(0, 12) || '.jpg';
    return `${name}${ext}`;
  }

  private fileTypeFromPath(value: string) {
    const ext = path.extname(value).toLocaleLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }
}
