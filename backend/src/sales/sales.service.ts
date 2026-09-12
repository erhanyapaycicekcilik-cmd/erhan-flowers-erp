import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinanceDirection, FinanceTransactionType, Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

type SaleCustomerPayload = Record<string, unknown>;
type SaleAddressPayload = Record<string, unknown>;
type SaleItemPayload = Record<string, unknown>;
type SalePaymentPayload = Record<string, unknown>;
type SaleDeliveryPayload = Record<string, unknown>;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(query: string) {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return [];

    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { barcode: { contains: cleanQuery, mode: 'insensitive' } },
          { productName: { contains: cleanQuery, mode: 'insensitive' } },
          { currentModelCode: { contains: cleanQuery, mode: 'insensitive' } },
          { proposedModelCode: { contains: cleanQuery, mode: 'insensitive' } },
          { supplierStockCode: { contains: cleanQuery, mode: 'insensitive' } },
          { seoProductName: { contains: cleanQuery, mode: 'insensitive' } },
          { seoManualProductName: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        family: true,
        productCostDraft: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { barcode: { contains: cleanQuery, mode: 'insensitive' } },
          { productName: { contains: cleanQuery, mode: 'insensitive' } },
          { modelCode: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        mediaFiles: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const lookupValues = Array.from(
      new Set(
        [
          ...variants.flatMap((variant) => [variant.barcode, variant.currentModelCode, variant.proposedModelCode, variant.supplierStockCode]),
          ...products.flatMap((product) => [product.barcode, product.modelCode]),
        ]
          .filter(Boolean) as string[],
      ),
    );
    const stockCards =
      lookupValues.length > 0
        ? await this.prisma.stockCard.findMany({
            where: {
              status: 'ACTIVE',
              OR: [{ barcode: { in: lookupValues } }, { sku: { in: lookupValues } }, { oldModelCode: { in: lookupValues } }],
            },
            select: { id: true, barcode: true, sku: true, oldModelCode: true, stockQuantity: true, unit: true },
          })
        : [];

    const variantResults = variants.map((variant) => {
      const stockCard = stockCards.find((card) =>
        [card.barcode, card.sku, card.oldModelCode].some((value) => value && [variant.barcode, variant.currentModelCode, variant.proposedModelCode, variant.supplierStockCode].includes(value)),
      );

      return {
        id: variant.id,
        variantId: variant.id,
        barcode: variant.barcode,
        productName: variant.seoManualProductName || variant.seoProductName || variant.productName,
        originalProductName: variant.productName,
        currentModelCode: variant.currentModelCode,
        proposedModelCode: variant.proposedModelCode,
        supplierStockCode: variant.supplierStockCode,
        categoryName: variant.trendyolCategoryName,
        familyName: variant.family?.familyName ?? variant.suggestedFamilyName,
        size: variant.detectedSize,
        pot: variant.detectedPot,
        stockQuantity: Number(stockCard?.stockQuantity ?? variant.stockQuantity ?? 0),
        stockUnit: stockCard?.unit ?? 'Adet',
        stockCardId: stockCard?.id ?? null,
        salePrice: Number(variant.productCostDraft?.salePrice ?? variant.trendyolSalePrice ?? 0),
        trendyolSalePrice: Number(variant.trendyolSalePrice ?? 0),
        trendyolProductUrl: variant.trendyolProductUrl,
        imageUrl: this.firstImage(variant.images),
      };
    });

    const productResults = products.map((product) => {
      const stockCard = stockCards.find((card) =>
        [card.barcode, card.sku, card.oldModelCode].some((value) => value && [product.barcode, product.modelCode].includes(value)),
      );
      const mediaPath = product.mediaFiles.find((file) => file.fileType?.startsWith('image/'))?.filePath ?? null;
      return {
        id: -product.id,
        variantId: null,
        barcode: product.barcode ?? product.modelCode,
        productName: product.productName,
        originalProductName: product.productName,
        currentModelCode: product.modelCode,
        proposedModelCode: product.modelCode,
        supplierStockCode: null,
        categoryName: product.category?.name ?? null,
        familyName: product.brand ?? null,
        size: null,
        pot: null,
        stockQuantity: Number(stockCard?.stockQuantity ?? product.stockQuantity ?? 0),
        stockUnit: stockCard?.unit ?? 'Adet',
        stockCardId: stockCard?.id ?? null,
        salePrice: Number(product.shopPrice ?? product.sitePrice ?? product.marketPrice ?? 0),
        trendyolSalePrice: Number(product.marketPrice ?? product.shopPrice ?? 0),
        trendyolProductUrl: null,
        imageUrl: mediaPath ?? this.firstImage(product.imageUrls),
      };
    });

    // Stok kartlarını doğrudan ara — saksı/toprak/aksesuar gibi ürünler sadece burada olabilir
    const usedStockCardIds = new Set([
      ...variantResults.map((r) => r.stockCardId),
      ...productResults.map((r) => r.stockCardId),
    ].filter(Boolean) as number[]);

    const directStockCards = await this.prisma.stockCard.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { sku: { contains: cleanQuery, mode: 'insensitive' } },
          { barcode: { contains: cleanQuery, mode: 'insensitive' } },
          { oldModelCode: { contains: cleanQuery, mode: 'insensitive' } },
          { category: { contains: cleanQuery, mode: 'insensitive' } },
          { productFamily: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, name: true, sku: true, barcode: true, oldModelCode: true,
        category: true, productFamily: true, size: true, potType: true,
        stockQuantity: true, unit: true, salePrice: true, imagePath: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const stockCardResults = directStockCards
      .filter((card) => !usedStockCardIds.has(card.id))
      .map((card) => ({
        id: -(card.id + 1_000_000), // negatif ve büyük alan — product ID'leriyle çakışmasın
        variantId: null,
        barcode: card.barcode ?? card.sku ?? '',
        productName: card.name,
        originalProductName: card.name,
        currentModelCode: card.sku ?? card.oldModelCode ?? null,
        proposedModelCode: card.sku ?? null,
        supplierStockCode: null,
        categoryName: card.category ?? card.productFamily ?? null,
        familyName: card.productFamily ?? null,
        size: card.size ?? null,
        pot: card.potType ?? null,
        stockQuantity: Number(card.stockQuantity ?? 0),
        stockUnit: card.unit ?? 'Adet',
        stockCardId: card.id,
        salePrice: Number(card.salePrice ?? 0),
        trendyolSalePrice: Number(card.salePrice ?? 0),
        trendyolProductUrl: null,
        imageUrl: card.imagePath ?? null,
      }));

    return [...variantResults, ...productResults, ...stockCardResults].slice(0, 40);
  }

  async searchCustomers(query: string) {
    const normalizedPhone = this.normalizePhone(query);
    const cleanText = this.text(query);
    if (cleanText.length === 1) return [];

    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        c.id,
        c.customer_code AS "customerCode",
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.display_name AS "displayName",
        c.phone,
        c.whatsapp_phone AS "whatsappPhone",
        c.normalized_phone AS "normalizedPhone",
        c.secondary_phone AS "secondaryPhone",
        c.email,
        c.customer_note AS "customerNote",
        COALESCE(COUNT(DISTINCT s.id), 0)::int AS "saleCount",
        COALESCE(SUM(s.grand_total) FILTER (WHERE s.status <> 'CANCELLED'), 0) AS "totalSpent",
        MAX(s.created_at) AS "lastSaleAt",
        c.whatsapp_marketing_allowed AS "whatsappMarketingAllowed",
        c.source,
        c.is_active AS "isActive",
        (SELECT a.city FROM retail_customer_addresses a WHERE a.customer_id = c.id AND a.is_active = true ORDER BY a.is_default DESC, a.updated_at DESC LIMIT 1) AS city,
        COALESCE((SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
          FROM retail_customer_tags ct JOIN retail_customer_tag_definitions t ON t.id = ct.tag_id
          WHERE ct.customer_id = c.id AND t.is_active = true), '[]'::json) AS tags
      FROM retail_customers c
      LEFT JOIN retail_sales s ON s.customer_id = c.id
      WHERE c.is_active = true
        AND (
          ${cleanText}::text = ''
          OR
          (${normalizedPhone}::text IS NOT NULL AND c.normalized_phone = ${normalizedPhone})
          OR (${cleanText}::text <> '' AND c.display_name ILIKE ${`%${cleanText}%`})
        )
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 10
    `;
    return rows;
  }

  async getCustomer(id: number) {
    const customers = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, customer_code AS "customerCode", customer_type AS "customerType", first_name AS "firstName", last_name AS "lastName", display_name AS "displayName",
        company_title AS "companyTitle", tax_office AS "taxOffice", tax_number AS "taxNumber", national_id AS "nationalId",
        is_e_invoice_payer AS "isEInvoicePayer", current_account_code AS "currentAccountCode",
        phone, normalized_phone AS "normalizedPhone", secondary_phone AS "secondaryPhone", whatsapp_phone AS "whatsappPhone",
        email, customer_note AS "customerNote", source, order_communication_allowed AS "orderCommunicationAllowed",
        whatsapp_marketing_allowed AS "whatsappMarketingAllowed", sms_marketing_allowed AS "smsMarketingAllowed",
        email_marketing_allowed AS "emailMarketingAllowed", consent_at AS "consentAt", consent_source AS "consentSource",
        consent_withdrawn_at AS "consentWithdrawnAt", is_active AS "isActive", birth_date AS "birthDate", website, instagram,
        rating, risk_status AS "riskStatus", last_contact_at AS "lastContactAt",
        (SELECT code FROM retail_customer_source_definitions WHERE id = source_definition_id) AS "sourceCode",
        (SELECT name FROM retail_customer_source_definitions WHERE id = source_definition_id) AS "sourceName"
      FROM retail_customers
      WHERE id = ${id}
      LIMIT 1
    `;
    const customer = customers[0];
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    const [summary] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COUNT(*)::int AS "saleCount",
        COALESCE(SUM(grand_total) FILTER (WHERE status <> 'CANCELLED'), 0) AS "totalSpent",
        MIN(created_at) AS "firstSaleAt",
        MAX(created_at) AS "lastSaleAt"
      FROM retail_sales
      WHERE customer_id = ${id}
    `;
    return {
      ...customer,
      addresses: await this.listAddresses(id),
      recentSales: await this.listSales({ customerId: id, take: 50 }),
      summary,
      tags: await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT t.id, t.name, t.color FROM retail_customer_tags ct
        JOIN retail_customer_tag_definitions t ON t.id = ct.tag_id
        WHERE ct.customer_id = ${id} AND t.is_active = true ORDER BY t.name
      `,
      notes: await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, note, created_at AS "createdAt" FROM retail_customer_notes
        WHERE customer_id = ${id} AND is_active = true ORDER BY created_at DESC
      `,
      reminders: await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, title, description, remind_at AS "remindAt", status, completed_at AS "completedAt"
        FROM retail_customer_reminders WHERE customer_id = ${id} ORDER BY remind_at DESC
      `,
      files: await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, file_name AS "fileName", file_path AS "filePath", file_type AS "fileType", description, created_at AS "createdAt"
        FROM retail_customer_files WHERE customer_id = ${id} AND is_active = true ORDER BY created_at DESC
      `,
    };
  }

  async createCustomer(payload: unknown, userId: number) {
    const body = (payload ?? {}) as SaleCustomerPayload;
    const customer = await this.prisma.$transaction(async (tx) => {
      const saved = await this.ensureCustomer(tx, body, userId);
      const address = (body.address ?? {}) as SaleAddressPayload;
      if (this.text(address.fullAddress)) await this.ensureAddress(tx, Number(saved.id), address, userId);
      await this.syncCustomerTags(tx, Number(saved.id), body.tagIds);
      return saved;
    });
    return this.getCustomer(Number(customer.id));
  }

  listCustomerTags() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, name, color, is_active AS "isActive" FROM retail_customer_tag_definitions ORDER BY name
    `;
  }

  async createCustomerTag(payload: unknown) {
    const name = this.text((payload as Record<string, unknown>)?.name);
    if (!name) throw new BadRequestException('Etiket adı zorunludur.');
    const color = this.text((payload as Record<string, unknown>)?.color) || '#64748b';
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customer_tag_definitions (name, color, is_active, created_at, updated_at)
      VALUES (${name}, ${color}, true, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET is_active = true, updated_at = NOW()
      RETURNING id, name, color
    `;
    return rows[0];
  }

  async updateCustomerTag(id: number, payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      UPDATE retail_customer_tag_definitions SET name = COALESCE(${this.text(body.name) || null}, name),
        color = COALESCE(${this.text(body.color) || null}, color), is_active = COALESCE(${typeof body.isActive === 'boolean' ? body.isActive : null}, is_active), updated_at = NOW()
      WHERE id = ${id} RETURNING id, name, color, is_active AS "isActive"
    `;
    if (!rows[0]) throw new NotFoundException('Etiket bulunamadı.');
    return rows[0];
  }

  async crmDashboard() {
    const [summary] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COUNT(*)::int AS "totalCustomers", COUNT(*) FILTER (WHERE is_active)::int AS "activeCustomers",
        COUNT(*) FILTER (WHERE customer_type = 'CORPORATE')::int AS corporate,
        COUNT(*) FILTER (WHERE customer_type = 'INDIVIDUAL')::int AS individual,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS "newThisMonth",
        COUNT(*) FILTER (WHERE whatsapp_marketing_allowed AND consent_withdrawn_at IS NULL)::int AS "whatsappAllowed"
      FROM retail_customers
    `;
    const [sales] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COUNT(DISTINCT customer_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS "activeLast30Days",
        COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IN (SELECT customer_id FROM retail_sales GROUP BY customer_id HAVING COUNT(*) > 1))::int AS "repeatCustomers"
      FROM retail_sales WHERE status <> 'CANCELLED'
    `;
    const [reminders] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND remind_at < NOW())::int AS overdue FROM retail_customer_reminders
    `;
    const [segments] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COUNT(DISTINCT c.id) FILTER (WHERE t.name IN ('VIP', 'Yüksek Değerli'))::int AS vip,
        COUNT(DISTINCT c.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM retail_sales s WHERE s.customer_id = c.id AND s.created_at >= NOW() - INTERVAL '30 days'))::int AS "inactive30Days"
      FROM retail_customers c LEFT JOIN retail_customer_tags ct ON ct.customer_id = c.id
      LEFT JOIN retail_customer_tag_definitions t ON t.id = ct.tag_id
    `;
    return { ...summary, ...sales, ...reminders, ...segments };
  }

  async crmCustomers(options: Record<string, string> = {}) {
    const clean = this.text(options.q ?? options.phone);
    const normalizedPhone = this.normalizePhone(clean);
    const type = this.text(options.type).toUpperCase();
    const source = this.text(options.source).toUpperCase();
    const status = this.text(options.status).toUpperCase();
    const city = this.text(options.city);
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT c.id, c.customer_code AS "customerCode", c.display_name AS "displayName", c.company_title AS "companyTitle",
        c.phone, c.whatsapp_phone AS "whatsappPhone", c.email, c.customer_type AS "customerType",
        c.is_active AS "isActive", COALESCE(sd.name, c.source::text) AS "sourceName", COUNT(DISTINCT s.id)::int AS "saleCount",
        COALESCE(SUM(s.grand_total) FILTER (WHERE s.status <> 'CANCELLED'), 0) AS "totalSpent", MAX(s.created_at) AS "lastSaleAt",
        (SELECT a.city FROM retail_customer_addresses a WHERE a.customer_id = c.id AND a.is_active ORDER BY a.is_default DESC, a.updated_at DESC LIMIT 1) AS city,
        (SELECT a.district FROM retail_customer_addresses a WHERE a.customer_id = c.id AND a.is_active ORDER BY a.is_default DESC, a.updated_at DESC LIMIT 1) AS district,
        COALESCE((SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
          FROM retail_customer_tags ct JOIN retail_customer_tag_definitions t ON t.id = ct.tag_id WHERE ct.customer_id = c.id AND t.is_active), '[]'::json) AS tags
      FROM retail_customers c LEFT JOIN retail_sales s ON s.customer_id = c.id
      LEFT JOIN retail_customer_source_definitions sd ON sd.id = c.source_definition_id
      WHERE (${clean} = '' OR c.display_name ILIKE ${`%${clean}%`} OR c.company_title ILIKE ${`%${clean}%`} OR c.phone ILIKE ${`%${clean}%`} OR c.email ILIKE ${`%${clean}%`} OR (${normalizedPhone}::text IS NOT NULL AND c.normalized_phone = ${normalizedPhone}))
        AND (${type} = '' OR c.customer_type = ${type})
        AND (${source} = '' OR sd.code = ${source})
        AND (${status} = '' OR (${status} = 'ACTIVE' AND c.is_active) OR (${status} = 'PASSIVE' AND NOT c.is_active))
        AND (${city} = '' OR EXISTS (SELECT 1 FROM retail_customer_addresses ca WHERE ca.customer_id = c.id AND ca.city ILIKE ${`%${city}%`}))
      GROUP BY c.id, sd.name ORDER BY c.updated_at DESC LIMIT 100
    `;
  }

  async addCustomerNote(customerId: number, payload: unknown, userId: number) {
    const note = this.text((payload as Record<string, unknown>)?.note);
    if (!note) throw new BadRequestException('Not metni zorunludur.');
    return this.prisma.retailCustomerNote.create({ data: { customerId, note, createdById: userId } });
  }

  async updateCustomerStatus(customerId: number, payload: unknown) {
    const isActive = Boolean((payload as Record<string, unknown>)?.isActive);
    return this.prisma.retailCustomer.update({ where: { id: customerId }, data: { isActive } });
  }

  async updateCustomerProfile(customerId: number, payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const rating = Math.max(0, Math.min(5, Number(body.rating ?? 0)));
    const birthDate = this.text(body.birthDate);
    return this.prisma.retailCustomer.update({
      where: { id: customerId },
      data: {
        birthDate: birthDate ? new Date(birthDate) : undefined,
        website: this.text(body.website) || undefined,
        instagram: this.text(body.instagram) || undefined,
        rating,
        riskStatus: this.text(body.riskStatus).toUpperCase() || 'NORMAL',
        lastContactAt: body.touchContact ? new Date() : undefined,
      },
    });
  }

  async addCustomerFile(customerId: number, payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const fileName = this.text(body.fileName);
    const filePath = this.text(body.filePath);
    const fileType = this.text(body.fileType).toUpperCase();
    if (!fileName || !filePath || !fileType) throw new BadRequestException('Dosya adı, yolu ve türü zorunludur.');
    return this.prisma.retailCustomerFile.create({ data: { customerId, fileName, filePath, fileType, description: this.text(body.description) || null, createdById: userId } });
  }

  async setDefaultAddress(customerId: number, addressId: number) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.retailCustomerAddress.findFirst({ where: { id: addressId, customerId, isActive: true } });
      if (!address) throw new NotFoundException('Adres bulunamadı.');
      await tx.retailCustomerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
      return tx.retailCustomerAddress.update({ where: { id: addressId }, data: { isDefault: true } });
    });
  }

  async crmReports() {
    const byCity = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(a.city, 'Belirtilmemiş') AS label, COUNT(DISTINCT c.id)::int AS value
      FROM retail_customers c LEFT JOIN retail_customer_addresses a ON a.customer_id = c.id AND a.is_default = true AND a.is_active
      GROUP BY COALESCE(a.city, 'Belirtilmemiş') ORDER BY value DESC
    `;
    const bySource = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(s.name, 'Belirtilmemiş') AS label, COUNT(c.id)::int AS value
      FROM retail_customers c LEFT JOIN retail_customer_source_definitions s ON s.id = c.source_definition_id
      GROUP BY COALESCE(s.name, 'Belirtilmemiş') ORDER BY value DESC
    `;
    const byPermission = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT CASE WHEN whatsapp_marketing_allowed AND consent_withdrawn_at IS NULL THEN 'WhatsApp İzinli' ELSE 'WhatsApp İzinsiz' END AS label, COUNT(*)::int AS value
      FROM retail_customers GROUP BY 1 ORDER BY value DESC
    `;
    return { byCity, bySource, byPermission };
  }

  listReminders() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT r.id, r.customer_id AS "customerId", c.display_name AS "customerName", c.phone, r.title, r.description,
        r.remind_at AS "remindAt", r.status, r.completed_at AS "completedAt"
      FROM retail_customer_reminders r JOIN retail_customers c ON c.id = r.customer_id
      ORDER BY CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END, r.remind_at ASC LIMIT 200
    `;
  }

  createReminder(payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const customerId = Number(body.customerId);
    const title = this.text(body.title);
    const remindAt = new Date(this.text(body.remindAt));
    if (!customerId || !title || Number.isNaN(remindAt.getTime())) throw new BadRequestException('Müşteri, başlık ve hatırlatma tarihi zorunludur.');
    return this.prisma.retailCustomerReminder.create({ data: { customerId, title, description: this.text(body.description) || null, remindAt, createdById: userId } });
  }

  updateReminder(id: number, payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const completed = this.text(body.status).toUpperCase() === 'COMPLETED';
    return this.prisma.retailCustomerReminder.update({ where: { id }, data: { status: completed ? 'COMPLETED' : 'PENDING', completedAt: completed ? new Date() : null } });
  }

  listCustomerSources() {
    return this.prisma.retailCustomerSourceDefinition.findMany({ orderBy: { name: 'asc' } });
  }

  async createCustomerSource(payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const name = this.text(body.name);
    const code = (this.text(body.code) || name).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!name || !code) throw new BadRequestException('Kaynak adı zorunludur.');
    return this.prisma.retailCustomerSourceDefinition.create({ data: { name, code } });
  }

  updateCustomerSource(id: number, payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    return this.prisma.retailCustomerSourceDefinition.update({ where: { id }, data: { name: this.text(body.name) || undefined, isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined } });
  }

  async addAddress(customerId: number, payload: unknown, userId: number) {
    return this.prisma.$transaction(async (tx) => this.ensureAddress(tx, customerId, (payload ?? {}) as SaleAddressPayload, userId));
  }

  async createSale(payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const clientRequestId = this.text(body.clientRequestId);
    if (!clientRequestId) throw new BadRequestException('Satış işlem anahtarı zorunludur.');
    const eventKey = `SALE_CREATE:${clientRequestId}`;

    return this.prisma.$transaction(async (tx) => {
      // Ayni istemci istegi eszamanli gelse bile yalnizca bir satis olusturulur.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventKey}))`;
      const existingRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM retail_sales WHERE event_key = ${eventKey} LIMIT 1
      `;
      if (existingRows[0]) return this.getSaleWithTx(tx, existingRows[0].id);

      const customerBody = (body.customer ?? {}) as SaleCustomerPayload;
      const customer = await this.ensureCustomer(tx, customerBody, userId);
      await this.syncCustomerTags(tx, Number(customer.id), customerBody.tagIds);
      const delivery = this.saleDelivery(body.delivery);
      const addressBody = (body.address ?? {}) as SaleAddressPayload;
      const address = delivery.deliveryType === 'STORE_PICKUP' && !this.text(addressBody.fullAddress) && !addressBody.id
        ? null
        : await this.ensureAddress(tx, Number(customer.id), addressBody, userId);
      const saleNumber = await this.nextSaleNumber(tx);
      const items = this.saleItems(body.items);
      if (items.length === 0) throw new BadRequestException('Satış için en az bir ürün eklenmelidir.');
      const payments = this.salePayments(body.payments ?? body.payment);
      const totals = this.calculateTotals(items, payments, this.number(body.deliveryFee, 0));
      const requestedStatus = this.saleStatus(body.status);
      const initialStatus = requestedStatus === 'CONFIRMED' && totals.remainingTotal > 0 ? 'PAYMENT_PENDING' : requestedStatus;

      const saleRows = await tx.$queryRaw<Array<{ id: number }>>`
        INSERT INTO retail_sales (
          sale_number, customer_id, address_id, channel, sale_type, status, currency, subtotal, discount_total,
          delivery_fee, grand_total, paid_total, remaining_total, customer_note, internal_note, event_key, created_by_id, created_at, updated_at
        )
        VALUES (
          ${saleNumber}, ${Number(customer.id)}, ${address ? Number(address.id) : null}, ${this.saleChannel(body.channel)}::"RetailSaleChannel",
          ${this.saleType(body.saleType)}::"RetailSaleType", ${initialStatus}::"RetailSaleStatus", 'TRY',
          ${totals.subtotal}, ${totals.discountTotal}, ${totals.deliveryFee}, ${totals.grandTotal}, ${totals.paidTotal}, ${totals.remainingTotal},
          ${this.text(body.customerNote)}, ${this.text(body.internalNote)}, ${eventKey}, ${userId}, NOW(), NOW()
        )
        RETURNING id
      `;
      const saleId = saleRows[0].id;
      await this.addStatusHistory(tx, saleId, null, initialStatus, 'Satış oluşturuldu.', userId);

      for (const item of items) {
        await tx.$executeRaw`
          INSERT INTO retail_sale_items (
            sale_id, variant_id, stock_card_id, barcode, model_code, product_name_snapshot, quantity, unit_price,
            discount_amount, line_total, unit_cost_snapshot, stock_fulfillment_type, created_at
          )
          VALUES (
            ${saleId}, ${item.variantId}, ${item.stockCardId}, ${item.barcode}, ${item.modelCode}, ${item.productNameSnapshot},
            ${item.quantity}, ${item.unitPrice}, ${item.discountAmount}, ${item.lineTotal}, ${item.unitCostSnapshot},
            ${item.stockFulfillmentType}::"StockFulfillmentType", NOW()
          )
        `;
      }

      for (const payment of payments) {
        await tx.$executeRaw`
          INSERT INTO retail_sale_payments (sale_id, method, amount, account_id, event_key, paid_at, note, created_at, created_by_id)
          VALUES (${saleId}, ${payment.method}::"RetailPaymentMethod", ${payment.amount}, ${payment.accountId}, ${`SALE_PAYMENT:${saleId}:${payment.clientKey}`}, NOW(), ${payment.note}, NOW(), ${userId})
        `;
      }

      await tx.$executeRaw`
        INSERT INTO retail_deliveries (
          sale_id, address_id, delivery_type, status, planned_date, planned_time, assigned_user_id, delivery_note, event_key, created_at, updated_at
        )
        VALUES (
          ${saleId}, ${address ? Number(address.id) : null}, ${delivery.deliveryType}::"RetailDeliveryType", ${delivery.status}::"RetailDeliveryStatus",
          ${delivery.plannedDate}, ${delivery.plannedTime}, ${delivery.assignedUserId}, ${delivery.deliveryNote}, ${`DELIVERY:${saleId}`}, NOW(), NOW()
        )
      `;

      return this.getSaleWithTx(tx, saleId);
    });
  }

  async listSales(options: { customerId?: number; take?: number } = {}) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT s.id, s.sale_number AS "saleNumber", s.status, s.channel, s.sale_type AS "saleType", s.grand_total AS "grandTotal",
        s.paid_total AS "paidTotal", s.remaining_total AS "remainingTotal", s.created_at AS "createdAt",
        c.display_name AS "customerName", c.phone AS "customerPhone"
      FROM retail_sales s
      JOIN retail_customers c ON c.id = s.customer_id
      WHERE (${options.customerId ?? null}::int IS NULL OR s.customer_id = ${options.customerId ?? null})
      ORDER BY s.created_at DESC
      LIMIT ${options.take ?? 50}
    `;
    return rows;
  }

  async getSale(id: number) {
    return this.getSaleWithTx(this.prisma, id);
  }

  async completeSale(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM retail_sales WHERE id = ${id} FOR UPDATE`;
      const sale = await this.getSaleWithTx(tx, id);
      if (sale.status === 'COMPLETED') return sale;
      if (sale.status === 'CANCELLED') throw new BadRequestException('İptal edilmiş satış tamamlanamaz.');

      const items = sale.items as Array<Record<string, unknown>>;
      const payments = sale.payments as Array<Record<string, unknown>>;
      await this.ensureReadyStock(tx, id, items, userId);
      await this.deductRecipeStock(tx, id, items, userId);
      await this.createFinanceForPayments(tx, id, payments, userId);

      await tx.$executeRaw`
        UPDATE retail_sales
        SET status = 'COMPLETED'::"RetailSaleStatus", completed_at = NOW(), completed_by_id = ${userId}, updated_at = NOW()
        WHERE id = ${id}
      `;
      await this.addStatusHistory(tx, id, String(sale.status), 'COMPLETED', 'Satış tamamlandı.', userId);

      return this.getSaleWithTx(tx, id);
    });
  }

  async updateStatus(id: number, payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const nextStatus = this.saleStatus(body.status);
    const note = this.text(body.note) || 'Durum güncellendi.';
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM retail_sales WHERE id = ${id} FOR UPDATE`;
      const sale = await this.getSaleWithTx(tx, id);
      const oldStatus = String(sale.status);
      if (oldStatus === nextStatus) return sale;
      if (oldStatus === 'CANCELLED') throw new BadRequestException('İptal edilmiş satışın durumu değiştirilemez.');
      await tx.$executeRaw`
        UPDATE retail_sales
        SET status = ${nextStatus}::"RetailSaleStatus", updated_at = NOW()
        WHERE id = ${id}
      `;
      if (nextStatus === 'OUT_FOR_DELIVERY') {
        await tx.$executeRaw`UPDATE retail_deliveries SET status = 'OUT_FOR_DELIVERY'::"RetailDeliveryStatus", updated_at = NOW() WHERE sale_id = ${id}`;
      }
      if (nextStatus === 'DELIVERED') {
        await tx.$executeRaw`UPDATE retail_deliveries SET status = 'DELIVERED'::"RetailDeliveryStatus", delivered_at = NOW(), delivered_by_id = ${userId}, updated_at = NOW() WHERE sale_id = ${id}`;
      }
      await this.addStatusHistory(tx, id, oldStatus, nextStatus, note, userId);
      return this.getSaleWithTx(tx, id);
    });
  }

  async cancelSale(id: number, reason: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM retail_sales WHERE id = ${id} FOR UPDATE`;
      const sale = await this.getSaleWithTx(tx, id);
      if (sale.status === 'COMPLETED') {
        throw new BadRequestException('Tamamlanmış satış iptali Sprint 17C iade akışına bırakıldı.');
      }
      await tx.$executeRaw`
        UPDATE retail_sales
        SET status = 'CANCELLED'::"RetailSaleStatus", cancelled_at = NOW(), cancelled_by_id = ${userId}, internal_note = COALESCE(internal_note, '') || ${`\nİptal: ${reason || 'Sebep girilmedi.'}`}, updated_at = NOW()
        WHERE id = ${id}
      `;
      await this.releaseReservations(tx, id);
      await this.addStatusHistory(tx, id, String(sale.status), 'CANCELLED', reason || 'Satış iptal edildi.', userId);
      return this.getSaleWithTx(tx, id);
    });
  }

  async addPayment(saleId: number, payload: unknown, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM retail_sales WHERE id = ${saleId} FOR UPDATE`;
      const sale = await this.getSaleWithTx(tx, saleId);
      if (sale.status === 'COMPLETED' || sale.status === 'CANCELLED') throw new BadRequestException('Bu satışa ödeme eklenemez.');
      const payments = this.salePayments(payload);
      for (const payment of payments) {
        await tx.$executeRaw`
          INSERT INTO retail_sale_payments (sale_id, method, amount, account_id, event_key, paid_at, note, created_at, created_by_id)
          VALUES (${saleId}, ${payment.method}::"RetailPaymentMethod", ${payment.amount}, ${payment.accountId}, ${`SALE_PAYMENT:${saleId}:${payment.clientKey}`}, NOW(), ${payment.note}, NOW(), ${userId})
          ON CONFLICT (event_key) DO NOTHING
        `;
      }
      await this.recalculateSalePaymentTotals(tx, saleId);
      return this.getSaleWithTx(tx, saleId);
    });
  }

  async printData(id: number, printType: 'ADDRESS_LABEL_10X15' | 'DELIVERY_FORM_A5' | 'ORDER_FORM_A4', userId: number, options: { recordPrint?: boolean } = {}) {
    const sale = await this.getSale(id);
    if (options.recordPrint !== false) {
      await this.prisma.$executeRaw`
        INSERT INTO retail_print_logs (sale_id, print_type, printed_at, printed_by_id)
        VALUES (${id}, ${printType}::"RetailPrintType", NOW(), ${userId})
      `;
    }
    return {
      printType,
      company: {
        name: 'Erhan Flowers',
        website: 'www.erhanflowers.com',
        phone: '0544 654 62 20',
        address: 'Sarılar Mahallesi Cumhuriyet Caddesi No: 52, Manavgat / Antalya',
      },
      sale,
    };
  }

  async previewNextSaleNumber() {
    const year = new Date().getFullYear();
    const rows = await this.prisma.$queryRaw<Array<{ nextNo: number }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 9) AS integer)), 0) + 1 AS "nextNo"
      FROM retail_sales
      WHERE sale_number ~ ${`^EF-${year}-[0-9]{6}$`}
    `;
    return { saleNumber: `EF-${year}-${String(Number(rows[0]?.nextNo ?? 1)).padStart(6, '0')}` };
  }

  private async ensureCustomer(tx: Prisma.TransactionClient, body: SaleCustomerPayload, userId: number) {
    const customerType = this.text(body.customerType).toUpperCase() === 'CORPORATE' ? 'CORPORATE' : 'INDIVIDUAL';
    const companyTitle = this.text(body.companyTitle);
    const firstName = this.text(body.firstName ?? body.name) || companyTitle;
    const lastName = this.text(body.lastName);
    const phone = this.text(body.phone);
    const normalizedPhone = this.normalizePhone(phone);
    const displayName = customerType === 'CORPORATE' ? companyTitle || firstName : [firstName, lastName].filter(Boolean).join(' ');
    if (!firstName) throw new BadRequestException('Müşteri adı zorunludur.');
    if (!normalizedPhone) throw new BadRequestException('Geçerli bir telefon numarası zorunludur.');
    if (normalizedPhone) {
      const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, customer_code AS "customerCode", first_name AS "firstName", last_name AS "lastName", display_name AS "displayName", phone, normalized_phone AS "normalizedPhone"
        FROM retail_customers
        WHERE normalized_phone = ${normalizedPhone}
        LIMIT 1
      `;
      if (existing[0]) {
        const consentGiven = Boolean(body.whatsappMarketingAllowed || body.smsMarketingAllowed || body.emailMarketingAllowed);
        await tx.$executeRaw`
          UPDATE retail_customers SET
            customer_type = ${customerType}, first_name = ${firstName}, last_name = ${lastName || null}, display_name = ${displayName},
            company_title = ${companyTitle || null}, tax_office = ${this.text(body.taxOffice) || null}, tax_number = ${this.text(body.taxNumber) || null},
            phone = ${phone}, whatsapp_phone = ${this.text(body.whatsappPhone) || phone}, email = ${this.text(body.email) || null},
            customer_note = ${this.text(body.customerNote ?? body.note) || null}, source = ${this.saleChannel(body.source)}::"RetailSaleChannel",
            source_definition_id = (SELECT id FROM retail_customer_source_definitions WHERE code = ${this.text(body.source).toUpperCase() || 'STORE'} AND is_active = true LIMIT 1),
            order_communication_allowed = ${body.orderCommunicationAllowed !== false},
            whatsapp_marketing_allowed = ${Boolean(body.whatsappMarketingAllowed)}, sms_marketing_allowed = ${Boolean(body.smsMarketingAllowed)},
            email_marketing_allowed = ${Boolean(body.emailMarketingAllowed)}, consent_source = ${this.text(body.consentSource) || null},
            consent_at = CASE WHEN ${consentGiven} THEN COALESCE(consent_at, NOW()) ELSE consent_at END,
            consent_withdrawn_at = CASE WHEN ${consentGiven} THEN NULL ELSE consent_withdrawn_at END,
            is_active = true, updated_at = NOW()
          WHERE id = ${Number(existing[0].id)}
        `;
        return existing[0];
      }
    }

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(17001701)`;
    const next = await tx.$queryRaw<Array<{ nextId: number }>>`SELECT COALESCE(MAX(id), 0) + 1 AS "nextId" FROM retail_customers`;
    const customerCode = `MUS-${String(Number(next[0].nextId)).padStart(6, '0')}`;
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customers (
        customer_code, customer_type, first_name, last_name, display_name, company_title, tax_office, tax_number, national_id,
        is_e_invoice_payer, current_account_code, phone, normalized_phone, secondary_phone, whatsapp_phone, email, customer_note,
        source, source_definition_id, order_communication_allowed, whatsapp_marketing_allowed, sms_marketing_allowed, email_marketing_allowed,
        consent_at, consent_source, created_by_id, created_at, updated_at
      )
      VALUES (
        ${customerCode}, ${customerType}, ${firstName}, ${lastName || null}, ${displayName}, ${companyTitle || null},
        ${this.text(body.taxOffice) || null}, ${this.text(body.taxNumber) || null}, ${this.text(body.nationalId ?? body.tckn) || null},
        ${Boolean(body.isEInvoicePayer)}, ${this.text(body.currentAccountCode) || null}, ${phone}, ${normalizedPhone}, ${this.text(body.secondaryPhone) || null},
        ${this.text(body.whatsappPhone) || phone}, ${this.text(body.email) || null}, ${this.text(body.customerNote ?? body.note) || null},
        ${this.saleChannel(body.source)}::"RetailSaleChannel", (SELECT id FROM retail_customer_source_definitions WHERE code = ${this.text(body.source).toUpperCase() || 'STORE'} AND is_active = true LIMIT 1),
        ${body.orderCommunicationAllowed !== false}, ${Boolean(body.whatsappMarketingAllowed)},
        ${Boolean(body.smsMarketingAllowed)}, ${Boolean(body.emailMarketingAllowed)},
        ${Boolean(body.whatsappMarketingAllowed || body.smsMarketingAllowed || body.emailMarketingAllowed) ? new Date() : null},
        ${this.text(body.consentSource) || null}, ${userId}, NOW(), NOW()
      )
      RETURNING id, customer_code AS "customerCode", first_name AS "firstName", last_name AS "lastName", display_name AS "displayName", phone, normalized_phone AS "normalizedPhone"
    `;
    return rows[0];
  }

  private async ensureAddress(tx: Prisma.TransactionClient, customerId: number, body: SaleAddressPayload, userId: number) {
    const existingAddressId = this.optionalNumber(body.id);
    if (existingAddressId) {
      const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, customer_id AS "customerId", title, full_address AS "fullAddress", is_default AS "isDefault"
        FROM retail_customer_addresses WHERE id = ${existingAddressId} AND customer_id = ${customerId} AND is_active = true LIMIT 1
      `;
      if (!existing[0]) throw new BadRequestException('Seçilen adres bu müşteriye ait değil.');
      return existing[0];
    }
    const fullAddress = this.text(body.fullAddress);
    const title = this.text(body.title) || 'Teslimat';
    const recipientName = this.text(body.recipientName) || this.text(body.displayName) || 'Müşteri';
    if (!fullAddress) throw new BadRequestException('Açık adres zorunludur.');

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${1700170200 + customerId})`;
    const hasDefault = await tx.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(SELECT 1 FROM retail_customer_addresses WHERE customer_id = ${customerId} AND is_default = true AND is_active = true) AS exists
    `;
    const isDefault = Boolean(body.isDefault) || !hasDefault[0].exists;
    if (isDefault) {
      await tx.$executeRaw`UPDATE retail_customer_addresses SET is_default = false WHERE customer_id = ${customerId}`;
    }
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customer_addresses (
        customer_id, title, recipient_name, recipient_phone, city, district, neighborhood, postal_code, full_address,
        location_description, delivery_note, is_default, created_by_id, created_at, updated_at
      )
      VALUES (
        ${customerId}, ${title}, ${recipientName}, ${this.text(body.recipientPhone) || null}, ${this.text(body.city) || null}, ${this.text(body.district) || null},
        ${this.text(body.neighborhood) || null}, ${this.text(body.postalCode) || null}, ${fullAddress}, ${this.text(body.locationDescription ?? body.locationNote) || null},
        ${this.text(body.deliveryNote) || null}, ${isDefault}, ${userId}, NOW(), NOW()
      )
      RETURNING id, customer_id AS "customerId", title, recipient_name AS "recipientName", full_address AS "fullAddress", is_default AS "isDefault"
    `;
    return rows[0];
  }

  private async syncCustomerTags(tx: Prisma.TransactionClient, customerId: number, value: unknown) {
    if (!Array.isArray(value)) return;
    const tagIds = Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    await tx.$executeRaw`DELETE FROM retail_customer_tags WHERE customer_id = ${customerId}`;
    for (const tagId of tagIds) {
      await tx.$executeRaw`
        INSERT INTO retail_customer_tags (customer_id, tag_id, created_at)
        SELECT ${customerId}, id, NOW() FROM retail_customer_tag_definitions WHERE id = ${tagId} AND is_active = true
        ON CONFLICT DO NOTHING
      `;
    }
  }

  private async nextSaleNumber(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(17001703)`;
    const year = new Date().getFullYear();
    const rows = await tx.$queryRaw<Array<{ nextNo: number }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 9) AS integer)), 0) + 1 AS "nextNo"
      FROM retail_sales
      WHERE sale_number LIKE ${`EF-${year}-%`}
    `;
    return `EF-${year}-${String(Number(rows[0].nextNo)).padStart(6, '0')}`;
  }

  private async getSaleWithTx(tx: Pick<PrismaService, '$queryRaw'> | Prisma.TransactionClient, id: number): Promise<Record<string, unknown> & { items: Array<Record<string, unknown>>; payments: Array<Record<string, unknown>>; delivery: Record<string, unknown> | null }> {
    const sales = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT s.*, c.display_name AS "customerName", c.phone AS "customerPhone", a.full_address AS "fullAddress", a.city, a.district
      FROM retail_sales s
      JOIN retail_customers c ON c.id = s.customer_id
      LEFT JOIN retail_customer_addresses a ON a.id = s.address_id
      WHERE s.id = ${id}
      LIMIT 1
    `;
    const sale = sales[0];
    if (!sale) throw new NotFoundException('Satış bulunamadı.');
    const rawItems = await tx.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM retail_sale_items WHERE sale_id = ${id} ORDER BY id`;
    const payments = await tx.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM retail_sale_payments WHERE sale_id = ${id} ORDER BY id`;
    const deliveries = await tx.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM retail_deliveries WHERE sale_id = ${id} LIMIT 1`;
    const statusHistory = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT h.*, u.name AS "changedByName"
      FROM retail_sale_status_history h
      LEFT JOIN users u ON u.id = h.changed_by_id
      WHERE h.sale_id = ${id}
      ORDER BY h.changed_at ASC, h.id ASC
    `;

    let productCostTotal = 0;
    const items = rawItems.map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const lineTotal = Number(item.line_total ?? 0);
      const lineCost = Number(item.unit_cost_snapshot ?? 0) * quantity;
      const lineProfit = lineTotal - lineCost;
      productCostTotal += lineCost;
      return { ...item, lineCost, lineProfit };
    });
    const otherOrderCosts = Number(sale.delivery_fee ?? 0);
    const netSalesReturn = Number(sale.subtotal ?? 0) - otherOrderCosts;
    const profit = netSalesReturn - productCostTotal;
    const profitMargin = netSalesReturn > 0 ? (profit / netSalesReturn) * 100 : 0;

    return {
      ...(sale as Record<string, unknown>),
      items,
      payments,
      delivery: deliveries[0] ?? null,
      statusHistory,
      productCostTotal,
      otherOrderCosts,
      netSalesReturn,
      profit,
      profitMargin,
    };
  }

  private async addStatusHistory(tx: Prisma.TransactionClient, saleId: number, oldStatus: string | null, newStatus: string, note: string | null, userId: number) {
    await tx.$executeRaw`
      INSERT INTO retail_sale_status_history (sale_id, old_status, new_status, note, changed_by_id, changed_at)
      VALUES (${saleId}, ${oldStatus}::"RetailSaleStatus", ${newStatus}::"RetailSaleStatus", ${note}, ${userId}, NOW())
    `;
  }

  private async findSaleByEventKey(eventKey: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM retail_sales WHERE event_key = ${eventKey} LIMIT 1`;
    return rows[0] ? this.getSale(rows[0].id) : null;
  }

  private async listAddresses(customerId: number) {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, title, recipient_name AS "recipientName", recipient_phone AS "recipientPhone", city, district, neighborhood,
        postal_code AS "postalCode", full_address AS "fullAddress", location_description AS "locationDescription",
        delivery_note AS "deliveryNote", is_default AS "isDefault"
      FROM retail_customer_addresses
      WHERE customer_id = ${customerId} AND is_active = true
      ORDER BY is_default DESC, updated_at DESC
    `;
  }

  private async ensureReadyStock(tx: Prisma.TransactionClient, saleId: number, items: Array<Record<string, unknown>>, userId: number) {
    for (const item of items) {
      if (item.stock_fulfillment_type !== 'READY_STOCK') continue;
      const quantity = Number(item.quantity);
      const itemId = Number(item.id);
      const stockCardId = item.stock_card_id ? Number(item.stock_card_id) : null;
      const variantId = item.variant_id ? Number(item.variant_id) : null;
      if (stockCardId) {
        await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${stockCardId} FOR UPDATE`;
        const cards = await tx.$queryRaw<Array<Record<string, unknown>>>`SELECT stock_quantity AS "stockQuantity", unit FROM stock_cards WHERE id = ${stockCardId}`;
        const previousStock = Number(cards[0]?.stockQuantity ?? 0);
        if (previousStock < quantity) throw new BadRequestException(`${item.product_name_snapshot} için stok yetersiz. Eksik: ${quantity - previousStock}`);
        const nextStock = previousStock - quantity;
        const reservations = await tx.$queryRaw<Array<Record<string, unknown>>>`
          SELECT id, quantity FROM stock_reservations
          WHERE sale_id = ${saleId} AND sale_item_id = ${itemId} AND stock_card_id = ${stockCardId} AND status = 'ACTIVE'
          LIMIT 1
        `;
        const reservedQuantity = Number(reservations[0]?.quantity ?? 0);
        await tx.$executeRaw`
          UPDATE stock_cards
          SET stock_quantity = ${nextStock},
              reserved_quantity = GREATEST(reserved_quantity - ${reservedQuantity}, 0),
              last_movement_at = NOW(),
              updated_at = NOW()
          WHERE id = ${stockCardId}
        `;
        if (reservations[0]) {
          await tx.$executeRaw`
            UPDATE stock_reservations SET status = 'COMPLETED', released_at = NOW(), updated_at = NOW()
            WHERE id = ${Number(reservations[0].id)}
          `;
        }
        await tx.$executeRaw`
          INSERT INTO stock_movements (stock_card_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at)
          VALUES (${stockCardId}, 'OUT', ${quantity}, ${String(cards[0]?.unit ?? 'Adet')}, ${previousStock}, ${nextStock}, 'RETAIL_SALE', 'RETAIL_SALE', ${String(saleId)}, ${`SALE_STOCK_OUT:${saleId}:${itemId}`}, ${userId}, NOW())
          ON CONFLICT (event_key) DO NOTHING
        `;
      } else if (variantId) {
        throw new BadRequestException(
          `${item.product_name_snapshot} için hazır ürün stok kartı bağlantısı bulunamadı. Satış tamamlanmadan önce stok kartını eşleştirin.`,
        );
      } else {
        throw new BadRequestException(`${item.product_name_snapshot} için stok bağlantısı bulunamadı.`);
      }
    }
  }

  private async releaseReservations(tx: Prisma.TransactionClient, saleId: number) {
    const reservations = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, stock_card_id AS "stockCardId", quantity
      FROM stock_reservations
      WHERE sale_id = ${saleId} AND status = 'ACTIVE'
    `;
    for (const reservation of reservations) {
      await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${Number(reservation.stockCardId)} FOR UPDATE`;
      await tx.$executeRaw`
        UPDATE stock_cards
        SET reserved_quantity = GREATEST(reserved_quantity - ${Number(reservation.quantity)}, 0), updated_at = NOW()
        WHERE id = ${Number(reservation.stockCardId)}
      `;
      await tx.$executeRaw`
        UPDATE stock_reservations SET status = 'RELEASED', released_at = NOW(), updated_at = NOW()
        WHERE id = ${Number(reservation.id)}
      `;
    }
  }

  private async deductRecipeStock(tx: Prisma.TransactionClient, saleId: number, items: Array<Record<string, unknown>>, userId: number) {
    for (const item of items) {
      const variantId = item.variant_id ? Number(item.variant_id) : null;
      const saleItemId = Number(item.id);
      const saleQuantity = Number(item.quantity ?? 0);
      if (!variantId || !saleItemId || saleQuantity <= 0) continue;

      const draft = await tx.productCostDraft.findUnique({
        where: { variantId },
        include: { items: true, pots: true },
      });
      if (!draft || draft.status !== 'APPROVED') continue;

      const recipeRows = [...draft.items, ...draft.pots]
        .filter((row) => row.source !== 'MANUAL' && row.stockCardId && Number(row.quantity) > 0)
        .map((row) => ({
          stockCardId: Number(row.stockCardId),
          quantity: Number(row.quantity) * saleQuantity,
          unit: 'unit' in row ? row.unit : 'adet',
        }));

      for (const row of recipeRows) {
        const eventKey = `SALE_RECIPE_STOCK_OUT:${saleId}:${saleItemId}:${row.stockCardId}`;
        const existing = await tx.stockUsageLog.findUnique({ where: { eventKey } });
        if (existing) continue;

        await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${row.stockCardId} FOR UPDATE`;
        const stockCard = await tx.stockCard.findUnique({ where: { id: row.stockCardId } });
        if (!stockCard) continue;

        const previousStock = Number(stockCard.stockQuantity);
        const nextStock = previousStock - row.quantity;
        if (nextStock < 0) {
          throw new BadRequestException(`${stockCard.name} için reçete stoku yetersiz. Eksik: ${this.quantityText(Math.abs(nextStock))} ${row.unit}`);
        }

        const updated = await tx.stockCard.update({
          where: { id: row.stockCardId },
          data: { stockQuantity: nextStock, lastMovementAt: new Date() },
        });

        await tx.stockUsageLog.create({
          data: {
            stockCardId: row.stockCardId,
            variantId,
            eventType: 'ORDER_SHIPPED',
            eventKey,
            quantity: row.quantity,
            unit: row.unit,
            previousStock,
            nextStock: Number(updated.stockQuantity),
            userId,
          },
        });
      }
    }
  }

  private async createFinanceForPayments(tx: Prisma.TransactionClient, saleId: number, payments: Array<Record<string, unknown>>, userId: number) {
    for (const payment of payments) {
      if (payment.method === 'ON_ACCOUNT') continue;
      if (payment.finance_transaction_id) continue;
      const amount = Number(payment.amount);
      if (amount <= 0) continue;
      const accountId = Number(payment.account_id ?? (await this.defaultAccountId(tx, String(payment.method))));
      const externalKey = `SALE_FINANCE:${saleId}:${payment.id}`;
      const existing = await tx.financeTransaction.findUnique({ where: { externalKey } });
      if (existing) continue;
      const transaction = await tx.financeTransaction.create({
        data: {
          transactionType: FinanceTransactionType.INCOME,
          direction: FinanceDirection.IN,
          amount,
          transactionDate: new Date(),
          accountId,
          description: `Satış tahsilatı ${saleId}`,
          linkedRecordType: 'RETAIL_SALE',
          linkedRecordId: String(saleId),
          externalKey,
          recordedByUserId: userId,
        },
      });
      await tx.$executeRaw`UPDATE retail_sale_payments SET finance_transaction_id = ${transaction.id} WHERE id = ${Number(payment.id)}`;
    }
  }

  private async defaultAccountId(tx: Prisma.TransactionClient, method: string) {
    const type = method === 'CREDIT_CARD' || method === 'BANK_TRANSFER' ? 'BANK' : 'CASH';
    const accounts = await tx.financeAccount.findMany({ where: { type: type as never, status: 'ACTIVE' }, orderBy: { id: 'asc' }, take: 1 });
    if (!accounts[0]) throw new BadRequestException('Finans hesabı bulunamadı. Önce kasa/banka hesabı oluşturulmalı.');
    return accounts[0].id;
  }

  private async recalculateSalePaymentTotals(tx: Prisma.TransactionClient, saleId: number) {
    const rows = await tx.$queryRaw<Array<{ paidTotal: number }>>`
      SELECT COALESCE(SUM(CASE WHEN method <> 'ON_ACCOUNT' THEN amount ELSE 0 END), 0) AS "paidTotal"
      FROM retail_sale_payments
      WHERE sale_id = ${saleId}
    `;
    const paidTotal = Number(rows[0].paidTotal ?? 0);
    await tx.$executeRaw`
      UPDATE retail_sales
      SET paid_total = ${paidTotal}, remaining_total = GREATEST(grand_total - ${paidTotal}, 0), updated_at = NOW()
      WHERE id = ${saleId}
    `;
  }

  private saleItems(payload: unknown) {
    const rows = Array.isArray(payload) ? payload : [];
    return rows.map((raw, index) => {
      const body = raw as SaleItemPayload;
      const quantity = this.positiveNumber(body.quantity, `Ürün ${index + 1} adedi zorunludur.`);
      const unitPrice = this.nonNegativeNumber(body.unitPrice, `Ürün ${index + 1} fiyatı zorunludur.`);
      const discountAmount = this.number(body.discountAmount ?? body.discount, 0);
      const lineTotal = Math.max(0, quantity * unitPrice - discountAmount);
      const productNameSnapshot = this.text(body.productNameSnapshot ?? body.productName);
      if (!productNameSnapshot) throw new BadRequestException('Ürün adı bulunamadı.');
      return {
        variantId: this.optionalNumber(body.variantId ?? body.id),
        stockCardId: this.optionalNumber(body.stockCardId),
        barcode: this.text(body.barcode) || null,
        modelCode: this.text(body.modelCode ?? body.proposedModelCode ?? body.currentModelCode) || null,
        productNameSnapshot,
        quantity,
        unitPrice,
        discountAmount,
        lineTotal,
        // Maliyet istemciden kabul edilmez; guvenilir maliyet kaynagi yoksa bos tutulur.
        unitCostSnapshot: null,
        stockFulfillmentType: this.stockFulfillmentType(body.stockFulfillmentType),
      };
    });
  }

  private salePayments(payload: unknown) {
    const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
    return rows
      .map((raw, index) => {
        const body = raw as SalePaymentPayload;
        const amount = this.number(body.amount ?? body.paidAmount, 0);
        return {
          method: this.paymentMethod(body.method),
          amount,
          accountId: this.optionalNumber(body.accountId),
          note: this.text(body.note) || null,
          clientKey: this.text(body.clientKey) || `${Date.now()}-${index}`,
        };
      })
      .filter((payment) => payment.amount > 0 || payment.method === 'ON_ACCOUNT');
  }

  private saleDelivery(payload: unknown) {
    const body = (payload ?? {}) as SaleDeliveryPayload;
    const deliveryType = this.deliveryType(body.method ?? body.deliveryType);
    return {
      deliveryType,
      status: deliveryType === 'STORE_PICKUP' ? 'NOT_REQUIRED' : 'WAITING',
      plannedDate: this.text(body.date ?? body.plannedDate) ? new Date(this.text(body.date ?? body.plannedDate)) : null,
      plannedTime: this.text(body.time ?? body.plannedTime) || null,
      assignedUserId: this.optionalNumber(body.assignedUserId),
      deliveryNote: this.text(body.note ?? body.deliveryNote) || null,
    };
  }

  private calculateTotals(items: ReturnType<SalesService['saleItems']>, payments: ReturnType<SalesService['salePayments']>, deliveryFee: number) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const grandTotal = Math.max(0, subtotal - discountTotal + deliveryFee);
    const paidTotal = payments.filter((payment) => payment.method !== 'ON_ACCOUNT').reduce((sum, payment) => sum + payment.amount, 0);
    return {
      subtotal: this.roundMoney(subtotal),
      discountTotal: this.roundMoney(discountTotal),
      deliveryFee: this.roundMoney(deliveryFee),
      grandTotal: this.roundMoney(grandTotal),
      paidTotal: this.roundMoney(paidTotal),
      remainingTotal: this.roundMoney(Math.max(0, grandTotal - paidTotal)),
    };
  }

  private normalizePhone(value: unknown) {
    let digits = this.text(value).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('0090')) digits = digits.slice(4);
    if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (digits.length === 10) return `90${digits}`;
    return digits;
  }

  private saleChannel(value: unknown) {
    const text = this.text(value).toUpperCase();
    return ['STORE', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'TRENDYOL', 'HEPSIBURADA', 'N11', 'AMAZON', 'OTHER'].includes(text) ? text : 'STORE';
  }

  private saleType(value: unknown) {
    const text = this.text(value).toUpperCase();
    return ['STORE_SALE', 'DELIVERY_SALE', 'CUSTOM_PRODUCTION'].includes(text) ? text : 'STORE_SALE';
  }

  private saleStatus(value: unknown) {
    const text = this.text(value).toUpperCase();
    const allowed = ['DRAFT', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'IN_PRODUCTION', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
    return allowed.includes(text) ? text : 'DRAFT';
  }

  private stockFulfillmentType(value: unknown) {
    const text = this.text(value).toUpperCase();
    return ['READY_STOCK', 'CUSTOM_PRODUCTION', 'NON_STOCK_SERVICE'].includes(text) ? text : 'READY_STOCK';
  }

  private paymentMethod(value: unknown) {
    const map: Record<string, string> = {
      NAKIT: 'CASH',
      'KREDI KARTI': 'CREDIT_CARD',
      'KREDİ KARTI': 'CREDIT_CARD',
      HAVALE: 'BANK_TRANSFER',
      VERESIYE: 'ON_ACCOUNT',
      VERESİYE: 'ON_ACCOUNT',
    };
    const text = this.text(value).toUpperCase();
    return ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'ON_ACCOUNT', 'OTHER'].includes(text) ? text : map[text] ?? 'CASH';
  }

  private deliveryType(value: unknown) {
    const map: Record<string, string> = {
      'MAĞAZADAN TESLIM': 'STORE_PICKUP',
      'MAĞAZADAN TESLİM': 'STORE_PICKUP',
      'KENDI ARACIMIZLA TESLIM': 'OWN_VEHICLE',
      'KENDİ ARACIMIZLA TESLİM': 'OWN_VEHICLE',
      KARGO: 'CARGO',
      KURYE: 'COURIER',
    };
    const text = this.text(value).toUpperCase();
    return ['STORE_PICKUP', 'OWN_VEHICLE', 'CARGO', 'COURIER'].includes(text) ? text : map[text] ?? 'STORE_PICKUP';
  }

  private firstImage(images: Prisma.JsonValue) {
    if (!images) return null;
    if (Array.isArray(images)) {
      const first = images.find((item) => typeof item === 'string');
      return typeof first === 'string' ? first : null;
    }
    if (typeof images === 'object' && !Array.isArray(images)) {
      const first = Object.values(images as Record<string, unknown>).find((item) => typeof item === 'string');
      return typeof first === 'string' ? first : null;
    }
    return null;
  }

  private text(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) ? number : null;
  }

  private number(value: unknown, fallback: number) {
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) ? number : fallback;
  }

  private positiveNumber(value: unknown, message: string) {
    const number = this.number(value, 0);
    if (number <= 0) throw new BadRequestException(message);
    return number;
  }

  private nonNegativeNumber(value: unknown, message: string) {
    const number = this.number(value, -1);
    if (number < 0) throw new BadRequestException(message);
    return number;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private quantityText(value: number) {
    return (Math.round(value * 1000) / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
  }
}
