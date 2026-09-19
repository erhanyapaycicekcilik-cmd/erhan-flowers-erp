'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Trash2, ShoppingBag, CheckCircle2, Plus, Minus } from 'lucide-react';

interface Product {
  id: number;
  barcode: string;
  productName: string;
  salePrice: number;
  stockQuantity: number;
  stockUnit?: string | null;
  imageUrl?: string | null;
  stockCardId?: number | null;
}

interface CartItem extends Product {
  quantity: number;
  unitPrice: number;
}

export default function HizliSatisPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api<Product[]>(`/sales/products/search?q=${encodeURIComponent(q)}&limit=10`);
      setResults(Array.isArray(r) ? r : []);
    } finally {
      setSearching(false);
    }
  }, []);

  function onQueryChange(v: string) {
    setQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void search(v), 300);
  }

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...p, quantity: 1, unitPrice: p.salePrice }];
    });
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }

  function updatePrice(id: number, price: string) {
    const val = Number(price);
    setCart(prev => prev.map(i => i.id === id ? { ...i, unitPrice: val > 0 ? val : 0 } : i));
  }

  function updateQty(id: number, delta: number) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  }

  function removeItem(id: number) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  async function completeSale() {
    if (!cart.length) return;
    const zeroPriceItems = cart.filter(i => !i.unitPrice || i.unitPrice <= 0);
    if (zeroPriceItems.length > 0) {
      setError(`Fiyat sıfır olamaz: ${zeroPriceItems.map(i => i.productName).join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const sale = await api<{ id: number }>('/sales', {
        method: 'POST',
        json: {
          clientRequestId: `hizli-satis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          channel: 'STORE',
          saleType: 'STORE_SALE',
          delivery: { deliveryType: 'STORE_PICKUP' },
          payments: [{ method: 'CASH', amount: total, clientKey: `cash-${Date.now()}` }],
          customer: { customerType: 'INDIVIDUAL', firstName: 'Perakende', lastName: 'Müşteri' },
          items: cart.map(i => ({
            id: i.id,
            variantId: i.id > 0 ? i.id : null,
            stockCardId: i.stockCardId ?? null,
            productName: i.productName,
            barcode: i.barcode,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountAmount: 0,
            stockFulfillmentType: 'READY_STOCK',
          })),
          subtotal: total,
          discountTotal: 0,
          grandTotal: total,
        },
      });
      await api(`/sales/${sale.id}/complete`, { method: 'POST', json: { force: true } });
      setSuccess(`Satış tamamlandı! Toplam: ${total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`);
      setCart([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Satış kaydedilemedi. Tekrar dene.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ShoppingBag size={20} /> Hızlı Dükkan Satışı
      </h1>

      {/* Ürün Arama */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-brand/30">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            autoFocus
            className="flex-1 outline-none text-sm"
            placeholder="Ürün adı veya barkod ile ara..."
            value={query}
            onChange={e => onQueryChange(e.target.value)}
          />
          {searching && <span className="text-xs text-slate-400">Aranıyor...</span>}
        </div>
        {results.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
            {results.map(p => (
              <button key={p.id} onClick={() => addToCart(p)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition">
                <div className="font-medium text-sm">{p.productName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {p.barcode} · Stok: {p.stockQuantity} {p.stockUnit ?? 'Adet'} · {p.salePrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sepet */}
      {cart.length > 0 ? (
        <div className="panel divide-y divide-line">
          {cart.map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.productName}</div>
                <div className="text-xs text-slate-400">{item.barcode}</div>
              </div>
              {/* Adet */}
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  min="1"
                  className="w-12 text-center text-sm font-semibold border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  value={item.quantity}
                  onChange={e => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, Number(e.target.value) || 1) } : i))}
                />
                <button onClick={() => updateQty(item.id, +1)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                  <Plus size={12} />
                </button>
              </div>
              {/* Manuel Fiyat */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  className={`w-24 border rounded px-2 py-1 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30 ${item.unitPrice <= 0 ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200'}`}
                  value={item.unitPrice}
                  onChange={e => updatePrice(item.id, e.target.value)}
                />
                <span className="text-xs text-slate-400">₺</span>
              </div>
              {/* Toplam */}
              <div className="w-20 text-right text-sm font-bold text-slate-700">
                {(item.quantity * item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
              <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Toplam + Satıldı */}
          <div className="px-4 py-4 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Toplam</div>
              <div className="text-2xl font-bold text-slate-800">
                {total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </div>
            </div>
            <button
              onClick={() => void completeSale()}
              disabled={saving}
              className="btn btn-primary px-8 py-3 text-base font-bold disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : '✓ Satıldı'}
            </button>
          </div>
        </div>
      ) : (
        <div className="panel p-10 text-center text-slate-400 text-sm">
          Ürün eklemek için yukarıdan arama yapın
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}
    </main>
  );
}
