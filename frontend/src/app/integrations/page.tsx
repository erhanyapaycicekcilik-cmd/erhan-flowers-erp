'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ClipboardPaste, Download, PlayCircle, RefreshCw, Save, TestTube2, Upload } from 'lucide-react';
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

type SalesChannel = {
  id: number;
  code: string;
  name: string;
  channelType: string;
  isActive: boolean;
  supportsProducts: boolean;
  supportsStock: boolean;
  supportsPrice: boolean;
  supportsOrders: boolean;
  supportsWebhooks: boolean;
};

type ChannelAccount = {
  id: number;
  companyName: string;
  channelCode: string;
  channelName: string;
  name: string;
  status: string;
  isActive: boolean;
  isTestMode: boolean;
  lastConnectionTestAt?: string | null;
  lastConnectionStatus?: string | null;
  credentialCount: number;
  productMappingCount: number;
};

type SyncJob = {
  id: number;
  companyName: string;
  channelCode: string;
  accountName: string;
  jobType: string;
  mode: string;
  status: string;
  createdAt: string;
};

type PlatformCode = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'TICIMAX';

type PlatformSettings = {
  platform: PlatformCode;
  platformName: string;
  accountId: number | null;
  accountName: string;
  externalAccountId: string;
  status: string;
  isTestMode: boolean;
  requiredCredentials: string[];
  credentials: Record<string, { maskedValue?: string; updatedAt?: string }>;
};

type PlatformForm = {
  accountName: string;
  externalAccountId: string;
  isTestMode: boolean;
  credentials: Record<string, string>;
};

type ScreenshotResult = {
  platform: PlatformCode | null;
  accountName?: string;
  externalAccountId?: string;
  credentials: Record<string, string>;
  confidence: number;
};

