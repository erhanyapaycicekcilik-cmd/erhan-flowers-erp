'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Package, Clock, ExternalLink, Camera, Printer, ChevronDown, ChevronUp, Phone, MapPin, CheckCircle } from 'lucide-react';
import { apiBaseUrl } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';

type OrderItem = {
  id?: number;
  barcode?: string | null;
  modelCode?: string | null;
  productName?: string | null;
  variationText?: string | null;
  quantity?: number | string | null;
  imagePath?: string | null;
  color?: string | null;
  trendyolUrl?: string | null;
};

type OrderRow = {
  id: number;
  saleNumber: string;
  platform: string;
  status: string;
  customerName: string;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  fullAddress?: string | null;
  quantity?: number | string | null;
  orderDate?: string | null;
  deliveryDueAt?: string | null;
  cargoProvider?: string | null;
  items: OrderItem[];
};

const PLATFORMS = [
  { key: 'all', label: 'Tümü' },
  { key: 'TRENDYOL', label: 'Trendyol' },
  { key: 'N11', label: 'N11' },
  { key: 'HEPSIBURADA', label: 'Hepsiburada' },
];

const CATEGORIES = [
  { key: 'all', label: 'Tüm Kategoriler' },
  { key: 'agac', label: 'Ağaç' },
  { key: 'bambu', label: 'Bambu' },
  { key: 'saksi', label: 'Saksı' },
];

const AGAC_KEYWORDS = ['ağaç', 'agac', 'ficus', 'palm', 'benjamın', 'benjamin', 'areka', 'dracaena', 'schefflera', 'kauçuk'];
const BAMBU_KEYWORDS = ['bambu', 'bamboo'];
const SAKSI_KEYWORDS = ['saksı', 'saksi', 'pot', 'saksısı'];

function matchCategory(order: OrderRow, cat: string): boolean {
  if (cat === 'all') return true;
  const text = [
    ...order.items.map((i) => i.productName ?? ''),
    ...order.items.map((i) => i.modelCode ?? ''),
  ].join(' ').toLowerCase();
  if (cat === 'agac') return AGAC_KEYWORDS.some((k) => text.includes(k));
  if (cat === 'bambu') return BAMBU_KEYWORDS.some((k) => text.includes(k));
  if (cat === 'saksi') return SAKSI_KEYWORDS.some((k) => text.includes(k));
  return false;
}

function date(s?: string | null) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function remainingDays(due?: string | null, status?: string) {
  if (!due || status === 'Teslim Edildi' || status === 'İptal Edildi') return null;
  const diff = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
  return diff;
}

