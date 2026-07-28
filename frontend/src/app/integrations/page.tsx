'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Save, TestTube2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Connection = {
  platform: string;
  displayName: string;
  status: string;
  lastTestAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
};

type OrderRow = {
  id: number;
  saleNumber: string;
  platformOrderNumber?: string | null;
  platform: string;
  status: string;
  integrationSyncStatus: string;
  customerName: string;
  phone?: string | null;
  grandTotal: number | string;
  itemCount: number;
  orderDate?: string | null;
};

type LogRow = {
  id: number;
  platform: string;
  action: string;
  status: string;
  message?: string | null;
  startedAt: string;
};

type TicimaxSettings = {
  tenant: string;
  siteUrl: string;
  serviceEndpoint: string;
  wsdlUrl: string;
  status: string;
  lastTestAt?: string | null;
  lastError?: string | null;
  hasUyeKodu: boolean;
  uyeKoduMasked?: string;
};

const defaultTicimaxSettings: TicimaxSettings & { uyeKodu: string } = {
  tenant: 'Erhan Flowers',
  siteUrl: 'https://www.erhanflowers.com',
  serviceEndpoint: 'https://www.erhanflowers.com/servis/UrunServis.svc',
  wsdlUrl: 'https://www.erhanflowers.com/servis/UrunServis.svc?wsdl',
  status: 'NOT_CONFIGURED',
  lastTestAt: null,
  lastError: null,
  hasUyeKodu: false,
  uyeKoduMasked: '',
  uyeKodu: '',
};

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [history, setHistory] = useState<LogRow[]>([]);
  const [errors, setErrors] = useState<LogRow[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [ticimax, setTicimax] = useState(defaultTicimaxSettings);
  const [message, setMessage] = useState('');
  const [loadingPlatform, setLoadingPlatform] = useState('');

  function load() {
    Promise.all([
      api<Connection[]>('/integrations/connections'),
      api<OrderRow[]>('/integrations/orders'),
      api<LogRow[]>('/integrations/history'),
      api<LogRow[]>('/integrations/errors'),
      api<Record<string, unknown>>('/integrations/operations'),
      api<TicimaxSettings>('/integrations/ticimax'),
    ]).then(([nextConnections, nextOrders, nextHistory, nextErrors, nextSummary, nextTicimax]) => {
      setConnections(nextConnections);
      setOrders(nextOrders);
      setHistory(nextHistory);
      setErrors(nextErrors);
      setSummary(nextSummary);
      setTicimax({ ...defaultTicimaxSettings, ...nextTicimax, uyeKodu: '' });
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'Entegrasyon verileri yüklenemedi.'));
  }

  useEffect(() => {
    load();
  }, []);

  async function test(platform: string) {
    setLoadingPlatform(platform);
    setMessage('');
    try {
      const result = await api<{ ok: boolean; message: string }>(`/integrations/connections/${platform}/test`, { method: 'POST' });
      setMessage(result.message);
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bağlantı testi yapılamadı.');
    } finally {
      setLoadingPlatform('');
    }
  }

  async function sync(platform: string) {
    setLoadingPlatform(platform);
    setMessage('');
    try {
      const result = await api<{ ok: boolean; imported: number; duplicated: number; message?: string }>(`/integrations/orders/${platform}/sync`, { method: 'POST' });
      setMessage(result.ok ? `${result.imported} yeni, ${result.duplicated} mükerrer sipariş işlendi.` : result.message || 'Senkronizasyon yapılamadı.');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sipariş senkronizasyonu yapılamadı.');
    } finally {
      setLoadingPlatform('');
    }
  }

  async function saveTicimax() {
    setLoadingPlatform('TICIMAX_SETTINGS');
    setMessage('');
    try {
      const saved = await api<TicimaxSettings>('/integrations/ticimax', {
        method: 'PUT',
        json: {
          tenant: ticimax.tenant,
          siteUrl: ticimax.siteUrl,
          serviceEndpoint: ticimax.serviceEndpoint,
          wsdlUrl: ticimax.wsdlUrl,
          uyeKodu: ticimax.uyeKodu,
        },
      });
      setTicimax({ ...defaultTicimaxSettings, ...saved, uyeKodu: '' });
      setMessage('Ticimax bağlantı ayarları kaydedildi.');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ticimax ayarları kaydedilemedi.');
    } finally {
      setLoadingPlatform('');
    }
  }

  async function testTicimax() {
    setLoadingPlatform('TICIMAX_TEST');
    setMessage('');
    try {
      const result = await api<{ ok: boolean; message: string }>('/integrations/ticimax/test', {
        method: 'POST',
        json: { tenant: ticimax.tenant },
      });
      setMessage(result.message);
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ticimax bağlantı testi yapılamadı.');
    } finally {
      setLoadingPlatform('');
    }
  }

  return (
    <AdminShell title="Entegrasyon Merkezi">
      <div className="space-y-5">
        {message && <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}

        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Ticimax Bağlantı Ayarları</h2>
              <p className="text-sm text-slate-500">www.erhanflowers.com sitesini ERP bağlantısına hazırlamak için temel servis bilgileri.</p>
            </div>
            <StatusBadge status={ticimax.status} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="label">Tenant / Firma</span>
              <input className="field" value={ticimax.tenant} onChange={(event) => setTicimax({ ...ticimax, tenant: event.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Site Adresi</span>
              <input className="field" value={ticimax.siteUrl} onChange={(event) => setTicimax({ ...ticimax, siteUrl: event.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Servis Endpoint</span>
              <input className="field" value={ticimax.serviceEndpoint} onChange={(event) => setTicimax({ ...ticimax, serviceEndpoint: event.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="label">WSDL Adresi</span>
              <input className="field" value={ticimax.wsdlUrl} onChange={(event) => setTicimax({ ...ticimax, wsdlUrl: event.target.value })} />
            </label>
            <label className="block space-y-1.5 lg:col-span-2">
              <span className="label">UyeKodu</span>
              <input
                className="field"
                type="password"
                placeholder={ticimax.hasUyeKodu ? `Kayıtlı: ${ticimax.uyeKoduMasked || '••••'}` : 'Ticimax UyeKodu'}
                value={ticimax.uyeKodu}
                onChange={(event) => setTicimax({ ...ticimax, uyeKodu: event.target.value })}
              />
              <span className="block text-xs text-slate-500">Boş bırakırsan kayıtlı UyeKodu korunur. Ekranda açık gösterilmez.</span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" type="button" onClick={saveTicimax} disabled={loadingPlatform === 'TICIMAX_SETTINGS'}>
              <Save size={16} />
              Kaydet
            </button>
            <button className="btn btn-secondary" type="button" onClick={testTicimax} disabled={loadingPlatform === 'TICIMAX_TEST'}>
              <TestTube2 size={16} />
              Bağlantıyı Test Et
            </button>
            <span className="text-xs text-slate-500">Son test: {date(ticimax.lastTestAt)}</span>
            {ticimax.lastError && <span className="text-xs font-semibold text-red-600">{ticimax.lastError}</span>}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Bugünkü Sipariş" value={summary.todayOrders} />
          <Metric label="Yeni" value={summary.newOrders} />
          <Metric label="Üretimde" value={summary.inProduction} />
          <Metric label="Hazır" value={summary.ready} />
          <Metric label="Tamamlanan" value={summary.completed} />
          <Metric label="Eşleşmeyen" value={summary.matchingRequired} />
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-bold text-ink">Bağlantılar</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {connections.map((connection) => (
              <div key={connection.platform} className="rounded border border-line p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{connection.displayName}</div>
                    <div className="mt-1 text-xs text-slate-500">{connection.status}</div>
                  </div>
                  {connection.status === 'CONNECTED' ? <CheckCircle2 className="text-emerald-600" size={19} /> : <AlertTriangle className="text-amber-500" size={19} />}
                </div>
                {connection.lastError && <div className="mt-2 text-xs text-red-600">{connection.lastError}</div>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn btn-secondary text-xs" onClick={() => test(connection.platform)} disabled={loadingPlatform === connection.platform}>
                    <TestTube2 size={15} />
                    Test
                  </button>
                  {connection.platform !== 'TICIMAX' && (
                  <button className="btn btn-primary text-xs" onClick={() => sync(connection.platform)} disabled={loadingPlatform === connection.platform}>
                    <RefreshCw size={15} />
                    Sipariş Çek
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-bold text-ink">Sipariş Senkronizasyonu</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="p-3">Merkezi No</th>
                  <th className="p-3">Platform No</th>
                  <th className="p-3">Kaynak</th>
                  <th className="p-3">Müşteri</th>
                  <th className="p-3">Ürün</th>
                  <th className="p-3">Tutar</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Sync</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-line">
                    <td className="p-3 font-semibold">{order.saleNumber}</td>
                    <td className="p-3">{order.platformOrderNumber || '-'}</td>
                    <td className="p-3">{order.platform}</td>
                    <td className="p-3">{order.customerName}<small className="block text-slate-500">{order.phone || '-'}</small></td>
                    <td className="p-3">{order.itemCount}</td>
                    <td className="p-3">{money(order.grandTotal)}</td>
                    <td className="p-3">{order.status}</td>
                    <td className="p-3">{order.integrationSyncStatus}</td>
                  </tr>
                ))}
                {!orders.length && <tr><td className="p-6 text-center text-slate-500" colSpan={8}>Senkron sipariş bulunamadı.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <LogPanel title="Hata Kayıtları" rows={errors} />
          <LogPanel title="Senkronizasyon Geçmişi" rows={history} />
        </section>
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="panel p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-bold">{Number(value || 0)}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    CONNECTED: 'Bağlı',
    CONFIGURED: 'Kaydedildi',
    NOT_CONFIGURED: 'Kurulmadı',
    MISSING_CREDENTIALS: 'Eksik Bilgi',
    FAILED: 'Hata',
    NOT_IMPLEMENTED: 'Hazır Değil',
  };
  const isOk = status === 'CONNECTED' || status === 'CONFIGURED';
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function LogPanel({ title, rows }: { title: string; rows: LogRow[] }) {
  return (
    <section className="panel p-5">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 8).map((row) => (
          <div key={row.id} className="rounded border border-line p-3 text-sm">
            <div className="font-semibold">{row.platform} · {row.action} · {row.status}</div>
            <div className="text-slate-500">{row.message || '-'}</div>
            <div className="text-xs text-slate-400">{date(row.startedAt)}</div>
          </div>
        ))}
        {!rows.length && <div className="rounded border border-dashed border-line p-4 text-sm text-slate-500">Kayıt yok.</div>}
      </div>
    </section>
  );
}

function money(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function date(value: unknown) {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(value))) : '-';
}
