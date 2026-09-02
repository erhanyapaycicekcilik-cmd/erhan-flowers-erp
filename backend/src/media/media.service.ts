import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { cleanMojibakeDeep } from '../common/mojibake';
import { GeminiImageService } from '../image-processing/gemini-image.service';
import { OpenAiImageService } from '../image-processing/openai-image.service';
import { PhotoroomService } from '../image-processing/photoroom.service';
import { PrismaService } from '../prisma/prisma.service';
import { productImageRoot } from '../product-image-paths';
import { stockImageFallbackRoots, stockImageRoot } from '../stock-image-paths';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoroom: PhotoroomService,
    private readonly openAiImage: OpenAiImageService,
    private readonly geminiImage: GeminiImageService,
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

  imageGenerationStatus() {
    const openAiReady = this.openAiImage.isConfigured();
    const geminiReady = this.geminiImage.isConfigured();
    return {
      openAiReady,
      geminiReady,
      ready: openAiReady || geminiReady,
      provider: openAiReady ? 'OpenAI' : geminiReady ? 'Gemini' : null,
      message: openAiReady
        ? 'OpenAI görsel üretimi hazır.'
        : geminiReady
          ? 'Gemini görsel üretimi hazır.'
          : 'Görsel üretim bağlantısı yok. OPENAI_API_KEY veya GEMINI_API_KEY ayarı gerekli.',
    };
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
    await this.moveUploadedFile(file.path, targetPath);

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

  async createFlowerStandardSet(body: { imagePath?: string; productId?: string; folderName?: string }) {
    const imagePath = String(body.imagePath || '').trim();
    if (!imagePath) throw new BadRequestException('7 görsel seti için ana görsel seçilmelidir.');

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = this.safeFolderName(body.folderName?.trim() || 'Cicek Gorsel Seti');
    const sourcePath = this.resolvePublicImagePath(imagePath);
    const sourceType = this.fileTypeFromPath(imagePath);
    this.ensureCompositeImageProvider();
    const outputDir = path.join(process.cwd(), 'uploads', 'flower-standard', folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    const slots = [
      { key: '01-beyaz-ana-gorsel', mode: 'photoroom', prompt: '' },
      { key: '02-ev-koltuk-cam', mode: 'ai', prompt: this.flowerScenePrompt('ürünü sıcak ve davetkar bir ev salonunda, koltuk yanında veya geniş cam kenarında doğal günışığıyla göster; ev yaşamına yakışan lifestyle fotoğrafı') },
      { key: '03-ofis-masa', mode: 'ai', prompt: this.flowerScenePrompt('ürünü modern ve temiz bir ofis masasında, yanında laptop veya kahve fincanıyla göster; kurumsal hediye veya ofis dekorasyonu atmosferi') },
      { key: '04-kafe-restoran', mode: 'ai', prompt: this.flowerScenePrompt('ürünü şık bir kafe veya restoran masasında, sıcak ambiyans ışığında ve cappuccino fincanı yanında göster; mekan dekorasyonu atmosferi') },
      { key: '05-yakin-yaprak', mode: 'ai', prompt: this.flowerScenePrompt('çiçeğin yaprak ve taç yapraklarının yakın çekimi; renk tonu, doku ve malzeme kalitesini ön plana çıkaran makro detay fotoğrafı') },
      { key: '06-yakin-saksi', mode: 'ai', prompt: this.flowerScenePrompt('çiçeğin saksı, vazo veya ambalajının yakın çekimi; sunum ve paketleme kalitesini gösteren detay fotoğrafı') },
      { key: '07-ecommerce-hero', mode: 'ai', prompt: this.flowerScenePrompt('e-ticaret satışına en uygun hero görsel; açık pastel arka plan, ürün tam ortada ve belirgin, Trendyol veya N11 ana görseli kalitesinde; müşteriyi sepete eklemeye yönlendiren kompozisyon') },
    ];

    const created = [];
    for (const slot of slots) {
      const outputFileName = `${Date.now()}-${slot.key}.png`;
      const outputPath = path.join(outputDir, outputFileName);

      if (slot.mode === 'photoroom') {
        try {
          const editedBuffer = await this.photoroom.editImage({ sourcePath, fileType: sourceType, backgroundColor: 'FFFFFF', padding: '0.12' });
          await fsPromises.writeFile(outputPath, editedBuffer);
        } catch {
          await fsPromises.copyFile(sourcePath, outputPath);
        }
      } else {
        const editedBuffer = await this.editCompositeProductImage({
          sourceFiles: [{ path: sourcePath, fileType: sourceType }],
          fileType: 'image/png',
          prompt: slot.prompt,
        });
        await fsPromises.writeFile(outputPath, editedBuffer);
      }

      const publicPath = `/uploads/flower-standard/${folderName}/${outputFileName}`;
      created.push(await this.prisma.mediaFile.create({
        data: {
          productId: productId && Number.isFinite(productId) ? productId : null,
          fileName: `${slot.key}.png`,
          filePath: publicPath,
          folderName: `${folderName} / 7 Gorsel Seti`,
          fileType: 'image/png',
        },
        include: { product: true },
      }));
    }

    return cleanMojibakeDeep({
      images: created.map((item) => item.filePath),
      mediaFiles: created,
      note: '7 görsel seti hazırlandı: Beyaz arka plan, ev, ofis, kafe, yaprak detay, saksı detay, e-ticaret hero.',
    });
  }

  private flowerScenePrompt(instruction: string) {
    return [
      'Referans fotoğraftaki çiçek/buket ürününü koru; çiçek türü, rengi, boyu, ambalajı ve genel görünümü hiç değişmesin.',
      instruction,
      'Kare 1:1 e-ticaret fotoğrafı üret. Ürün net, gerçekçi, temiz ışıklı ve premium görünsün.',
      'Ürünün üzerine yazı, logo, fiyat etiketi, kampanya bandı veya ekstra obje ekleme.',
      'Türkiye pazaryerleri (Trendyol, N11, Hepsiburada) için gerçekçi ve çekici ürün fotoğrafı stili kullan.',
    ].join(' ');
  }

  async createTreeStandardSet(body: { imagePath?: string; productId?: string; folderName?: string }) {
    const imagePath = String(body.imagePath || '').trim();
    if (!imagePath) throw new BadRequestException('Standart set için ana görsel seçilmelidir.');

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = this.safeFolderName(body.folderName?.trim() || 'Agac Standart Gorsel');
    const sourcePath = this.resolveUploadPath(imagePath);
    const sourceType = this.fileTypeFromPath(imagePath);
    this.ensureCompositeImageProvider();
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

  async createCompositeProductImage(body: { productStockCardId?: string; potStockCardId?: string; productId?: string; folderName?: string; productName?: string; referenceImageUrl?: string }) {
    const productStockCardId = Number(body.productStockCardId);
    const potStockCardId = Number(body.potStockCardId);
    if (!Number.isFinite(productStockCardId) || !Number.isFinite(potStockCardId)) {
      throw new BadRequestException('Ürün ve saksı stok kartı seçilmelidir.');
    }
    this.openAiImage.ensureConfigured();

    const [productStock, potStock] = await Promise.all([
      this.prisma.stockCard.findUnique({ where: { id: productStockCardId }, include: { images: { orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] } } }),
      this.prisma.stockCard.findUnique({ where: { id: potStockCardId }, include: { images: { orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] } } }),
    ]);
    if (!productStock) throw new BadRequestException('Ürün stok kartı bulunamadı.');
    if (!potStock) throw new BadRequestException('Saksı stok kartı bulunamadı.');

    const productImagePath = this.primaryStockImagePath(productStock);
    const potImagePath = this.primaryStockImagePath(potStock);
    if (!productImagePath) throw new BadRequestException('Seçilen ürün stok kartında görsel yok.');
    if (!potImagePath) throw new BadRequestException('Seçilen saksı stok kartında görsel yok.');

    const productId = body.productId ? Number(body.productId) : null;
    const folderName = this.safeFolderName(body.folderName?.trim() || body.productName?.trim() || `${productStock.name} ${potStock.name}`);
    const outputDir = path.join(process.cwd(), 'uploads', 'composite-products', folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    const referenceFile = body.referenceImageUrl ? await this.downloadReferenceImage(body.referenceImageUrl, outputDir) : null;
    const created = [];
    try {
      const sourceFiles = [
        { path: this.resolvePublicImagePath(productImagePath), fileType: this.fileTypeFromPath(productImagePath) },
        { path: this.resolvePublicImagePath(potImagePath), fileType: this.fileTypeFromPath(potImagePath) },
        ...(referenceFile ? [{ path: referenceFile.path, fileType: referenceFile.fileType }] : []),
      ];
      const slots = [
        { key: '01-beyaz-ana-gorsel', title: '01 Beyaz ana görsel', instruction: 'beyaz veya çok açık gri temiz fonda ana pazaryeri ürün görseli hazırla; ürün tam boy ve ortada olsun' },
        { key: '02-magaza-lobi', title: '02 Mağaza / lobi', instruction: 'ürünü modern çiçek mağazası, showroom veya otel lobisi ortamında gerçekçi kullanım görseli olarak konumlandır' },
        { key: '03-salon-ofis', title: '03 Salon / ofis', instruction: 'ürünü modern salon veya kurumsal ofis köşesinde doğal, sade ve premium dekorasyon görseli olarak göster' },
        { key: '04-yakin-detay', title: '04 Yakın detay', instruction: 'ürünün yaprak, gövde, saksı, taş ve malzeme kalitesini gösteren yakın detay fotoğrafı üret' },
        { key: '05-olcu-algisi', title: '05 Ölçü algısı', instruction: 'ürünü kapı, konsol veya koridor yanında boy ve hacim algısı verecek şekilde göster' },
      ];

      for (const slot of slots) {
        const outputFileName = `${Date.now()}-${slot.key}.png`;
        const outputPath = path.join(outputDir, outputFileName);
        const editedBuffer = await this.editCompositeProductImage({
          sourceFiles,
          fileType: 'image/png',
          prompt: this.compositeProductPrompt(productStock.name, potStock.name, body.productName, Boolean(referenceFile), slot.instruction),
        });
        await fsPromises.writeFile(outputPath, editedBuffer);

        const publicPath = `/uploads/composite-products/${folderName}/${outputFileName}`;
        created.push(await this.prisma.mediaFile.create({
          data: {
            productId: productId && Number.isFinite(productId) ? productId : null,
            fileName: `${slot.key}.png`,
            filePath: publicPath,
            folderName: `${folderName} / ChatGPT 5 Görsel`,
            fileType: 'image/png',
          },
          include: { product: true },
        }));
      }
    } finally {
      if (referenceFile) await fsPromises.unlink(referenceFile.path).catch(() => undefined);
    }

    return cleanMojibakeDeep({
      image: created[0]?.filePath,
      images: created.map((item) => item.filePath),
      mediaFiles: created,
      note: 'Ağaç, saksı ve referans görsel ile standart 5 satış görseli hazırlandı.',
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

  private compositeProductPrompt(productName: string, potName: string, productTitle?: string, hasExternalReference = false, slotInstruction = 'satışa hazır ana ürün görseli oluştur') {
    return [
      `Birinci referans görseldeki ürünü/bitkiyi ve ikinci referans görseldeki saksıyı kullanarak satışa hazır tek ürün kompozisyonu oluştur.`,
      `Ürün/bitki: ${productName}. Saksı: ${potName}. Final ürün adı: ${productTitle || `${productName} ${potName}`}.`,
      hasExternalReference ? 'Üçüncü referans görsel yalnızca kompozisyon, açı, kadraj ve genel satış görseli tarzı için kullanılsın; ürün ve saksı kimliği birinci ve ikinci referanstan gelsin.' : '',
      'Bitki saksının içine doğal ve orantılı şekilde yerleşsin; gövde, yaprak, saksı rengi ve malzeme hissi referanslara sadık kalsın.',
      slotInstruction,
      'Kare 1:1 e-ticaret görseli üret; ürün net, gerçekçi, temiz ışıklı ve pazaryeri kalitesinde olsun.',
      'Yazı, logo, filigran, fiyat etiketi, kampanya bandı, insan, ekstra obje veya dekor ekleme.',
    ].filter(Boolean).join(' ');
  }

  private ensureCompositeImageProvider() {
    if (this.openAiImage.isConfigured() || this.geminiImage.isConfigured()) return;
    throw new BadRequestException('Görsel üretim bağlantısı kurulmamış. OPENAI_API_KEY veya GEMINI_API_KEY ayarı eklenmelidir.');
  }

  private async editCompositeProductImage(options: { sourceFiles: Array<{ path: string; fileType: string }>; fileType: string; prompt: string }) {
    if (this.openAiImage.isConfigured()) {
      return this.openAiImage.editImage(options);
    }
    return this.geminiImage.editImage({
      sourceFiles: options.sourceFiles,
      prompt: options.prompt,
    });
  }

  private primaryStockImagePath(stockCard: { imagePath?: string | null; images?: Array<{ filePath: string | null; isMain?: boolean | null }> }) {
    return stockCard.images?.find((image) => image.isMain && image.filePath)?.filePath
      ?? stockCard.images?.find((image) => image.filePath)?.filePath
      ?? stockCard.imagePath
      ?? null;
  }

  private resolvePublicImagePath(filePath: string) {
    if (filePath.startsWith('/uploads/products/')) {
      const relativePath = filePath.replace(/^\/uploads\/products\//, '');
      const inProductRoot = path.normalize(path.join(productImageRoot(), relativePath));
      if (fs.existsSync(inProductRoot)) return inProductRoot;
      return this.resolveUploadPath(filePath);
    }
    if (filePath.startsWith('/uploads/')) return this.resolveUploadPath(filePath);
    if (filePath.startsWith('/stock-images/')) {
      const relativePath = filePath.replace(/^\/stock-images\//, '');
      const roots = [stockImageRoot(), path.join(process.cwd(), 'uploads'), path.join(process.cwd(), 'uploads', 'stock-cards'), ...stockImageFallbackRoots()];
      for (const root of roots) {
        const absolutePath = path.normalize(path.join(root, relativePath));
        const normalizedRoot = path.normalize(root);
        if (absolutePath.startsWith(normalizedRoot) && fs.existsSync(absolutePath)) return absolutePath;
      }
    }
    throw new BadRequestException('Görsel dosyası bulunamadı.');
  }

  private async downloadReferenceImage(referenceImageUrl: string, outputDir: string) {
    const url = this.safeReferenceUrl(referenceImageUrl);
    const response = await fetch(url);
    if (!response.ok) throw new BadRequestException('Referans görsel indirilemedi.');
    const fileType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    if (!fileType.startsWith('image/')) throw new BadRequestException('Referans URL görsel dosyası değil.');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) throw new BadRequestException('Referans görsel 10 MB üzerinde olamaz.');
    const extension = fileType.includes('png') ? '.png' : fileType.includes('webp') ? '.webp' : '.jpg';
    const referencePath = path.join(outputDir, `${Date.now()}-internet-referans${extension}`);
    await fsPromises.writeFile(referencePath, buffer);
    return { path: referencePath, fileType };
  }

  private safeReferenceUrl(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Referans görsel URL geçerli değil.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new BadRequestException('Referans görsel URL http veya https olmalıdır.');
    const host = url.hostname.toLocaleLowerCase('tr-TR');
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
      throw new BadRequestException('Yerel ağ adresleri referans görsel olarak kullanılamaz.');
    }
    return url.toString();
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

  private async moveUploadedFile(sourcePath: string, targetPath: string) {
    try {
      await fsPromises.rename(sourcePath, targetPath);
    } catch {
      await fsPromises.copyFile(sourcePath, targetPath);
      await fsPromises.unlink(sourcePath).catch(() => undefined);
    }
  }
}
