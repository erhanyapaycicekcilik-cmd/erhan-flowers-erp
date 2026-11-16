'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { api } from '@/lib/api';

type Alerts = { overdueCount: number; overdueTotal: number; dueSoonCount: number; dueSoonTotal: number; unknownBills: number };

const CACHE_KEY = 'payment-alerts';
const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });

/** Sadece OWNER: gecikmiş / 3 gün içinde ödenecek taksit-fatura + tanınmayan fatura bildirimleri. */
export function PaymentAlertBanner() {
  const [a, setA] = useState<Alerts | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(`${CACHE_KEY}-hidden`)) { setHidden(true); return; }
      const c = sessionStorage.getItem(CACHE_KEY);
      if (c) {
        const { t, v } = JSON.parse(c);
        if (Date.now() - t < 5 * 60000) { setA(v); return; }
      }
    } catch { /* yok */ }
    api<Alerts>('/suppliers/alerts?days=3')
      .then((v) => {
        setA(v);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v })); } catch { /* yok */ }
      })
      .catch(() => null);
  }, []);

  if (hidden || !a || (!a.overdueCount && !a.dueSoonCount && !a.unknownBills)) return null;

  const parts: string[] = [];
  if (a.overdueCount) parts.push(`${a.overdueCount} ödeme gecikti (${fmt(a.overdueTotal)} ₺)`);
  if (a.dueSoonCount) parts.push(`${a.dueSoonCount} ödeme 3 gün içinde (${fmt(a.dueSoonTotal)} ₺)`);
  if (a.unknownBills) parts.push(`${a.unknownBills} yeni fatura bildirimi`);

  return (
    <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${a.overdueCount ? 'border-red-300 bg-red-50 text-red-800' : 'border-orange-300 bg-orange-50 text-orange-800'}`}>
      <AlertTriangle size={18} className="shrink-0" />
      <span className="flex-1 font-medium">{parts.join(' • ')}</span>
      <Link href="/borclar" className="shrink-0 rounded-lg bg-white/80 px-3 py-1 text-xs font-semibold hover:bg-white">Görüntüle</Link>
      <button
        aria-label="Kapat"
        onClick={() => { setHidden(true); try { sessionStorage.setItem(`${CACHE_KEY}-hidden`, '1'); } catch { /* yok */ } }}
        className="shrink-0 opacity-60 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
