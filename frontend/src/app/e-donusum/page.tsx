'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, PlugZap, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Settings = {
  provider: 'TRENDYOL_EFATURAM';
  active: boolean;
  firmCode: string;
  username: string;
  password: string;
  email: string;
  firmId: string;
  eArchiveSeries: string;
  eInvoiceSeries: string;
  autoIssue: boolean;
  issueOn: 'DELIVERED' | 'SHIPPED';
  vatRate: number;
};

type SettingsResponse = { settings: Settings; providerReady: boolean; providerNotice: string | null };

type PendingRow = {
  sourceType: 'RETAIL_SALE' | 'WEB_ORDER';
  sourceId: number;
  sourceNumber: string;
  channel: string;
  customerName: string;
  amount: number;
  invoiceType: 'E_ARSIV' | 'E_FATURA';
  date: string;
  lastError: string | null;
  attempts: number;
};

type InvoiceRow = {
  id: number;
  sourceType: string;
  sourceNumber: string;
  customerName: string | null;
  amount: number;
  invoiceType: string;
  status: 'PENDING' | 'ISSUED' | 'ERROR' | 'CANCELLED';
  invoiceNumber: string | null;
  pdfUrl: string | null;
  errorMessage: string | null;
  attempts: number;
  issuedAt: string | null;
  createdAt: string;
};

const CHANNEL_LABEL: Record<string, string> = {
  STORE: 'Dükkan', PHONE: 'Telefon', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', WEBSITE: 'Web (ERP)', OTHER: 'Diğer', WEB: 'Web Sitesi',
};

const money = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('tr-TR') : '-');
const typeLabel = (t: string) => (t === 'E_FATURA' ? 'e-Fatura' : 'e-Arşiv');

function StatusBadge({ row }: { row: InvoiceRow }) {
  if (row.status === 'ISSUED') return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Kesildi</span>;
  if (row.status === 'PENDING') return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Gönderiliyor</span>;
  if (row.status === 'CANCELLED') return <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">İptal</span>;
  return <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Hata</span>;
}

