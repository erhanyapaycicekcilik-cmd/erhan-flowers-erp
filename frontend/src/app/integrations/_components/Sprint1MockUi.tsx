'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Package,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Tag,
  TestTube2,
  Truck,
  Wifi,
  X,
} from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';

type Tone = 'slate' | 'emerald' | 'amber' | 'red' | 'sky' | 'violet';

type TabConfig<T extends string> = {
  label: T;
  match: (row: IntegrationRow) => boolean;
};

type IntegrationRow = {
  orderNo?: string;
  platform?: string;
  customer?: string;
  product?: string;
  cargoCompany?: string;
  trackingNo?: string;
  packageStatus?: string;
  invoiceType?: string;
  amount?: number;
  invoiceStatus?: string;
  invoiceNo?: string;
  date?: string;
  channel?: string;
  account?: string;
  actionType?: string;
  lastSync?: string;
  status?: string;
  processed?: number;
  success?: number;
  failed?: number;
  duration?: string;
  errorType?: string;
  record?: string;
  description?: string;
  retryCount?: number;
  apiStatus?: string;
  webhookStatus?: string;
  lastSuccess?: string;
  lastError?: string;
  responseTime?: string;
};

type Column = {
  key: keyof IntegrationRow | 'print' | 'actions';
  label: string;
  render?: (row: IntegrationRow, notify: (action: string) => void) => ReactNode;
};

const shippingRows: IntegrationRow[] = [];
const invoiceRows: IntegrationRow[] = [];
const syncRows: IntegrationRow[] = [];
const errorRows: IntegrationRow[] = [];
const statusRows: IntegrationRow[] = [];
const accounts: Array<{ channel: string; store: string; connected: boolean; active: boolean; lastSync: string; tone: string }> = [];

const mainLinks = [
  { href: '/integrations/orders', title: 'Tum Siparisler', description: 'Pazaryeri siparislerini tek listede izle.', icon: Package, tone: 'sky' as Tone },
  { href: '/integrations/shipping', title: 'Kargo Yonetimi', description: 'Etiket, barkod ve paket durumlarini yonet.', icon: Truck, tone: 'emerald' as Tone },
  { href: '/integrations/invoices', title: 'Fatura Yonetimi', description: 'Fatura bekleyenleri, hatalari ve PDF islemlerini takip et.', icon: ReceiptText, tone: 'violet' as Tone },
  { href: '/integrations/sync', title: 'Senkronizasyon Merkezi', description: 'Urun, stok, fiyat ve siparis senkronlarini izle.', icon: RefreshCw, tone: 'amber' as Tone },
  { href: '/integrations/errors', title: 'Hata Merkezi', description: 'Kanal hatalarini yeniden dene veya cozuldu isaretle.', icon: AlertCircle, tone: 'red' as Tone },
  { href: '/integrations/accounts', title: 'Pazaryeri Hesaplari', description: 'Magaza durumlarini ve test aksiyonlarini gor.', icon: Settings, tone: 'slate' as Tone },
  { href: '/integrations/status', title: 'API Durumu', description: 'API ve webhook saglik durumunu izle.', icon: Wifi, tone: 'emerald' as Tone },
];

const shippingColumns: Column[] = [
  { key: 'orderNo', label: 'Siparis no' },
  { key: 'platform', label: 'Platform', render: (row) => <PlatformPill value={row.platform} /> },
  { key: 'customer', label: 'Musteri' },
  { key: 'product', label: 'Urun' },
  { key: 'cargoCompany', label: 'Kargo firmasi' },
  { key: 'trackingNo', label: 'Takip numarasi' },
  { key: 'packageStatus', label: 'Paket durumu', render: (row) => <StatusBadge status={row.packageStatus} /> },
  { key: 'print', label: 'Yazdir', render: (row, notify) => <ActionButton icon={Printer} label="Yazdir" onClick={() => notify(`Yazdir: ${row.orderNo}`)} /> },
  { key: 'actions', label: 'Islemler', render: (row, notify) => <ActionButton icon={Eye} label="Detay" onClick={() => notify(`Detay: ${row.orderNo}`)} /> },
];

