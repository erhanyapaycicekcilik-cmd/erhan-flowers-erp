'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Question = {
  id: number;
  platform: string;
  productName: string | null;
  productSku: string | null;
  customerName: string | null;
  question: string;
  answer: string | null;
  status: string;
  askedAt: string | null;
  createdAt: string;
};

type ListResponse = {
  total: number;
  page: number;
  limit: number;
  items: Question[];
};

const PLATFORM_COLORS: Record<string, string> = {
  TRENDYOL: 'bg-orange-500',
  N11: 'bg-purple-600',
  HEPSIBURADA: 'bg-red-600',
};

const PLATFORM_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  N11: 'N11',
  HEPSIBURADA: 'Hepsiburada',
};

export default function MusteriSorulariPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [answerMap, setAnswerMap] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPlatform) params.set('platform', filterPlatform);
      const data = await api<ListResponse>(`/customer-questions?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError('Sorular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPlatform]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api('/customer-questions/sync', { method: 'POST' });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleAnswer = async (id: number) => {
    const answer = answerMap[id]?.trim();
    if (!answer) return;
    setSubmitting(id);
    try {
      await api(`/customer-questions/${id}/answer`, { method: 'POST', json: { answer } });
      setAnswerMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
      await load();
    } catch {
      setError('Cevap gönderilemedi.');
    } finally {
      setSubmitting(null);
    }
  };

  const pendingCount = items.filter((q) => q.status === 'PENDING').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Müşteri Soruları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} soru toplam{pendingCount > 0 && ` · ${pendingCount} bekliyor`}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {syncing ? 'Yenileniyor…' : '↻ Şimdi Yenile'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {/* Filtreler */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {['', 'PENDING', 'ANSWERED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            {s === '' ? 'Tümü' : s === 'PENDING' ? 'Bekleyenler' : 'Cevaplananlar'}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        {['', 'TRENDYOL', 'N11', 'HEPSIBURADA'].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPlatform(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterPlatform === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            {p === '' ? 'Tüm Platformlar' : PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {filterStatus === 'PENDING' ? 'Bekleyen soru yok 🎉' : 'Soru bulunamadı'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-white text-xs font-semibold ${PLATFORM_COLORS[q.platform] ?? 'bg-gray-500'}`}>
                    {PLATFORM_LABELS[q.platform] ?? q.platform}
                  </span>
                  {q.status === 'ANSWERED' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Cevaplandı
                    </span>
                  )}
                  {q.status === 'PENDING' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                      Bekliyor
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {q.askedAt ? new Date(q.askedAt).toLocaleString('tr-TR') : new Date(q.createdAt).toLocaleString('tr-TR')}
                </span>
              </div>

              {q.productName && (
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-medium">Ürün:</span> {q.productName}
                  {q.productSku && <span className="ml-1 opacity-60">({q.productSku})</span>}
                </p>
              )}

              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Müşteri:</span> {q.customerName ?? 'Bilinmiyor'}
              </p>

              <div className="rounded-lg bg-muted p-3 mb-3">
                <p className="text-sm">{q.question}</p>
              </div>

              {q.answer && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">Cevabınız:</p>
                  <p className="text-sm text-green-900">{q.answer}</p>
                </div>
              )}

              {q.status === 'PENDING' && (
                <div className="flex gap-2 mt-2">
                  <textarea
                    value={answerMap[q.id] ?? ''}
                    onChange={(e) => setAnswerMap((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Cevabınızı yazın…"
                    rows={2}
                    className="flex-1 text-sm rounded-lg border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => handleAnswer(q.id)}
                    disabled={submitting === q.id || !answerMap[q.id]?.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 self-end"
                  >
                    {submitting === q.id ? '…' : 'Gönder'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