export default function EDonusumPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState(90);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await api<SettingsResponse>('/e-invoices/settings');
    setData(res);
    setForm(res.settings);
  }, []);
  const loadPending = useCallback(async () => {
    const res = await api<{ rows: PendingRow[] }>(`/e-invoices/pending?days=${days}`);
    setPending(res.rows);
  }, [days]);
  const loadInvoices = useCallback(async () => {
    const res = await api<{ total: number; rows: InvoiceRow[] }>('/e-invoices?limit=200');
    setInvoices(res.rows);
    setInvoiceTotal(res.total);
  }, []);

  useEffect(() => { loadSettings().catch((e) => setMsg({ type: 'err', text: e.message })); }, [loadSettings]);
  useEffect(() => { loadPending().catch((e) => setMsg({ type: 'err', text: e.message })); }, [loadPending]);
  useEffect(() => { loadInvoices().catch((e) => setMsg({ type: 'err', text: e.message })); }, [loadInvoices]);

  async function run(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setMsg(null);
    try {
      const text = await fn();
      if (text) setMsg({ type: 'ok', text });
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(patch: Partial<Settings>, okText = 'Ayarlar kaydedildi.') {
    const res = await api<SettingsResponse>('/e-invoices/settings', { method: 'PUT', json: patch });
    setData(res);
    setForm(res.settings);
    return okText;
  }

  const issueResult = (r: { issued: number; failed: number }) => `${r.issued} fatura kesildi${r.failed ? `, ${r.failed} hata` : ''}.`;

  const s = data?.settings;
  const ready = !!data?.providerReady;
  const canIssue = ready && !!s?.active;
  const configured = !!(s?.firmCode && s?.username && s?.password);

  return (
    <AdminShell title="e-Dönüşüm">
      <div className="mx-auto max-w-7xl space-y-5 p-4">
        <div>
          <h1 className="text-xl font-bold">Trendyol e-Faturam — e-Dönüşüm</h1>
          <p className="text-sm text-gray-500">Dükkan satışları ve web siparişleri için e-Arşiv / e-Fatura</p>
        </div>

        {msg && (
          <div className={`flex justify-between rounded-lg border p-3 text-sm ${msg.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)}>✕</button>
          </div>
        )}

        {data && !ready && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{data.providerNotice} Bu sırada bilgileri kaydedebilir ve faturasız satışları takip edebilirsiniz.</span>
          </div>
        )}

        {/* ── Sağlayıcı kartı ─────────────────────────────── */}
        {s && form && (
          <section className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 font-bold text-red-600">TF</div>
                <div>
                  <div className="font-semibold">Trendyol e-Faturam</div>
                  <div className="text-sm text-gray-500">{s.email || 'e-posta girilmedi'}</div>
                </div>
              </div>
              {s.active && configured ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">● Aktif</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{configured ? 'Pasif' : 'Bilgi girilmedi'}</span>
              )}
            </div>

            {!editing ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">Firma</div>
                  <div className="mt-1 text-sm">Firma ID: <b>{s.firmId || '-'}</b></div>
                  <div className="text-sm">Kısa Kod: <b>{s.firmCode || '-'}</b></div>
                  <div className="text-sm">Web Servis Kullanıcı: <b>{s.username || '-'}</b></div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">Fatura Serisi</div>
                  <div className="mt-1 text-sm font-semibold">e-Arşiv: {s.eArchiveSeries || '-'} · e-Fatura: {s.eInvoiceSeries || '-'}</div>
                  <div className="mt-1 text-xs text-gray-500">Seri, Trendyol e-Faturam hesabınızda tanımlı olmalı. KDV oranı: %{s.vatRate} (fiyatlar KDV dahil)</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">Otomatik Kesim</div>
                  <label className="mt-1 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.autoIssue}
                      onChange={(e) => run('auto', () => saveSettings({ autoIssue: e.target.checked }, e.target.checked ? 'Otomatik kesim açıldı.' : 'Otomatik kesim kapatıldı.'))}
                    />
                    {s.autoIssue ? 'Açık' : 'Kapalı'} — satış tamamlanınca kesilir
                  </label>
                  <div className="mt-2 text-xs text-gray-500">Fatura ne zaman kesilsin?</div>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    value={s.issueOn}
                    onChange={(e) => run('issueOn', () => saveSettings({ issueOn: e.target.value as Settings['issueOn'] }))}
                  >
                    <option value="DELIVERED">Müşteri teslim alınca</option>
                    <option value="SHIPPED">Kargoya / yola çıkınca</option>
                  </select>
                  <div className="mt-1 text-xs text-gray-500">Dükkan satışları tamamlanınca faturalanır. Sonra en geç 15 dakika içinde kesilir.</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {([
                  ['firmId', 'Firma ID (panelde görünen)'],
                  ['firmCode', 'Firma Kısa Kodu'],
                  ['username', 'Web Servis Kullanıcı Kodu'],
                  ['password', 'Web Servis Şifresi'],
                  ['email', 'e-Faturam e-posta'],
                  ['eArchiveSeries', 'e-Arşiv Seri (3 karakter)'],
                  ['eInvoiceSeries', 'e-Fatura Seri (3 karakter)'],
                  ['vatRate', 'KDV Oranı (%)'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="text-sm">
                    <span className="text-xs text-gray-500">{label}</span>
                    <input
                      type={key === 'password' ? 'password' : key === 'vatRate' ? 'number' : 'text'}
                      className="mt-1 w-full rounded-md border px-2 py-1.5"
                      value={String(form[key] ?? '')}
                      maxLength={key.endsWith('Series') ? 3 : undefined}
                      onChange={(e) => setForm({ ...form, [key]: key === 'vatRate' ? Number(e.target.value) : e.target.value })}
                    />
                  </label>
                ))}
                <p className="text-xs text-gray-500 md:col-span-3">
                  Kısa kod, web servis kullanıcı kodu ve şifresi Trendyol e-Faturam&apos;ın gönderdiği e-postada yer alır.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {editing ? (
                <>
                  <button
                    disabled={busy !== null}
                    onClick={() => run('save', async () => { const t = await saveSettings(form); setEditing(false); return t; })}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >Kaydet</button>
                  <button onClick={() => { setForm(s); setEditing(false); }} className="rounded-md border px-3 py-1.5 text-sm">Vazgeç</button>
                </>
              ) : (
                <>
                  <button
                    disabled={busy !== null}
                    onClick={() => run('test', async () => {
                      const r = await api<{ ok: boolean; message: string }>('/e-invoices/settings/test', { method: 'POST' });
                      if (!r.ok) throw new Error(r.message);
                      return r.message;
                    })}
                    className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                  ><PlugZap className="h-4 w-4" /> Bağlantıyı Test Et</button>
                  <button onClick={() => setEditing(true)} className="rounded-md border px-3 py-1.5 text-sm">Bilgileri Düzenle</button>
                  <button
                    disabled={busy !== null}
                    onClick={() => run('active', () => saveSettings({ active: !s.active }, s.active ? 'Entegrasyon pasife alındı.' : 'Entegrasyon aktif edildi.'))}
                    className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 ${s.active ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}
                  >{s.active ? 'Pasife Al' : 'Aktif Et'}</button>
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Faturasız satışlar ─────────────────────────── */}
        <section className="rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Faturasız tamamlanmış satışlar
              <span className="rounded-full bg-gray-100 px-2 text-xs">{pending.length}</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <select className="rounded-md border px-2 py-1.5 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Son 7 gün</option>
                <option value={30}>Son 30 gün</option>
                <option value={90}>Son 90 gün</option>
                <option value={180}>Son 180 gün</option>
              </select>
              <button onClick={() => run('pending', async () => { await loadPending(); })} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
                <RefreshCw className="h-4 w-4" /> Yenile
              </button>
              <button
                disabled={!canIssue || !pending.length || busy !== null}
                title={!canIssue ? 'Entegrasyon hazır/aktif değil' : undefined}
                onClick={() => run('all', async () => {
                  if (!confirm(`${pending.length} satış için fatura kesilsin mi?`)) return;
                  const r = await api<{ issued: number; failed: number }>('/e-invoices/issue', { method: 'POST', json: { all: true, days } });
                  await Promise.all([loadPending(), loadInvoices()]);
                  return issueResult(r);
                })}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              ><Send className="h-4 w-4" /> Hepsini Faturala ({pending.length})</button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Dükkan, telefon, WhatsApp, Instagram satışları ve web sitesi siparişlerinden tamamlanmış ama e-Dönüşüm faturası kesilmemiş olanlar.
            Pazaryeri (Trendyol, N11, HB) siparişleri burada listelenmez.
          </p>

          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Bekleyen satış yok — her şey faturalanmış. 🎉</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Satış No</th><th className="px-3 py-2">Kanal</th><th className="px-3 py-2">Müşteri</th>
                    <th className="px-3 py-2">Tutar</th><th className="px-3 py-2">Tür</th><th className="px-3 py-2">Tarih</th><th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={`${r.sourceType}-${r.sourceId}`} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{r.sourceNumber}</td>
                      <td className="px-3 py-2">{CHANNEL_LABEL[r.channel] ?? r.channel}</td>
                      <td className="px-3 py-2">
                        {r.customerName}
                        {r.lastError && <div className="mt-1 max-w-md text-xs text-red-600">Son deneme hatası: {r.lastError}</div>}
                      </td>
                      <td className="px-3 py-2">{money(r.amount)}</td>
                      <td className="px-3 py-2">{typeLabel(r.invoiceType)}</td>
                      <td className="px-3 py-2">{date(r.date)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          disabled={!canIssue || busy !== null}
                          onClick={() => run(`one-${r.sourceType}-${r.sourceId}`, async () => {
                            const res = await api<{ issued: number; failed: number }>('/e-invoices/issue', {
                              method: 'POST', json: { items: [{ sourceType: r.sourceType, sourceId: r.sourceId }] },
                            });
                            await Promise.all([loadPending(), loadInvoices()]);
                            return issueResult(res);
                          })}
                          className="rounded-md border px-2.5 py-1 text-xs disabled:opacity-40"
                        >Faturala</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Kesilen faturalar ──────────────────────────── */}
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-red-500" /> Kesilen Faturalar <span className="text-xs text-gray-500">({invoiceTotal})</span>
            </h2>
            <button onClick={() => run('invoices', async () => { await loadInvoices(); })} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
              <RefreshCw className="h-4 w-4" /> Yenile
            </button>
          </div>

          {invoices.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">Henüz kesilen fatura yok.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Fatura No</th><th className="px-3 py-2">Satış No</th><th className="px-3 py-2">Müşteri</th>
                    <th className="px-3 py-2">Tutar</th><th className="px-3 py-2">Tür</th><th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Tarih</th><th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{r.invoiceNumber ?? '-'}</td>
                      <td className="px-3 py-2">{r.sourceNumber}</td>
                      <td className="px-3 py-2">{r.customerName ?? '-'}</td>
                      <td className="px-3 py-2">{money(r.amount)}</td>
                      <td className="px-3 py-2">{typeLabel(r.invoiceType)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge row={r} />
                        {r.status === 'ERROR' && r.errorMessage && <div className="mt-1 max-w-sm text-xs text-red-600">{r.errorMessage}</div>}
                      </td>
                      <td className="px-3 py-2">{date(r.issuedAt ?? r.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        {r.pdfUrl && (
                          <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <ExternalLink className="h-3.5 w-3.5" /> PDF
                          </a>
                        )}
                        {r.status === 'ERROR' && (
                          <button
                            disabled={!canIssue || busy !== null}
                            onClick={() => run(`retry-${r.id}`, async () => {
                              const res = await api<{ issued: number; failed: number }>(`/e-invoices/${r.id}/retry`, { method: 'POST' });
                              await Promise.all([loadPending(), loadInvoices()]);
                              return issueResult(res);
                            })}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 disabled:opacity-40"
                          ><RotateCcw className="h-3.5 w-3.5" /> Tekrar Dene</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
