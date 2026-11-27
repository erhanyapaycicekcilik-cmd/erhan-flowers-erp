// Ürün mağazaları — Erhan Flowers ve Flora Yapay Çiçek birbirinden TAMAMEN bağımsızdır.
// Her ürün tek bir mağazaya aittir (`store_code`). FLORA ürünleri yalnızca Flora'nın kendi
// pazaryeri hesaplarına (Trendyol, Hepsiburada, N11, Trendrum) gider; Erhan'ın otomatik
// fiyat/stok yayınlarına, toplu zamlara ve sitesine girmez. ERHAN ürünleri de Flora'ya gitmez.
export const STORE_CODES = ['ERHAN', 'FLORA'] as const;
export type StoreCode = (typeof STORE_CODES)[number];

export const STORE_LABELS: Record<StoreCode, string> = {
  ERHAN: 'Erhan Flowers',
  FLORA: 'Flora Yapay Çiçek',
};

// Yeni ürün açılırken varsayılan marka
export const STORE_DEFAULT_BRAND: Record<StoreCode, string> = {
  ERHAN: 'Erhan Flowers',
  FLORA: 'Flora Yapay Çiçek',
};

// Flora ürünlerinin model/stok kodu bu ön ekle başlar (ekranda ve pazaryerinde ayırt etmek için)
export const FLORA_MODEL_PREFIX = 'FL-';

// Flora ürünlerinin gönderilebildiği pazaryerleri
export const FLORA_PLATFORMS = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'TRENDRUM'] as const;

export function normalizeStoreCode(value: unknown): StoreCode {
  const text = String(value ?? '').trim().toUpperCase();
  return text === 'FLORA' ? 'FLORA' : 'ERHAN';
}

// Liste filtresi: boş/ALL = hepsi
export function storeFilter(value: unknown): StoreCode | null {
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'FLORA') return 'FLORA';
  if (text === 'ERHAN') return 'ERHAN';
  return null;
}

export function withFloraPrefix(code: string): string {
  const text = String(code ?? '').trim().toUpperCase();
  if (!text) return text;
  return text.startsWith(FLORA_MODEL_PREFIX) ? text : `${FLORA_MODEL_PREFIX}${text}`;
}
