// Ortak stok — Erhan Flowers ve Flora Yapay Çiçek aynı depodan satar.
// İlan adedi, ürünün ONAYLI reçetesindeki ana malzemelerin (yaprak/gövde/ağaç + saksı)
// stok kartlarından hesaplanır: her kart için floor(kart stoğu / reçete miktarı), en küçüğü.
// Sarf (yapıştırıcı, köpük), işçilik ve paketleme kartları hesaba katılmaz (çoğu sayılmıyor).
// Güvenlik payı: hesaplanan adet <= buffer ise ilanda 0 gösterilir (iki mağaza aynı son ürünü satmasın).
//
// Modlar (app_settings.shared_stock_settings, ERP → Stok → Ortak Stok):
//  OFF      hiçbir şey yapılmaz
//  PREVIEW  (varsayılan) sadece hesaplanır ve ekranda gösterilir, pazaryerine gönderilmez
//  ON       her pazaryeri fiyat/stok gönderiminde adet reçeteden hesaplanır + 10 dk'da bir değişenler gönderilir
import { PrismaService } from '../prisma/prisma.service';

export const SHARED_STOCK_SETTINGS_KEY = 'shared_stock_settings';
export const SHARED_STOCK_LAST_RUN_KEY = 'shared_stock_last_run';
export type SharedStockMode = 'OFF' | 'PREVIEW' | 'ON';
export interface SharedStockSettings {
  mode: SharedStockMode;
  buffer: number;
}
export const DEFAULT_SHARED_STOCK_SETTINGS: SharedStockSettings = { mode: 'PREVIEW', buffer: 1 };

export function normalizeSharedStockSettings(raw: unknown): SharedStockSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const mode = String(r.mode ?? '').toUpperCase();
  const buffer = Math.floor(Number(r.buffer));
  return {
    mode: mode === 'OFF' || mode === 'ON' || mode === 'PREVIEW' ? (mode as SharedStockMode) : DEFAULT_SHARED_STOCK_SETTINGS.mode,
    buffer: Number.isFinite(buffer) && buffer >= 0 && buffer <= 10 ? buffer : DEFAULT_SHARED_STOCK_SETTINGS.buffer,
  };
}

export async function readSharedStockSettings(prisma: PrismaService): Promise<SharedStockSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SHARED_STOCK_SETTINGS_KEY } }).catch(() => null);
  if (!row) return { ...DEFAULT_SHARED_STOCK_SETTINGS };
  try {
    return normalizeSharedStockSettings(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_SHARED_STOCK_SETTINGS };
  }
}

export interface RecipeComponent {
  stockCardId: number;
  name: string;
  stock: number;
  need: number;
}

export interface RecipeCapacity {
  variantId: number;
  capacity: number;
  limiting: RecipeComponent;
  components: RecipeComponent[];
}

// Saf hesap: bileşenlerden üretilebilir adet (kartlar birleştirilmiş, need > 0)
export function capacityFromComponents(components: RecipeComponent[]): { capacity: number; limiting: RecipeComponent } | null {
  let best: { capacity: number; limiting: RecipeComponent } | null = null;
  for (const c of components) {
    if (!(c.need > 0)) continue;
    const cap = Math.max(0, Math.floor((Number(c.stock) + 1e-9) / c.need));
    if (!best || cap < best.capacity) best = { capacity: cap, limiting: c };
  }
  return best;
}

export function listedQuantity(capacity: number, buffer: number): number {
  return capacity <= buffer ? 0 : capacity;
}

// Onaylı reçetesi olan varyantların reçete kapasitesi. variantIds verilmezse hepsi.
export async function computeRecipeCapacities(prisma: PrismaService, variantIds?: number[]): Promise<Map<number, RecipeCapacity>> {
  const cardSelect = { select: { id: true, name: true, stockQuantity: true } } as const;
  const drafts = await prisma.productCostDraft.findMany({
    where: { status: 'APPROVED', ...(variantIds ? { variantId: { in: variantIds } } : {}) },
    select: {
      variantId: true,
      items: {
        where: { isActive: true, source: 'AUTO', stockCardId: { not: null }, group: { in: ['LEAF_TRUNK', 'POT'] } },
        select: { stockCardId: true, quantity: true, stockCard: cardSelect },
      },
      pots: {
        where: { source: 'AUTO', stockCardId: { not: null } },
        select: { stockCardId: true, quantity: true, stockCard: cardSelect },
      },
    },
  });
  const out = new Map<number, RecipeCapacity>();
  for (const d of drafts) {
    const byCard = new Map<number, RecipeComponent>();
    for (const row of [...d.items, ...d.pots]) {
      const qty = Number(row.quantity);
      if (!row.stockCardId || !row.stockCard || !(qty > 0)) continue;
      const prev = byCard.get(row.stockCardId);
      if (prev) prev.need += qty;
      else byCard.set(row.stockCardId, { stockCardId: row.stockCardId, name: row.stockCard.name, stock: Number(row.stockCard.stockQuantity), need: qty });
    }
    const components = [...byCard.values()];
    const result = capacityFromComponents(components);
    if (result) out.set(d.variantId, { variantId: d.variantId, capacity: result.capacity, limiting: result.limiting, components });
  }
  return out;
}
