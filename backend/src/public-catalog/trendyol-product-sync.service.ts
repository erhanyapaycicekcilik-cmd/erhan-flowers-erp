import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const SUPPLIER_ID = process.env.TRENDYOL_SUPPLIER_ID || '485323';
const API_KEY     = process.env.TRENDYOL_API_KEY     || 'vKUXhTt38k0RHiC5iRnX';
const API_SECRET  = process.env.TRENDYOL_API_SECRET  || 'sRA4f7I2AnFVguQ0q31W';
const TY_API      = 'https://apigw.trendyol.com/integration';

const SITE_REVALIDATE_URL = process.env.SITE_REVALIDATE_URL || 'http://localhost:3200/api/revalidate';
const REVALIDATE_SECRET   = process.env.REVALIDATE_SECRET   || 'dev-secret-local';

interface TrendyolProduct {
  id: number;
  title: string;
  stockCode: string;
  barcode: string | null;
  salePrice: string | number;
  listPrice: string | number;
  quantity: number;
  images: Array<{ url: string }>;
  description: string | null;
  brand: string | null;
  categoryName: string | null;
}

@Injectable()
export class TrendyolProductSyncService {
  private readonly logger = new Logger(TrendyolProductSyncService.name);
  private readonly auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  private syncRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  /** Her 15 dakikada bir Trendyol'dan ürünleri çek, DB'ye yaz, siteyi revalidate et */
  @Cron('0 */15 * * * *') // her 15 dakika
  async scheduledSync() {
    if (this.syncRunning) return;
    this.logger.log('Trendyol ürün senkronizasyonu başlıyor...');
    const result = await this.syncProducts();
    if (result.inserted > 0 || result.updated > 0) {
      await this.revalidateSite();
    }
    this.logger.log(`Sync tamamlandı: +${result.inserted} yeni, ~${result.updated} güncellendi, ${result.skipped} atlandı`);
  }

  /** Manuel tetikleme (API'den çağrılabilir) */
  async syncNow(): Promise<{ inserted: number; updated: number; skipped: number }> {
    const result = await this.syncProducts();
    if (result.inserted > 0 || result.updated > 0) {
      await this.revalidateSite();
    }
    return result;
  }

  private async syncProducts() {
    if (this.syncRunning) return { inserted: 0, updated: 0, skipped: 0 };
    this.syncRunning = true;

    let inserted = 0, updated = 0, skipped = 0;

    try {
      const products = await this.fetchAllTrendyolProducts();
      this.logger.log(`Trendyol'dan ${products.length} ürün çekildi`);

      // Kategori eşleşmesi için var olan kategorileri çek
      const allCategories = await this.prisma.category.findMany({ select: { id: true, name: true } });

      for (const p of products) {
        try {
          const modelCode = (p.stockCode || `TY-${p.id}`).toUpperCase();
          const salePrice  = parseFloat(String(p.salePrice  || 0));
          const listPrice  = parseFloat(String(p.listPrice  || salePrice));
          const stock      = parseInt(String(p.quantity     || 0), 10);
          const images     = (p.images || []).map((img) => img.url).filter(Boolean);
          const brand      = p.brand || 'Erhan Flowers';

          // Kategori bul (Trendyol'dan gelen categoryName'e göre eşleştir)
          const categoryId = this.matchCategory(allCategories, p.categoryName);

          const existing = await this.prisma.product.findFirst({
            where: { modelCode },
            select: { id: true, sitePrice: true },
          });

          if (existing) {
            // Sadece stok + fiyat + görselleri güncelle (kullanıcının manuel değiştirdiği sitePrice'ı korumak için
            // sitePrice=0 olan ürünleri Trendyol fiyatıyla doldur, 0'dan büyük olanları dokunma)
            const updateData: Record<string, unknown> = {
              stockQuantity: stock,
              imageUrls: images,
              listPrice,
              marketPrice: salePrice,
            };

            if (existing.sitePrice === 0) {
              updateData.sitePrice = salePrice;
              updateData.shopPrice = salePrice;
            }

            await this.prisma.product.update({
              where: { id: existing.id },
              data: updateData as any,
            });
            updated++;
          } else {
            // Yeni ürün ekle
            await this.prisma.product.create({
              data: {
                productName: p.title || 'İsimsiz Ürün',
                modelCode,
                barcode: p.barcode || modelCode,
                brand,
                sitePrice: salePrice,
                shopPrice: salePrice,
                listPrice,
                marketPrice: salePrice,
                stockQuantity: stock,
                imageUrls: images,
                description: p.description || null,
                status: 'ACTIVE',
                origin: 'ÇİN',
                vatRate: 20,
                warrantyMonths: 0,
                ...(categoryId ? { categoryId } : {}),
              } as any,
            });
            inserted++;
          }
        } catch (err: unknown) {
          this.logger.warn(`Ürün işlenemedi (${p.stockCode}): ${err instanceof Error ? err.message : String(err)}`);
          skipped++;
        }
      }
    } finally {
      this.syncRunning = false;
    }

    return { inserted, updated, skipped };
  }

  private async fetchAllTrendyolProducts(): Promise<TrendyolProduct[]> {
    const all: TrendyolProduct[] = [];
    let page = 0;
    const size = 200;

    while (true) {
      const url = `${TY_API}/product/sellers/${SUPPLIER_ID}/products?page=${page}&size=${size}&approved=true`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'User-Agent': `${SUPPLIER_ID} - SelfIntegration`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        this.logger.error(`Trendyol API hata: ${res.status} ${await res.text()}`);
        break;
      }

      const data = await res.json() as { content?: TrendyolProduct[]; totalPages?: number };
      const items = data.content || [];
      all.push(...items);

      if (items.length < size || page >= (data.totalPages ?? 0) - 1) break;
      page++;

      // Rate limit: 300ms bekleme
      await new Promise((r) => setTimeout(r, 300));
    }

    return all;
  }

  private matchCategory(
    categories: Array<{ id: number; name: string }>,
    trendyolCategoryName: string | null,
  ): number | null {
    if (!trendyolCategoryName) return null;
    const lower = trendyolCategoryName.toLowerCase();
    const match = categories.find((c) => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower));
    return match?.id ?? null;
  }

  /** Next.js cache'ini sıfırla — ürünler anında sitede görünür */
  async revalidateSite(slug?: string) {
    try {
      const url = `${SITE_REVALIDATE_URL}?secret=${REVALIDATE_SECRET}`;
      const body = slug ? { slug } : {};
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        this.logger.log('Site cache revalidate edildi ✓');
      } else {
        this.logger.warn(`Revalidate başarısız: ${res.status}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Revalidate isteği gönderilemedi: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
