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
  description: string;
  colors: SiteOnlyColor[];
}

export interface SiteOnlySeries {
  name: string;
  slug: string;
  sortOrder: number;
  description: string;
  sizes: SiteOnlySize[];
}
