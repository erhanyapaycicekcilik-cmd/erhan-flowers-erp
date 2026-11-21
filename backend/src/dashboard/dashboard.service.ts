import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  private readonly settlementCache = new Map<string, { at: number; data: Awaited<ReturnType<IntegrationsService['platformSettlements']>> }>();

  /** Hakedişler (Trendyol cari hesap ekstresi). 10 dk önbellek, en fazla 93 gün. */
  async settlements(fromStr?: string, toStr?: string, refresh = false) {
    const today = new Date(Date.now() + 3 * 3600000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const to = valid(toStr) ?? iso(today);
    const from = valid(fromStr) ?? `${iso(today).slice(0, 8)}01`;
    if (from > to) throw new BadRequestException('Başlangıç tarihi bitişten sonra olamaz.');
    const span = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    if (span > 93) throw new BadRequestException('Hakediş için en fazla 93 günlük aralık seçilebilir.');
    const key = `${from}|${to}`;
    let c = this.settlementCache.get(key);
    if (!c || refresh || Date.now() - c.at > 10 * 60000) {
      c = { at: Date.now(), data: await this.integrations.platformSettlements(from, to) };
      this.settlementCache.set(key, c);
      if (this.settlementCache.size > 30) this.settlementCache.delete(this.settlementCache.keys().next().value as string);
    }
    return { from, to, fetchedAt: new Date(c.at).toISOString(), stores: c.data };
  }

  /** Platform ciro sorgusu önbelleği (API'leri yormamak için 10 dk) */
  private readonly platformCache = new Map<string, { at: number; data: Awaited<ReturnType<IntegrationsService['platformRevenue']>> }>();

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

    // Telefon / WhatsApp / Instagram / Dükkan — elle girilen siparişler
    const retailRows = await this.prisma.$queryRaw<Array<{ todayRevenue: number; todayOrders: number; monthRevenue: number; monthOrders: number }>>`
      SELECT
        COALESCE(SUM(grand_total) FILTER (WHERE created_at::date = CURRENT_DATE AND status NOT IN ('CANCELLED','DRAFT')), 0)::float AS "todayRevenue",
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND status NOT IN ('CANCELLED','DRAFT'))::int AS "todayOrders",
        COALESCE(SUM(grand_total) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND status NOT IN ('CANCELLED','DRAFT')), 0)::float AS "monthRevenue",
        COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND status NOT IN ('CANCELLED','DRAFT'))::int AS "monthOrders"
      FROM retail_sales
      WHERE channel::text = ANY(ARRAY['PHONE','WHATSAPP','INSTAGRAM','STORE','OTHER'])
        AND (integration_sync_status = 'MANUAL' OR integration_sync_status IS NULL)
    `;
    const rr = retailRows[0];
    if (rr && (Number(rr.todayOrders) > 0 || Number(rr.monthOrders) > 0)) {
      rows.push({
        companyCode: 'RETAIL',
        companyName: 'Telefon & Dükkan',
        todayRevenue: Number(rr.todayRevenue),
        todayOrders: Number(rr.todayOrders),
        monthRevenue: Number(rr.monthRevenue),
        monthOrders: Number(rr.monthOrders),
      });
    }

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

  /**
   * Günlük ciro defteri (Türkiye saatine göre gün). Kaynaklar çakışmasın diye:
   *  - Pazaryerleri: marketplace_orders (iptal/iade/teslim edilemedi hariç; FLORA_ önekli = Flora mağazası)
   *  - Dükkan/telefon/WhatsApp/Instagram: retail_sales'te ELLE girilenler (pazaryeri aktarımları hariç)
   *  - Web sitesi: ödenmiş ya da onaylanmış web_orders (iptal hariç)
   */
  async revenueLedger(fromStr?: string, toStr?: string, live = true, refresh = false) {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const to = valid(toStr) ?? iso(today);
    const from = valid(fromStr) ?? iso(new Date(today.getFullYear(), today.getMonth(), 1));
    if (from > to) throw new BadRequestException('Başlangıç tarihi bitişten sonra olamaz.');
    const spanDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    if (spanDays > 400) throw new BadRequestException('En fazla 400 günlük aralık seçilebilir.');

    const rows = await this.prisma.$queryRaw<Array<{ day: string; channel: string; revenue: number; orders: number }>>`
      WITH src AS (
        SELECT ((COALESCE(mo.order_date, mo.created_at) AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul')::date AS day,
               CASE WHEN mo.external_order_id LIKE 'FLORA\_%' THEN mo.platform || '_FLORA' ELSE mo.platform END AS channel,
               mo.total_amount::float AS amount
        FROM marketplace_orders mo
        WHERE NOT (LOWER(COALESCE(mo.status, '')) ~ '(cancel|iptal|return|iade|undeliver|reject|refund)')
        UNION ALL
        SELECT ((COALESCE(s.order_date, s.created_at) AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul')::date,
               s.channel::text,
               s.grand_total::float
        FROM retail_sales s
        WHERE s.channel::text IN ('STORE', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'OTHER')
          AND (s.integration_sync_status IS NULL OR s.integration_sync_status = 'MANUAL')
          AND s.status::text NOT IN ('CANCELLED', 'DRAFT')
        UNION ALL
        SELECT ((wo.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul')::date,
               'WEBSITE',
               wo.grand_total::float
        FROM web_orders wo
        WHERE wo.status::text <> 'CANCELLED'
          AND (wo.paid_at IS NOT NULL OR wo.status::text IN ('CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'))
      )
      SELECT to_char(day, 'YYYY-MM-DD') AS day, channel, SUM(amount)::float AS revenue, COUNT(*)::int AS orders
      FROM src
      WHERE day BETWEEN ${from}::date AND ${to}::date
      GROUP BY day, channel
      ORDER BY day, channel
    `;

    // Trendyol / n11 (Erhan + Flora): veriyi doğrudan platformdan al; alınamayan kanalda ERP kaydı kalır
    const sources: Record<string, 'PLATFORM' | 'ERP'> = {};
    const platformErrors: Array<{ channel: string; error: string }> = [];
    let liveNote: string | null = null;
    const oldest = new Date(today.getTime() - 180 * 86400000);
    if (live && (spanDays > 93 || new Date(from) < oldest)) {
      liveNote = 'Platformdan canlı veri en fazla 93 günlük ve son 6 aylık aralıkta alınır; bu aralıkta ERP kayıtları gösteriliyor.';
    } else if (live) {
      const key = `${from}|${to}`;
      let cached = this.platformCache.get(key);
      if (!cached || refresh || Date.now() - cached.at > 10 * 60000) {
        cached = { at: Date.now(), data: await this.integrations.platformRevenue(from, to) };
        this.platformCache.set(key, cached);
        if (this.platformCache.size > 50) this.platformCache.delete(this.platformCache.keys().next().value as string);
      }
      for (const res of cached.data) {
        if (!res.ok) { platformErrors.push({ channel: res.channel, error: res.error ?? 'bilinmeyen hata' }); continue; }
        sources[res.channel] = 'PLATFORM';
        // Bu kanalın ERP satırlarını platform rakamlarıyla değiştir
        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].channel === res.channel) rows.splice(i, 1);
        for (const [day, v] of Object.entries(res.days)) rows.push({ day, channel: res.channel, revenue: v.revenue, orders: v.orders });
      }
    }
    for (const r of rows) sources[r.channel] ??= 'ERP';

    // Her gün için satır (satış olmayan günler 0)
    const days: Array<{ date: string; total: number; orders: number; byChannel: Record<string, number> }> = [];
    for (let d = new Date(`${from}T12:00:00Z`); iso2(d) <= to; d = new Date(d.getTime() + 86400000)) {
      days.push({ date: iso2(d), total: 0, orders: 0, byChannel: {} });
    }
    function iso2(d: Date) { return d.toISOString().slice(0, 10); }
    const byDay = new Map(days.map((x) => [x.date, x]));
    const channelTotals: Record<string, { revenue: number; orders: number }> = {};
    for (const r of rows) {
      const day = byDay.get(r.day);
      if (!day) continue;
      day.byChannel[r.channel] = Math.round(((day.byChannel[r.channel] ?? 0) + r.revenue) * 100) / 100;
      day.total += r.revenue;
      day.orders += r.orders;
      const ct = (channelTotals[r.channel] ??= { revenue: 0, orders: 0 });
      ct.revenue += r.revenue;
      ct.orders += r.orders;
    }
    for (const d of days) d.total = Math.round(d.total * 100) / 100;
    const total = Math.round(days.reduce((s, d) => s + d.total, 0) * 100) / 100;
    const orders = days.reduce((s, d) => s + d.orders, 0);
    const activeDays = days.filter((d) => d.date <= iso(today)).length || 1;
    return {
      from, to,
      total, orders,
      sources,
      platformErrors,
      liveNote,
      fetchedAt: new Date().toISOString(),
      dailyAverage: Math.round((total / activeDays) * 100) / 100,
      bestDay: days.reduce<typeof days[number] | null>((b, d) => (!b || d.total > b.total ? d : b), null),
      channels: Object.entries(channelTotals)
        .map(([channel, v]) => ({ channel, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }))
        .sort((a, b) => b.revenue - a.revenue),
      days,
    };
  }
}
