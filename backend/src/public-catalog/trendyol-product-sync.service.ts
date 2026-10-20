import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialVaultService } from '../integrations/services/credential-vault.service';

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
  approved?: boolean;
  onSale?: boolean;
  blacklisted?: boolean;
}

@Injectable()
export class TrendyolProductSyncService {
  private readonly logger = new Logger(TrendyolProductSyncService.name);
  private syncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialVault: CredentialVaultService,
  ) {}

  private async loadAuth(): Promise<{ auth: string; supplierId: string } | null> {
    try {
      const account = await this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT ca.id FROM channel_accounts ca
        JOIN sales_channels sc ON ca.sales_channel_id = sc.id
        JOIN companies co ON ca.company_id = co.id
        WHERE sc.code = 'TRENDYOL' AND co.code = 'ERHAN' AND ca.is_active = true
        LIMIT 1
      `;
      if (!account.length) return null;

      const rows = await this.prisma.$queryRaw<Array<{ credentialType: string; encryptedValue: string }>>`
        SELECT credential_type AS "credentialType", encrypted_value AS "encryptedValue"
        FROM channel_credentials
        WHERE channel_account_id = ${Number(account[0].id)} AND is_active = true
      `;

      const values: Record<string, string> = {};
      for (const row of rows) {
        try { values[row.credentialType] = this.credentialVault.decrypt(row.encryptedValue); } catch { /* skip */ }
      }

      const apiKey = values['API_KEY'] || '';
      const apiSecret = values['API_SECRET'] || '';
      const supplierId = values['SUPPLIER_ID'] || SUPPLIER_ID;
      if (!apiKey || !apiSecret) return null;
      return { auth: Buffer.from(`${apiKey}:${apiSecret}`).toString('base64'), supplierId };
    } catch {
      return null;
    }
  }

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
      // Genel kategori (zorunlu categoryId için fallback — eşleşme bulunamazsa buraya düşer)
      const genelCategory = allCategories.find((c) => c.name === 'Genel');
      const fallbackCategoryId = genelCategory?.id ?? allCategories[0]?.id ?? 1;

      // Sadece onaylı ve satışta olan ürünleri filtrele
      const activeProducts = products.filter((p) => {
        if (p.approved === false) return false;
        if (p.blacklisted === true) return false;
        return true;
      });

      // Trendyol'dan gelen aktif model kodlarını topla — sync sonrası bunlar dışındakileri PASSIVE yap
      const activeTrendyolCodes = new Set(activeProducts.map((p) => (p.stockCode || `TY-${p.id}`).toUpperCase()));

      for (const p of activeProducts) {
        try {
          const modelCode = (p.stockCode || `TY-${p.id}`).toUpperCase();
          const salePrice  = parseFloat(String(p.salePrice  || 0));
          const listPrice  = parseFloat(String(p.listPrice  || salePrice));
          const stock      = parseInt(String(p.quantity     || 0), 10);
          const images     = (p.images || []).map((img) => img.url).filter(Boolean);
          const brand      = p.brand || 'Erhan Flowers';

          // Kategori bul — eşleşme yoksa Genel kategorisine ata
          const categoryId = this.matchCategory(allCategories, p.categoryName) ?? fallbackCategoryId;

          const existing = await this.prisma.product.findFirst({
            where: { modelCode },
            select: { id: true, sitePrice: true },
          });

          // Site fiyatı = Trendyol fiyatı - %20 (www.erhanflowers.com sadece site fiyatı bu kadar düşük)
          const sitePrice = Math.round(salePrice * 0.80);

          if (existing) {
            const updateData: Record<string, unknown> = {
              stockQuantity: stock,
              imageUrls: images,
              listPrice,
              marketPrice: salePrice,
              shopPrice: salePrice,
              sitePrice: sitePrice > 0 ? sitePrice : salePrice,
            };

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
                sitePrice: sitePrice > 0 ? sitePrice : salePrice,
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
                categoryId,
              } as any,
            });
            inserted++;
          }
        } catch (err: unknown) {
          this.logger.warn(`Ürün işlenemedi (${p.stockCode}): ${err instanceof Error ? err.message : String(err)}`);
          skipped++;
        }
      }
      // Trendyol'da artık aktif olmayan ürünleri PASSIVE yap
      if (activeTrendyolCodes.size > 0) {
        const deactivated = await this.prisma.product.updateMany({
          where: {
            status: 'ACTIVE',
            modelCode: { notIn: Array.from(activeTrendyolCodes) },
          },
          data: { status: 'PASSIVE' },
        });
        if (deactivated.count > 0) {
          this.logger.log(`${deactivated.count} ürün Trendyol'da aktif olmadığı için PASSIVE yapıldı`);
        }
      }
    } finally {
      this.syncRunning = false;
    }

    return { inserted, updated, skipped };
  }

  private async fetchAllTrendyolProducts(): Promise<TrendyolProduct[]> {
    const creds = await this.loadAuth();
    const auth = creds?.auth ?? Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    const supplierId = creds?.supplierId ?? SUPPLIER_ID;

    const all: TrendyolProduct[] = [];
    let page = 0;
    const size = 200;

    while (true) {
      const url = `${TY_API}/product/sellers/${supplierId}/products?page=${page}&size=${size}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': `${supplierId} - SelfIntegration`,
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