const invoiceColumns: Column[] = [
  { key: 'orderNo', label: 'Siparis no' },
  { key: 'platform', label: 'Platform', render: (row) => <PlatformPill value={row.platform} /> },
  { key: 'customer', label: 'Musteri' },
  { key: 'invoiceType', label: 'Fatura tipi' },
  { key: 'amount', label: 'Tutar', render: (row) => money(row.amount) },
  { key: 'invoiceStatus', label: 'Fatura durumu', render: (row) => <StatusBadge status={row.invoiceStatus} /> },
  { key: 'invoiceNo', label: 'Fatura no' },
  { key: 'date', label: 'Tarih' },
  { key: 'actions', label: 'Islemler', render: (row, notify) => <ActionButton icon={Eye} label="Detay" onClick={() => notify(`Fatura detayi: ${row.orderNo}`)} /> },
];

const syncColumns: Column[] = [
  { key: 'channel', label: 'Kanal', render: (row) => <PlatformPill value={row.channel} /> },
  { key: 'account', label: 'Hesap' },
  { key: 'actionType', label: 'Islem turu' },
  { key: 'lastSync', label: 'Son senkronizasyon' },
  { key: 'status', label: 'Durum', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'processed', label: 'Islenen kayit' },
  { key: 'success', label: 'Basarili' },
  { key: 'failed', label: 'Hatali' },
  { key: 'duration', label: 'Sure' },
  { key: 'actions', label: 'Islemler', render: (row, notify) => <ActionButton icon={RefreshCw} label="Calistir" onClick={() => notify(`Senkronizasyon: ${row.channel}`)} /> },
];

const errorColumns: Column[] = [
  { key: 'channel', label: 'Kanal', render: (row) => <PlatformPill value={row.channel} /> },
  { key: 'errorType', label: 'Hata tipi' },
  { key: 'record', label: 'Kayit' },
  { key: 'description', label: 'Aciklama' },
  { key: 'date', label: 'Tarih' },
  { key: 'retryCount', label: 'Tekrar sayisi' },
  { key: 'status', label: 'Durum', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'actions', label: 'Islemler', render: (row, notify) => <ActionButton icon={Eye} label="Detay" onClick={() => notify(`Hata detayi: ${row.record}`)} /> },
];

const statusColumns: Column[] = [
  { key: 'channel', label: 'Kanal', render: (row) => <PlatformPill value={row.channel} /> },
  { key: 'apiStatus', label: 'API durumu' },
  { key: 'webhookStatus', label: 'Webhook durumu' },
  { key: 'lastSuccess', label: 'Son basarili baglanti' },
  { key: 'lastError', label: 'Son hata' },
  { key: 'responseTime', label: 'Ortalama cevap suresi' },
  { key: 'status', label: 'Durum rozeti', render: (row) => <StatusBadge status={row.status} /> },
];

