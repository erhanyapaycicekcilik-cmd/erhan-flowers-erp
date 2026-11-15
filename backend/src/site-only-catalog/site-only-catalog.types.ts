export interface SiteOnlyColor {
  key: string; // model koduna eklenir (ör. BEJ)
  name: string; // sitede renk seçeneği (ör. Bej)
  images: string[];
}

export interface SiteOnlySize {
  code: string; // "LUMEN 140"
  key: string; // "LUMEN140"
  top: string; // üst ölçü (cm)
  inner: string; // iç ölçü (cm)
  base: string; // taban (cm)
  height: string; // yükseklik (cm)
  volume: string; // "125 L"
  price: number; // site satış fiyatı (KDV dahil, TL)
  cover?: string; // Bostann'ın bu boy için kapak fotoğrafı
  description: string;
  colors: SiteOnlyColor[];
}

export interface SiteOnlySeries {
  name: string;
  slug: string;
  sortOrder: number;
  cover?: string; // sitede seri kartı görseli
  description: string;
  sizes: SiteOnlySize[];
}

/** Gruba bağlı olmayan tekil site ürünü (ör. "fiyat için iletişime geçin" fiber saksılar) */
export interface SiteOnlySimpleProduct {
  modelCode: string; // WEB- ile başlamalı
  /** true: sitede gösterilmez — yoksa eklenmez, varsa PASİF yapılır (görselleri hâlâ bizimkiyse; ERP'den gerçek fotoğraf eklenip açılan ürüne dokunulmaz) */
  retired?: boolean;
  name: string;
  description: string;
  images: string[];
  sitePrice: number; // 0 = fiyat için iletişime geçin
  catalogCategory: string;
  catalogSubCategory?: string | null;
  categoryName: string; // ERP kategori adı
  categoryCodePrefix?: string; // kategori yoksa açılırken kullanılacak kod ön eki
  /** Daha önce bu kategoriyle eklendiyse (ve elle değiştirilmediyse) yeni kategoriye taşınır */
  previousCatalog?: { catalogCategory: string; catalogSubCategory: string | null };
  brand?: string;
  productHeight?: string | null;
  potSize?: string | null;
}

/** Genel ürün grubu varyantı (boy × renk) — her biri ayrı ERP ürünü olur */
export interface SiteOnlyGroupVariant {
  modelCode: string; // WEB- ile başlamalı
  productName: string;
  sizeLabel: string; // sitede "Boy" seçeneği
  colorLabel: string; // sitede "Renk" seçeneği
  images: string[]; // renk seçilince değişen görseller
  sitePrice: number;
  description: string;
  productHeight?: string | null;
  potSize?: string | null;
}

/** Genel ürün grubu: müşteri sitede boy ve renk seçer, görsel seçime göre değişir */
export interface SiteOnlyGroup {
  name: string;
  slug: string;
  sortOrder: number;
  description: string;
  mainImage: string;
  catalogCategory: string;
  groupSubCategory: string | null;
  categoryName: string; // ERP kategori adı
  categoryCodePrefix?: string;
  brand?: string;
  variants: SiteOnlyGroupVariant[];
}
