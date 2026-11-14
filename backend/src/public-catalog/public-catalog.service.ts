import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resolveGeminiModel } from '../common/gemini-model';
import { SITE_ONLY_MODEL_PREFIX, isSiteOnlyModelCode } from '../common/site-only';
import { productSitePrice, sitePriceFromTrendyol, TRENDYOL_COMPARE_LABEL } from '../common/site-pricing';

// Sadece ürün grubu sayfasında (boyut/renk seçimiyle) satılan site ürünleri
const GROUP_ONLY_MODEL_PREFIX = 'WEB-BST-';

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
  videoUrl: true,
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
  // Site fiyatı = Trendyol fiyatının %25 altı (common/site-pricing.ts)
  productCenterVariant: {
    select: { trendyolSalePrice: true, status: true },
  },
};

interface TrendyolIndex {
  priceByProductId: Map<number, { trendyolSalePrice: number; onSale: boolean; barcode: string }>;
  onSaleProductIds: number[];
  shadowedVariantIds: number[];
}

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
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${resolveGeminiModel(this.config.get<string>('GEMINI_MODEL'))}:generateContent?key=${apiKey}`, {
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
    // Sayılar sitede gerçekten listelenen ürünlerle aynı olsun (sadece satıştakiler)
    const idx = await this.trendyolIndex();
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', catalogCategory: { not: null }, ...this.onSaleProductFilter(idx) },
        select: { catalogCategory: true },
      }),
      this.prisma.trendyolProductVariant.findMany({
        where: { catalogCategory: { not: null }, ...this.onSaleVariantFilter(idx) },
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
    const CAT_ORDER = ['Ağaçlar', 'Bambu', 'Yapay Çiçekler', 'Buketler', 'Dikey Bahçeler', 'Sarmaşıklar', 'Bonsai ve Zeytin Ağaçları', 'Saksı Aranjmanları', 'Yapay Bitkiler', 'Kaktüs ve Sazlıklar', 'Saksılar', 'Vazo ve Şamdanlar'];

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
    const CAT_NAMES = ['Ağaçlar', 'Bambu', 'Yapay Çiçekler', 'Buketler', 'Dikey Bahçeler', 'Sarmaşıklar', 'Bonsai ve Zeytin Ağaçları', 'Saksı Aranjmanları', 'Yapay Bitkiler', 'Kaktüs ve Sazlıklar', 'Saksılar', 'Vazo ve Şamdanlar'];
    const matched = CAT_NAMES.find((n) => slugify(n) === categorySlug);
    if (!matched) return [];

    const idx = await this.trendyolIndex();
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', catalogCategory: matched, catalogSubCategory: { not: null }, ...this.onSaleProductFilter(idx) },
        select: { catalogSubCategory: true },
      }),
      this.prisma.trendyolProductVariant.findMany({
        where: { catalogCategory: matched, catalogSubCategory: { not: null }, ...this.onSaleVariantFilter(idx) },
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

  // ── Çok satanlar: son 90 gün pazaryeri satışları (önce Trendyol) — 30 dk önbellek ─────────
  private salesCache: { at: number; value: Promise<Map<string, number>> } | null = null;

  /** barkod / stok kodu → satış skoru. Trendyol satışı her zaman öne geçer (1e6 + adet), diğer pazaryerleri adet. */
  private salesScores(): Promise<Map<string, number>> {
    const now = Date.now();
    if (this.salesCache && now - this.salesCache.at < 30 * 60_000) return this.salesCache.value;
    const value = (async () => {
      const since = new Date(now - 90 * 24 * 3600_000);
      const items = await this.prisma.marketplaceOrderItem.findMany({
        where: {
          order: {
            orderDate: { gte: since },
            NOT: [
              { status: { contains: 'cancel', mode: 'insensitive' } },
              { status: { contains: 'return', mode: 'insensitive' } },
              { status: { contains: 'iptal', mode: 'insensitive' } },
              { status: { contains: 'iade', mode: 'insensitive' } },
              { status: { contains: 'unsupplied', mode: 'insensitive' } },
            ],
          },
        },
        select: { barcode: true, sku: true, quantity: true, order: { select: { platform: true } } },
      });
      const ty = new Map<string, number>();
      const other = new Map<string, number>();
      for (const it of items) {
        const q = Number(it.quantity) || 0;
        const target = it.order.platform.toUpperCase().startsWith('TRENDYOL') ? ty : other;
        for (const k of new Set([it.barcode, it.sku].filter(Boolean) as string[])) {
          const key = k.replace(/^FL-/i, '');
          target.set(key, (target.get(key) ?? 0) + q);
        }
      }
      const out = new Map<string, number>();
      for (const [k, q] of other) out.set(k, q);
      for (const [k, q] of ty) out.set(k, 1_000_000 + q);
      return out;
    })().catch((e) => { this.salesCache = null; throw e; });
    this.salesCache = { at: now, value };
    return value;
  }

  // Ana sayfa: her kategoriden en son eklenen (satıştaki, fiyatlı) ürün — 10 dk önbellek
  private latestCache: { at: number; value: Promise<Array<{ category: { name: string; slug: string }; product: ReturnType<PublicCatalogService['variantToPublicProduct']> | ReturnType<PublicCatalogService['toPublicProduct']> }>> } | null = null;

  latestByCategory() {
    const now = Date.now();
    if (this.latestCache && now - this.latestCache.at < 10 * 60_000) return this.latestCache.value;
    const value = this.buildLatestByCategory().catch((e) => { this.latestCache = null; throw e; });
    this.latestCache = { at: now, value };
    return value;
  }

  private async buildLatestByCategory() {
    const [cats, idx] = await Promise.all([this.listCategories(), this.trendyolIndex()]);
    const out = [];
    for (const c of cats) {
      const [prod, variant] = await Promise.all([
        this.prisma.product.findFirst({
          where: {
            status: 'ACTIVE',
            catalogCategory: c.name,
            NOT: { modelCode: { startsWith: GROUP_ONLY_MODEL_PREFIX } },
            OR: [
              { modelCode: { startsWith: SITE_ONLY_MODEL_PREFIX }, stockQuantity: { gt: 0 }, sitePrice: { gt: 0 } },
              { id: { in: idx.onSaleProductIds } },
            ],
          },
          select: { ...SAFE_SELECT, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.trendyolProductVariant.findFirst({
          where: {
            productId: null, catalogCategory: c.name, stockQuantity: { gt: 0 }, trendyolSalePrice: { gt: 0 },
            status: 'ACTIVE', id: { notIn: idx.shadowedVariantIds },
          },
          select: {
            id: true, productName: true, currentModelCode: true, barcode: true, trendyolSalePrice: true,
            stockQuantity: true, catalogCategory: true, catalogSubCategory: true, images: true, brand: true,
            productDescription: true, productColor: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      const useVariant = variant && (!prod || variant.createdAt > prod.createdAt);
      const product = useVariant
        ? this.variantToPublicProduct(variant)
        : prod
          ? this.toPublicProduct((await this.withTrendyolMatch([prod]))[0])
          : null;
      if (product && product.sitePrice > 0 && product.mainImage) out.push({ category: { name: c.name, slug: c.slug }, product });
    }
    return out;
  }

  async listProducts(params: {
    categorySlug?: string;
    subCategorySlug?: string;
    search?: string;
    barcode?: string;
    modelCode?: string;
    page?: number;
    limit?: number;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name' | 'bestseller';
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(2000, Math.max(1, params.limit ?? 48));
    const skip = (page - 1) * limit;

    const CAT_NAMES = ['Ağaçlar', 'Bambu', 'Yapay Çiçekler', 'Buketler', 'Dikey Bahçeler', 'Sarmaşıklar', 'Bonsai ve Zeytin Ağaçları', 'Saksı Aranjmanları', 'Yapay Bitkiler', 'Kaktüs ve Sazlıklar', 'Saksılar', 'Vazo ve Şamdanlar'];

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
      matchedSubCategory = allSubs.find((p) => p.catalogSubCategory && slugify(p.catalogSubCategory) === params.subCategorySlug)?.catalogSubCategory ?? undefined;
    }

    // ── 1. Product tablosu ──────────────────────────────────────────────────
    const productWhere: Record<string, unknown> = {
      status: 'ACTIVE',
      stockQuantity: { gt: 0 },
      OR: [
        { sitePrice: { gt: 0 } },
        { marketPrice: { gt: 0 } },
        { shopPrice: { gt: 0 } },
        // Sadece sitede satılan, fiyatı girilmemiş ürünler "Fiyat için iletişime geçin" ile listelenir
        { modelCode: { startsWith: SITE_ONLY_MODEL_PREFIX } },
      ],
    };
    // Sitede sadece: Trendyol'da AKTİF + stoklu olanlar ve sadece sitede satılan WEB- ürünleri
    const tyIndex = await this.trendyolIndex();
    // Stok: Trendyol ürününde Trendyol stoğu esas (dizinde kontrol edildi), WEB- üründe ERP stoğu
    delete productWhere['stockQuantity'];
    productWhere['AND'] = [{ OR: [
      { modelCode: { startsWith: SITE_ONLY_MODEL_PREFIX }, stockQuantity: { gt: 0 } },
      { id: { in: tyIndex.onSaleProductIds } },
    ] }];
    if (matchedCategory) productWhere['catalogCategory'] = matchedCategory;
    if (matchedSubCategory) productWhere['catalogSubCategory'] = matchedSubCategory;
    // Ürün grubu varyantı olarak satılan site ürünleri (ör. Bostann saksı boyut×renk) düz listede
    // tek tek gösterilmez; müşteri bunları grup sayfasından boyut/renk seçerek alır. Aramada görünürler.
    if (!params.search?.trim()) {
      productWhere['NOT'] = { modelCode: { startsWith: GROUP_ONLY_MODEL_PREFIX } };
    }

    if (params.barcode?.trim()) {
      productWhere['barcode'] = params.barcode.trim();
      delete productWhere['status'];
      delete productWhere['stockQuantity'];
      delete productWhere['OR'];
      delete productWhere['AND'];
    }
    if (params.modelCode?.trim()) {
      // FL- ön eki Flora siparişlerinde gelir; products tablosunda ön eksiz kayıtlı
      const mc = params.modelCode.trim().replace(/^FL-/i, '');
      productWhere['modelCode'] = mc;
      delete productWhere['status'];
      delete productWhere['stockQuantity'];
      delete productWhere['OR'];
      delete productWhere['AND'];
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
      status: 'ACTIVE', // sadece Trendyol'da satışta olanlar
      // ERP ürün kaydıyla eşleşen Trendyol ürünü, ERP kaydı üzerinden listelenir (çift görünmesin)
      id: { notIn: tyIndex.shadowedVariantIds },
    };
    if (matchedCategory) variantWhere['catalogCategory'] = matchedCategory;
    if (matchedSubCategory) variantWhere['catalogSubCategory'] = matchedSubCategory;
    if (params.barcode?.trim()) {
      variantWhere['barcode'] = params.barcode.trim();
      delete variantWhere['stockQuantity'];
      delete variantWhere['trendyolSalePrice'];
      delete variantWhere['productId'];
      delete variantWhere['status'];
      delete variantWhere['id'];
    }
    if (params.modelCode?.trim()) {
      const mc = params.modelCode.trim().replace(/^FL-/i, '');
      variantWhere['OR'] = [{ currentModelCode: mc }, { supplierStockCode: mc }];
      delete variantWhere['stockQuantity'];
      delete variantWhere['trendyolSalePrice'];
      delete variantWhere['productId'];
      delete variantWhere['status'];
      delete variantWhere['id'];
    }
    if (params.search?.trim()) {
      const term = params.search.trim();
      variantWhere['productName'] = { contains: term, mode: 'insensitive' };
    }

    const [productRows, variantRows] = await Promise.all([
      // Sayfalama birleşik listede yapılır (Product + Trendyol ürünleri birlikte sıralanır; her sayfada tekrar etmez)
      this.prisma.product.findMany({ where: productWhere as any, select: { ...SAFE_SELECT, createdAt: true }, orderBy: orderBy as any }),
      // Barcode/modelCode aramasında da variant tablosuna bak (HB, Flora siparişlerinde barkod match için)
      // Sadece tam liste için barcode/modelCode/search filtresi olmadığında büyük sorgu çalıştır
      this.prisma.trendyolProductVariant.findMany({
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
          createdAt: true,
        },
        orderBy: { id: 'desc' },
        // Barcode/modelCode aramasında limit 1 yeterli; tam listede sayfalama üst çerçevesine bırak
        take: (params.barcode || params.modelCode) ? 1 : undefined,
      }),
    ]);

    const [matchedRows, sales] = await Promise.all([this.withTrendyolMatch(productRows), this.salesScores()]);
    const idx = await this.trendyolIndex();
    const scoreOf = (codes: Array<string | null | undefined>) => {
      let best = 0;
      for (const c of codes) if (c) best = Math.max(best, sales.get(c) ?? 0);
      return best;
    };
    const rows = [
      ...matchedRows.map((p) => ({
        pub: this.toPublicProduct(p),
        createdAt: p.createdAt.getTime(),
        score: scoreOf([idx.priceByProductId.get(p.id)?.barcode, p.barcode, p.modelCode]),
      })),
      ...variantRows.map((v) => ({
        pub: this.variantToPublicProduct(v),
        createdAt: v.createdAt.getTime(),
        score: scoreOf([v.barcode, v.currentModelCode]),
      })),
    ];

    // Sıralama birleşik listede. Varsayılan: çok satanlar (önce Trendyol satışları), sonra en yeniler
    const sort = params.sort ?? 'bestseller';
    if (sort === 'price_asc')  rows.sort((a, b) => (a.pub.sitePrice || Infinity) - (b.pub.sitePrice || Infinity));
    else if (sort === 'price_desc') rows.sort((a, b) => b.pub.sitePrice - a.pub.sitePrice);
    else if (sort === 'name')  rows.sort((a, b) => a.pub.name.localeCompare(b.pub.name, 'tr'));
    else if (sort === 'newest') rows.sort((a, b) => b.createdAt - a.createdAt);
    else rows.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);

    // "Çok Satan" etiketi: tüm katalogdaki satış sırasına göre ilk 20
    const topScores = [...sales.values()].sort((a, b) => b - a);
    const cutoff = topScores[Math.min(19, topScores.length - 1)] ?? Infinity;
    const allProducts = rows.map((r) => ({ ...r.pub, bestseller: r.score > 0 && r.score >= cutoff }));

    const total = allProducts.length;

    return {
      products: (params.barcode || params.modelCode) ? allProducts : allProducts.slice(skip, skip + limit),
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
        if (product) return this.toPublicProduct((await this.withTrendyolMatch([product]))[0]);
      }
    }
    // Product tablosunda bulunamadıysa TrendyolProductVariant'ta ara
    for (let take = 1; take <= 6; take++) {
      const segment = parts.slice(-take).join('-').toUpperCase();
      const candidates = [segment, segment.replace(/-/g, '.')];
      for (const modelCode of candidates) {
        const variant = await this.prisma.trendyolProductVariant.findFirst({
          where: {
            OR: [{ currentModelCode: modelCode }, { barcode: modelCode }],
            catalogCategory: { not: null },
          },
          select: {
            id: true, productName: true, currentModelCode: true, barcode: true,
            trendyolSalePrice: true, stockQuantity: true, catalogCategory: true,
            catalogSubCategory: true, images: true, brand: true, productDescription: true, productColor: true,
          },
        });
        if (variant) return this.variantToPublicProduct(variant);
      }
    }
    return null;
  }

  async getProductById(id: number) {
    if (id < 0) {
      // Negatif ID → TrendyolProductVariant
      const variant = await this.prisma.trendyolProductVariant.findFirst({
        where: { id: Math.abs(id) },
        select: {
          id: true, productName: true, currentModelCode: true, barcode: true,
          trendyolSalePrice: true, stockQuantity: true, catalogCategory: true,
          catalogSubCategory: true, images: true, brand: true, productDescription: true, productColor: true,
        },
      });
      return variant ? this.variantToPublicProduct(variant) : null;
    }
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      select: SAFE_SELECT,
    });
    return product ? this.toPublicProduct((await this.withTrendyolMatch([product]))[0]) : null;
  }

  async createProduct(data: {
    name: string;
    modelCode?: string | null;
    sitePrice: number;
    originalPrice?: number | null;
    brand?: string | null;
    description?: string | null;
    origin?: string | null;
    vatRate?: number | null;
    warrantyMonths?: number | null;
    inStock?: boolean;
    images?: string[];
    videoUrl?: string | null;
  }) {
    const modelCode = data.modelCode?.trim() || `URUN-${Date.now()}`;
    // categoryId zorunlu — ilk kategoriyi default olarak kullan
    let defaultCategory = await this.prisma.category.findFirst({ orderBy: { id: 'asc' } });
    if (!defaultCategory) {
      defaultCategory = await this.prisma.category.create({ data: { name: 'Genel', codePrefix: 'GEN', startCode: 1, currentCode: 1 } });
    }
    const product = await this.prisma.product.create({
      data: {
        productName: data.name,
        modelCode,
        categoryId: defaultCategory.id,
        sitePrice: data.sitePrice,
        listPrice: data.originalPrice ?? 0,
        marketPrice: data.originalPrice ?? 0,
        brand: data.brand ?? 'Erhan Flowers',
        description: data.description ?? null,
        origin: data.origin ?? 'ÇİN',
        vatRate: data.vatRate ?? 10,
        warrantyMonths: data.warrantyMonths ?? 0,
        status: data.inStock === false ? 'PASSIVE' : 'ACTIVE',
        imageUrls: data.images ?? [],
        videoUrl: data.videoUrl ?? null,
        stockQuantity: data.inStock === false ? 0 : 1,
        costPrice: 0,
        desi: 1,
        shippingCost: 5,
        shopPrice: 0,
      },
    });
    return { ok: true, id: product.id };
  }

  async setVideo(productId: number, videoUrl: string | null): Promise<{ ok: boolean }> {
    if (productId > 0) {
      await this.prisma.product.update({ where: { id: productId }, data: { videoUrl } });
    }
    return { ok: true };
  }

  async setCategory(productId: number, category: string, subCategory: string | null): Promise<{ ok: boolean; updated: string }> {
    if (productId > 0) {
      // Product tablosu
      await this.prisma.product.update({
        where: { id: productId },
        data: { catalogCategory: category, catalogSubCategory: subCategory },
      });
      return { ok: true, updated: 'product' };
    } else {
      // TrendyolProductVariant tablosu (negatif id → gerçek id = abs)
      const variantId = Math.abs(productId);
      const variant = await this.prisma.trendyolProductVariant.update({
        where: { id: variantId },
        data: { catalogCategory: category, catalogSubCategory: subCategory },
        select: { id: true, productId: true },
      });
      // Bağlı Product varsa onu da güncelle
      if (variant.productId) {
        await this.prisma.product.update({
          where: { id: variant.productId },
          data: { catalogCategory: category, catalogSubCategory: subCategory },
        }).catch(() => undefined);
      }
      return { ok: true, updated: 'variant' };
    }
  }

  // Ürün adındaki anahtar kelimeye göre toplu fiyat güncelleme
  // changePercent: +20 → %20 zam, -10 → %10 indirim
  async bulkPriceAdjust(params: {
    search: string;
    changePercent: number;
    dryRun?: boolean;
  }): Promise<{ updated: number; skipped: number; preview: Array<{ id: number; name: string; oldSitePrice: number; newSitePrice: number; oldMarketPrice: number; newMarketPrice: number }> }> {
    const term = params.search.trim();
    if (!term) return { updated: 0, skipped: 0, preview: [] };

    const multiplier = 1 + params.changePercent / 100;

    const products = await this.prisma.product.findMany({
      where: {
        productName: { contains: term, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { id: true, productName: true, sitePrice: true, marketPrice: true, listPrice: true },
    });

    const preview: Array<{ id: number; name: string; oldSitePrice: number; newSitePrice: number; oldMarketPrice: number; newMarketPrice: number }> = [];
    let updated = 0;
    let skipped = 0;

    for (const p of products) {
      const oldSitePrice = Number(p.sitePrice) || 0;
      const oldMarketPrice = Number(p.marketPrice) || 0;

      if (oldSitePrice <= 0 && oldMarketPrice <= 0) { skipped++; continue; }

      const newSitePrice = oldSitePrice > 0 ? Math.round(oldSitePrice * multiplier) : 0;
      const newMarketPrice = oldMarketPrice > 0 ? Math.round(oldMarketPrice * multiplier) : 0;
      const newListPrice = Math.max(newSitePrice, newMarketPrice, Number(p.listPrice) || 0);

      preview.push({ id: p.id, name: p.productName, oldSitePrice, newSitePrice, oldMarketPrice, newMarketPrice });

      if (!params.dryRun) {
        await this.prisma.product.update({
          where: { id: p.id },
          data: {
            sitePrice: newSitePrice > 0 ? newSitePrice : undefined,
            marketPrice: newMarketPrice > 0 ? newMarketPrice : undefined,
            listPrice: newListPrice > 0 ? newListPrice : undefined,
          },
        });
        updated++;
      }
    }

    if (params.dryRun) skipped = products.length - preview.length;
    else skipped = products.length - updated;

    return { updated: params.dryRun ? 0 : updated, skipped, preview };
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
    const trendyolPrice = Number(v.trendyolSalePrice) || 0;
    const price = sitePriceFromTrendyol(trendyolPrice);
    const images = this.parseImageUrls(v.images);

    return {
      id: v.id * -1, // negatif id — variant'ı Product'tan ayırt etmek için
      name: v.productName,
      slug: productSlug(v.productName, modelCode),
      modelCode,
      category: catName,
      categorySlug: catName ? slugify(catName) : null,
      sitePrice: price,
      originalPrice: price > 0 && trendyolPrice > price ? trendyolPrice : (null as number | null),
      compareAtLabel: price > 0 && trendyolPrice > price ? TRENDYOL_COMPARE_LABEL : (null as string | null),
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
      videoUrl: null as string | null,
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

  // ── Trendyol eşleşme dizini (5 dk önbellek) ───────────────────────────────
  // Site = Trendyol'da AKTİF + stoklu ürünler, fiyat Trendyol −%X. ERP Product kaydı Trendyol ürünüyle
  // productCenterVariant bağıyla, yoksa barkod / model koduyla eşleştirilir. Eşleşen Trendyol kaydı ayrıca
  // "Trendyol ürünü" olarak listelenmez (aynı ürün iki kez görünmesin).
  private trendyolIndexCache: { at: number; value: Promise<TrendyolIndex> } | null = null;

  private trendyolIndex(): Promise<TrendyolIndex> {
    const now = Date.now();
    if (this.trendyolIndexCache && now - this.trendyolIndexCache.at < 5 * 60_000) return this.trendyolIndexCache.value;
    const value = this.buildTrendyolIndex().catch((e) => { this.trendyolIndexCache = null; throw e; });
    this.trendyolIndexCache = { at: now, value };
    return value;
  }

  private async buildTrendyolIndex(): Promise<TrendyolIndex> {
    const [variants, products] = await Promise.all([
      this.prisma.trendyolProductVariant.findMany({
        where: { trendyolSalePrice: { gt: 0 } },
        select: { id: true, productId: true, barcode: true, currentModelCode: true, trendyolSalePrice: true, status: true, stockQuantity: true },
      }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, barcode: true, modelCode: true },
      }),
    ]);
    const byProductId = new Map<number, (typeof variants)[number]>();
    const byBarcode = new Map<string, (typeof variants)[number]>();
    const byCode = new Map<string, (typeof variants)[number]>();
    for (const v of variants) {
      if (v.productId) byProductId.set(v.productId, v);
      byBarcode.set(v.barcode, v);
      if (v.currentModelCode && !byCode.has(v.currentModelCode)) byCode.set(v.currentModelCode, v);
    }
    const priceByProductId = new Map<number, { trendyolSalePrice: number; onSale: boolean; barcode: string }>();
    const onSaleProductIds: number[] = [];
    const shadowedVariantIds = new Set<number>();
    for (const p of products) {
      if (isSiteOnlyModelCode(p.modelCode)) continue;
      const v = byProductId.get(p.id) || (p.barcode ? byBarcode.get(p.barcode) : undefined) || byBarcode.get(p.modelCode) || byCode.get(p.modelCode);
      if (!v) continue;
      const onSale = v.status === 'ACTIVE' && v.stockQuantity > 0;
      priceByProductId.set(p.id, { trendyolSalePrice: Number(v.trendyolSalePrice) || 0, onSale, barcode: v.barcode });
      if (onSale) onSaleProductIds.push(p.id);
      shadowedVariantIds.add(v.id);
    }
    return { priceByProductId, onSaleProductIds, shadowedVariantIds: [...shadowedVariantIds] };
  }

  /** Sitede listelenen Product: sadece sitede satılan WEB- (stoklu, grup-dışı) veya Trendyol'da satıştaki */
  private onSaleProductFilter(idx: TrendyolIndex) {
    return {
      NOT: { modelCode: { startsWith: GROUP_ONLY_MODEL_PREFIX } },
      OR: [
        { modelCode: { startsWith: SITE_ONLY_MODEL_PREFIX }, stockQuantity: { gt: 0 } },
        { id: { in: idx.onSaleProductIds } },
      ],
    };
  }

  /** Sitede ayrı listelenen Trendyol ürünü: ERP kaydına bağlı/eşleşmiş değil, aktif, stoklu, fiyatlı */
  private onSaleVariantFilter(idx: TrendyolIndex) {
    return {
      productId: null,
      status: 'ACTIVE' as const,
      stockQuantity: { gt: 0 },
      trendyolSalePrice: { gt: 0 },
      id: { notIn: idx.shadowedVariantIds },
    };
  }

  /** Product satırlarına Trendyol fiyatını iliştirir (bağlı ya da barkod/model koduyla eşleşen). */
  private async withTrendyolMatch<T extends { id: number; modelCode: string; productCenterVariant?: { trendyolSalePrice: unknown; status?: string } | null }>(rows: T[]): Promise<T[]> {
    if (rows.length === 0) return rows;
    const idx = await this.trendyolIndex();
    return rows.map((r) => {
      const m = idx.priceByProductId.get(r.id);
      return m ? { ...r, productCenterVariant: { trendyolSalePrice: m.trendyolSalePrice, status: m.onSale ? 'ACTIVE' : 'PASSIVE' } } : r;
    });
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
    videoUrl?: string | null;
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
    productCenterVariant?: { trendyolSalePrice: unknown; status?: string } | null;
  }) {
    const images = this.parseImageUrls(product.imageUrls);
    const catName = product.catalogCategory ?? product.category?.name ?? null;
    // Trendyol'da satılan ürün: site fiyatı Trendyol fiyatının %25 altı (dükkan fiyatının altına inmez).
    // WEB- ürünler Trendyol'da yok, ERP'de girilen site fiyatıyla satılır.
    const trendyolPrice = isSiteOnlyModelCode(product.modelCode)
      ? 0
      : Number(product.productCenterVariant?.trendyolSalePrice ?? 0) || 0;
    const price = productSitePrice({ ...product, trendyolSalePrice: trendyolPrice });
    const compareAt = trendyolPrice > 0 ? trendyolPrice : product.listPrice;

    return {
      id: product.id,
      name: product.productName,
      slug: productSlug(product.productName, product.modelCode),
      modelCode: product.modelCode,
      category: catName,
      categorySlug: catName ? slugify(catName) : null,
      sitePrice: price,
      originalPrice: price > 0 && compareAt > price ? compareAt : null,
      compareAtLabel: price > 0 && trendyolPrice > price ? TRENDYOL_COMPARE_LABEL : null,
      // Fiyatı olmayan site ürünü: sepete eklenmez, "Fiyat için iletişime geçin" gösterilir
      priceOnRequest: !(price > 0) && isSiteOnlyModelCode(product.modelCode),
      brand: product.brand,
      description: product.description,
      colorVariant: product.colorVariant,
      material: product.material,
      origin: product.origin,
      vatRate: product.vatRate,
      warrantyMonths: product.warrantyMonths,
      // Trendyol ürününde Trendyol'daki satış durumu esas
      inStock: product.productCenterVariant?.status ? product.productCenterVariant.status === 'ACTIVE' : product.stockQuantity > 0,
      images,
      mainImage: images[0] ?? null,
      videoUrl: product.videoUrl ?? null,
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
