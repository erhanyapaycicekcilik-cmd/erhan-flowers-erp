'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';
import type { CurrentUser } from '@/types';

type OrderItem = {
  id?: number;
  barcode?: string | null;
  modelCode?: string | null;
  productName?: string | null;
  variationText?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  lineTotal?: number | string | null;
  imagePath?: string | null;
  color?: string | null;
};

type OrderRow = {
  id: number;
  saleNumber: string;
  platformOrderNumber?: string | null;
  externalOrderId?: string | null;
  platform: string;
  status: string;
  integrationSyncStatus?: string | null;
  customerName: string;
  customerType?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  grandTotal?: number | string | null;
  deliveryFee?: number | string | null;
  estimatedProfit?: number | string | null;
  itemCount?: number | null;
  quantity?: number | string | null;
  orderDate?: string | null;
  createdAt?: string | null;
  deliveryDueAt?: string | null;
  cargoProvider?: string | null;
  cargoTrackingNumber?: string | null;
  deliveryStatus?: string | null;
  invoiceStatus?: string | null;
  invoiceNote?: string | null;
  cancelledAt?: string | null;
  cancelledByName?: string | null;
  internalNote?: string | null;
  items?: OrderItem[];
};

type OrderSummary = {
  total: number;
  new: number;
  processing: number;
  ready: number;
  transit: number;
  delivered: number;
  reshipment: number;
  hold: number;
  cancelled: number;
  returned: number;
  lastUpdatedAt?: string;
  source?: 'LIVE' | 'LOCAL';
};

type Filters = {
  q: string;
  customerName: string;
  saleNumber: string;
  platformOrderNumber: string;
  packageNumber: string;
  barcode: string;
  cargoCode: string;
  status: string;
  startDate: string;
  endDate: string;
  productName: string;
  modelCode: string;
  phone: string;
  platform: string;
  cargoProvider: string;
};

const emptyFilters: Filters = {
  q: '',
  customerName: '',
  saleNumber: '',
  platformOrderNumber: '',
  packageNumber: '',
  barcode: '',
  cargoCode: '',
  status: '',
  startDate: '',
  endDate: '',
  productName: '',
  modelCode: '',
  phone: '',
  platform: 'TRENDYOL',
  cargoProvider: '',
};

const tabs = [
  { key: 'all', label: 'Tüm Siparişler', statuses: [] },
  { key: 'new', label: 'Yeni', statuses: ['CONFIRMED', 'PAYMENT_PENDING'] },
  { key: 'processing', label: 'İşleme Alınanlar', statuses: ['PREPARING', 'IN_PRODUCTION'] },
  { key: 'ready', label: 'Kargoya Hazır', statuses: ['READY'] },
  { key: 'transit', label: 'Taşıma Durumunda', statuses: ['OUT_FOR_DELIVERY'] },
  { key: 'delivered', label: 'Teslim Edilenler', statuses: ['DELIVERED', 'COMPLETED'] },
  { key: 'reshipment', label: 'Yeniden Gönderimler', statuses: [] },
  { key: 'hold', label: 'Askıdaki Siparişler', statuses: [] },
  { key: 'cancelled', label: 'İptal Edilenler', statuses: ['CANCELLED'] },
  { key: 'returned', label: 'İade Edilenler', statuses: [] },
];

const statusOptions = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'PAYMENT_PENDING', label: 'Ödeme Bekliyor' },
  { value: 'CONFIRMED', label: 'Yeni' },
  { value: 'PREPARING', label: 'Hazırlanıyor' },
  { value: 'IN_PRODUCTION', label: 'Üretimde' },
  { value: 'READY', label: 'Kargoya Hazır' },
  { value: 'OUT_FOR_DELIVERY', label: 'Taşıma Durumunda' },
  { value: 'DELIVERED', label: 'Teslim Edildi' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal' },
];

const platformOptions = [
  { value: '', label: 'Tüm kanallar' },
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'N11', label: 'N11' },
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'WEBSITE', label: 'Web Site' },
  { value: 'TICIMAX', label: 'Ticimax' },
];

const statusRank: Record<string, number> = {
  DRAFT: 0,
  PAYMENT_PENDING: 1,
  CONFIRMED: 1,
  PREPARING: 2,
  IN_PRODUCTION: 2,
  READY: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  COMPLETED: 5,
  CANCELLED: 9,
};

