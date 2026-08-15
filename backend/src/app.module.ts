import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BarcodesModule } from './barcodes/barcodes.module';
import { MediaModule } from './media/media.module';
import { StockCardsModule } from './stock-cards/stock-cards.module';
import { CostsModule } from './costs/costs.module';
import { ProductionCostsModule } from './production-costs/production-costs.module';
import { AppController } from './app.controller';
import { SeoProductsModule } from './seo-products/seo-products.module';
import { FinanceModule } from './finance/finance.module';
import { StockCountsModule } from './stock-counts/stock-counts.module';
import { PublishingModule } from './publishing/publishing.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { SalesModule } from './sales/sales.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { StaffTasksModule } from './staff-tasks/staff-tasks.module';
import { ProductCenterModule } from './product-center/product-center.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: process.env.ENV_FILE || '.env' }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    ProductsModule,
    CategoriesModule,
    BarcodesModule,
    MediaModule,
    StockCardsModule,
    CostsModule,
    ProductionCostsModule,
    SeoProductsModule,
    FinanceModule,
    StockCountsModule,
    PublishingModule,
    SalesModule,
    ...(process.env.ENV_FILE?.endsWith('.env.dev') ? [DeliveriesModule] : []),
    ...(process.env.ENV_FILE?.endsWith('.env.dev') ? [KnowledgeBaseModule] : []),
    ...(process.env.ENV_FILE?.endsWith('.env.dev') ? [StaffTasksModule] : []),
    IntegrationsModule,
    ProductCenterModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
