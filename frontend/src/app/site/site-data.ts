const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export type PublicProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  categorySlug: string | null;
  shortDescription: string | null;
  description: string | null;
  technicalSpecs: string | null;
  salePrice: number;
  inStock: boolean;
  images: string[];
};

export type PublicCategory = {
  name: string;
  slug: string;
  count: number;
};

export async function fetchPublicProducts(categorySlug?: string): Promise<PublicProduct[]> {
  try {
    const query = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : '';
    const response = await fetch(`${apiBaseUrl}/public/catalog/products${query}`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    return (await response.json()) as PublicProduct[];
  } catch {
    return [];
  }
}

export async function fetchPublicProduct(id: number): Promise<PublicProduct | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/public/catalog/products/${id}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return (await response.json()) as PublicProduct;
  } catch {
    return null;
  }
}

export async function fetchPublicCategories(): Promise<PublicCategory[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/public/catalog/categories`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    return (await response.json()) as PublicCategory[];
  } catch {
    return [];
  }
}

export function productImageUrl(path?: string) {
  if (!path) return '/site-products/ficus-white.png';
  return `${apiBaseUrl}${path}`;
}

export function formatSitePrice(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
}

export function whatsappOrderHref(product: Pick<PublicProduct, 'name' | 'sku'>) {
  const message = `Merhaba, "${product.name}"${product.sku ? ` (${product.sku})` : ''} ürünü hakkında bilgi almak istiyorum.`;
  return `https://wa.me/905446546220?text=${encodeURIComponent(message)}`;
}