const platformFields: Record<PlatformCode, Array<{ key: string; label: string; type?: string }>> = {
  TRENDYOL: [
    { key: 'SUPPLIER_ID', label: 'Supplier ID' },
    { key: 'API_KEY', label: 'API Key' },
    { key: 'API_SECRET', label: 'API Secret', type: 'password' },
  ],
  HEPSIBURADA: [
    { key: 'MERCHANT_ID', label: 'Merchant ID' },
    { key: 'API_KEY', label: 'API Key' },
    { key: 'API_SECRET', label: 'Secret Key', type: 'password' },
    { key: 'USER_AGENT', label: 'User-Agent' },
  ],
  N11: [
    { key: 'MERCHANT_ID', label: 'Merchant ID' },
    { key: 'API_KEY', label: 'API Key' },
    { key: 'API_SECRET', label: 'API Secret', type: 'password' },
  ],
  TICIMAX: [
    { key: 'UYE_KODU', label: 'UyeKodu', type: 'password' },
    { key: 'API_KEY', label: 'API Key' },
    { key: 'API_SECRET', label: 'API Secret', type: 'password' },
  ],
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
  const [history, setHistory] = useState<LogRow[]>([]);
  const [errors, setErrors] = useState<LogRow[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [ticimax, setTicimax] = useState(defaultTicimaxSettings);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings[]>([]);
  const [platformForms, setPlatformForms] = useState<Record<string, PlatformForm>>({});
  const [screenshotResult, setScreenshotResult] = useState<ScreenshotResult | null>(null);
  const [dryRunForm, setDryRunForm] = useState({ channelAccountId: '', trendyolProductVariantId: '', stockCardId: '', productId: '' });
  const [dryRunResult, setDryRunResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [loadingPlatform, setLoadingPlatform] = useState('');

  function load() {
    Promise.all([
      api<Connection[]>('/integrations/connections'),
      api<LogRow[]>('/integrations/history'),
      api<LogRow[]>('/integrations/errors'),
      api<Record<string, unknown>>('/integrations/operations'),
      api<TicimaxSettings>('/integrations/ticimax'),
    ]).then(([nextConnections, nextHistory, nextErrors, nextSummary, nextTicimax]) => {
      setConnections(nextConnections);
      setHistory(nextHistory);
      setErrors(nextErrors);
      setSummary(nextSummary);
      setTicimax({ ...defaultTicimaxSettings, ...nextTicimax, uyeKodu: '' });
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'Entegrasyon verileri yüklenemedi.'));
  }

  function loadSprint1A() {
    Promise.allSettled([
      api<SalesChannel[]>('/integrations/channels'),
      api<ChannelAccount[]>('/integrations/accounts'),
      api<SyncJob[]>('/integrations/sync-jobs'),
      api<PlatformSettings[]>('/integrations/platform-settings'),
    ]).then(([nextChannels, nextAccounts, nextSyncJobs, nextPlatformSettings]) => {
      if (nextChannels.status === 'fulfilled') setChannels(nextChannels.value);
      if (nextAccounts.status === 'fulfilled') setAccounts(nextAccounts.value);
      if (nextSyncJobs.status === 'fulfilled') setSyncJobs(nextSyncJobs.value);
      if (nextPlatformSettings.status === 'fulfilled') {
        setPlatformSettings(nextPlatformSettings.value);
        setPlatformForms((current) => mergePlatformForms(nextPlatformSettings.value, current));
      }
    });
  }

  function refreshLiveData() {
    Promise.all([
      api<Connection[]>('/integrations/connections'),
      api<LogRow[]>('/integrations/history'),
      api<LogRow[]>('/integrations/errors'),
      api<Record<string, unknown>>('/integrations/operations'),
    ]).then(([nextConnections, nextHistory, nextErrors, nextSummary]) => {
      setConnections(nextConnections);
      setHistory(nextHistory);
      setErrors(nextErrors);
      setSummary(nextSummary);
    }).catch(() => {});
    api<SyncJob[]>('/integrations/sync-jobs').then(setSyncJobs).catch(() => {});
  }

  useEffect(() => {
    load();
    loadSprint1A();
    const interval = setInterval(refreshLiveData, 30000);
    return () => clearInterval(interval);
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

  async function importOrderExcel(platform: string, file?: File | null) {
    if (!file) return;
    setLoadingPlatform(`EXCEL_${platform}`);
    setMessage('');
    try {
      const data = new FormData();
      data.append('file', file);
      const result = await api<{ ok: boolean; imported: number; duplicated: number; failed: number; message?: string }>(`/integrations/orders/${platform}/excel-import`, { method: 'POST', body: data });
      setMessage(result.message || `${result.imported} yeni, ${result.duplicated} mükerrer sipariş işlendi.`);
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sipariş Excel içe aktarılamadı.');
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

  async function testAccount(accountId: number) {
    setLoadingPlatform(`ACCOUNT_TEST_${accountId}`);
    setMessage('');
    try {
      const result = await api<{ success: boolean }>('/integrations/accounts/' + accountId + '/test', { method: 'POST' });
      setMessage(result.success ? 'Kanal baglanti testi tamamlandi.' : 'Kanal baglanti testi basarisiz.');
      loadSprint1A();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kanal hesabi test edilemedi.');
    } finally {
      setLoadingPlatform('');
    }
  }

  async function savePlatform(platform: PlatformCode) {
    const form = platformForms[platform];
    if (!form) return;
    setLoadingPlatform(`SAVE_${platform}`);
    setMessage('');
    try {
      const settings = await api<PlatformSettings[]>(`/integrations/platform-settings/${platform}`, {
        method: 'PUT',
        json: form,
      });
      setPlatformSettings(settings);
      setPlatformForms((current) => mergePlatformForms(settings, current, true));
      setMessage(`${platformLabel(platform)} API bilgileri guvenli kasaya kaydedildi.`);
      loadSprint1A();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'API bilgileri kaydedilemedi.');
    } finally {
      setLoadingPlatform('');
    }
  }

  async function analyzeScreenshot(file?: File | null) {
    if (!file) return;
    setLoadingPlatform('OCR');
    setMessage('');
    try {
      const data = new FormData();
      data.append('file', file);
      const result = await api<ScreenshotResult>('/integrations/platform-settings/analyze-screenshot', { method: 'POST', body: data });
      applyScreenshotResult(result);
      setScreenshotResult(result);
      setMessage(result.platform ? `${platformLabel(result.platform)} bilgileri ekrandan okundu ve forma aktarıldı.` : 'Gorsel okundu ancak platform kesin taninamadi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ekran goruntusu okunamadi.');
    } finally {
      setLoadingPlatform('');
    }
  }

  async function pasteScreenshot() {
    const items = await navigator.clipboard?.read?.().catch(() => []);
    const imageItem = items.find((item) => item.types.some((type) => type.startsWith('image/')));
    const imageType = imageItem?.types.find((type) => type.startsWith('image/'));
    if (!imageItem || !imageType) {
      setMessage('Panoda gorsel bulunamadi.');
      return;
    }
    const blob = await imageItem.getType(imageType);
    await analyzeScreenshot(new File([blob], 'entegrasyon-ekran-goruntusu.png', { type: imageType }));
  }

  function applyScreenshotResult(result: ScreenshotResult) {
    const platform = result.platform;
    if (!platform) return;
    setPlatformForms((current) => ({
      ...current,
      [platform]: {
        ...(current[platform] ?? emptyPlatformForm(platform)),
        accountName: result.accountName || current[platform]?.accountName || `${platformLabel(platform)} Magaza`,
        externalAccountId: result.externalAccountId || current[platform]?.externalAccountId || '',
        credentials: {
          ...(current[platform]?.credentials ?? {}),
          ...result.credentials,
        },
      },
    }));
  }

  function updatePlatformForm(platform: PlatformCode, patch: Partial<PlatformForm>) {
    setPlatformForms((current) => ({
      ...current,
      [platform]: {
        ...(current[platform] ?? emptyPlatformForm(platform)),
        ...patch,
        credentials: patch.credentials ?? current[platform]?.credentials ?? {},
      },
    }));
  }

  function updatePlatformCredential(platform: PlatformCode, key: string, value: string) {
    setPlatformForms((current) => ({
      ...current,
      [platform]: {
        ...(current[platform] ?? emptyPlatformForm(platform)),
        credentials: {
          ...(current[platform]?.credentials ?? {}),
          [key]: value,
        },
      },
    }));
  }

  function downloadTemplate(platform: PlatformCode) {
    const rows = [
      ['Platform', 'Magaza Adi', 'Supplier/Merchant ID', ...platformFields[platform].map((field) => field.label)],
      [platformLabel(platform), '', '', ...platformFields[platform].map(() => '')],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${platform.toLowerCase()}-api-sablonu.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function runDryRun() {
    setLoadingPlatform('DRY_RUN_PRODUCT');
    setMessage('');
    setDryRunResult(null);
    try {
      const result = await api<Record<string, unknown>>('/integrations/dry-run/product', {
        method: 'POST',
        json: {
          channelAccountId: dryRunForm.channelAccountId,
          trendyolProductVariantId: dryRunForm.trendyolProductVariantId || undefined,
          stockCardId: dryRunForm.stockCardId || undefined,
          productId: dryRunForm.productId || undefined,
          mode: 'DRY_RUN',
        },
      });
      setDryRunResult(result);
      setMessage('Dry-run tamamlandi. Urun, stok, fiyat ve siparis kaydi degismedi.');
      loadSprint1A();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dry-run tamamlanamadi.');
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
              <h2 className="text-lg font-bold text-ink">Magaza API Bilgileri</h2>
              <p className="text-sm text-slate-500">Trendyol, Hepsiburada, N11 ve Ticimax bilgilerini elden gir veya ekran goruntusunden okut.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn btn-secondary cursor-pointer">
                <Camera size={16} />
                Ekran Goruntusu Yukle
                <input className="hidden" type="file" accept="image/*" onChange={(event) => analyzeScreenshot(event.target.files?.[0])} />
              </label>
              <button className="btn btn-secondary" type="button" onClick={pasteScreenshot} disabled={loadingPlatform === 'OCR'}>
                <ClipboardPaste size={16} />
                Panodan Yapistir
              </button>
            </div>
          </div>

          {screenshotResult && (
            <div className="mt-3 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              Okunan platform: {screenshotResult.platform ? platformLabel(screenshotResult.platform) : 'Belirsiz'} / Guven skoru: %{Math.round(Number(screenshotResult.confidence || 0) * 100)}
            </div>
          )}

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {platformSettings.map((setting) => {
              const platform = setting.platform;
              const form = platformForms[platform] ?? emptyPlatformForm(platform);
              return (
                <div key={platform} className="rounded border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{setting.platformName}</h3>
                      <div className="mt-1 text-xs text-slate-500">Durum: {setting.status} / Kayitli alan: {Object.keys(setting.credentials ?? {}).length}</div>
                    </div>
                    <StatusBadge status={setting.status} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="label">Magaza Adi</span>
                      <input className="field" value={form.accountName} onChange={(event) => updatePlatformForm(platform, { accountName: event.target.value })} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="label">Supplier / Merchant ID</span>
                      <input className="field" value={form.externalAccountId} onChange={(event) => updatePlatformForm(platform, { externalAccountId: event.target.value })} />
                    </label>
                    {platformFields[platform].map((field) => (
                      <label key={field.key} className="block space-y-1.5">
                        <span className="label">{field.label}</span>
                        <input
                          className="field"
                          type={field.type ?? 'text'}
                          placeholder={setting.credentials?.[field.key]?.maskedValue ? `Kayitli: ${setting.credentials[field.key].maskedValue}` : field.label}
                          value={form.credentials[field.key] ?? ''}
                          onChange={(event) => updatePlatformCredential(platform, field.key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn btn-primary" type="button" onClick={() => savePlatform(platform)} disabled={loadingPlatform === `SAVE_${platform}`}>
                      <Save size={16} />
                      Kaydet
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => downloadTemplate(platform)}>
                      <Download size={16} />
                      Sablon Indir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Sprint 1A Kanal Altyapisi</h2>
              <p className="text-sm text-slate-500">Kanal hesaplari, credential durumu ve dry-run onizlemesi.</p>
            </div>
            <StatusBadge status="DRY_RUN" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="Satis Kanali" value={channels.length} />
            <Metric label="Kanal Hesabi" value={accounts.length} />
            <Metric label="Dry-run Isi" value={syncJobs.length} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded border border-line p-4">
              <h3 className="font-bold">Kanal Hesaplari</h3>
              <div className="mt-3 space-y-2">
                {accounts.slice(0, 6).map((account) => (
                  <div key={account.id} className="rounded border border-line p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <b>{account.name}</b>
                        <span className="ml-2 text-slate-500">{account.companyName} / {account.channelCode}</span>
                      </div>
                      <button className="btn btn-secondary text-xs" onClick={() => testAccount(account.id)} disabled={loadingPlatform === `ACCOUNT_TEST_${account.id}`}>
                        <TestTube2 size={14} />
                        Test Et
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {account.isTestMode ? 'Test modu' : 'Canli hesap'} / Credential: {account.credentialCount ? 'Var' : 'Yok'} / Mapping: {account.productMappingCount}
                    </div>
                  </div>
                ))}
                {!accounts.length && <div className="rounded border border-dashed border-line p-4 text-sm text-slate-500">Kanal hesabi bulunamadi. Migration sonrasi manuel hesap eklenebilir.</div>}
              </div>
            </div>

            <div className="rounded border border-line p-4">
              <h3 className="font-bold">Urun Dry-run</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <select className="field sm:col-span-2" value={dryRunForm.channelAccountId} onChange={(event) => setDryRunForm({ ...dryRunForm, channelAccountId: event.target.value })}>
                  <option value="">Kanal hesabi sec</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.companyName} / {account.channelCode} / {account.name}</option>)}
                </select>
                <input className="field" placeholder="Varyasyon ID" value={dryRunForm.trendyolProductVariantId} onChange={(event) => setDryRunForm({ ...dryRunForm, trendyolProductVariantId: event.target.value, stockCardId: '', productId: '' })} />
                <input className="field" placeholder="Stok karti ID" value={dryRunForm.stockCardId} onChange={(event) => setDryRunForm({ ...dryRunForm, stockCardId: event.target.value, trendyolProductVariantId: '', productId: '' })} />
                <input className="field sm:col-span-2" placeholder="Eski urun ID" value={dryRunForm.productId} onChange={(event) => setDryRunForm({ ...dryRunForm, productId: event.target.value, trendyolProductVariantId: '', stockCardId: '' })} />
              </div>
              <button className="btn btn-primary mt-3" type="button" onClick={runDryRun} disabled={loadingPlatform === 'DRY_RUN_PRODUCT' || !dryRunForm.channelAccountId}>
                <PlayCircle size={16} />
                Dry-run Calistir
              </button>
              {dryRunResult && (
                <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-50">{JSON.stringify(dryRunResult, null, 2)}</pre>
              )}
            </div>
          </div>
        </section>

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
                  <button className="btn btn-primary text-xs" onClick={() => sync(connection.platform)} disabled={loadingPlatform === connection.platform}>
                    <RefreshCw size={15} />
                    Sipariş Çek
                  </button>
                  {connection.platform === 'TRENDYOL' && (
                    <label className="btn btn-secondary cursor-pointer text-xs">
                      <Upload size={15} />
                      Excel Yükle
                      <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => importOrderExcel(connection.platform, event.target.files?.[0])} disabled={loadingPlatform === `EXCEL_${connection.platform}`} />
                    </label>
                  )}
                </div>
              </div>
            ))}
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

function date(value: unknown) {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(value))) : '-';
}

function emptyPlatformForm(platform: PlatformCode): PlatformForm {
  return {
    accountName: `${platformLabel(platform)} Magaza`,
    externalAccountId: '',
    isTestMode: true,
    credentials: {},
  };
}

function mergePlatformForms(settings: PlatformSettings[], current: Record<string, PlatformForm>, clearSecrets = false) {
  return settings.reduce<Record<string, PlatformForm>>((forms, setting) => {
    const existing = current[setting.platform] ?? emptyPlatformForm(setting.platform);
    const fields = platformFields[setting.platform] ?? [];
    const nextCredentials = clearSecrets
      ? Object.fromEntries(
          Object.entries(existing.credentials ?? {}).filter(([key]) => fields.find((field) => field.key === key)?.type !== 'password'),
        )
      : existing.credentials ?? {};
    forms[setting.platform] = {
      accountName: existing.accountName || setting.accountName || `${setting.platformName} Magaza`,
      externalAccountId: existing.externalAccountId || setting.externalAccountId || '',
      isTestMode: existing.isTestMode ?? setting.isTestMode,
      credentials: nextCredentials,
    };
    return forms;
  }, { ...current });
}

function platformLabel(platform: PlatformCode) {
  const labels: Record<PlatformCode, string> = {
    TRENDYOL: 'Trendyol',
    HEPSIBURADA: 'Hepsiburada',
    N11: 'N11',
    TICIMAX: 'Ticimax',
  };
  return labels[platform];
}
