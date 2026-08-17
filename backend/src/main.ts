import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { stockImageFallbackRoots, stockImageRoot } from './stock-image-paths';
import { productImageRoot } from './product-image-paths';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = new Set([
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}:(3000|3001|3101)$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
});
  
  // Yeni yüklemeler ana development klasörüne yazılır; eski/ithal görseller taşınmadan okunur.
  const imageRoot = stockImageRoot();
  fs.mkdirSync(imageRoot, { recursive: true });
  const stockImageStaticRoots = [
    imageRoot,
    join(process.cwd(), 'uploads'),
    join(process.cwd(), 'uploads', 'stock-cards'),
  ];

  for (const root of Array.from(new Set(stockImageStaticRoots))) {
    if (fs.existsSync(root)) {
      app.useStaticAssets(root, {
        prefix: '/stock-images/',
      });
    }
  }

  const uploadsRoot = join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsRoot)) {
    app.useStaticAssets(uploadsRoot, {
      prefix: '/uploads/',
    });
  }

  // Yeni ürün görselleri "Yeni Ürün ERP" köküne yazılır; eski dosyalar proje
  // içindeki uploads/products altında geriye dönük olarak yukarıdaki genel
  // /uploads/ eşlemesiyle okunmaya devam eder.
  const productRoot = productImageRoot();
  fs.mkdirSync(productRoot, { recursive: true });
  if (fs.existsSync(productRoot)) {
    app.useStaticAssets(productRoot, {
      prefix: '/uploads/products/',
    });
  }

  // Eski arşivi taşımadan, yalnızca geriye dönük okuma kaynağı olarak koru.
  for (const fallbackImageRoot of stockImageFallbackRoots()) {
    if (fs.existsSync(fallbackImageRoot)) {
      app.useStaticAssets(fallbackImageRoot, {
        prefix: '/stock-images/',
      });
    }
  }

  const port = process.env.PORT || 8001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
