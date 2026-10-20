import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userRole?: string) {
    const [totalProducts, totalImages, totalBarcodes, stockProducts, recentlyAddedProducts, stockCards, outOfStockCards] =
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
        userRole === 'OWNER'
          ? this.prisma.stockCard.findMany({
              where: { status: 'ACTIVE', stockQuantity: { lte: 0 } },
              select: { id: true, name: true, sku: true, barcode: true, stockQuantity: true },
              orderBy: { updatedAt: 'desc' },
              take: 20,
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
      outOfStockCount: userRole === 'OWNER' ? outOfStockCards.length : 0,
      outOfStockCards: userRole === 'OWNER' ? outOfStockCards : [],
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

    const [marketOrders, webOrders] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { orderDate: { gte: monthStart < weekStart ? monthStart : weekStart }, status: { not: 'Cancelled' } },
        select: { platform: true, totalAmount: true, orderDate: true },
      }),
      this.webSiteOrders(monthStart < weekStart ? monthStart : weekStart),
    ]);
    const all = [
      ...marketOrders.map((o) => ({ platform: o.platform, totalAmount: o.totalAmount, date: o.orderDate as Date })),
      ...webOrders,
    ];
    const between = (from: Date, to?: Date) => all.filter((o) => o.date >= from && (!to || o.date < to));

    return {
      today: this.aggregateSales(between(todayStart)),
      yesterday: this.aggregateSales(between(yesterdayStart, todayStart)),
      thisWeek: this.aggregateSales(between(weekStart)),
      thisMonth: this.aggregateSales(between(monthStart)),
    };
  }

  /**
   * www.erhanflowers.com siparişleri — sadece gerçekleşen satışlar: kartla ödenmiş ya da
   * ERP'de onaylanmış (WhatsApp/EFT siparişi "Yeni" durumdayken ciroya girmez)
   */
  private async webSiteOrders(from: Date, to?: Date) {
    const rows = await this.prisma.webOrder.findMany({
      where: {
        createdAt: { gte: from, ...(to ? { lt: to } : {}) },
        status: { not: 'CANCELLED' },
        OR: [{ paidAt: { not: null } }, { status: { in: ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'] } }],
      },
      select: { grandTotal: true, createdAt: true, orderNumber: true, customerName: true },
    });
    return rows.map((o) => ({
      platform: 'WEB SİTESİ',
      totalAmount: o.grandTotal,
      date: o.createdAt,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
    }));
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

  async dailyReport(dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const [marketOrders, webOrders, retailSales, stockMovements] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { orderDate: { gte: dayStart, lt: dayEnd }, status: { not: 'Cancelled' } },
        select: { platform: true, totalAmount: true, cargoAmount: true, orderNumber: true, customerName: true },
      }),
      this.webSiteOrders(dayStart, dayEnd),
      this.prisma.retailSale.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
        select: { grandTotal: true, channel: true, saleNumber: true },
      }),
      this.prisma.stockMovement.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd }, type: 'OUT' },
        include: { stockCard: { select: { name: true, purchasePrice: true, unit: true } } },
      }),
    ]);

    const marketplaceOrders = [
      ...marketOrders,
      ...webOrders.map((o) => ({ platform: o.platform, totalAmount: o.totalAmount, cargoAmount: 0, orderNumber: o.orderNumber, customerName: o.customerName })),
    ];

    // Ciro hesapla
    const marketplaceRevenue = marketplaceOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const retailRevenue = retailSales.reduce((s, o) => s + Number(o.grandTotal), 0);
    const totalRevenue = marketplaceRevenue + retailRevenue;

    // Platform bazında satışlar
    const byPlatform: Record<string, { orders: number; revenue: number }> = {};
    for (const o of marketplaceOrders) {
      if (!byPlatform[o.platform]) byPlatform[o.platform] = { orders: 0, revenue: 0 };
      byPlatform[o.platform].orders++;
      byPlatform[o.platform].revenue += Number(o.totalAmount);
    }
    if (retailSales.length > 0) {
      byPlatform['Mağaza'] = { orders: retailSales.length, revenue: retailRevenue };
    }

    // Stok çıkışları ve maliyet
    const stockOut = stockMovements.map((m) => ({
      name: m.stockCard?.name ?? 'Bilinmiyor',
      quantity: Number(m.quantity),
      unit: m.unit,
      unitCost: Number(m.stockCard?.purchasePrice ?? 0),
      totalCost: Number(m.quantity) * Number(m.stockCard?.purchasePrice ?? 0),
      reason: m.reason ?? '',
    }));
    const totalCost = stockOut.reduce((s, m) => s + m.totalCost, 0);
    const estimatedProfit = totalRevenue - totalCost;

    // En çok satan ürünler (marketplace)
    const topProducts: Record<string, number> = {};
    for (const m of stockMovements) {
      const name = m.stockCard?.name ?? 'Bilinmiyor';
      topProducts[name] = (topProducts[name] ?? 0) + Number(m.quantity);
    }
    const topProductsList = Object.entries(topProducts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, quantity]) => ({ name, quantity }));

    return {
      date: dayStart.toISOString().split('T')[0],
      revenue: { total: Math.round(totalRevenue * 100) / 100, marketplace: Math.round(marketplaceRevenue * 100) / 100, retail: Math.round(retailRevenue * 100) / 100 },
      orders: { total: marketplaceOrders.length + retailSales.length, marketplace: marketplaceOrders.length, retail: retailSales.length },
      byPlatform,
      stockOut,
      cost: Math.round(totalCost * 100) / 100,
      estimatedProfit: Math.round(estimatedProfit * 100) / 100,
      topProducts: topProductsList,
    };
  }

  async dailySalesByCompany() {
    const rows = await this.prisma.$queryRaw<Array<{ companyCode: string; companyName: string; todayRevenue: number; todayOrders: number; monthRevenue: number; monthOrders: number }>>`
      SELECT
        co.code AS "companyCode",
        co.name AS "companyName",
        COALESCE(SUM(s.grand_total) FILTER (WHERE s.created_at::date = CURRENT_DATE AND s.status NOT IN ('CANCELLED')), 0)::float AS "todayRevenue",
        COUNT(*) FILTER (WHERE s.created_at::date = CURRENT_DATE AND s.status NOT IN ('CANCELLED'))::int AS "todayOrders",
        COALESCE(SUM(s.grand_total) FILTER (WHERE DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE) AND s.status NOT IN ('CANCELLED')), 0)::float AS "monthRevenue",
        COUNT(*) FILTER (WHERE DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE) AND s.status NOT IN ('CANCELLED'))::int AS "monthOrders"
      FROM companies co
      LEFT JOIN retail_sales s ON s.company_id = co.id AND s.integration_sync_status <> 'MANUAL'
      WHERE co.is_active = true
      GROUP BY co.id, co.code, co.name
      ORDER BY co.code
    `;

    // www.erhanflowers.com — ayrı kanal olarak (retail_sales'e yazılmıyor)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const web = await this.webSiteOrders(monthStart);
    const webToday = web.filter((o) => o.date >= todayStart);
    rows.push({
      companyCode: 'WEB',
      companyName: 'Web Sitesi',
      todayRevenue: webToday.reduce((s, o) => s + Number(o.totalAmount), 0),
      todayOrders: webToday.length,
      monthRevenue: web.reduce((s, o) => s + Number(o.totalAmount), 0),
      monthOrders: web.length,
    });

    const totalToday = rows.reduce((sum, r) => sum + Number(r.todayRevenue), 0);
    const totalMonth = rows.reduce((sum, r) => sum + Number(r.monthRevenue), 0);
    const totalTodayOrders = rows.reduce((sum, r) => sum + Number(r.todayOrders), 0);
    const totalMonthOrders = rows.reduce((sum, r) => sum + Number(r.monthOrders), 0);

    return {
      byCompany: rows.map(r => ({
        companyCode: r.companyCode,
        companyName: r.companyName,
        todayRevenue: Math.round(Number(r.todayRevenue) * 100) / 100,
        todayOrders: Number(r.todayOrders),
        monthRevenue: Math.round(Number(r.monthRevenue) * 100) / 100,
        monthOrders: Number(r.monthOrders),
      })),
      total: {
        todayRevenue: Math.round(totalToday * 100) / 100,
        todayOrders: totalTodayOrders,
        monthRevenue: Math.round(totalMonth * 100) / 100,
        monthOrders: totalMonthOrders,
      },
    };
  }
}
