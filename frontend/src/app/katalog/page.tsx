'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Printer } from 'lucide-react';

type Product = {
  id: number;
  productName: string;
  modelCode: string;
  barcode: string;
  sitePrice: number;
  marketPrice: number;
  imageUrls: string[];
  status: string;
  stockQuantity: number;
  category: { id: number; name: string } | null;
};

const CATEGORY_ORDER = [
  'Yapay Ağaç',
  'Bambu',
  'Aranjman',
  'Demet Çiçek',
  'Yapay Bitki',
  'Yapay Sarmaşık',
  'Dikey Bahçe',
  'Saksı & Vazo',
  'Bonsai',
  'Zeytin Ağacı',
  'Mini Saksılı Bitki',
];

export default function KatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/products')
      .then((data: Product[]) => {
        setProducts(data.filter(p => p.status === 'ACTIVE' && p.stockQuantity > 0 && (p.sitePrice > 0 || p.marketPrice > 0)));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const grouped = (() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const cat = p.category?.name ?? 'Diğer';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    // Sort by predefined order
    const sorted = new Map<string, Product[]>();
    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat)) sorted.set(cat, map.get(cat)!);
    }
    for (const [cat, prods] of map) {
      if (!sorted.has(cat)) sorted.set(cat, prods);
    }
    return sorted;
  })();

  const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Katalog hazırlanıyor…
    </div>
  );

  return (
    <>
      {/* Print button — sadece ekranda görünür */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-green-800 font-semibold text-sm"
        >
          <Printer size={18} /> PDF İndir / Yazdır
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 15mm 12mm; }
          .page-break { break-before: page; }
        }
        body { background: white; font-family: 'Segoe UI', sans-serif; }
      `}</style>

      {/* Kapak sayfası */}
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1510] text-white px-8 print:min-h-0 print:py-32">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 bg-[#8FBF97] rounded-full flex items-center justify-center mx-auto mb-8 text-3xl font-bold text-[#0D1510]">
            EF
          </div>
          <h1 className="text-5xl font-light tracking-tight mb-3">Erhan Flowers</h1>
          <p className="text-[#8FBF97] text-xl mb-8">Yapay Çiçek & Dekorasyon Kataloğu</p>
          <div className="w-16 h-px bg-[#8FBF97] mx-auto mb-8" />
          <p className="text-white/50 text-sm">{today}</p>
          <p className="text-white/40 text-xs mt-3">Sarılar Mah. Cumhuriyet Cad. 2038 Sk. No:52/1/2, Manavgat / Antalya</p>
          <p className="text-white/40 text-xs mt-1">0544 654 62 20  ·  erhanflowers.com</p>
        </div>
      </div>

      {/* İçindekiler */}
      <div className="page-break py-16 px-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8 pb-3 border-b border-gray-200">İçindekiler</h2>
        <div className="space-y-3">
          {[...grouped.entries()].map(([cat, prods]) => (
            <div key={cat} className="flex items-center justify-between text-gray-700">
              <span className="font-medium">{cat}</span>
              <span className="text-gray-400 text-sm">{prods.length} ürün</span>
            </div>
          ))}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between font-semibold text-gray-800">
            <span>Toplam</span>
            <span>{products.length} ürün</span>
          </div>
        </div>
      </div>

      {/* Kategori sayfaları */}
      {[...grouped.entries()].map(([cat, prods], catIdx) => (
        <div key={cat} className={catIdx > 0 ? 'page-break' : ''}>
          {/* Kategori başlığı */}
          <div className="bg-[#F4F2EC] px-12 py-8 border-b border-gray-200">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Koleksiyon</p>
            <h2 className="text-3xl font-light text-[#0D1510]">{cat}</h2>
            <p className="text-gray-400 text-sm mt-1">{prods.length} ürün</p>
          </div>

          {/* Ürün grid */}
          <div className="grid grid-cols-3 gap-0 border-l border-t border-gray-100">
            {prods.map(p => {
              const price = p.sitePrice || p.marketPrice;
              const img = p.imageUrls?.[0];
              return (
                <div key={p.id} className="border-r border-b border-gray-100 p-4 flex flex-col">
                  {/* Görsel */}
                  <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-200 text-xs text-center p-4">Görsel yok</div>
                    )}
                  </div>
                  {/* Bilgi */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">{p.modelCode}</p>
                    <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">{p.productName}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-base font-semibold text-[#0D1510]">
                      {price > 0 ? `${price.toLocaleString('tr-TR')} ₺` : '—'}
                    </span>
                    <span className="text-xs text-gray-400">Stok: {p.stockQuantity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Son sayfa */}
      <div className="page-break min-h-64 flex flex-col items-center justify-center py-24 bg-[#0D1510] text-white">
        <div className="text-center">
          <p className="text-[#8FBF97] text-lg mb-2">Erhan Flowers</p>
          <p className="text-white/50 text-sm">0544 654 62 20</p>
          <p className="text-white/50 text-sm">www.erhanflowers.com</p>
          <p className="text-white/30 text-xs mt-4">Bu katalog {today} tarihi itibarıyla günceldir. Fiyatlar değişebilir.</p>
        </div>
      </div>
    </>
  );
}
