import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BarcodesService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }

    if (product.barcode) {
      return { barcode: product.barcode, productId: product.id };
    }

    const barcode = `ERH${String(product.id).padStart(6, '0')}`;
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data: { barcode },
    });

    await this.prisma.barcodeLog.create({
      data: { productId: product.id, barcode },
    });

    return { barcode: updated.barcode, productId: updated.id };
  }

  async exportPdf(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }
    if (!product.barcode) {
      throw new BadRequestException('PDF oluşturmadan önce barkod üretin.');
    }

    const dir = path.join(process.cwd(), 'uploads', 'barcodes');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${product.modelCode}-barcode.pdf`;
    const absolutePath = path.join(dir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A6', margin: 24 });
      const stream = fs.createWriteStream(absolutePath);
      doc.pipe(stream);
      doc.fontSize(16).text('Erhan Flowers', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(product.productName, { align: 'center' });
      doc.text(product.modelCode, { align: 'center' });
      doc.moveDown();
      doc.fontSize(22).text(product.barcode ?? '', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text('Barkod ürün oluşturulduktan sonra değişmez.', { align: 'center' });
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const pdfPath = `/uploads/barcodes/${fileName}`;
    await this.prisma.barcodeLog.create({
      data: { productId: product.id, barcode: product.barcode, pdfPath },
    });

    return { absolutePath, pdfPath };
  }
}

