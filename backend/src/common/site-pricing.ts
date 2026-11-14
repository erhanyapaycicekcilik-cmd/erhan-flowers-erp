// Site fiyatı kuralı: Trendyol'daki güncel satış fiyatının %X altı.
// Trendyol fiyatı her gece 04:00'te Trendyol API'den çekilir (production-costs syncWithTrendyol),
// site fiyatı da okuma anında buradan hesaplanır; böylece Trendyol fiyatı değişince site kendiliğinden uyar.
// Oranı değiştirmek için: SITE_TRENDYOL_DISCOUNT_PERCENT (varsayılan 25).

const DEFAULT_DISCOUNT_PERCENT = 25;

export function siteTrendyolDiscountPercent(): number {
  const raw = Number(process.env.SITE_TRENDYOL_DISCOUNT_PERCENT);
  if (!Number.isFinite(raw) || raw < 0 || raw >= 90) return DEFAULT_DISCOUNT_PERCENT;
  return raw;
}

/**
 * Trendyol fiyatından site fiyatını hesaplar (tam TL'ye yuvarlar).
 * floor > 0 ise site fiyatı bunun altına inmez (ör. dükkan fiyatı — maliyetin altına satmamak için).
 */
export function sitePriceFromTrendyol(trendyolPrice: number, floor = 0): number {
  if (!(trendyolPrice > 0)) return 0;
  const price = Math.round(trendyolPrice * (1 - siteTrendyolDiscountPercent() / 100));
  return floor > 0 && price < floor ? Math.round(floor) : price;
}

export const TRENDYOL_COMPARE_LABEL = 'Trendyol';
