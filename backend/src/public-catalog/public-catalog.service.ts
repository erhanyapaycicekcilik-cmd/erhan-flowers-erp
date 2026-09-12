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
  return `${slugify(name)}-${modelCode.toLowerCase()}`;
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
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: { status: 'ACTIVE', stockQuantity: { gt: 0 }, sitePrice: { gt: 0 } },
        },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { products: { where: { status: 'ACTIVE', stockQuantity: { gt: 0 }, sitePrice: { gt: 0 } } } } },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: slugify(cat.name),
      count: cat._count.products,
    }));
  }

  async listProducts(params: {
    categorySlug?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'name';
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 48));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      stockQuantity: { gt: 0 },
      sitePrice: { gt: 0 }, // Sadece site fiyatı tanımlanmış ürünler
    };

    // Kategori filtresi
    if (params.categorySlug) {
      const allCategories = await this.prisma.category.findMany({ select: { id: true, name: true } });
      const matchedCat = allCategories.find((c) => slugify(c.name) === params.categorySlug);
      if (matchedCat) where['categoryId'] = matchedCat.id;
    }

    // Arama filtresi
    if (params.search?.trim()) {
      const term = params.search.trim();
      where['OR'] = [
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
                                     { id: 'desc' }; // newest

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where: where as any }),
      this.prisma.product.findMany({ where: where as any, select: SAFE_SELECT, orderBy: orderBy as any, skip, take: limit }),
    ]);

    return {
      products: products.map((p) => this.toPublicProduct(p)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductBySlug(slug: string) {
    // Slug = slugify(name)-modelCode → modelCode'u ayıkla
    const parts = slug.split('-');
    // modelCode ERH-XXXX formatında, son iki parçayı al
    const modelCode = parts.slice(-2).join('-').toUpperCase();

    const product = await this.prisma.product.findFirst({
      where: { modelCode, status: 'ACTIVE', sitePrice: { gt: 0 } },
      select: SAFE_SELECT,
    });
    return product ? this.toPublicProduct(product) : null;
  }

  async getProductById(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE', sitePrice: { gt: 0 } },
      select: SAFE_SELECT,
    });
    return product ? this.toPublicProduct(product) : null;
  }

  // Trendyol ürünlerinden sitePrice toplu doldur — sitePrice=0 olanları günceller
  // Kural: sitePrice = trendyolSalePrice (müşteri sonradan manuel ayarlayabilir)
  async bulkSyncSitePriceFromTrendyol(): Promise<{ updated: number; skipped: number }> {
    // sitePrice=0 olan ürünleri bul, Trendyol varyantı varsa fiyatını al
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', sitePrice: 0 },
      select: {
        id: true,
        productCenterVariant: {
          select: { trendyolSalePrice: true, status: true },
        },
      },
    });

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      const variant = product.productCenterVariant;
      if (!variant || variant.status !== 'ACTIVE') { skipped++; continue; }

      const trendyolPrice = Number(variant.trendyolSalePrice ?? 0);
      if (trendyolPrice <= 0) { skipped++; continue; }

      // sitePrice = trendyolSalePrice (kullanıcı sonradan ERP'den manuel ayarlayabilir)
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          sitePrice: trendyolPrice,
          shopPrice: trendyolPrice,
          listPrice: trendyolPrice,
          marketPrice: trendyolPrice,
        },
      });
      updated++;
    }

    return { updated, skipped };
  }

  // Dükkan barkod okutma — sadece shopPrice döner, diğer fiyat bilgileri YOK
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
    category: { id: number; name: string } | null;
  }) {
    const images = this.parseImageUrls(product.imageUrls);

    return {
      id: product.id,
      name: product.productName,
      slug: productSlug(product.productName, product.modelCode),
      modelCode: product.modelCode,
      category: product.category?.name ?? null,
      categorySlug: product.category ? slugify(product.category.name) : null,
      sitePrice: product.sitePrice,
      // listPrice > sitePrice ise üstü çizili "önceki fiyat" olarak göster
      originalPrice: product.listPrice > product.sitePrice ? product.listPrice : null,
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
