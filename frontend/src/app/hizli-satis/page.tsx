'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Trash2, ShoppingBag, CheckCircle2, Plus, Minus } from 'lucide-react';

const CATEGORIES = [
  { label: 'Yapay Ağaç',    value: 'Yapay Ağaç' },
  { label: 'Bambu',          value: 'Bambu' },
  { label: 'Yapay Bitki',    value: 'Yapay Bitki' },
  { label: 'Sarmaşık',       value: 'Yapay Sarmaşık' },
  { label: 'Dikey Bahçe',   value: 'Dikey Bahçe' },
  { label: 'Demet Çiçek',   value: 'Demet Çiçek' },
  { label: 'Saksı & Vazo',  value: 'Saksı & Vazo' },
  { label: 'Aranjman',       value: 'Aranjman' },
];

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

type CustomerForm = {
  anonymous: boolean;
  type: 'INDIVIDUAL' | 'CORPORATE';
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nationalId: string;
  companyTitle: string;
  taxNumber: string;
  taxOffice: string;
  city: string;
  district: string;
  fullAddress: string;
};

const EMPTY_CUSTOMER: CustomerForm = {
  anonymous: false, type: 'INDIVIDUAL', firstName: '', lastName: '', phone: '', email: '', nationalId: '',
  companyTitle: '', taxNumber: '', taxOffice: '', city: '', district: '', fullAddress: '',
};

const onlyDigits = (v: string) => v.replace(/\D/g, '');

/** Hata varsa mesaj döner */
function validateCustomer(c: CustomerForm): string | null {
  if (c.anonymous) return null;
  const phone = onlyDigits(c.phone);
  if (c.type === 'CORPORATE') {
    if (c.companyTitle.trim().length < 2) return 'Firma ünvanı zorunlu.';
    if (onlyDigits(c.taxNumber).length !== 10) return 'Vergi numarası 10 haneli olmalı.';
    if (c.taxOffice.trim().length < 2) return 'Vergi dairesi zorunlu.';
  } else {
    if (c.firstName.trim().length < 2) return 'Müşteri adı zorunlu.';
    if (c.lastName.trim().length < 2) return 'Müşteri soyadı zorunlu.';
    if (c.nationalId && onlyDigits(c.nationalId).length !== 11) return 'TC kimlik no 11 haneli olmalı (bilinmiyorsa boş bırakın).';
  }
  if (phone.length < 10) return 'Geçerli bir telefon numarası girin.';
  if (c.city.trim().length < 2) return 'İl zorunlu.';
  if (c.district.trim().length < 2) return 'İlçe zorunlu.';
  if (c.fullAddress.trim().length < 5) return 'Açık adres zorunlu.';
  return null;
}

export default function HizliSatisPage() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerForm>(EMPTY_CUSTOMER);
  const setC = (patch: Partial<CustomerForm>) => setCustomer(prev => ({ ...prev, ...patch }));
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, cat: string) => {
    if (q.length < 2 && !cat) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api<Product[]>(`/sales/products/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}&limit=50`);
      setResults(Array.isArray(r) ? r : []);
    } finally {
      setSearching(false);
    }
  }, []);

  function onQueryChange(v: string) {
    setQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void search(v, selectedCategory), 300);
  }

  function onCategorySelect(cat: string) {
    const next = selectedCategory === cat ? '' : cat;
    setSelectedCategory(next);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    void search(query, next);
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
    const customerError = validateCustomer(customer);
    if (customerError) {
      setError(customerError);
      return;
    }
    const c = customer;
    const customerPayload = c.anonymous
      ? { customerType: 'INDIVIDUAL', firstName: 'Perakende', lastName: 'Müşteri', walkIn: true }
      : c.type === 'CORPORATE'
        ? {
            customerType: 'CORPORATE', companyTitle: c.companyTitle.trim(), firstName: c.companyTitle.trim(),
            taxNumber: onlyDigits(c.taxNumber), taxOffice: c.taxOffice.trim(), phone: c.phone.trim(), email: c.email.trim() || undefined,
          }
        : {
            customerType: 'INDIVIDUAL', firstName: c.firstName.trim(), lastName: c.lastName.trim(),
            nationalId: onlyDigits(c.nationalId) || undefined, phone: c.phone.trim(), email: c.email.trim() || undefined,
          };
    const addressPayload = c.anonymous
      ? undefined
      : {
          title: 'Fatura', fullAddress: c.fullAddress.trim(), city: c.city.trim(), district: c.district.trim(),
          recipientName: c.type === 'CORPORATE' ? c.companyTitle.trim() : `${c.firstName.trim()} ${c.lastName.trim()}`,
          recipientPhone: c.phone.trim(),
        };
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
          customer: customerPayload,
          ...(addressPayload ? { address: addressPayload } : {}),
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
      setCustomer(EMPTY_CUSTOMER);
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

      {/* Kategori Filtreleri */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => onCategorySelect(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedCategory === c.value ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600 hover:border-brand/50'}`}>
            {c.label}
          </button>
        ))}
      </div>

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

          {/* Müşteri / Fatura bilgileri */}
          <div className="px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-700">Müşteri / Fatura Bilgileri</div>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={customer.anonymous} onChange={e => setC({ anonymous: e.target.checked })} />
                Müşteri bilgi vermek istemiyor (Perakende Müşteri)
              </label>
            </div>
            {!customer.anonymous && (
              <>
                <div className="flex gap-2">
                  {(['INDIVIDUAL', 'CORPORATE'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setC({ type: t })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${customer.type === t ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {t === 'INDIVIDUAL' ? 'Bireysel' : 'Kurumsal (Firma)'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {customer.type === 'INDIVIDUAL' ? (
                    <>
                      <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="Ad *" value={customer.firstName} onChange={e => setC({ firstName: e.target.value })} />
                      <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="Soyad *" value={customer.lastName} onChange={e => setC({ lastName: e.target.value })} />
                      <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="TC Kimlik No (isteğe bağlı)" inputMode="numeric" maxLength={11} value={customer.nationalId} onChange={e => setC({ nationalId: onlyDigits(e.target.value) })} />
                    </>
                  ) : (
                    <>
                      <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 sm:col-span-2" placeholder="Firma Ünvanı *" value={customer.companyTitle} onChange={e => setC({ companyTitle: e.target.value })} />
                      <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="Vergi No (10 hane) *" inputMode="numeric" maxLength={10} value={customer.taxNumber} onChange={e => setC({ taxNumber: onlyDigits(e.target.value) })} />
                      <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="Vergi Dairesi *" value={customer.taxOffice} onChange={e => setC({ taxOffice: e.target.value })} />
                    </>
                  )}
                  <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="Telefon *" inputMode="tel" value={customer.phone} onChange={e => setC({ phone: e.target.value })} />
                  <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="E-posta (isteğe bağlı)" type="email" value={customer.email} onChange={e => setC({ email: e.target.value })} />
                  <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="İl *" value={customer.city} onChange={e => setC({ city: e.target.value })} />
                  <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="İlçe *" value={customer.district} onChange={e => setC({ district: e.target.value })} />
                  <textarea className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 sm:col-span-2" rows={2} placeholder="Açık Adres *" value={customer.fullAddress} onChange={e => setC({ fullAddress: e.target.value })} />
                </div>
              </>
            )}
          </div>

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
