import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Müşteriye güvenli gösterilebilecek alanlar.
// Maliyet alanları (costPrice, purchasePrice, supplierName vb.) KESİNLİKLE YOK —
// bu servis AuthGuard olmadan (public) çağrılır.
const SAFE_SELECT = {
  id: true,
  productName: true,
  modelCode: true,
  barcode: true,
  sitePrice: true,    // FloraYapayCicek.com satış fiyatı
  shopPrice: true,    // Dükkan barkod okutma fiyatı (kasaya gönderilir, siteye yansımaz)
  listPrice: true,    // Liste / tavsiye edilen fiyat (üstü çizili gösterim için)
  marketPrice: true,  // Pazar yeri referans fiyatı
  imageUrls: true,
  brand: true,
  description: true,
  colorVariant: true,
  material: true,
  origin: true,
  vatRate: true,
  warrantyMonths: true,
  stockQuantity: true,
  status: true,
  catalogCategory: true,
  catalogSubCategory: true,
  category: {
    select: { id: true, name: true },
  },
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productSlug(name: string, modelCode: string) {
  return `${slugify(name)}-${slugify(modelCode)}`;
}

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async lookupByImage(imageBase64: string, mimeType: string) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    let searchTerm = '';

    if (apiKey) {
      try {
        const body = {
          contents: [{
            parts: [
              { text: 'Bu görseldeki yapay çiçek veya dekoratif ürünün adını Türkçe olarak yaz. Sadece kısa ürün adını yaz, başka bir şey yazma. Örnek: "Yapay Bambu Ağaç 180 cm" veya "Yapay Gül Buketi Kırmızı"' },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: { maxOutputTokens: 60, temperature: 0.1 },
        };
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          const data = await resp.json() as any;
          searchTerm = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().slice(0, 100);
        }
      } catch { /* Gemini hatası — metin aramasına düş */ }
    }

    if (!searchTerm) return { searchTerm: '', products: [] };

    // Ürün adından anahtar kelimeler çıkar ve DB'de ara
    const words = searchTerm.split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
    const products = await this.prisma.product.findMany({
      where: {
        AND: words.map((w) => ({ productName: { contains: w, mode: 'insensitive' as const } })),
        status: 'ACTIVE',
      },
      select: {
        id: true,
        productName: true,
        modelCode: true,
        barcode: true,
        shopPrice: true,
        sitePrice: true,
        marketPrice: true,
        imageUrls: true,
        category: { select: { name: true } },
      },
      take: 5,
      orderBy: { shopPrice: 'desc' },
    });

    // Sonuç yoksa ilk kelimeyle tekrar dene
    if (products.length === 0 && words.length > 1) {
      const fallback = await this.prisma.product.findMany({
        where: {
          productName: { contains: words[0], mode: 'insensitive' },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          productName: true,
          modelCode: true,
          barcode: true,
          shopPrice: true,
          sitePrice: true,
          marketPrice: true,
          imageUrls: true,
          category: { select: { name: true } },
        },
        take: 5,
        orderBy: { shopPrice: 'desc' },
      });
      return { searchTerm, products: fallback };
    }

    return { searchTerm, products };
  }

  async listCategories() {
    // catalogCategory alanına göre dinamik kategori listesi
    // Hem Product hem TrendyolProductVariant tablosundan say (Product.productId null olabilir)
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', catalogCategory: { not: null } },
        select: { catalogCategory: true },
      }),
      this.prisma.trendyolProductVariant.findMany({
        where: { catalogCategory: { not: null }, productId: null },
        select: { catalogCategory: true },
      }),
    ]);

    const counts = new Map<string, number>();
    for (const p of [...products, ...variants]) {
      if (p.catalogCategory) {
        counts.set(p.catalogCategory, (counts.get(p.catalogCategory) ?? 0) + 1);
      }
    }

    // Kategori sırası — kullanıcının atama sayfasındaki sırayla aynı
    const CAT_ORDER = ['Ağaçlar', 'Bambu', 'Yapay Çiçekler', 'Buketler', 'Dikey Bahçeler', 'Sarmaşıklar', 'Bonsai ve Zeytin Ağaçları', 'Saksı Aranjmanları', 'Yapay Bitkiler', 'Saksılar'];

    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => {
        const ia = CAT_ORDER.indexOf(a);
        const ib = CAT_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b, 'tr');
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(([name, count], idx) => ({
        id: idx + 1,
        name,
        slug: slugify(name),
        count,
      }));
  }

  async listSubCategories(categorySlug: string): Promise<{ name: string; slug: string; count: number }[]> {
    const CAT_NAMES = ['Ağaçlar', 'Bambu', 'Yapay Çiçekler', 'Buketler', 'Dikey Bahçeler', 'Sarmaşıklar', 'Bonsai ve Zeytin Ağaçları', 'Saksı Aranjmanları', 'Yapay Bitkiler', 'Saksılar'];
    const matched = CAT_NAMES.find((n) => slugify(n) === categorySlug);
    if (!matched) return [];

    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', catalogCategory: matched, catalogSubCategory: { not: null } },
        select: { catalogSubCategory: true },
      }),
      this.prisma.trendyolProductVariant.findMany({
        where: { productId: null, catalogCategory: matched, catalogSubCategory: { not: null } },
        select: { catalogSubCategory: true },
      }),
    ]);

    const counts = new Map<string, number>();
    for (const p of [...products, ...variants]) {
      if (p.catalogSubCategory) counts.set(p.catalogSubCategory, (counts.get(p.catalogSubCategory) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([name, count]) => ({ name, slug: slugify(name), count }));
  }

  async listProducts(params: {
    categorySlug?: string;
    subCategorySlug?: string;
    search?: string;
    barcode?: string;
    modelCode?: string;
    page?: number;
    limit?: number;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name';
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(2000, Math.max(1, params.limit ?? 48));
    const skip = (page - 1) * limit;

    const CAT_NAMES = ['Ağaçlar', 'Bambu', 'Yapay Çiçekler', 'Buketler', 'Dikey Bahçeler', 'Sarmaşıklar', 'Bonsai ve Zeytin Ağaçları', 'Saksı Aranjmanları', 'Yapay Bitkiler', 'Saksılar'];

    // Kategori/alt kategori slug'ı gerçek isime çevir
    let matchedCategory: string | undefined;
    let matchedSubCategory: string | undefined;

    if (params.categorySlug) {
      matchedCategory = CAT_NAMES.find((n) => slugify(n) === params.categorySlug);
    }
    if (params.subCategorySlug) {
      const allSubs = await this.prisma.product.findMany({
        where: { status: 'ACTIVE', catalogSubCategory: { not: null } },
        select: { catalogSubCategory: true },
        distinct: ['catalogSubCategory'],
      });
      matchedSubCategory = allSubs.find((p) => p.catalogSubCategory && slugify(p.catalogSubCategory) === params.subCategorySlug)?.catalogSubCategory;
    }

    // ── 1. Product tablosu ──────────────────────────────────────────────────
    const productWhere: Record<string, unknown> = {
      status: 'ACTIVE',
      stockQuantity: { gt: 0 },
      OR: [{ sitePrice: { gt: 0 } }, { marketPrice: { gt: 0 } }, { shopPrice: { gt: 0 } }],
    };
    if (matchedCategory) productWhere['catalogCategory'] = matchedCategory;
    if (matchedSubCategory) productWhere['catalogSubCategory'] = matchedSubCategory;

    if (params.barcode?.trim()) {
      productWhere['barcode'] = params.barcode.trim();
      delete productWhere['status'];
      delete productWhere['stockQuantity'];
      delete productWhere['OR'];
    }
    if (params.modelCode?.trim()) {
      productWhere['modelCode'] = params.modelCode.trim();
      delete productWhere['status'];
      delete productWhere['stockQuantity'];
      delete productWhere['OR'];
    }
    if (params.search?.trim()) {
      const term = params.search.trim();
      productWhere['OR'] = [
        { productName: { contains: term, mode: 'insensitive' } },
        { modelCode: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { colorVariant: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> =
      params.sort === 'price_asc'  ? { sitePrice: 'asc' }  :
      params.sort === 'price_desc' ? { sitePrice: 'desc' } :
      params.sort === 'name'       ? { productName: 'asc' } :
                                     { id: 'desc' };

    // ── 2. TrendyolProductVariant tablosu (productId: null olanlar) ─────────
    // Bunlar Product'a bağlanmamış ama kategorize edilmiş Trendyol ürünleri
    const variantWhere: Record<string, unknown> = {
      productId: null,
      catalogCategory: { not: null },
      stockQuantity: { gt: 0 },
      trendyolSalePrice: { gt: 0 },
    };
    if (matchedCategory) variantWhere['catalogCategory'] = matchedCategory;
    if (matchedSubCategory) variantWhere['catalogSubCategory'] = matchedSubCategory;
    if (params.barcode?.trim()) {
      variantWhere['barcode'] = params.barcode.trim();
      delete variantWhere['stockQuantity'];
      delete variantWhere['trendyolSalePrice'];
    }
    if (params.search?.trim()) {
      const term = params.search.trim();
      variantWhere['productName'] = { contains: term, mode: 'insensitive' };
    }

    const [productCount, productRows, variantRows] = await Promise.all([
      this.prisma.product.count({ where: productWhere as any }),
      this.prisma.product.findMany({ where: productWhere as any, select: SAFE_SELECT, orderBy: orderBy as any, skip, take: limit }),
      // Varyantları sadece barcode/modelCode/search filtresi olmadığında getir (tam liste için)
      (!params.barcode && !params.modelCode)
        ? this.prisma.trendyolProductVariant.findMany({
            where: variantWhere as any,
            select: {
              id: true,
              productName: true,
              currentModelCode: true,
              barcode: true,
              trendyolSalePrice: true,
              stockQuantity: true,
              catalogCategory: true,
              catalogSubCategory: true,
              images: true,
              brand: true,
              productDescription: true,
              productColor: true,
            },
            orderBy: { id: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const variantProducts = variantRows.map((v) => this.variantToPublicProduct(v));
    const allProducts = [...productRows.map((p) => this.toPublicProduct(p)), ...variantProducts];

    // Sort birleşik listeye uygula
    if (params.sort === 'price_asc')  allProducts.sort((a, b) => a.sitePrice - b.sitePrice);
    if (params.sort === 'price_desc') allProducts.sort((a, b) => b.sitePrice - a.sitePrice);
    if (params.sort === 'name')       allProducts.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    const total = productCount + variantRows.length;

    return {
      products: allProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductBySlug(slug: string) {
    const parts = slug.split('-');
    for (let take = 1; take <= 6; take++) {
      const segment = parts.slice(-take).join('-').toUpperCase();
      const candidates = [segment, segment.replace(/-/g, '.')];
      for (const modelCode of candidates) {
        const product = await this.prisma.product.findFirst({
          where: { modelCode, status: 'ACTIVE' },
          select: SAFE_SELECT,
        });
        if (product) return this.toPublicProduct(product);
      }
    }
    return null;
  }

  async getProductById(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      select: SAFE_SELECT,
    });
    return product ? this.toPublicProduct(product) : null;
  }

  private variantToPublicProduct(v: {
    id: number;
    productName: string;
    currentModelCode: string | null;
    barcode: string;
    trendyolSalePrice: any;
    stockQuantity: number;
    catalogCategory: string | null;
    catalogSubCategory: string | null;
    images: unknown;
    brand: string | null;
    productDescription: string | null;
    productColor: string | null;
  }) {
    const modelCode = v.currentModelCode || v.barcode;
    const catName = v.catalogCategory;
    const price = Number(v.trendyolSalePrice) || 0;
    const images = this.parseImageUrls(v.images);

    return {
      id: v.id * -1, // negatif id — variant'ı Product'tan ayırt etmek için
      name: v.productName,
      slug: productSlug(v.productName, modelCode),
      modelCode,
      category: catName,
      categorySlug: catName ? slugify(catName) : null,
      sitePrice: price,
      originalPrice: null as number | null,
      brand: v.brand ?? '',
      description: v.productDescription,
      colorVariant: v.productColor,
      material: null as string | null,
      origin: 'TR',
      vatRate: 20,
      warrantyMonths: 0,
      inStock: v.stockQuantity > 0,
      images,
      mainImage: images[0] ?? null,
    };
  }

  private calcSitePrice(trendyolPrice: number, commissionPercent: number): number {
    if (trendyolPrice <= 0) return 0;
    const commission = Math.max(0, Math.min(commissionPercent, 100));
    return Math.round(trendyolPrice * (1 - commission / 100));
  }

  async bulkSyncSitePriceFromTrendyol(): Promise<{ updated: number; skipped: number }> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, marketPrice: true, shopPrice: true },
    });

    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { productId: { not: null } },
      select: { productId: true, trendyolSalePrice: true },
    });
    const variantPriceMap = new Map<number, number>();
    for (const v of variants) {
      if (v.productId && !variantPriceMap.has(v.productId)) {
        variantPriceMap.set(v.productId, Number(v.trendyolSalePrice ?? 0));
      }
    }

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      let trendyolPrice = Number(product.marketPrice ?? 0) || Number(product.shopPrice ?? 0);
      if (trendyolPrice <= 0) {
        trendyolPrice = variantPriceMap.get(product.id) ?? 0;
      }
      if (trendyolPrice <= 0) { skipped++; continue; }
      const sitePrice = Math.round(trendyolPrice * 0.80);
      await this.prisma.product.update({ where: { id: product.id }, data: { sitePrice } });
      updated++;
    }

    return { updated, skipped };
  }

  async bulkSyncSitePriceFromApprovedCosts(): Promise<{ updated: number; skipped: number; details: string[] }> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        productName: true,
        sitePrice: true,
        productCenterVariant: {
          select: {
            trendyolSalePrice: true,
            commissionPercent: true,
            productCostDraft: {
              select: { salePrice: true, status: true },
            },
          },
        },
      },
    });

    let updated = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const product of products) {
      const variant = product.productCenterVariant;
      const draft = variant?.productCostDraft;
      const trendyolPrice = Number(variant?.trendyolSalePrice ?? 0);
      const commission = Number((variant as any)?.commissionPercent ?? 20);

      const approvedPrice = draft?.status === 'APPROVED' ? Number(draft.salePrice ?? 0) : 0;
      const basePrice = approvedPrice > 0 ? approvedPrice : trendyolPrice;

      if (basePrice <= 0) { skipped++; continue; }

      const newPrice = this.calcSitePrice(basePrice, commission);

      if (newPrice <= 0) { skipped++; continue; }
      if (product.sitePrice === newPrice) { skipped++; continue; }

      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          sitePrice: newPrice,
          shopPrice: newPrice,
          listPrice: trendyolPrice > 0 ? trendyolPrice : newPrice,
          marketPrice: trendyolPrice > 0 ? trendyolPrice : newPrice,
        },
      });
      details.push(`[${product.id}] ${product.productName}: ${product.sitePrice} → ${newPrice} (komisyon %${commission})`);
      updated++;
    }

    return { updated, skipped, details };
  }

  async getShopPrice(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, status: 'ACTIVE' },
      select: { id: true, productName: true, modelCode: true, shopPrice: true, imageUrls: true },
    });
    if (!product) return null;
    return {
      id: product.id,
      name: product.productName,
      modelCode: product.modelCode,
      shopPrice: product.shopPrice,
      image: this.firstImage(product.imageUrls),
    };
  }

  async recategorizeByName(): Promise<{ updated: number; skipped: number; details: string[] }> {
    const RULES: Array<{ keywords: string[]; categoryName: string }> = [
      { keywords: ['bambu'],                                                                                                                                     categoryName: 'Bambu' },
      { keywords: ['dikey bahçe', 'dikey bahce', 'yosun duvar', 'panel', 'duvar kaplama', 'yapay çit', 'yapay cit'],                                           categoryName: 'Dikey Bahçe' },
      { keywords: ['sarmaşık', 'sarmasik'],                                                                                                                      categoryName: 'Yapay Sarmaşık' },
      { keywords: ['demet', 'buket'],                                                                                                                            categoryName: 'Demet Çiçek' },
      { keywords: ['aranjman', 'arajman', 'kompozisyon'],                                                                                                       categoryName: 'Aranjman' },
      { keywords: ['bonzai', 'bonsai'],                                                                                                                          categoryName: 'Bonsai' },
      { keywords: ['zeytin'],                                                                                                                                    categoryName: 'Zeytin Ağacı' },
      { keywords: ['mini', 'küçük saksı', 'kucuk saksi', 'masa bitkisi', 'masa bitki', 'sukulent', 'kaktüs', 'kaktus', 'lavanta', 'şimşir', 'simsir'],        categoryName: 'Mini Saksılı Bitki' },
      { keywords: ['saksı', 'saksi', 'vazo', 'saksılı', 'saksili'],                                                                                            categoryName: 'Saksı & Vazo' },
      { keywords: ['ağaç', 'agac', 'palmiye', 'ficus', 'benjamin', 'areka', 'strelitzia', 'kiraz', 'erik', 'bahar dal'],                                      categoryName: 'Yapay Ağaç' },
      { keywords: ['çiçek', 'cicek', 'orkide', 'gül', 'gul', 'lale', 'kasımpatı', 'kasimpati', 'dal çiçek', 'dal cicek'],                                     categoryName: 'Demet Çiçek' },
      { keywords: ['bitki', 'kaktüs', 'kaktus', 'lavanta'],                                                                                                    categoryName: 'Yapay Bitki' },
    ];

    const allCategories = await this.prisma.category.findMany({ select: { id: true, name: true } });
    const catMap = new Map(allCategories.map((c) => [c.name.toLocaleLowerCase('tr-TR'), c.id]));

    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, productName: true, categoryId: true },
    });

    let updated = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const product of products) {
      const nameLower = product.productName.toLocaleLowerCase('tr-TR');
      let targetCategoryId: number | null = null;
      let targetCategoryName = '';

      for (const rule of RULES) {
        if (rule.keywords.some((kw) => nameLower.includes(kw.toLocaleLowerCase('tr-TR')))) {
          const catId = catMap.get(rule.categoryName.toLocaleLowerCase('tr-TR'));
          if (catId) {
            targetCategoryId = catId;
            targetCategoryName = rule.categoryName;
          }
          break;
        }
      }

      if (!targetCategoryId || targetCategoryId === product.categoryId) {
        skipped++;
        continue;
      }

      await this.prisma.product.update({
        where: { id: product.id },
        data: { categoryId: targetCategoryId },
      });
      details.push(`[${product.id}] ${product.productName} → ${targetCategoryName}`);
      updated++;
    }

    return { updated, skipped, details };
  }

  private toPublicProduct(product: {
    id: number;
    productName: string;
    modelCode: string;
    barcode: string | null;
    sitePrice: number;
    shopPrice: number;
    listPrice: number;
    marketPrice: number;
    imageUrls: unknown;
    brand: string;
    description: string | null;
    colorVariant: string | null;
    material: string | null;
    origin: string;
    vatRate: number;
    warrantyMonths: number;
    stockQuantity: number;
    catalogCategory?: string | null;
    catalogSubCategory?: string | null;
    category: { id: number; name: string } | null;
  }) {
    const images = this.parseImageUrls(product.imageUrls);
    const catName = product.catalogCategory ?? product.category?.name ?? null;
    const price = product.sitePrice || product.marketPrice || product.shopPrice;

    return {
      id: product.id,
      name: product.productName,
      slug: productSlug(product.productName, product.modelCode),
      modelCode: product.modelCode,
      category: catName,
      categorySlug: catName ? slugify(catName) : null,
      sitePrice: price,
      originalPrice: product.listPrice > price ? product.listPrice : null,
      brand: product.brand,
      description: product.description,
      colorVariant: product.colorVariant,
      material: product.material,
      origin: product.origin,
      vatRate: product.vatRate,
      warrantyMonths: product.warrantyMonths,
      inStock: product.stockQuantity > 0,
      images,
      mainImage: images[0] ?? null,
    };
  }

  private parseImageUrls(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string');
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }

  private firstImage(raw: unknown): string | null {
    return this.parseImageUrls(raw)[0] ?? null;
  }
}