const companyTabs = [
  { key: '', label: 'Tüm Firmalar' },
  { key: 'ERHAN', label: 'Erhan Flowers' },
  { key: 'FLORA', label: 'Florayapaycicek' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [activeTab, setActiveTab] = useState('all');
  const [activeCompany, setActiveCompany] = useState('');
  const [sort, setSort] = useState('newest');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const requestInFlight = useRef(false);

  const isOwner = currentUser?.role === 'OWNER';

  const params = useMemo(() => {
    const search = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (key !== 'status' && value.trim()) search.set(key, value.trim());
    });
    if (appliedFilters.status) search.set('status', appliedFilters.status);
    if (activeCompany) search.set('company', activeCompany);
    search.set('sort', sort);
    search.set('pageSize', '500');
    return search.toString();
  }, [appliedFilters, sort, activeCompany]);

  const summaryParams = useMemo(() => {
    const search = new URLSearchParams();
    if (appliedFilters.platform) search.set('platform', appliedFilters.platform);
    return search.toString();
  }, [appliedFilters.platform]);

  const tab = tabs.find((item) => item.key === activeTab) ?? tabs[0];
  const tabOrders = useMemo(() => {
    if (activeTab === 'returned') return orders.filter((order) => order.invoiceStatus === 'RETURNED');
    if (!tab.statuses.length) return activeTab === 'all' ? orders : [];
    return orders.filter((order) => tab.statuses.includes(order.status));
  }, [activeTab, orders, tab.statuses]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tabOrders.slice(start, start + pageSize);
  }, [page, pageSize, tabOrders]);

  const selectedOrders = useMemo(() => orders.filter((order) => selected.includes(order.id)), [orders, selected]);
  const pageSelected = pagedOrders.length > 0 && pagedOrders.every((order) => selected.includes(order.id));
  const totalPages = Math.max(1, Math.ceil(tabOrders.length / pageSize));
  const todayShipping = orders.filter((order) => isDueToday(order.deliveryDueAt) && !['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)).length;
  const delayed = orders.filter((order) => isDelayed(order.deliveryDueAt, order.status)).length;

  const tabCount = useCallback((key: string, statuses: string[]) => {
    if (summary) {
      const liveCount = {
        all: summary.total,
        new: summary.new,
        processing: summary.processing,
        ready: summary.ready,
        transit: summary.transit,
        delivered: summary.delivered,
        reshipment: summary.reshipment,
        hold: summary.hold,
        cancelled: summary.cancelled,
        returned: summary.returned,
      }[key];
      if (typeof liveCount === 'number') return liveCount;
    }
    if (key === 'all') return orders.length;
    if (key === 'returned') return orders.filter((order) => order.invoiceStatus === 'RETURNED').length;
    return statuses.length ? countByStatuses(orders, statuses) : 0;
  }, [orders, summary]);

  useEffect(() => {
    api<CurrentUser>('/auth/me').then(setCurrentUser).catch(() => null);
  }, []);

  const loadOrders = useCallback(async (options: { background?: boolean } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    const isBackground = Boolean(options.background);
    if (isBackground) setRefreshing(true);
    else setLoading(true);
    setMessage('');
    try {
      const [data, summaryData] = await Promise.all([
        api<OrderRow[]>(`/integrations/orders?${params}`),
        api<OrderSummary>(`/integrations/orders/summary?${summaryParams}`),
      ]);
      setOrders(data.map((order) => ({ ...order, items: Array.isArray(order.items) ? order.items : [] })));
      setSummary(summaryData);
      setLastUpdatedAt(new Date());
    } catch {
      setMessage('Gerçek sipariş verileri alınamadı.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [params, summaryParams]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrders({ background: true });
      }
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrders({ background: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [activeTab, pageSize, appliedFilters]);

  function applyFilters() {
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function updateStatus(orderId: number, nextStatus: string, note: string) {
    const order = orders.find((item) => item.id === orderId);
    if (!canMoveTo(order?.status, nextStatus)) {
      setMessage('İleri durumdaki sipariş geriye alınmadı.');
      return;
    }
    setBusyAction(`${orderId}:${nextStatus}`);
    setMessage('');
    try {
      await api(`/sales/${orderId}/status`, { method: 'POST', json: { status: nextStatus, note } });
      setMessage('Sipariş durumu güncellendi.');
      loadOrders({ background: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Durum güncellenemedi.');
    } finally {
      setBusyAction('');
    }
  }

  async function bulkStatus(nextStatus: string, note: string) {
    const eligible = selectedOrders.filter((order) => canMoveTo(order.status, nextStatus));
    if (!eligible.length) {
      setMessage('Seçilen siparişlerde bu durum güncellemesine uygun kayıt yok.');
      return;
    }
    setBusyAction(`bulk:${nextStatus}`);
    setMessage('');
    try {
      for (const order of eligible) {
        await api(`/sales/${order.id}/status`, { method: 'POST', json: { status: nextStatus, note } });
      }
      setMessage(`${eligible.length} sipariş güncellendi. İleri durumdaki kayıtlar geri alınmadı.`);
      loadOrders({ background: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Toplu durum güncellenemedi.');
    } finally {
      setBusyAction('');
      setBulkMenuOpen(false);
    }
  }

  function togglePageSelection() {
    const ids = pagedOrders.map((order) => order.id);
    setSelected((current) => (pageSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))));
  }

  function openPrint(ids: number[], type: 'delivery' | 'label' | 'order' = 'delivery') {
    if (!ids.length) {
      setMessage('Önce en az bir sipariş seçin.');
      return;
    }
    window.location.assign(`/orders/${ids.join(',')}/print?type=${type}`);
  }

  function exportExcel(rows = selectedOrders.length ? selectedOrders : tabOrders) {
    const headers = ['ERP Sipariş No', 'Platform No', 'Kanal', 'Müşteri', 'Telefon', 'Şehir', 'Durum', 'Kargo', 'Takip No', 'Tutar', 'Tarih'];
    const lines = [headers, ...rows.map((order) => [
      order.saleNumber,
      order.platformOrderNumber || '',
      platformLabel(order.platform),
      order.customerName,
      order.phone || '',
      [order.city, order.district].filter(Boolean).join(' / '),
      statusLabel(order.status),
      order.cargoProvider || '',
      order.cargoTrackingNumber || '',
      String(order.grandTotal ?? ''),
      date(order.orderDate || order.createdAt),
    ])];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `siparisler-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <AdminShell title="Siparişler">
      <div className="space-y-5">
        {message && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span>{message}</span>
            {!orders.length && (
              <button className="btn btn-secondary min-h-9 px-3" type="button" onClick={() => loadOrders()} disabled={loading || refreshing}>
                Tekrar Dene
              </button>
            )}
          </div>
        )}

        <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span>Son güncelleme: <b className="text-ink">{lastUpdatedAt ? date(lastUpdatedAt) : '-'}</b></span>
            <span>Otomatik yenileme: <b className="text-ink">60 saniye</b></span>
            <span>Sayaç kaynağı: <b className="text-ink">{summary?.source === 'LIVE' ? 'Trendyol canlı' : 'ERP kayıtları'}</b></span>
            {refreshing && <span className="inline-flex items-center gap-2 font-semibold text-brand"><RefreshCw className="animate-spin" size={15} /> Yenileniyor</span>}
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => loadOrders({ background: true })} disabled={loading || refreshing}>
            <RefreshCw size={16} />
            Şimdi Yenile
          </button>
        </section>

        <section className="grid gap-3 md:grid-cols-5">
          <Metric label="Toplam Sipariş" value={summary?.total ?? orders.length} />
          <Metric label="Yeni Sipariş" value={summary?.new ?? countByStatuses(orders, ['CONFIRMED', 'PAYMENT_PENDING'])} />
          <Metric label="İşleme Alınan" value={summary?.processing ?? countByStatuses(orders, ['PREPARING', 'IN_PRODUCTION'])} />
          <Metric label="Taşıma Durumunda" value={summary?.transit ?? countByStatuses(orders, ['OUT_FOR_DELIVERY'])} />
          <Metric label="Geciken Sipariş" value={delayed} danger={delayed > 0} />
        </section>

        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-ink">Çıktı Merkezi</h2>
              <p className="text-sm text-slate-500">Seçili siparişlerden tek ekranda A5 form, kargo etiketi veya A4 sipariş formu alın.</p>
            </div>
            <div className="text-sm font-semibold text-slate-600">{selected.length} sipariş seçildi</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={() => openPrint(selected, 'delivery')} disabled={!selected.length}>
              <Printer size={16} />
              Seçili A5 Çıktı
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => openPrint(selected, 'label')} disabled={!selected.length}>
              <Tag size={16} />
              Seçili Kargo Etiketi
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => openPrint(selected, 'order')} disabled={!selected.length}>
              <FileText size={16} />
              Seçili A4 Form
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => exportExcel(selectedOrders.length ? selectedOrders : tabOrders)} disabled={!tabOrders.length}>
              <FileSpreadsheet size={16} />
              Listeyi Excel İndir
            </button>
          </div>
        </section>

        <section className="panel overflow-hidden">
          {/* Şirket sekmeleri */}
          <div className="flex gap-2 px-4 pt-3 pb-0 border-b-2 border-line overflow-x-auto bg-slate-50">
            {companyTabs.map((ct) => (
              <button
                key={ct.key}
                type="button"
                onClick={() => { setActiveCompany(ct.key); setPage(1); }}
                className={`px-5 py-2.5 text-sm font-bold rounded-t-lg border-b-2 transition whitespace-nowrap -mb-0.5 ${
                  activeCompany === ct.key
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>

          {/* Platform sekmeleri */}
          <div className="flex gap-2 px-4 pt-3 pb-0 border-b border-line overflow-x-auto">
            {platformOptions.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => { setFilters((f) => ({ ...f, platform: p.value })); setAppliedFilters((f) => ({ ...f, platform: p.value })); }}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition whitespace-nowrap ${
                  appliedFilters.platform === p.value
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3">
            {tabs.map((item) => {
              const count = tabCount(item.key, item.statuses);
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold ${active ? 'bg-brand text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                >
                  {item.label} <span className={active ? 'text-white/80' : 'text-slate-500'}>{count} Paket</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 p-4">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
              <Field icon={<Search size={16} />} placeholder="ERP no, platform no, müşteri veya telefon" value={filters.q} onChange={(value) => setFilters({ ...filters, q: value })} />
              <Input placeholder="Müşteri adı" value={filters.customerName} onChange={(value) => setFilters({ ...filters, customerName: value })} />
              <Input placeholder="ERP sipariş no" value={filters.saleNumber} onChange={(value) => setFilters({ ...filters, saleNumber: value })} />
              <Input placeholder="Platform sipariş no" value={filters.platformOrderNumber} onChange={(value) => setFilters({ ...filters, platformOrderNumber: value })} />
              <Input placeholder="Paket / teslimat no" value={filters.packageNumber} onChange={(value) => setFilters({ ...filters, packageNumber: value })} />
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
              <Input placeholder="Barkod" value={filters.barcode} onChange={(value) => setFilters({ ...filters, barcode: value })} />
              <Input placeholder="Kargo kodu" value={filters.cargoCode} onChange={(value) => setFilters({ ...filters, cargoCode: value })} />
              <Select value={filters.status} options={statusOptions} onChange={(value) => setFilters({ ...filters, status: value })} />
              <Input type="date" value={filters.startDate} onChange={(value) => setFilters({ ...filters, startDate: value })} />
              <Input type="date" value={filters.endDate} onChange={(value) => setFilters({ ...filters, endDate: value })} />
              <Select value={filters.platform} options={platformOptions} onChange={(value) => setFilters({ ...filters, platform: value })} />
              <button className="btn btn-secondary whitespace-nowrap" type="button" onClick={clearFilters}>Temizle</button>
              <button className="btn btn-primary whitespace-nowrap" type="button" onClick={applyFilters}>Filtrele</button>
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              <Input placeholder="Ürün adı" value={filters.productName} onChange={(value) => setFilters({ ...filters, productName: value })} />
              <Input placeholder="Model kodu" value={filters.modelCode} onChange={(value) => setFilters({ ...filters, modelCode: value })} />
              <Input placeholder="Telefon" value={filters.phone} onChange={(value) => setFilters({ ...filters, phone: value })} />
              <Input placeholder="Kargo firması" value={filters.cargoProvider} onChange={(value) => setFilters({ ...filters, cargoProvider: value })} />
            </div>
          </div>
        </section>

        <section className="panel overflow-visible">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
                <input type="checkbox" checked={pageSelected} onChange={togglePageSelection} />
                Tümünü Seç
              </label>
              <div className="text-sm text-slate-600">{selected.length} kayıt seçildi</div>
              <div className="relative">
                <button className="btn btn-secondary" type="button" onClick={() => setBulkMenuOpen((open) => !open)}>
                  Toplu İşlemler <ChevronDown size={16} />
                </button>
                {bulkMenuOpen && (
                  <div className="absolute left-0 top-12 z-20 w-72 rounded-md border border-line bg-white p-2 shadow-xl">
                    <MenuButton onClick={() => bulkStatus('PREPARING', 'Toplu işleme alındı.')} disabled={!selected.length || busyAction === 'bulk:PREPARING'}>Seçilenleri İşleme Al</MenuButton>
                    <MenuButton onClick={() => openPrint(selected, 'delivery')} disabled={!selected.length}>A5 Sipariş Çıktısı Al</MenuButton>
                    <MenuButton onClick={() => openPrint(selected, 'label')} disabled={!selected.length}>Kargo Etiketi Al</MenuButton>
                    <MenuButton onClick={() => openPrint(selected, 'order')} disabled={!selected.length}>A4 Sipariş Formu Al</MenuButton>
                    <MenuButton onClick={() => bulkStatus('READY', 'Toplu kargoya hazır yapıldı.')} disabled={!selected.length || busyAction === 'bulk:READY'}>Kargoya Hazır Yap</MenuButton>
                    <MenuButton onClick={() => bulkStatus('OUT_FOR_DELIVERY', 'Toplu taşıma durumuna alındı.')} disabled={!selected.length || busyAction === 'bulk:OUT_FOR_DELIVERY'}>Durumu Güncelle</MenuButton>
                    <MenuButton disabled>Personel Ata</MenuButton>
                    <MenuButton disabled>Üretim Görevi Oluştur</MenuButton>
                    <MenuButton onClick={() => exportExcel()} disabled={!tabOrders.length}>Excel'e Aktar</MenuButton>
                    <MenuButton disabled>Askıya Al</MenuButton>
                    <MenuButton disabled>İptal Et</MenuButton>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sort} options={[{ value: 'newest', label: 'Sipariş Tarihi: Yeniden Eskiye' }, { value: 'oldest', label: 'Eskiden Yeniye' }, { value: 'due', label: 'Son Çıkış Süresi' }]} onChange={setSort} compact />
              <Select value={String(pageSize)} options={[25, 50, 100].map((value) => ({ value: String(value), label: `${value} kayıt` }))} onChange={(value) => setPageSize(Number(value))} compact />
              <button className="btn btn-secondary" type="button" onClick={() => exportExcel(tabOrders)}>
                <FileSpreadsheet size={16} />
                Excel ile İndir
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => loadOrders({ background: true })} disabled={loading || refreshing}>
                <RefreshCw size={16} />
                Yenile
              </button>
            </div>
          </div>

          <div className="divide-y divide-line">
            {pagedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isOwner={isOwner}
                selected={selected.includes(order.id)}
                busyAction={busyAction}
                onSelect={(checked) => setSelected((current) => (checked ? [...current, order.id] : current.filter((id) => id !== order.id)))}
                onDetail={() => setSelectedOrderId(order.id)}
                onPrint={() => openPrint([order.id], 'delivery')}
                onCargoLabel={() => openCargoLabel(order.id)}
                onProcessing={() => updateStatus(order.id, 'PREPARING', 'İşleme alındı.')}
                onReady={() => updateStatus(order.id, 'READY', 'Kargoya hazır yapıldı.')}
              />
            ))}
            {!loading && !pagedOrders.length && !message && <div className="p-10 text-center text-sm text-slate-500">Henüz aktarılmış gerçek sipariş bulunmuyor.</div>}
            {loading && <div className="p-10 text-center text-sm text-slate-500">Siparişler yükleniyor...</div>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm text-slate-600">
            <div>{tabOrders.length} ERP kaydı listeleniyor; canlı sayaç {tabCount(activeTab, tab.statuses).toLocaleString('tr-TR')} paket</div>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Önceki</button>
              <span className="font-semibold text-ink">{page} / {totalPages}</span>
              <button className="btn btn-secondary" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Sonraki</button>
            </div>
          </div>
        </section>

        {selectedOrderId && (
          <OrderDetailModal order={orders.find((order) => order.id === selectedOrderId) ?? null} isOwner={isOwner} onClose={() => setSelectedOrderId(null)} onPrint={() => openPrint([selectedOrderId], 'delivery')} />
        )}
      </div>
    </AdminShell>
  );
}

function OrderCard({
  order,
  isOwner,
  selected,
  busyAction,
  onSelect,
  onDetail,
  onPrint,
  onCargoLabel,
  onProcessing,
  onReady,
}: {
  order: OrderRow;
  isOwner: boolean;
  selected: boolean;
  busyAction: string;
  onSelect: (checked: boolean) => void;
  onDetail: () => void;
  onPrint: () => void;
  onCargoLabel: () => void;
  onProcessing: () => void;
  onReady: () => void;
}) {
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    <article className="grid gap-4 p-4 text-sm xl:grid-cols-[32px_1.1fr_1fr_1.5fr_80px_1fr_1fr_1fr_1fr_1.2fr]">
      <div><input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} /></div>
      <Cell title="Sipariş Bilgileri">
        <div className="font-black text-ink">{order.saleNumber}</div>
        {isOwner && <div className="text-xs text-slate-500">Platform: {order.platformOrderNumber || '-'}</div>}
        <div className="text-xs text-slate-500">Paket: {order.externalOrderId || '-'}</div>
        <div className="mt-2 text-xs">Sipariş: {date(order.orderDate || order.createdAt)}</div>
        <div className="text-xs">Son çıkış: {date(order.deliveryDueAt)}</div>
        <div className={`mt-1 text-xs font-semibold ${isDelayed(order.deliveryDueAt, order.status) ? 'text-red-700' : 'text-emerald-700'}`}>{remainingText(order.deliveryDueAt, order.status)}</div>
      </Cell>
      <Cell title="Müşteri">
        <div className="font-semibold text-ink">{order.customerName || '-'}</div>
        <div className="text-xs text-slate-500">{order.phone || '-'}</div>
        <div className="text-xs text-slate-500">{[order.city, order.district].filter(Boolean).join(' / ') || '-'}</div>
        <div className="text-xs text-slate-500">{customerTypeLabel(order.customerType)}</div>
      </Cell>
      <Cell title="Ürün Bilgileri">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div className="grid grid-cols-[44px_1fr] gap-2" key={item.id ?? index}>
              <ProductImage src={item.imagePath} />
              <div>
                <div className="font-semibold leading-snug text-ink">{item.productName || '-'}</div>
                <div className="text-xs text-slate-500">Model: {item.modelCode || '-'}</div>
                <div className="text-xs text-slate-500">Barkod: {item.barcode || '-'}</div>
                <div className="text-xs text-slate-500">{[item.color, item.variationText].filter(Boolean).join(' / ') || '-'}</div>
              </div>
            </div>
          ))}
          {!items.length && <div className="text-xs text-slate-500">Ürün bilgisi yok</div>}
        </div>
      </Cell>
      <Cell title="Adet"><div className="text-lg font-black">{Number(order.quantity ?? order.itemCount ?? 0).toLocaleString('tr-TR')}</div></Cell>
      <Cell title="Satış Özeti">
        {isOwner ? (
          <>
            <div className="font-black">{money(order.grandTotal)}</div>
            <div className="text-xs text-slate-500">Kanal: {platformLabel(order.platform)}</div>
            <div className="text-xs text-emerald-700">Tahmini kâr: {money(order.estimatedProfit)}</div>
          </>
        ) : <div className="text-xs text-slate-500">Personel görünümünde gizli</div>}
      </Cell>
      <Cell title="Kargo">
        <div className="font-semibold">{order.cargoProvider || '-'}</div>
        <div className="text-xs text-slate-500">Kod: {order.cargoTrackingNumber || '-'}</div>
        <div className="text-xs text-slate-500">Durum: {deliveryStatusLabel(order.deliveryStatus)}</div>
        <button className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold" type="button" onClick={onCargoLabel}>
          <Tag size={14} /> Etiket
        </button>
      </Cell>
      <Cell title="Fatura">
        <div className="font-semibold">{invoiceStatusLabel(order.invoiceStatus)}</div>
        <div className="text-xs text-slate-500">No: -</div>
        <button className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold" disabled type="button">İşlemler</button>
      </Cell>
      <Cell title="Durum">
        <StatusPill status={order.status} />
        {order.status === 'CANCELLED' && (
          <div className="mt-2 text-xs text-slate-500">
            <div>İptal: {date(order.cancelledAt)}</div>
            <div>{order.cancelledByName || '-'}</div>
            <div>{cancelReason(order.internalNote)}</div>
          </div>
        )}
      </Cell>
      <Cell title="İşlemler">
        <div className="grid gap-2">
          <button className="btn btn-secondary min-h-9 px-3 text-xs" type="button" onClick={onDetail}><Eye size={15} /> Detay</button>
          <button className="btn btn-secondary min-h-9 px-3 text-xs" type="button" onClick={onPrint}><Printer size={15} /> A5 Çıktı</button>
          <button className="btn btn-primary min-h-9 px-3 text-xs" type="button" onClick={onProcessing} disabled={!canMoveTo(order.status, 'PREPARING') || busyAction === `${order.id}:PREPARING`}><FileText size={15} /> İşleme Al</button>
          <button className="btn btn-secondary min-h-9 px-3 text-xs" type="button" onClick={onReady} disabled={!canMoveTo(order.status, 'READY') || busyAction === `${order.id}:READY`}><PackageCheck size={15} /> Hazır Yap</button>
        </div>
      </Cell>
    </article>
  );
}

function OrderDetailModal({ order, isOwner, onClose, onPrint }: { order: OrderRow | null; isOwner: boolean; onClose: () => void; onPrint: () => void }) {
  const items = order?.items ?? [];
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 p-4" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-4xl flex-col rounded-md bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Sipariş detayı</div>
            <h2 className="mt-1 text-xl font-black">{order?.saleNumber ?? '-'}</h2>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Kapat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!order ? <div className="text-sm text-slate-500">Detay yükleniyor...</div> : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Müşteri" value={order.customerName} />
                <Info label="Telefon" value={order.phone || '-'} />
                <Info label="Satış Kanalı" value={platformLabel(order.platform)} />
                {isOwner && <Info label="Platform No" value={order.platformOrderNumber || '-'} />}
                <Info label="Kargo" value={[order.cargoProvider, order.cargoTrackingNumber].filter(Boolean).join(' / ') || '-'} />
                <Info label="Fatura" value={invoiceStatusLabel(order.invoiceStatus)} />
              </div>
              <div className="overflow-hidden rounded-md border border-line">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-slate-600"><th className="p-3">Ürün</th><th className="p-3">Model</th><th className="p-3">Barkod</th><th className="p-3">Adet</th><th className="p-3">Varyant</th></tr></thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id ?? index} className="border-t border-line">
                        <td className="p-3 font-semibold">{item.productName || '-'}</td>
                        <td className="p-3">{item.modelCode || '-'}</td>
                        <td className="p-3">{item.barcode || '-'}</td>
                        <td className="p-3">{Number(item.quantity || 0)}</td>
                        <td className="p-3">{item.variationText || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-line p-5">
          <button className="btn btn-primary" type="button" onClick={onPrint}><Printer size={16} /> A5 Sipariş Çıktısı Al</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return <div className="panel p-4"><div className="text-xs font-semibold uppercase text-slate-500">{label}</div><div className={`mt-2 text-2xl font-black ${danger ? 'text-red-700' : 'text-ink'}`}>{value.toLocaleString('tr-TR')}</div></div>;
}

function Cell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="min-w-0"><div className="mb-1 text-[11px] font-bold uppercase text-slate-500">{title}</div>{children}</div>;
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <input className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

function Field({ icon, value, onChange, placeholder }: { icon: React.ReactNode; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span><input className="field pl-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function Select({ value, options, onChange, compact }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; compact?: boolean }) {
  return <select className={`field ${compact ? 'min-w-48' : ''}`} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

function MenuButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400" type="button" onClick={onClick} disabled={disabled}>{children}</button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line p-3"><div className="text-xs font-semibold uppercase text-slate-500">{label}</div><div className="mt-1 font-semibold text-ink">{value || '-'}</div></div>;
}

function StatusPill({ status }: { status: string }) {
  const tone = ['READY', 'DELIVERED', 'COMPLETED'].includes(status) ? 'bg-emerald-50 text-emerald-700' : ['CONFIRMED', 'PAYMENT_PENDING', 'PREPARING', 'IN_PRODUCTION'].includes(status) ? 'bg-amber-50 text-amber-700' : status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{statusLabel(status)}</span>;
}

function ProductImage({ src }: { src?: string | null }) {
  if (!src) return <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-400"><CheckCircle2 size={16} /></div>;
  return <img className="h-11 w-11 rounded-md border border-line object-cover" src={apiFileUrl(src)} alt="" />;
}

function openCargoLabel(orderId?: number) {
  if (!orderId) return;
  window.location.assign(`/orders/${orderId}/print?type=label`);
}

function openCargoLabels(orderIds: number[]) {
  if (!orderIds.length) return;
  window.location.assign(`/orders/${orderIds.join(',')}/print?type=label`);
}

function canMoveTo(currentStatus = '', nextStatus: string) {
  if (currentStatus === 'CANCELLED') return false;
  return (statusRank[currentStatus] ?? 0) <= (statusRank[nextStatus] ?? 0);
}

function countByStatuses(rows: OrderRow[], statuses: string[]) {
  return rows.filter((row) => statuses.includes(row.status)).length;
}

function isDueToday(value?: string | null) {
  if (!value) return false;
  const dateValue = new Date(value);
  const today = new Date();
  return dateValue.toDateString() === today.toDateString();
}

function isDelayed(value?: string | null, status = '') {
  if (!value || ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) return false;
  return new Date(value).getTime() < startOfToday().getTime();
}

function startOfToday() {
  const dateValue = new Date();
  dateValue.setHours(0, 0, 0, 0);
  return dateValue;
}

function remainingText(value?: string | null, status = '') {
  if (!value) return 'Son çıkış tarihi yok';
  if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) return 'Operasyon kapandı';
  const diff = new Date(value).getTime() - Date.now();
  const hours = Math.ceil(diff / 36e5);
  if (hours < 0) return `${Math.abs(hours)} saat gecikti`;
  if (hours < 24) return `${hours} saat kaldı`;
  return `${Math.ceil(hours / 24)} gün kaldı`;
}

function statusLabel(status: string) {
  return ({ DRAFT: 'Taslak', PAYMENT_PENDING: 'Ödeme Bekliyor', CONFIRMED: 'Yeni', PREPARING: 'Hazırlanıyor', IN_PRODUCTION: 'Üretimde', READY: 'Kargoya Hazır', OUT_FOR_DELIVERY: 'Taşıma Durumunda', DELIVERED: 'Teslim Edildi', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal' } as Record<string, string>)[status] ?? status;
}

function deliveryStatusLabel(status?: string | null) {
  return ({ WAITING: 'Bekliyor', PLANNED: 'Planlandı', PREPARING: 'Hazırlanıyor', OUT_FOR_DELIVERY: 'Dağıtımda', DELIVERED: 'Teslim Edildi', CANCELLED: 'İptal' } as Record<string, string>)[status || ''] ?? (status || '-');
}

function invoiceStatusLabel(status?: string | null) {
  return ({ WAITING: 'Bekliyor', E_ARCHIVE: 'E-Arşiv', E_INVOICE: 'E-Fatura', ISSUED: 'Kesildi', CANCELLED: 'İptal', RETURNED: 'İade' } as Record<string, string>)[status || ''] ?? (status || '-');
}

function platformLabel(platform: string) {
  return ({ TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11', AMAZON: 'Amazon', WEBSITE: 'Web Site', TICIMAX: 'Ticimax', STORE: 'Mağaza', PHONE: 'Telefon', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram' } as Record<string, string>)[platform] ?? (platform || '-');
}

function customerTypeLabel(value?: string | null) {
  return ({ INDIVIDUAL: 'Bireysel', CORPORATE: 'Kurumsal' } as Record<string, string>)[value || ''] ?? (value || '-');
}

function cancelReason(value?: string | null) {
  const text = String(value ?? '');
  const match = text.match(/İptal:\s*(.+)$/m);
  return match?.[1] || '-';
}

function money(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function date(value: unknown) {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(value))) : '-';
}
