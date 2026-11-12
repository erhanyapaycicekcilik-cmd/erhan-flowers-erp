// Sadece kendi sitemizde (www.erhanflowers.com) satılan ürünler.
// Model kodu bu ön ekle başlayan ürünler pazaryerlerine (Trendyol, N11, HB, Amazon…)
// GÖNDERİLMEZ ve Trendyol ürün senkronu tarafından PASİF yapılmaz.
export const SITE_ONLY_MODEL_PREFIX = 'WEB-';

export function isSiteOnlyModelCode(modelCode?: string | null): boolean {
  return !!modelCode && modelCode.toUpperCase().startsWith(SITE_ONLY_MODEL_PREFIX);
}
