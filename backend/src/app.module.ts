import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { MarketIntelligenceModule } from './market-intelligence/market-intelligence.module';
import { PublicCatalogModule } from './public-catalog/public-catalog.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: process.env.ENV_FILE || '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ScheduleModule.forRoot(),
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
    MarketIntelligenceModule,
    PublicCatalogModule,
    SuppliersModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
