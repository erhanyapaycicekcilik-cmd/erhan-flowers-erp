import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import { stockImageFallbackRoots, stockImageRoot } from './stock-image-paths';
import { productImageRoot } from './product-image-paths';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';

  // Helmet: HTTP güvenlik başlıkları (XSS, clickjacking, MIME sniffing vb.)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // görseller için
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    } : false,
  }));

  // CORS: sadece kendi frontend ve API domainlerine izin ver
  const allowedOrigins = new Set([
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    'https://erp.florayapaycicek.com',
    'https://florayapaycicek.com',
    'https://www.florayapaycicek.com',
    'http://erp.florayapaycicek.com',
    'http://florayapaycicek.com',
    'http://www.florayapaycicek.com',
  ].filter(Boolean) as string[]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; } // server-to-server
      if (allowedOrigins.has(origin)) { callback(null, true); return; }
      if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true); return;
      }
      if (!isProduction && /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}:\d+$/.test(origin)) {
        callback(null, true); return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Statik dosyalar
  const imageRoot = stockImageRoot();
  fs.mkdirSync(imageRoot, { recursive: true });
  const stockImageStaticRoots = [
    imageRoot,
    join(process.cwd(), 'uploads'),
    join(process.cwd(), 'uploads', 'stock-cards'),
  ];

  for (const root of Array.from(new Set(stockImageStaticRoots))) {
    if (fs.existsSync(root)) {
      app.useStaticAssets(root, { prefix: '/stock-images/' });
    }
  }

  const uploadsRoot = join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsRoot)) {
    app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });
  }

  const productRoot = productImageRoot();
  fs.mkdirSync(productRoot, { recursive: true });
  if (fs.existsSync(productRoot)) {
    app.useStaticAssets(productRoot, { prefix: '/uploads/products/' });
  }

  for (const fallbackImageRoot of stockImageFallbackRoots()) {
    if (fs.existsSync(fallbackImageRoot)) {
      app.useStaticAssets(fallbackImageRoot, { prefix: '/stock-images/' });
    }
  }

  const port = process.env.PORT || 8001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