function useCountdown(due?: string | null, status?: string) {
  const [tick, setTick] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!due || status === 'Teslim Edildi' || status === 'İptal Edildi') return;
    ref.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [due, status]);

  if (!due || status === 'Teslim Edildi' || status === 'İptal Edildi') return null;

  const diffMs = new Date(due).getTime() - Date.now();
  const isLate = diffMs < 0;
  const abs = Math.abs(diffMs);
  const totalSecs = Math.floor(abs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) {
    return { text: `${isLate ? '+' : ''}${days}g ${pad(hours)}s ${pad(mins)}d`, isLate, isUrgent: !isLate && days <= 1 };
  }
  return { text: `${isLate ? '+' : ''}${pad(hours)}:${pad(mins)}:${pad(secs)}`, isLate, isUrgent: !isLate };
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  function handleStatusChange(id: number, status: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<OrderRow[]>('/integrations/orders?limit=200&status=CONFIRMED,PREPARING,IN_PRODUCTION,READY,OUT_FOR_DELIVERY');
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = orders.filter((o) => {
    if (platform !== 'all' && o.platform !== platform) return false;
    if (!matchCategory(o, category)) return false;
    if (search) {
      const q = search.toLowerCase();
      const text = [o.saleNumber, o.customerName, ...o.items.map((i) => i.productName ?? '')].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminShell title="Personel Siparişler">
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Siparişler</h1>
          <button onClick={() => void load()} className="btn btn-secondary text-sm">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>

        {/* Platform filtreleri */}
        <div className="flex gap-2 flex-wrap border-b border-line pb-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                platform === p.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Kategori filtreleri */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                category === c.key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Arama */}
        <input
          className="field w-full max-w-sm"
          placeholder="Sipariş no, müşteri veya ürün ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* İstatistik */}
        <div className="text-sm text-slate-500">{filtered.length} aktif sipariş</div>

        {/* Sipariş kartları */}
        {loading ? (
          <div className="text-center text-slate-400 py-12">Yükleniyor...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
            ))}
            {!filtered.length && (
              <div className="col-span-full text-center text-slate-400 py-12">Sipariş bulunamadı</div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function itemImageSrc(item: OrderItem): string | null {
  if (!item.imagePath) return null;
  return item.imagePath.startsWith('http') ? item.imagePath : apiFileUrl(item.imagePath);
}

function OrderCard({ order, onStatusChange }: { order: OrderRow; onStatusChange: (id: number, status: string) => void }) {
  const countdown = useCountdown(order.deliveryDueAt, order.status);
  const isLate = countdown?.isLate ?? false;
  const isUrgent = countdown?.isUrgent ?? false;
  const [activeIdx, setActiveIdx] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const itemsWithImg = order.items.filter((i) => i.imagePath);
  const activeItem = itemsWithImg[activeIdx] ?? order.items[activeIdx] ?? order.items[0];
  const activeSrc = itemsWithImg.length > 0 ? itemImageSrc(itemsWithImg[activeIdx] ?? itemsWithImg[0]) : null;

  const trendyolUrl =
    activeItem?.trendyolUrl ??
    order.items.find((i) => i.trendyolUrl)?.trendyolUrl ??
    null;

  const isReady = order.status === 'READY' || order.status === 'Kargoya Hazır' || done;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem(`auth_token_${window.location.hostname}_${window.location.port || 'default'}`) ?? localStorage.getItem('auth_token')) : null;
      const form = new FormData();
      form.append('file', file);
      await fetch(`${apiBaseUrl}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      await fetch(`${apiBaseUrl}/sales/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: 'READY', note: 'Ürün hazırlandı, fotoğraf yüklendi.' }),
      });
      setDone(true);
      onStatusChange(order.id, 'READY');
    } finally {
      setUploading(false);
    }
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=420,height=600');
    if (!win) return;
    const itemsHtml = order.items.map(item => `
      <div style="margin-bottom:6px">
        <b>${item.productName ?? ''}</b>
        ${item.color ? `<span style="color:#666"> · ${item.color}</span>` : ''}
        ${item.variationText ? `<span style="color:#666"> · ${item.variationText}</span>` : ''}
        ${Number(item.quantity) > 1 ? `<b> ×${item.quantity}</b>` : ''}
      </div>`).join('');
    win.document.write(`<html><head><title>${order.saleNumber}</title>
      <style>body{font-family:sans-serif;padding:24px;font-size:14px}h2{margin:0 0 8px}hr{margin:12px 0}p{margin:4px 0}</style>
      </head><body>
      <h2>${order.saleNumber}</h2>
      <p><b>Müşteri:</b> ${order.customerName}</p>
      ${order.phone ? `<p><b>Tel:</b> ${order.phone}</p>` : ''}
      ${order.fullAddress ? `<p><b>Adres:</b> ${order.fullAddress}</p>` : ''}
      ${[order.city, order.district].filter(Boolean).length ? `<p>${[order.city, order.district].filter(Boolean).join(' / ')}</p>` : ''}
      <hr/>
      <p><b>Ürünler:</b></p>
      ${itemsHtml}
      <hr/>
      <p><b>Sipariş:</b> ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('tr-TR') : '-'}</p>
      ${order.deliveryDueAt ? `<p><b>Son çıkış:</b> ${new Date(order.deliveryDueAt).toLocaleDateString('tr-TR')}</p>` : ''}
      ${order.cargoProvider ? `<p><b>Kargo:</b> ${order.cargoProvider}</p>` : ''}
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    win.document.close();
  }

  return (
    <div className={`panel overflow-hidden flex flex-col ${isLate ? 'border-red-400 border-2' : isUrgent ? 'border-orange-400 border-2' : isReady ? 'border-green-400 border-2' : ''}`}>

      {/* Ana görsel */}
      <div className="relative bg-slate-100" style={{ aspectRatio: '1/1' }}>
        {activeSrc ? (
          <img src={activeSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package size={56} />
          </div>
        )}
        <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full ${
          isReady ? 'bg-green-500 text-white' :
          order.status === 'CONFIRMED' ? 'bg-blue-500 text-white' :
          order.status === 'PREPARING' ? 'bg-amber-500 text-white' :
          'bg-slate-500 text-white'
        }`}>{isReady ? 'Hazır' : order.status}</span>

        {order.platform === 'TRENDYOL' && trendyolUrl && (
          <a href={trendyolUrl} target="_blank" rel="noopener noreferrer"
            className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1.5 shadow hover:bg-orange-600 transition"
            title="Trendyol'da görüntüle">
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Çoklu ürün galerisi */}
      {itemsWithImg.length > 1 && (
        <div className="flex gap-1 px-2 pt-2 flex-wrap">
          {itemsWithImg.map((item, i) => {
            const src = itemImageSrc(item);
            return src ? (
              <button key={i} onClick={() => setActiveIdx(i)}
                className={`w-12 h-12 rounded border-2 overflow-hidden shrink-0 ${i === activeIdx ? 'border-indigo-500' : 'border-transparent'}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ) : null;
          })}
        </div>
      )}

      {/* Canlı sayaç */}
      {countdown && (
        <div className={`mx-2 mt-2 rounded-lg px-3 py-2 flex items-center gap-2 ${
          isLate ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
        }`}>
          <Clock size={14} className="shrink-0" />
          <span className="font-mono font-bold text-sm tracking-wider flex-1">{countdown.text}</span>
          {isLate && <span className="text-xs font-bold text-red-700">GECİKMELİ</span>}
          {!isLate && isUrgent && <span className="text-xs font-bold text-orange-700">ACİL</span>}
        </div>
      )}

      {/* Ürünler */}
      <div className="p-3 flex-1 space-y-1">
        <div className="font-black text-base">{order.saleNumber}</div>

        {order.items.map((item, i) => (
          <div key={i} className="text-sm font-semibold text-ink leading-snug">
            {item.productName ?? 'Ürün bilgisi yok'}
            {(item.color || item.variationText) && (
              <span className="text-xs font-normal text-slate-500 ml-1">
                {[item.color, item.variationText].filter(Boolean).join(' · ')}
              </span>
            )}
            {Number(item.quantity) > 1 && (
              <span className="text-xs font-bold text-indigo-600 ml-1">×{item.quantity}</span>
            )}
            {order.platform === 'TRENDYOL' && item.trendyolUrl && (
              <a href={item.trendyolUrl}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 ml-1 text-orange-500 hover:text-orange-700 text-xs"
                title="Trendyol'da gör">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        ))}

        {/* Özet müşteri bilgisi */}
        <div className="border-t border-line pt-2 mt-2 text-xs text-slate-500 space-y-0.5">
          <div><span className="font-medium text-ink">{order.customerName}</span>
            {order.phone && <span className="ml-1 text-slate-400">· {order.phone}</span>}
          </div>
          <div>{[order.city, order.district].filter(Boolean).join(' / ')}</div>
          {order.orderDate && <div>Sipariş: {date(order.orderDate)}</div>}
          {order.deliveryDueAt && <div className="text-slate-400">Son çıkış: {date(order.deliveryDueAt)}</div>}
          {order.cargoProvider && <div>Kargo: {order.cargoProvider}</div>}
        </div>

        {/* Genişletilebilir detay */}
        <button onClick={() => setShowDetails(v => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1">
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showDetails ? 'Gizle' : 'Adres & Detay'}
        </button>
        {showDetails && (
          <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5 text-slate-700">
            {order.phone && (
              <div className="flex items-start gap-1.5">
                <Phone size={12} className="mt-0.5 shrink-0 text-slate-400" />
                <a href={`tel:${order.phone}`} className="text-blue-600 underline">{order.phone}</a>
              </div>
            )}
            {order.fullAddress && (
              <div className="flex items-start gap-1.5">
                <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{order.fullAddress}</span>
              </div>
            )}
            {order.items.map((item, i) => (
              item.barcode ? (
                <div key={i} className="text-slate-400">Barkod: {item.barcode}</div>
              ) : null
            ))}
          </div>
        )}

        {/* Alt butonlar */}
        <div className="flex gap-2 pt-2">
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition">
            <Printer size={13} /> Yazdır
          </button>

          {isReady ? (
            <div className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-2 rounded-lg bg-green-100 text-green-700 font-bold">
              <CheckCircle size={13} /> Hazır
            </div>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60 font-semibold">
                <Camera size={13} /> {uploading ? 'Yükleniyor...' : 'Fotoğraf → Hazır'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
