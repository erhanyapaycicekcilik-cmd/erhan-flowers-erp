import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { cleanMojibakeDeep } from '../common/mojibake';
import { OpenAiImageService } from '../image-processing/openai-image.service';
import { PhotoroomService } from '../image-processing/photoroom.service';
import { PrismaService } from '../prisma/prisma.service';
import { productImageRoot } from '../product-image-paths';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoroom: PhotoroomService,
    private readonly openAiImage: OpenAiImageService,
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

    const created = await this.prisma.mediaFile.create({
      data: {
        productId: productId && Number.isFinite(productId) ? productId : null,
        fileName: file.originalname,
        filePath,
        folderName,
        fileType: file.mimetype,
      },
      include: { product: true },
    });

    let cleanBackground: Awaited<ReturnType<typeof this.runPhotoroom>> | null = null;
    try {
      cleanBackground = await this.runPhotoroom(created);
    } catch {
      // Otomatik arka plan temizleme başarısız olsa bile yükleme başarılı sayılır;
      // kullanıcı isterse manuel "Arka Planı Temizle" ile tekrar deneyebilir.
    }

    return cleanMojibakeDeep({ ...created, cleanBackground });
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

    return cleanMojibakeDeep(await this.runPhotoroom(media));
  }

  async bulkProcessWithPhotoroom(ids: number[]) {
    const results: Array<{ id: number; success: boolean; error?: string; mediaFile?: unknown }> = [];
    for (const id of ids) {
      try {
        const media = await this.prisma.mediaFile.findUnique({ where: { id }, include: { product: true } });
        if (!media) {
          results.push({ id, success: false, error: 'Görsel bulunamadı.' });
          continue;
        }
        const mediaFile = await this.runPhotoroom(media);
        results.push({ id, success: true, mediaFile: cleanMojibakeDeep(mediaFile) });
      } catch (error) {
        results.push({ id, success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' });
      }
    }
    return results;
  }

  private async runPhotoroom(media: { id: number; productId: number | null; fileName: string; filePath: string; folderName: string; fileType: string }) {
    if (!media.fileType.startsWith('image/')) {
      throw new BadRequestException('Sadece görsel dosyaları işlenebilir.');
    }

    const sourcePath = this.resolveUploadPath(media.filePath);
    const editedBuffer = await this.photoroom.editImage({
      sourcePath,
      fileType: media.fileType,
      backgroundColor: 'FFFFFF',
      padding: '0.12',
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

  async createTreeStandardSet(body: { imagePath?: string; productId?: string; folderName?: string }) {
    const imagePath = String(body.imagePath || '').trim();
    if (!imagePath) throw new BadRequestException('Standart set için ana görsel seçilmelidir.');

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = this.safeFolderName(body.folderName?.trim() || 'Agac Standart Gorsel');
    const sourcePath = this.resolveUploadPath(imagePath);
    const sourceType = this.fileTypeFromPath(imagePath);
    this.openAiImage.ensureConfigured();
    const outputDir = path.join(process.cwd(), 'uploads', 'tree-standard', folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    const slots = [
      { key: '01-beyaz-ana-gorsel', title: '01 Beyaz ana görsel', mode: 'photoroom', prompt: '' },
      { key: '02-otel-lobisi-dukkan', title: '02 Otel lobisi / dükkan', mode: 'openai', prompt: this.treeScenePrompt('ürünü lüks bir otel lobisi, showroom veya çiçek dükkanı girişinde doğal ışıkla konumlandır') },
      { key: '03-modern-salon-ofis', title: '03 Modern salon / ofis', mode: 'openai', prompt: this.treeScenePrompt('ürünü modern salon veya kurumsal ofis köşesinde, gerçek kullanım ortamında konumlandır') },
      { key: '04-yakin-detay', title: '04 Yakın detay', mode: 'openai', prompt: this.treeScenePrompt('ürünün yaprak, gövde, saksı, taş ve malzeme kalitesini gösteren yakın detay fotoğrafı hazırla') },
      { key: '05-giris-olcu-algisi', title: '05 Giriş / ölçü algısı', mode: 'openai', prompt: this.treeScenePrompt('ürünü kapı, konsol veya koridor yanında boy algısı verecek şekilde konumlandır') },
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
        const editedBuffer = await this.openAiImage.editImage({
          sourcePath,
          fileType: sourceType,
          prompt: slot.prompt,
        });
        await fsPromises.writeFile(outputPath, editedBuffer);
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
      note: 'ChatGPT ile ağaç standart 5 görsel seti hazırlandı.',
    });
  }

  private treeScenePrompt(instruction: string) {
    return [
      'Referans ürün fotoğrafındaki yapay ağaç/bitki ürününü koru; ürün tipi, renkleri, saksısı, oranı ve malzeme hissi değişmesin.',
      instruction,
      'Kare 1:1 e-ticaret görseli üret. Ürün net, temiz, doğal ve premium görünsün.',
      'Ürünün üzerine yazı, logo, filigran, fiyat, kampanya etiketi veya ek aksesuar ekleme.',
      'Türkiye pazaryerleri için gerçekçi, parlak ama abartısız ürün fotoğrafı stili kullan.',
    ].join(' ');
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
