// Fiyat koruması — pazaryerine giden fiyat, bilinen güncel platform fiyatının
// PRICE_DROP_GUARD_PERCENT'ten (varsayılan %10) fazla altındaysa GÖNDERİLMEZ:
// mevcut platform fiyatı korunur, sadece stok güncellenir.
// Amaç: otomatik akışların (stok kartı güncellemesi, ürün kaydı, maliyet onayı vb.)
// yanlışlıkla alış/maliyet/dükkan fiyatını Trendyol'a basıp fiyatları aşağı çekmesini önlemek.
// Bilerek indirim: Toplu Zam/İndirim ekranı (`allowPriceDrop: true`) veya Katalog Stratejisi
// yayını (önce ERP'deki platform fiyatını günceller, sonra gönderir).
export function priceDropGuardPercent(): number {
  const raw = Number(process.env.PRICE_DROP_GUARD_PERCENT ?? 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 10;
}

export interface PriceDropCheck {
  blocked: boolean;
  dropPercent: number;
}

// 0 = koruma kapalı. Güncel fiyat bilinmiyorsa (0) koruma uygulanmaz.
export function checkPriceDrop(newPrice: number, currentPrice: number, maxDropPercent = priceDropGuardPercent()): PriceDropCheck {
  const next = Number(newPrice) || 0;
  const current = Number(currentPrice) || 0;
  if (maxDropPercent <= 0 || next <= 0 || current <= 0 || next >= current) return { blocked: false, dropPercent: 0 };
  const dropPercent = Math.round(((current - next) / current) * 1000) / 10;
  return { blocked: dropPercent > maxDropPercent, dropPercent };
}
