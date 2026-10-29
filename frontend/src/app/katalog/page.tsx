'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { CheckSquare, Printer, Search, Square, X } from 'lucide-react';

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
  'Yapay Ağaç','Bambu','Aranjman','Demet Çiçek','Yapay Bitki',
  'Yapay Sarmaşık','Dikey Bahçe','Saksı & Vazo','Bonsai','Zeytin Ağacı','Mini Saksılı Bitki',
];

export default function KatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [mode, setMode] = useState<'select' | 'preview'>('select');

  useEffect(() => {
    api('/products')
      .then((data: Product[]) => {
        const active = data.filter(p => p.status === 'ACTIVE');
        setProducts(active);
        setSelected(new Set(active.filter(p => p.stockQuantity > 0 && (p.sitePrice > 0 || p.marketPrice > 0)).map(p => p.id)));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category?.name ?? 'Diğer'))];
    return cats.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [products]);

  const filtered = useMemo(() => products.filter(p => {
    if (filterCat && p.category?.name !== filterCat) return false;
    if (search && !p.productName.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) && !p.modelCode.includes(search)) return false;
    return true;
  }), [products, filterCat, search]);

  function toggleOne(id: number) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleAll() {
    const allSelected = filtered.every(p => selected.has(p.id));
    setSelected(prev => {
      const s = new Set(prev);
      if (allSelected) filtered.forEach(p => s.delete(p.id));
      else filtered.forEach(p => s.add(p.id));
      return s;
    });
  }

  const selectedProducts = products.filter(p => selected.has(p.id));
  const grouped = (() => {
    const map = new Map<string, Product[]>();
    for (const p of selectedProducts) {
      const cat = p.category?.name ?? 'Diğer';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    const sorted = new Map<string, Product[]>();
    for (const cat of CATEGORY_ORDER) { if (map.has(cat)) sorted.set(cat, map.get(cat)!); }
    for (const [cat, prods] of map) { if (!sorted.has(cat)) sorted.set(cat, prods); }
    return sorted;
  })();

  const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Yükleniyor…</div>;

  /* ── SEÇİM MODU ── */
  if (mode === 'select') {
    const allFiltered = filtered.length > 0 && filtered.every(p => selected.has(p.id));
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-gray-800">PDF Katalog — Ürün Seçimi</h1>
            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {selected.size} / {products.length} seçili
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ürün ara…"
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 w-48"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={12} /></button>}
            </div>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Tüm kategoriler</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => setMode('preview')}
              disabled={selected.size === 0}
              className="flex items-center gap-2 bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-40"
            >
              <Printer size={15} /> PDF Önizle ({selected.size})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-500 text-xs uppercase tracking-wide sticky top-[57px]">
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  <button onClick={toggleAll}>
                    {allFiltered ? <CheckSquare size={16} className="text-green-600" /> : <Square size={16} className="text-gray-400" />}
                  </button>
                </th>
                <th className="px-3 py-3 text-left w-14">Görsel</th>
                <th className="px-3 py-3 text-left">Ürün Adı</th>
                <th className="px-3 py-3 text-left">Model</th>
                <th className="px-3 py-3 text-left">Kategori</th>
                <th className="px-3 py-3 text-right">Fiyat</th>
                <th className="px-3 py-3 text-right">Stok</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map(p => {
                const isSelected = selected.has(p.id);
                const price = p.sitePrice || p.marketPrice;
                const img = p.imageUrls?.[0];
                return (
                  <tr
                    key={p.id}
                    onClick={() => toggleOne(p.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-2 text-center">
                      {isSelected
                        ? <CheckSquare size={16} className="text-green-600 mx-auto" />
                        : <Square size={16} className="text-gray-300 mx-auto" />}
                    </td>
                    <td className="px-3 py-2">
                      {img
                        ? <img src={img} alt="" className="w-10 h-10 object-cover rounded" />
                        : <div className="w-10 h-10 bg-gray-100 rounded" />}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-xs">{p.productName}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{p.modelCode}</td>
                    <td className="px-3 py-2">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{p.category?.name ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">
                      {price > 0 ? `${price.toLocaleString('tr-TR')} ₺` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs ${p.stockQuantity === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {p.stockQuantity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">Ürün bulunamadı</div>
          )}
        </div>
      </div>
    );
  }

  /* ── PDF ÖNİZLEME MODU ── */
  return (
    <>
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => setMode('select')} className="bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800">
          ← Geri
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-green-700 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-green-800">
          <Printer size={16} /> PDF İndir / Yazdır
        </button>
      </div>

      <style>{`
        @media print { .no-print { display: none !important; } @page { size: A4; margin: 15mm 12mm; } .page-break { break-before: page; } }
        body { background: white; font-family: 'Segoe UI', sans-serif; }
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1510] text-white px-8 print:min-h-0 print:py-32">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 bg-[#8FBF97] rounded-full flex items-center justify-center mx-auto mb-8 text-3xl font-bold text-[#0D1510]">EF</div>
          <h1 className="text-5xl font-light tracking-tight mb-3">Erhan Flowers</h1>
          <p className="text-[#8FBF97] text-xl mb-8">Yapay Çiçek & Dekorasyon Kataloğu</p>
          <div className="w-16 h-px bg-[#8FBF97] mx-auto mb-8" />
          <p className="text-white/50 text-sm">{today}</p>
          <p className="text-white/40 text-xs mt-3">Sarılar Mah. Cumhuriyet Cad. 2038 Sk. No:52/1/2, Manavgat / Antalya</p>
          <p className="text-white/40 text-xs mt-1">0544 654 62 20  ·  erhanflowers.com</p>
        </div>
      </div>

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
            <span>Toplam</span><span>{selectedProducts.length} ürün</span>
          </div>
        </div>
      </div>

      {[...grouped.entries()].map(([cat, prods], catIdx) => (
        <div key={cat} className={catIdx > 0 ? 'page-break' : ''}>
          <div className="bg-[#F4F2EC] px-12 py-8 border-b border-gray-200">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Koleksiyon</p>
            <h2 className="text-3xl font-light text-[#0D1510]">{cat}</h2>
            <p className="text-gray-400 text-sm mt-1">{prods.length} ürün</p>
          </div>
          <div className="grid grid-cols-3 gap-0 border-l border-t border-gray-100">
            {prods.map(p => {
              const price = p.sitePrice || p.marketPrice;
              const img = p.imageUrls?.[0];
              return (
                <div key={p.id} className="border-r border-b border-gray-100 p-4 flex flex-col">
                  <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                    {img ? <img src={img} alt={p.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">{p.modelCode}</p>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{p.productName}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-base font-semibold text-[#0D1510]">{price > 0 ? `${price.toLocaleString('tr-TR')} ₺` : '—'}</span>
                    <span className="text-xs text-gray-400">Stok: {p.stockQuantity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="page-break min-h-64 flex flex-col items-center justify-center py-24 bg-[#0D1510] text-white">
        <p className="text-[#8FBF97] text-lg mb-2">Erhan Flowers</p>
        <p className="text-white/50 text-sm">0544 654 62 20</p>
        <p className="text-white/50 text-sm">www.erhanflowers.com</p>
        <p className="text-white/30 text-xs mt-4">Bu katalog {today} tarihi itibarıyla günceldir.</p>
      </div>
    </>
  );
}
