import ProductCenterPage from '@/components/product-center/ProductCenterPage';

// Flora Yapay Çiçek Ürün Merkezi — Erhan'ın Ürün Merkezi ile birebir aynı ekran ve hesaplama
// (stok bileşenleri, reçete, maliyetten fiyat). Ürünler Flora'ya aittir: FL- model kodu, Flora barkod serisi,
// "Flora Yapay Çiçek" markası, sadece Flora pazaryeri hesapları.
export default function FloraProductsPage() {
  return <ProductCenterPage storeMode="FLORA" />;
}
