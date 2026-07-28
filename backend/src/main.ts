import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { stockImageFallbackRoot, stockImageRoot } from './stock-image-paths';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
});
  
  // Yeni yüklemeleri uygulamanın uploads klasöründen sun.
  const imageRoot = stockImageRoot();
  fs.mkdirSync(imageRoot, { recursive: true });
  app.useStaticAssets(imageRoot, {
    prefix: '/stock-images/',
  });

  // Eski arşivi taşımadan, yalnızca geriye dönük okuma kaynağı olarak koru.
  const fallbackImageRoot = stockImageFallbackRoot();
  if (fallbackImageRoot && fs.existsSync(fallbackImageRoot)) {
    app.useStaticAssets(fallbackImageRoot, {
      prefix: '/stock-images/',
    });
  }

  const port = process.env.PORT || 8001;
  await app.listen(port);
}
bootstrap();
