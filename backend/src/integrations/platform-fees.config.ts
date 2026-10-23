/**
 * Platform başına komisyon oranı ve sabit tampon.
 * Satış fiyatı = marketPrice / (1 - commission) + buffer
 * Örnek: marketPrice=100, commission=0.15, buffer=5 → 100/0.85 + 5 = 122.76 → 123₺
 */
export const PLATFORM_FEES: Record<string, { commission: number; buffer: number }> = {
  TRENDYOL:      { commission: 0, buffer: 0 },
  N11:           { commission: 0, buffer: 0 },
  HEPSIBURADA:   { commission: 0, buffer: 0 },
  PAZARAMA:      { commission: 0, buffer: 0 },
  IDEFIX:        { commission: 0, buffer: 0 },
  TRENDRUM:      { commission: 0, buffer: 0 },
};

/**
 * marketPrice üzerine komisyon + tampon ekleyerek platform satış fiyatını hesaplar.
 * Dönen değer tam sayıya yuvarlanır.
 */
export function calcPlatformPrice(marketPrice: number, platform: string): number {
  const fee = PLATFORM_FEES[platform.toUpperCase()];
  if (!fee || fee.commission <= 0) return marketPrice;
  const withCommission = marketPrice / (1 - fee.commission);
  return Math.ceil(withCommission + fee.buffer);
}