export function IntegrationNavigationCards() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {mainLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="panel block p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start gap-3">
              <IconBox icon={Icon} tone={item.tone} />
              <div className="min-w-0">
                <div className="font-bold text-ink">{item.title}</div>
                <div className="mt-1 text-sm leading-5 text-slate-500">{item.description}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

export function ShippingPage() {
  return (
    <TabbedTablePage
      title="Kargo Yonetimi"
      current="Kargo Yonetimi"
      rows={shippingRows}
      columns={shippingColumns}
      tabs={[
        { label: 'Kargoya Hazir', match: (row) => row.packageStatus === 'Kargoya Hazir' },
        { label: 'Kargoya Verildi', match: (row) => row.packageStatus === 'Kargoya Verildi' },
        { label: 'Teslim Edildi', match: (row) => row.packageStatus === 'Teslim Edildi' },
        { label: 'Iade', match: (row) => row.packageStatus === 'Iade' },
      ]}
      actions={[
        { label: 'Toplu Etiket', icon: Tag },
        { label: 'Toplu Barkod', icon: ClipboardCheck },
        { label: 'Toplu Yazdir', icon: Printer },
      ]}
      minWidth="1180px"
    />
  );
}

export function InvoicesPage() {
  return (
    <TabbedTablePage
      title="Fatura Yonetimi"
      current="Fatura Yonetimi"
      rows={invoiceRows}
      columns={invoiceColumns}
      tabs={[
        { label: 'Fatura Bekleyen', match: (row) => row.invoiceStatus === 'Fatura Bekleyen' },
        { label: 'Faturalandi', match: (row) => row.invoiceStatus === 'Faturalandi' },
        { label: 'Hatali', match: (row) => row.invoiceStatus === 'Hatali' },
        { label: 'Iptal', match: (row) => row.invoiceStatus === 'Iptal' },
      ]}
      actions={[
        { label: 'Toplu Fatura Olustur', icon: ReceiptText },
        { label: 'PDF Goruntule', icon: FileText },
        { label: 'Yeniden Dene', icon: RotateCcw },
      ]}
      minWidth="1120px"
    />
  );
}

export function SyncPage() {
  return (
    <SimpleTablePage
      title="Senkronizasyon Merkezi"
      current="Senkronizasyon Merkezi"
      rows={syncRows}
      columns={syncColumns}
      actions={[
        { label: 'Urun Senkronize Et', icon: Package },
        { label: 'Stok Senkronize Et', icon: ClipboardCheck },
        { label: 'Fiyat Senkronize Et', icon: Tag },
        { label: 'Siparisleri Cek', icon: RefreshCw },
      ]}
      minWidth="1220px"
    />
  );
}

export function ErrorsPage() {
  return (
    <SimpleTablePage
      title="Hata Merkezi"
      current="Hata Merkezi"
      rows={errorRows}
      columns={errorColumns}
      actions={[
        { label: 'Yeniden Dene', icon: RotateCcw },
        { label: 'Cozuldu Isaretle', icon: CheckCircle2 },
        { label: 'Detay Gor', icon: Eye },
      ]}
      minWidth="1080px"
    />
  );
}

export function AccountsPage() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <AdminShell title="Pazaryeri Hesaplari">
      <div className="space-y-5">
        <Notice value={notice} onClose={() => setNotice(null)} />
        <PageTop current="Pazaryeri Hesaplari" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <div key={account.channel} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-md ${accountTone(account.tone)}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-ink">{account.channel}</div>
                    <div className="text-sm text-slate-500">{account.store}</div>
                  </div>
                </div>
                <StatusBadge status={account.connected ? 'Bagli' : 'Bagli Degil'} />
              </div>

              <div className="mt-5 grid gap-3 text-sm">
                <InfoLine label="Baglanti durumu" value={account.connected ? 'Bagli' : 'Kurulum bekliyor'} />
                <InfoLine label="Magaza adi" value={account.store} />
                <InfoLine label="Son senkronizasyon" value={account.lastSync} />
                <InfoLine label="Aktif/Pasif" value={account.active ? 'Aktif' : 'Pasif'} />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button className="btn btn-secondary justify-center" type="button" onClick={() => setNotice(`${account.channel} ayarlari acilamadi.`)}>
                  <Settings size={16} />
                  Ayarlar
                </button>
                <button className="btn btn-primary justify-center" type="button" onClick={() => setNotice(`${account.channel} test islemi baslatilamadi.`)}>
                  <TestTube2 size={16} />
                  Test Et
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}

export function StatusPage() {
  return (
    <SimpleTablePage
      title="API Durumu"
      current="API Durumu"
      rows={statusRows}
      columns={statusColumns}
      actions={[]}
      minWidth="980px"
    />
  );
}

