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

  async dailySales() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayOrders, yesterdayOrders, weekOrders, monthOrders] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { orderDate: { gte: todayStart }, status: { not: 'Cancelled' } },
        select: { platform: true, totalAmount: true },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: { orderDate: { gte: yesterdayStart, lt: todayStart }, status: { not: 'Cancelled' } },
        select: { platform: true, totalAmount: true },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: { orderDate: { gte: weekStart }, status: { not: 'Cancelled' } },
        select: { platform: true, totalAmount: true },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: { orderDate: { gte: monthStart }, status: { not: 'Cancelled' } },
        select: { platform: true, totalAmount: true },
      }),
    ]);

    return {
      today: this.aggregateSales(todayOrders),
      yesterday: this.aggregateSales(yesterdayOrders),
      thisWeek: this.aggregateSales(weekOrders),
      thisMonth: this.aggregateSales(monthOrders),
    };
  }

  private aggregateSales(orders: Array<{ platform: string; totalAmount: unknown }>) {
    const platforms: Record<string, number> = {};
    let revenue = 0;
    for (const order of orders) {
      const amount = Number(order.totalAmount);
      revenue += amount;
      platforms[order.platform] = (platforms[order.platform] ?? 0) + amount;
    }
    return { orderCount: orders.length, revenue: Math.round(revenue * 100) / 100, platforms };
  }
}
