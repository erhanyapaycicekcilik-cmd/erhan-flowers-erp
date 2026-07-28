import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userRole?: string) {
    const [totalProducts, totalImages, totalBarcodes, stockProducts, recentlyAddedProducts, stockCards] =
      await Promise.all([
        this.prisma.product.count({ where: { status: 'ACTIVE' } }),
        this.prisma.mediaFile.count(),
        this.prisma.product.count({ where: { barcode: { not: null } } }),
        this.prisma.product.findMany({
          where: { status: 'ACTIVE' },
          include: { category: true },
          orderBy: { stockQuantity: 'asc' },
        }),
        this.prisma.product.findMany({
          take: 5,
          include: { category: true },
          orderBy: { createdAt: 'desc' },
        }),
        userRole === 'OWNER'
          ? this.prisma.stockCard.findMany({
              where: { status: 'ACTIVE' },
              select: { purchasePrice: true, stockQuantity: true },
            })
          : Promise.resolve([]),
      ]);

    const allCriticalStocks = stockProducts.filter((product) => product.stockQuantity <= product.criticalStockLevel);
    const criticalStocks = allCriticalStocks.slice(0, 10);
    const totalProductCost = stockCards.reduce((sum, stockCard) => {
      return sum + Number(stockCard.purchasePrice) * Number(stockCard.stockQuantity);
    }, 0);

    const summary = {
      totalProducts,
      totalImages,
      totalBarcodes,
      criticalStockCount: userRole === 'OWNER' ? allCriticalStocks.length : 0,
      criticalStocks: userRole === 'OWNER' ? criticalStocks : [],
      recentlyAddedProducts: userRole === 'OWNER' ? recentlyAddedProducts : [],
    };

    return userRole === 'OWNER'
      ? {
          ...summary,
          totalProductCost,
        }
      : summary;
  }
}