function TabbedTablePage<T extends string>({
  title,
  current,
  rows,
  columns,
  tabs,
  actions,
  minWidth,
}: {
  title: string;
  current: string;
  rows: IntegrationRow[];
  columns: Column[];
  tabs: TabConfig<T>[];
  actions: Array<{ label: string; icon: LucideIcon }>;
  minWidth: string;
}) {
  const [activeTab, setActiveTab] = useState<T>(tabs[0].label);
  const filteredRows = useMemo(() => rows.filter((row) => tabs.find((tab) => tab.label === activeTab)?.match(row)), [activeTab, rows, tabs]);

  return (
    <SimpleTablePage
      title={title}
      current={current}
      rows={filteredRows}
      columns={columns}
      actions={actions}
      minWidth={minWidth}
      tabs={
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${activeTab === tab.label ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              onClick={() => setActiveTab(tab.label)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    />
  );
}

function SimpleTablePage({
  title,
  current,
  rows,
  columns,
  actions,
  minWidth,
  tabs,
}: {
  title: string;
  current: string;
  rows: IntegrationRow[];
  columns: Column[];
  actions: Array<{ label: string; icon: LucideIcon }>;
  minWidth: string;
  tabs?: ReactNode;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const notify = (action: string) => setNotice(`${action} icin gercek veri baglantisi bulunamadi.`);

  return (
    <AdminShell title={title}>
      <div className="space-y-5">
        <Notice value={notice} onClose={() => setNotice(null)} />
        <PageTop current={current} />

        <section className="panel p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm text-slate-500">{rows.length} gercek kayit listeleniyor</div>
              {tabs && <div className="mt-3">{tabs}</div>}
            </div>
            {actions.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
                {actions.map(({ label, icon: Icon }) => (
                  <button key={label} className="btn btn-secondary justify-center" type="button" onClick={() => notify(label)}>
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth }}>
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-3">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.orderNo ?? row.channel ?? row.record}-${index}`} className="border-t border-line align-top">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        {column.render ? column.render(row, notify) : formatCell(row[column.key as keyof IntegrationRow])}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr className="border-t border-line">
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>Bu sekmede aktarilmis gercek kayit yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function PageTop({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-slate-500">Entegrasyon Merkezi / {current}</div>
      <Link className="btn btn-secondary" href="/integrations">Entegrasyon Merkezi</Link>
    </div>
  );
}

function Notice({ value, onClose }: { value: string | null; onClose: () => void }) {
  if (!value) return null;
  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
      <span className="leading-5">{value}</span>
      <button className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100" type="button" aria-label="Bildirimi kapat" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

function IconBox({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const tones: Record<Tone, string> = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
      <Icon size={20} />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className="btn btn-secondary min-h-9 px-3 text-xs" type="button" onClick={onClick}>
      <Icon size={15} />
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status ?? '-';
  const ok = ['Kargoya Hazir', 'Teslim Edildi', 'Faturalandi', 'Basarili', 'Cozuldu', 'Saglikli', 'Bagli', 'Aktif'].includes(value);
  const warning = ['Kargoya Verildi', 'Fatura Bekleyen', 'Isleniyor', 'Uyari', 'Inceleniyor', 'Dikkat', 'Yavas', 'Beklemede'].includes(value);
  const tone = ok ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

function PlatformPill({ value }: { value?: string }) {
  const tones: Record<string, string> = {
    Trendyol: 'bg-orange-50 text-orange-700',
    Hepsiburada: 'bg-amber-50 text-amber-700',
    N11: 'bg-violet-50 text-violet-700',
    Amazon: 'bg-sky-50 text-sky-700',
    Site: 'bg-emerald-50 text-emerald-700',
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tones[value ?? ''] ?? 'bg-slate-100 text-slate-700'}`}>{value ?? '-'}</span>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function accountTone(tone: string) {
  const tones: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return tones[tone] ?? 'bg-slate-100 text-slate-700';
}

function formatCell(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'number') return value.toLocaleString('tr-TR');
  return String(value);
}

function money(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}
