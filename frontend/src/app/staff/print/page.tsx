'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  fullAddress?: string | null;
  orderDate?: string | null;
  deliveryDueAt?: string | null;
  cargoProvider?: string | null;
  companyCode?: string | null;
  items: OrderItem[];
};

const AGAC_KEYWORDS = ['ağaç', 'agac', 'ficus', 'palm', 'benjamın', 'benjamin', 'areka', 'dracaena', 'schefflera', 'kauçuk'];
const BAMBU_KEYWORDS = ['bambu', 'bamboo'];
const SAKSI_KEYWORDS = ['saksı', 'saksi', 'pot', 'saksısı'];
const SEPERATOR_KEYWORDS = ['seperatör', 'seperator', 'seperatör', 'taş', 'toprak', 'deco', 'dekor'];

function itemNameLower(item: OrderItem) {
  return (item.productName ?? '').toLowerCase();
}

function matchesKeywords(item: OrderItem, keywords: string[]) {
  return keywords.some((kw) => itemNameLower(item).includes(kw));
}

function filterItemsByCategory(items: OrderItem[], cat: string): OrderItem[] {
  if (cat === 'all') return items;
  const kw =
    cat === 'agac' ? AGAC_KEYWORDS :
    cat === 'bambu' ? BAMBU_KEYWORDS :
    cat === 'saksi' ? SAKSI_KEYWORDS :
    cat === 'seperator' ? SEPERATOR_KEYWORDS : [];
  if (!kw.length) return items;
  return items.filter((i) => matchesKeywords(i, kw));
}

function bestImageForCategory(items: OrderItem[], cat: string): string | null {
  const catItems = filterItemsByCategory(items, cat).filter((i) => i.imagePath);
  if (catItems.length > 0) return imgSrc(catItems[0]);
  const any = items.find((i) => i.imagePath);
  return any ? imgSrc(any) : null;
}

function imgSrc(item: OrderItem): string | null {
  if (!item.imagePath) return null;
  return item.imagePath.startsWith('http') ? item.imagePath : apiFileUrl(item.imagePath);
}

function fmtDate(s?: string | null) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function PrintPage() {
  const params = useSearchParams();
  const cat = params.get('cat') ?? 'all'; // agac | saksi | bambu | seperator | all
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<OrderRow[]>('/integrations/orders?limit=200&status=CONFIRMED,PREPARING,IN_PRODUCTION')
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const printOrders = useMemo(() => {
    return orders
      .map((o) => {
        const visibleItems = cat === 'all' ? o.items : filterItemsByCategory(o.items, cat);
        return { ...o, visibleItems };
      })
      .filter((o) => o.visibleItems.length > 0);
  }, [orders, cat]);

  const catLabel =
    cat === 'agac' ? '🌳 AĞAÇ' :
    cat === 'bambu' ? '🎋 BAMBU' :
    cat === 'saksi' ? '🪴 SAKSI' :
    cat === 'seperator' ? '🪨 SEPERATÖR' : 'TÜM SİPARİŞLER';

  useEffect(() => {
    if (!loading && printOrders.length > 0) {
      setTimeout(() => window.print(), 600);
    }
  }, [loading, printOrders.length]);

  if (loading) {
    return <div style={{ fontFamily: 'sans-serif', padding: 24 }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, margin: 0 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .order-grid { break-inside: avoid; }
        }
        @page { margin: 10mm; size: A4; }
        body { background: white; }
        .header { font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #333; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .card { border: 1px solid #ccc; border-radius: 4px; padding: 8px; page-break-inside: avoid; break-inside: avoid; display: flex; gap: 8px; }
        .card-img { width: 90px; height: 90px; object-fit: cover; border-radius: 3px; flex-shrink: 0; background: #eee; }
        .card-img-placeholder { width: 90px; height: 90px; background: #eee; border-radius: 3px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 20px; }
        .card-body { flex: 1; min-width: 0; }
        .order-num { font-weight: bold; font-size: 13px; }
        .customer { font-size: 11px; color: #333; margin-top: 2px; }
        .items { margin-top: 4px; }
        .item { font-size: 11px; line-height: 1.4; }
        .item-qty { font-weight: bold; color: #555; }
        .meta { font-size: 10px; color: #666; margin-top: 4px; border-top: 1px solid #eee; padding-top: 3px; }
        .platform-badge { display: inline-block; font-size: 9px; font-weight: bold; background: #f0f0f0; border-radius: 3px; padding: 1px 4px; margin-left: 4px; }
      `}</style>

      <div className="no-print" style={{ padding: '12px', background: '#f5f5f5', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>Çıktı Önizleme:</strong> {catLabel} — {printOrders.length} sipariş
        <button onClick={() => window.print()} style={{ marginLeft: 'auto', padding: '6px 16px', background: '#1a56db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
          🖨️ Yazdır
        </button>
        <button onClick={() => window.close()} style={{ padding: '6px 12px', background: '#aaa', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Kapat
        </button>
      </div>

      <div className="header">
        {catLabel} — {new Date().toLocaleDateString('tr-TR')} — {printOrders.length} sipariş
      </div>

      <div className="grid">
        {printOrders.map((order) => {
          const imgSrcVal = bestImageForCategory(order.items, cat);
          return (
            <div key={order.id} className="card order-grid">
              {imgSrcVal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgSrcVal} alt="" className="card-img" />
              ) : (
                <div className="card-img-placeholder">📦</div>
              )}
              <div className="card-body">
                <div className="order-num">
                  {order.saleNumber}
                  <span className="platform-badge">{order.platform}</span>
                </div>
                <div className="customer">
                  {order.customerName}
                  {order.phone && <> · {order.phone}</>}
                </div>
                <div className="items">
                  {order.visibleItems.map((item, i) => (
                    <div key={i} className="item">
                      {item.productName ?? '—'}
                      {(item.color || item.variationText) && (
                        <span style={{ color: '#888' }}> · {[item.color, item.variationText].filter(Boolean).join(' · ')}</span>
                      )}
                      {Number(item.quantity) > 1 && (
                        <span className="item-qty"> ×{item.quantity}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="meta">
                  {[order.city, order.district].filter(Boolean).join(' / ')}
                  {order.deliveryDueAt && <> · Son: {fmtDate(order.deliveryDueAt)}</>}
                  {order.cargoProvider && <> · {order.cargoProvider}</>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StaffPrintPageWrapper() {
  return (
    <Suspense fallback={<div style={{ fontFamily: 'sans-serif', padding: 24 }}>Yükleniyor…</div>}>
      <PrintPage />
    </Suspense>
  );
}
