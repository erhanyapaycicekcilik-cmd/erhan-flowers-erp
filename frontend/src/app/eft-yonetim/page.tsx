'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Eye, RefreshCw, ExternalLink } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';
import type { CurrentUser } from '@/types';

type EftRow = {
  id: number;
  token: string;
  status: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  dekontPath?: string | null;
  dekontUploadedAt?: string | null;
  customerNote?: string | null;
  staffNote?: string | null;
  expiresAt: string;
  createdAt: string;
  saleId: number;
  saleNumber: string;
  saleStatus: string;
  customerName: string;
  phone?: string | null;
};

function money(v: number | string | null | undefined) {
  return `${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function statusBadge(status: string) {
  if (status === 'PENDING') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Bekliyor</span>;
  if (status === 'CONFIRMED') return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Onaylandı</span>;
  if (status === 'REJECTED') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Reddedildi</span>;
  if (status === 'EXPIRED') return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Süresi Doldu</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{status}</span>;
}

export default function EftYonetimPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rows, setRows] = useState<EftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EftRow | null>(null);
  const [staffNote, setStaffNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    api<CurrentUser>('/auth/me').then(setUser).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<EftRow[]>('/eft/pending');
      setRows(data);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doConfirm() {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api(`/eft/${selected.id}/confirm`, { method: 'POST', body: JSON.stringify({ staffNote }) });
      setSelected(null);
      setStaffNote('');
      await load();
    } catch (e) {
      alert(String(e));
    }
    setActionLoading(false);
  }

  async function doReject() {
    if (!selected) return;
    if (!staffNote.trim()) { alert('Red sebebini yazın.'); return; }
    setActionLoading(true);
    try {
      await api(`/eft/${selected.id}/reject`, { method: 'POST', body: JSON.stringify({ staffNote }) });
      setSelected(null);
      setStaffNote('');
      await load();
    } catch (e) {
      alert(String(e));
    }
    setActionLoading(false);
  }

  const hasDekont = (row: EftRow) => Boolean(row.dekontPath && row.dekontUploadedAt);

  return (
    <AdminShell user={user} title="EFT Ödeme Yönetimi">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-800">EFT Ödemeleri</h1>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-slate-400">
            <Clock className="mx-auto mb-3" size={32} />
            <p className="font-medium">Bekleyen EFT talebi yok</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Sipariş</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Müşteri</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500">Tutar</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-500">Dekont</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-500">Durum</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-500">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{row.saleNumber}</p>
                      <p className="text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{row.customerName}</p>
                      {row.phone && <p className="text-xs text-slate-400">{row.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-emerald-700">{money(row.finalAmount)}</p>
                      <p className="text-xs text-slate-400 line-through">{money(row.originalAmount)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasDekont(row) ? (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(apiFileUrl(row.dekontPath!))}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Eye size={12} /> Görüntüle
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">Henüz yok</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => { setSelected(row); setStaffNote(''); }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detay modali */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-black text-slate-800">EFT Talebi — {selected.saleNumber}</h2>
              <p className="text-sm text-slate-500">{selected.customerName} · {selected.phone}</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Normal Tutar</p>
                  <p className="font-semibold text-slate-500 line-through">{money(selected.originalAmount)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-600">EFT Tutarı (%3 İndirimli)</p>
                  <p className="text-lg font-black text-emerald-700">{money(selected.finalAmount)}</p>
                </div>
              </div>

              {selected.dekontPath ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">Dekont yüklendi</p>
                    <p className="text-xs text-blue-500">{selected.dekontUploadedAt ? new Date(selected.dekontUploadedAt).toLocaleString('tr-TR') : ''}</p>
                    {selected.customerNote && <p className="mt-1 text-xs text-blue-600 italic">"{selected.customerNote}"</p>}
                  </div>
                  <a
                    href={apiFileUrl(selected.dekontPath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <ExternalLink size={12} /> Aç
                  </a>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  Müşteri henüz dekont yüklemedi.
                </div>
              )}

              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-400 focus:outline-none resize-none"
                rows={2}
                placeholder="Personel notu (isteğe bağlı — red için zorunlu)"
                value={staffNote}
                onChange={e => setStaffNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={doReject}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle size={14} /> Reddet
              </button>
              <button
                type="button"
                onClick={doConfirm}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Onayla & Siparişi Hazırla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dekont önizleme */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white text-sm font-semibold"
            >
              Kapat ✕
            </button>
            {previewUrl.endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-full h-[80vh] rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Dekont" className="w-full rounded-xl object-contain max-h-[80vh]" />
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
