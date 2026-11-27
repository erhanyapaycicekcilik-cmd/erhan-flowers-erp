'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, FileText, PlugZap, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Settings = {
  provider: 'TRENDYOL_EFATURAM';
  active: boolean;
  environment: 'STAGE' | 'PROD';
  email: string;
  password: string;
  firmId: string;
  userId: string;
  eArchiveSeries: string;
  eInvoiceSeries: string;
  autoIssue: boolean;
  issueOn: 'DELIVERED' | 'SHIPPED';
  vatRate: number;
  webSiteUrl: string;
  carrierName: string;
  carrierTaxId: string;
  defaultCity: string;
  defaultDistrict: string;
  defaultAddress: string;
  marketplacePlatforms: string[];
};

type SettingsResponse = { settings: Settings; providerReady: boolean; providerNotice: string | null };

type PendingRow = {
  sourceType: 'RETAIL_SALE' | 'WEB_ORDER' | 'MARKETPLACE_ORDER';
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
  provider: string;
  sourceId: number;
  sourceType: string;
  sourceNumber: string;
  channel: string | null;
  customerName: string | null;
  amount: number;
  invoiceType: string;
  status: 'PENDING' | 'ISSUED' | 'ERROR' | 'CANCELLED' | 'SKIPPED';
  invoiceNumber: string | null;
  pdfUrl: string | null;
  errorMessage: string | null;
  attempts: number;
  issuedAt: string | null;
  createdAt: string;
};

const CHANNEL_LABEL: Record<string, string> = {
  STORE: 'Dükkan', PHONE: 'Telefon', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', WEBSITE: 'Web (ERP)', OTHER: 'Diğer', WEB: 'Web Sitesi',
  N11: 'N11', HEPSIBURADA: 'Hepsiburada', IDEFIX: 'Idefix', PAZARAMA: 'Pazarama', TICIMAX: 'Ticimax', AMAZON: 'Amazon',
};

const CHANNEL_COLOR: Record<string, string> = {
  N11: 'bg-purple-100 text-purple-800',
  HEPSIBURADA: 'bg-orange-100 text-orange-800',
  IDEFIX: 'bg-sky-100 text-sky-800',
  PAZARAMA: 'bg-pink-100 text-pink-800',
  TICIMAX: 'bg-teal-100 text-teal-800',
  AMAZON: 'bg-yellow-100 text-yellow-800',
  WEB: 'bg-blue-100 text-blue-800',
  WHATSAPP: 'bg-green-100 text-green-800',
  INSTAGRAM: 'bg-rose-100 text-rose-800',
};

function ChannelBadge({ channel }: { channel: string }) {
  const label = CHANNEL_LABEL[channel] ?? channel;
  const color = CHANNEL_COLOR[channel] ?? 'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{label}</span>;
}

const money = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('tr-TR') : '-');
const typeLabel = (t: string) => (t === 'E_FATURA' ? 'e-Fatura' : 'e-Arşiv');

