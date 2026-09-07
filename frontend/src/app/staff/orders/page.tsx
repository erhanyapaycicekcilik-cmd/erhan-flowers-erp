'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Package } from 'lucide-react';
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
};

type OrderRow = {
  id: number;
  saleNumber: string;
  platform: string;
  status: string;
  customerName: string;
  city?: string | null;
  district?: string | null;
  quantity?: number | string | null;
  orderDate?: string | null;
  deliveryDueAt?: string | null;
  cargoProvider?: string | null;
  items: OrderItem[];
};

const CATEGORIES = [
  { key: 'all', label: 'Tüm Siparişler' },
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

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<OrderRow[]>('/orders?limit=200&status=Yeni,İşleme Alındı,Kargoya Hazır,Taşıma Durumunda');
      setOrders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = orders.filter((o) => {
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
              <OrderCard key={order.id} order={order} />
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

function OrderCard({ order }: { order: OrderRow }) {
  const days = remainingDays(order.deliveryDueAt, order.status);
  const isUrgent = days !== null && days <= 1;
  const isLate = days !== null && days < 0;

  const firstImage = order.items.find((i) => i.imagePath)?.imagePath;

  return (
    <div className={`panel overflow-hidden flex flex-col ${isLate ? 'border-red-400' : isUrgent ? 'border-orange-400' : ''}`}>
      {/* Ürün görseli — büyük */}
      <div className="relative bg-slate-100" style={{ aspectRatio: '4/3' }}>
        {firstImage ? (
          <img
            src={apiFileUrl(firstImage)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package size={48} />
          </div>
        )}
        {/* Durum badge */}
        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${
          order.status === 'Yeni' ? 'bg-blue-500 text-white' :
          order.status === 'İşleme Alındı' ? 'bg-amber-500 text-white' :
          order.status === 'Kargoya Hazır' ? 'bg-green-500 text-white' :
          'bg-slate-500 text-white'
        }`}>{order.status}</span>
      </div>

      {/* Birden fazla ürün varsa küçük resimler */}
      {order.items.length > 1 && (
        <div className="flex gap-1 px-3 pt-2">
          {order.items.slice(0, 4).map((item, i) => (
            item.imagePath ? (
              <img
                key={i}
                src={apiFileUrl(item.imagePath)}
                alt=""
                className="w-10 h-10 rounded border border-line object-cover"
              />
            ) : null
          ))}
        </div>
      )}

      {/* Sipariş bilgisi */}
      <div className="p-3 flex-1 space-y-1">
        <div className="font-black text-base">{order.saleNumber}</div>
        <div className="text-sm font-semibold text-ink truncate">
          {order.items[0]?.productName ?? 'Ürün bilgisi yok'}
        </div>
        {order.items.length > 1 && (
          <div className="text-xs text-slate-500">+{order.items.length - 1} ürün daha</div>
        )}
        {order.items[0]?.color && (
          <div className="text-xs text-slate-500">{order.items[0].color}</div>
        )}

        <div className="border-t border-line pt-2 mt-2 space-y-0.5 text-xs text-slate-500">
          <div><span className="font-medium text-ink">{order.customerName}</span> · {[order.city, order.district].filter(Boolean).join('/')}</div>
          <div>Sipariş: {date(order.orderDate)}</div>
          {order.deliveryDueAt && (
            <div className={`font-semibold ${isLate ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-slate-500'}`}>
              Son çıkış: {date(order.deliveryDueAt)}
              {days !== null && ` (${isLate ? `${Math.abs(days)} gün gecikmeli` : days === 0 ? 'bugün' : `${days} gün kaldı`})`}
            </div>
          )}
          {order.cargoProvider && <div>Kargo: {order.cargoProvider}</div>}
        </div>
      </div>
    </div>
  );
}