function StatusBadge({ row }: { row: InvoiceRow }) {
  if (row.status === 'ISSUED') return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Kesildi</span>;
  if (row.status === 'SKIPPED') return <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Faturalanmayacak</span>;
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
  const [editingAmountId, setEditingAmountId] = useState<number | null>(null);
  const [editingAmountVal, setEditingAmountVal] = useState('');

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
  const configured = !!(s?.email && s?.password);
  const isProd = s?.environment === 'PROD';

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
              <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${isProd ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                {isProd ? 'CANLI ortam' : 'TEST ortamı'}
              </span>
              {s.active && configured ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">● Aktif</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{configured ? 'Pasif' : 'Bilgi girilmedi'}</span>
              )}
              </div>
            </div>

            {!editing ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium uppercase text-gray-500">Hesap</div>
                  <div className="mt-1 text-sm">Kullanıcı: <b>{s.email || '-'}</b></div>
                  <div className="text-sm">Firma ID: <b>{s.firmId || 'token\'dan otomatik'}</b></div>
                  <div className="text-sm">Web siparişi kargo: <b>{s.carrierName || '-'}</b>{s.carrierTaxId ? ` (${s.carrierTaxId})` : ''}</div>
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
                  {!isProd && <div className="mt-1 text-xs font-medium text-amber-700">Otomatik kesim sadece CANLI ortamda çalışır.</div>}
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  <span className="text-xs text-gray-500">Ortam</span>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1.5"
                    value={form.environment}
                    onChange={(e) => setForm({ ...form, environment: e.target.value as Settings['environment'] })}
                  >
                    <option value="STAGE">TEST (stage) — fatura GİB&apos;e gitmez</option>
                    <option value="PROD">CANLI — gerçek fatura</option>
                  </select>
                </label>
                {([
                  ['email', 'e-Faturam e-posta (kullanıcı adı)'],
                  ['password', 'Şifre (test ve canlı ayrı)'],
                  ['firmId', 'Firma ID (boşsa otomatik)'],
                  ['userId', 'Kullanıcı ID (boşsa otomatik)'],
                  ['eArchiveSeries', 'e-Arşiv Seri (3 karakter)'],
                  ['eInvoiceSeries', 'e-Fatura Seri (3 karakter)'],
                  ['vatRate', 'KDV Oranı (%)'],
                  ['defaultCity', 'Varsayılan Şehir (dükkan)'],
                  ['defaultDistrict', 'Varsayılan İlçe (dükkan)'],
                  ['defaultAddress', 'Varsayılan Açık Adres (dükkan)'],
                  ['webSiteUrl', 'Web sitesi adresi'],
                  ['carrierName', 'Kargo firması adı (web siparişleri)'],
                  ['carrierTaxId', 'Kargo firması VKN'],
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
                <div className="md:col-span-3">
                  <span className="text-xs text-gray-500">Pazaryeri platformları (ERP&apos;den fatura kesilecekler, ör. IDEFIX)</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {['N11', 'HEPSIBURADA', 'IDEFIX', 'PAZARAMA', 'TICIMAX', 'AMAZON'].map((p) => {
                      const active = (form.marketplacePlatforms ?? []).includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            const cur = form.marketplacePlatforms ?? [];
                            setForm({ ...form, marketplacePlatforms: active ? cur.filter((x) => x !== p) : [...cur, p] });
                          }}
                          className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">ERP üzerinden fatura kesmek istediğiniz pazaryerlerini seçin. Trendyol kendi faturasını kesiyor; burada seçmeyin.</p>
                </div>
                <p className="text-xs text-gray-500 md:col-span-3">
                  Kullanıcı adı, e-Faturam portalına kayıtlı e-posta adresinizdir. Test ortamı şifresini e-Faturam&apos;ın gönderdiği e-postadaki linkten belirlersiniz.
                  Web sitesi siparişleri &quot;internet satışı&quot; faturası olduğu için kargo firması adı ve VKN&apos;si zorunludur.
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
                    onClick={() => run('active', () => {
                      if (!s.active && isProd && !confirm('CANLI ortamda aktif ediyorsunuz. Kesilen faturalar GİB\'e gerçek fatura olarak gider. Devam edilsin mi?')) return Promise.resolve();
                      return saveSettings({ active: !s.active }, s.active ? 'Entegrasyon pasife alındı.' : 'Entegrasyon aktif edildi.');
                    })}
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
                disabled={!canIssue || !isProd || !pending.length || busy !== null}
                title={!canIssue ? 'Entegrasyon aktif değil' : !isProd ? 'Test ortamında tek tek deneyin' : undefined}
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
            Dükkan, telefon, WhatsApp, Instagram satışları, web sitesi siparişleri ve yukarıda seçilen pazaryeri platformlarının tamamlanmış siparişleri listelenir.
            Trendyol kendi faturasını kesiyor; burada seçmeyin.
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
                      <td className="px-3 py-2"><ChannelBadge channel={r.channel} /></td>
                      <td className="px-3 py-2">
                        {r.customerName}
                        {r.lastError && <div className="mt-1 max-w-md text-xs text-red-600">Son deneme hatası: {r.lastError}</div>}
                      </td>
                      <td className="px-3 py-2">
                        {editingAmountId === Number(r.sourceId) && r.sourceType === 'MARKETPLACE_ORDER' ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-28 rounded border px-1 py-0.5 text-sm"
                              value={editingAmountVal}
                              onChange={(e) => setEditingAmountVal(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="rounded bg-green-600 px-1.5 py-0.5 text-xs text-white"
                              onClick={async () => {
                                const v = parseFloat(editingAmountVal.replace(',', '.'));
                                if (!v || v <= 0) { setMsg({ type: 'err', text: 'Geçersiz tutar' }); return; }
                                try {
                                  await api(`/integrations/marketplace-orders/${Number(r.sourceId)}/total-amount`, {
                                    method: 'PATCH', json: { totalAmount: v },
                                  });
                                  setEditingAmountId(null);
                                  await loadPending();
                                  setMsg({ type: 'ok', text: `Tutar ${money(v)} olarak güncellendi.` });
                                } catch (e) {
                                  setMsg({ type: 'err', text: (e as Error).message });
                                }
                              }}
                            >✓ Kaydet</button>
                            <button
                              type="button"
                              className="rounded border px-1.5 py-0.5 text-xs text-gray-500"
                              onClick={() => setEditingAmountId(null)}
                            >✕</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            {money(r.amount)}
                            {r.sourceType === 'MARKETPLACE_ORDER' && (
                              <button
                                type="button"
                                title="Tutarı düzelt (platform indirimi düşülmemişse)"
                                className="ml-1 rounded border px-1 py-0.5 text-xs text-orange-600"
                                onClick={() => { setEditingAmountId(Number(r.sourceId)); setEditingAmountVal(String(r.amount)); }}
                              >Düzelt</button>
                            )}
                          </span>
                        )}
                      </td>
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
                        <button
                          disabled={busy !== null}
                          title="Deneme veya iptal satışı: fatura kesilmesin"
                          onClick={() => run(`skip-${r.sourceType}-${r.sourceId}`, async () => {
                            if (!confirm(`${r.sourceNumber} faturalanmayacak olarak işaretlensin mi? (Kesilen Faturalar listesinden geri alabilirsiniz)`)) return;
                            await api('/e-invoices/skip', {
                              method: 'POST',
                              json: { sourceType: r.sourceType, sourceId: r.sourceId, sourceNumber: r.sourceNumber, customerName: r.customerName, amount: r.amount },
                            });
                            await Promise.all([loadPending(), loadInvoices()]);
                            return `${r.sourceNumber} faturalanmayacak.`;
                          })}
                          className="ml-1 rounded-md border px-2.5 py-1 text-xs text-gray-500 disabled:opacity-40"
                        >Faturalama</button>
                        {r.sourceType === 'RETAIL_SALE' && (
                          <button
                            disabled={busy !== null}
                            title="Deneme/yanlış satış: satış iptal edilir, stok ve kasa geri alınır"
                            onClick={() => run(`void-${r.sourceId}`, async () => {
                              if (!confirm(`${r.sourceNumber} (${money(r.amount)}) satışı silinsin mi?\n\nSatış iptal edilir, düşen stok geri eklenir ve kasa tahsilatı kaldırılır. Bu işlem geri alınamaz.`)) return;
                              await api(`/sales/${r.sourceId}/void`, { method: 'POST', json: { reason: 'e-Dönüşüm ekranından silindi (deneme satışı)' } });
                              await Promise.all([loadPending(), loadInvoices()]);
                              return `${r.sourceNumber} silindi; stok ve kasa geri alındı.`;
                            })}
                            className="ml-1 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 disabled:opacity-40"
                          >Satışı Sil</button>
                        )}
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
                    <th className="px-3 py-2">Fatura No</th><th className="px-3 py-2">Kanal</th><th className="px-3 py-2">Satış No</th><th className="px-3 py-2">Müşteri</th>
                    <th className="px-3 py-2">Tutar</th><th className="px-3 py-2">Tür</th><th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Tarih</th><th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{r.invoiceNumber ?? '-'}</td>
                      <td className="px-3 py-2"><ChannelBadge channel={r.channel ?? r.sourceType} /></td>
                      <td className="px-3 py-2">{r.sourceNumber}</td>
                      <td className="px-3 py-2">{r.customerName ?? '-'}</td>
                      <td className="px-3 py-2">{money(r.amount)}</td>
                      <td className="px-3 py-2">{typeLabel(r.invoiceType)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge row={r} />
                        {r.provider.endsWith('_TEST') && <span className="ml-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">TEST</span>}
                        {r.status === 'ERROR' && r.errorMessage && <div className="mt-1 max-w-sm text-xs text-red-600">{r.errorMessage}</div>}
                      </td>
                      <td className="px-3 py-2">{date(r.issuedAt ?? r.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        {r.status === 'ISSUED' && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              disabled={busy !== null}
                              onClick={() => run(`pdf-${r.id}`, async () => {
                                const res = await api<{ url: string }>(`/e-invoices/${r.id}/pdf`);
                                window.open(res.url, '_blank', 'noopener');
                              })}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 disabled:opacity-40"
                            ><ExternalLink className="h-3.5 w-3.5" /> PDF</button>
                            <button
                              disabled={busy !== null}
                              title="Platformda iptal edilen faturayı ERP'den sil — sipariş bekleyenler listesine düşer"
                              onClick={() => run(`cancel-inv-${r.id}`, async () => {
                                if (!confirm(`${r.sourceNumber} fatura kaydı silinsin mi?\n\nSipariş bekleyenler listesine düşer, yeni fatura kesilebilir.\n\nBu işlem sadece platformda zaten iptal edilmiş faturalar için kullanılmalıdır.`)) return;
                                await api(`/e-invoices/${r.id}/cancel`, { method: 'DELETE' });
                                await Promise.all([loadPending(), loadInvoices()]);
                                return `${r.sourceNumber} fatura kaydı silindi, sipariş bekleyenler listesine alındı.`;
                              })}
                              className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700 disabled:opacity-40"
                            >Kaydı Sil</button>
                          </div>
                        )}
                        {r.provider.endsWith('_TEST') && r.sourceType === 'RETAIL_SALE' && r.status !== 'CANCELLED' && (
                          <button
                            disabled={busy !== null}
                            title="Deneme satışı: satış iptal edilir, stok ve kasa geri alınır (test faturası gerçek değildir)"
                            onClick={() => run(`void-inv-${r.id}`, async () => {
                              if (!confirm(`${r.sourceNumber} deneme satışı silinsin mi?\n\nSatış iptal edilir, düşen stok geri eklenir ve kasa tahsilatı kaldırılır. Test faturası gerçek olmadığı için ayrıca iptal gerekmez.`)) return;
                              await api(`/sales/${r.sourceId}/void`, { method: 'POST', json: { reason: 'e-Dönüşüm ekranından silindi (deneme satışı)' } });
                              await Promise.all([loadPending(), loadInvoices()]);
                              return `${r.sourceNumber} silindi; stok ve kasa geri alındı.`;
                            })}
                            className="ml-2 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 disabled:opacity-40"
                          >Satışı Sil</button>
                        )}
                        {r.status === 'SKIPPED' && (
                          <button
                            disabled={busy !== null}
                            onClick={() => run(`unskip-${r.id}`, async () => {
                              await api(`/e-invoices/${r.id}/unskip`, { method: 'POST' });
                              await Promise.all([loadPending(), loadInvoices()]);
                              return `${r.sourceNumber} tekrar faturalanacaklar listesine alındı.`;
                            })}
                            className="rounded-md border px-2.5 py-1 text-xs disabled:opacity-40"
                          >Geri Al</button>
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
