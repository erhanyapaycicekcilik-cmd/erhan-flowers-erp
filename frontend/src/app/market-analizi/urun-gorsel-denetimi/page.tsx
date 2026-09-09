'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileImage,
  ListFilter,
  Loader2,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react';

type AuditStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type Recommendation = 'KEEP' | 'IMPROVE' | 'REBUILD';
type RequirementStatus = 'PRESENT' | 'MISSING' | 'NEEDS_IMPROVEMENT';

type Audit = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  erpDetailUrl: string | null;
  salesPageUrl: string | null;
  channel: string;
  status: AuditStatus;
  imageCount: number;
  overallVisualScore: number;
  mainImageScore: number;
  realismScore: number;
  lifestyleScore: number;
  detailScore: number;
  measurementScore: number;
  consistencyScore: number;
  commercialScore: number;
  changePriorityScore: number;
  priorityClass: string;
  recommendation: Recommendation;
  publishState: string;
  mainImageStatus: RequirementStatus;
  lifestyleStatus: RequirementStatus;
  measurementStatus: RequirementStatus;
  closeUpStatus: RequirementStatus;
  stockQuantity: number;
  price: number;
  aiSummary: string;
  aiIssues: string[];
  aiRecommendation: string;
  recommendedSet: string[];
  missingMediaTypes: string[];
  images: Array<{ id: string; imageUrl: string; imageType: string; score: number }>;
  issues: Array<{ id: string; severity: string; title: string; description: string }>;
  history: Array<{ analyzedAt: string; overallVisualScore: number; changePriorityScore: number; recommendation: Recommendation }>;
  salesSignals: { salesQuantity?: number | null; revenue?: number | null; views?: number | null; conversionRate?: number | null; ratingAverage?: number | null; ratingCount?: number | null };
  analyzedAt: string | null;
};

type AuditListResponse = {
  items: Audit[];
  total: number;
  summary: Summary;
  filters: { channels: string[]; recommendations: Recommendation[]; statuses: AuditStatus[]; missingMediaTypes: string[]; categories: string[]; brands: string[] };
};

type Summary = {
  visualHealth: number;
  urgentChange: number;
  shouldImprove: number;
  goodCondition: number;
  waitingAnalysis: number;
  total: number;
};

const recommendationLabel: Record<Recommendation, string> = {
  KEEP: 'Kalsın',
  IMPROVE: 'Düzeltilsin',
  REBUILD: 'Baştan Hazırlansın',
};

const scoreRows: Array<[keyof Audit, string]> = [
  ['mainImageScore', 'Ana Görsel'],
  ['realismScore', 'Gerçeklik'],
  ['lifestyleScore', 'Lifestyle'],
  ['detailScore', 'Detay'],
  ['measurementScore', 'Ölçü'],
  ['consistencyScore', 'Tutarlılık'],
  ['commercialScore', 'Ticari Sunum'],
];

export default function ProductMediaAuditPage() {
  const [data, setData] = useState<AuditListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('TRENDYOL');
  const [recommendation, setRecommendation] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [missingMediaType, setMissingMediaType] = useState('');
  const [sort, setSort] = useState('priority_desc');
  const [selected, setSelected] = useState<string[]>([]);
  const [analyzingId, setAnalyzingId] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [detail, setDetail] = useState<Audit | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (channel) params.set('channel', channel);
    if (recommendation) params.set('recommendation', recommendation);
    if (priority) params.set('priority', priority);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (missingMediaType) params.set('missingMediaType', missingMediaType);
    if (sort) params.set('sort', sort);
    return params.toString();
  }, [category, channel, missingMediaType, priority, recommendation, search, sort, status]);

  function load() {
    setLoading(true);
    setError('');
    api<AuditListResponse>(`/market-intelligence/product-media-audits${query ? `?${query}` : ''}`)
      .then((result) => {
        setData(result);
        setSelected((current) => current.filter((id) => result.items.some((audit) => audit.id === id)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ürün görsel denetimleri alınamadı.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [query]);

  async function analyzeOne(id: string) {
    setAnalyzingId(id);
    setError('');
    try {
      const updated = await api<Audit>(`/market-intelligence/product-media-audits/${id}/analyze`, { method: 'POST', json: {} });
      setData((current) => current ? { ...current, items: current.items.map((audit) => audit.id === id ? updated : audit) } : current);
      if (detail?.id === id) setDetail(updated);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz başlatılamadı.');
    } finally {
      setAnalyzingId('');
    }
  }

  async function analyzeBulk(ids?: string[]) {
    setBulkRunning(true);
    setError('');
    try {
      if (ids?.length) {
        for (const id of ids) await api(`/market-intelligence/product-media-audits/${id}/analyze`, { method: 'POST', json: {} });
      } else {
        await api('/market-intelligence/product-media-audits/bulk-analyze', { method: 'POST', json: { channel: channel || 'GLOBAL' } });
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu analiz tamamlanamadı.');
    } finally {
      setBulkRunning(false);
    }
  }

  const items = data?.items ?? [];
  const summary = data?.summary ?? { visualHealth: 0, urgentChange: 0, shouldImprove: 0, goodCondition: 0, waitingAnalysis: 0, total: 0 };
  const allVisibleSelected = items.length > 0 && items.every((audit) => selected.includes(audit.id));

  return (
    <AdminShell title="Pazar Analizi">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink">Ürün Görsel Denetimi</h2>
            <p className="mt-1 text-sm text-slate-500">Ürünlerin görsel kalitesini, eksiklerini ve satış önceliğini analiz edin.</p>
          </div>
          <button className="btn btn-primary" onClick={() => analyzeBulk()} disabled={bulkRunning}>
            {bulkRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {bulkRunning ? 'Analiz ediliyor...' : 'Tüm Kataloğu Analiz Et'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi title="Mağaza Görsel Sağlığı" value={`${summary.visualHealth} / 100`} />
          <Kpi title="Acil Değişmeli" value={`${summary.urgentChange} ürün`} tone="red" />
          <Kpi title="Düzeltilmeli" value={`${summary.shouldImprove} ürün`} tone="amber" />
          <Kpi title="İyi Durumda" value={`${summary.goodCondition} ürün`} tone="emerald" />
          <Kpi title="Analiz Bekliyor" value={`${summary.waitingAnalysis} ürün`} />
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <ListFilter size={17} /> Filtreler
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="relative md:col-span-2 xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <input className="field pl-9" placeholder="Ürün adı, SKU, barkod" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <Select value={channel} onChange={setChannel} placeholder="Kanal" options={data?.filters.channels ?? []} />
            <Select value={recommendation} onChange={setRecommendation} placeholder="Karar" options={data?.filters.recommendations ?? []} labelMap={recommendationLabel} />
            <Select value={priority} onChange={setPriority} placeholder="Öncelik" options={['Çok Yüksek', 'Yüksek', 'Orta', 'Düşük', 'Çok Düşük']} />
            <Select value={status} onChange={setStatus} placeholder="Analiz durumu" options={data?.filters.statuses ?? []} labelMap={statusLabels} />
            <Select value={category} onChange={setCategory} placeholder="Kategori" options={data?.filters.categories ?? []} />
            <Select value={missingMediaType} onChange={setMissingMediaType} placeholder="Eksik görsel tipi" options={data?.filters.missingMediaTypes ?? []} labelMap={mediaTypeLabels} />
            <Select value={sort} onChange={setSort} placeholder="Sıralama" options={['priority_desc', 'score_asc', 'sales_desc', 'revenue_desc', 'newest', 'oldest']} labelMap={sortLabels} />
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setChannel('TRENDYOL'); setRecommendation(''); setPriority(''); setCategory(''); setStatus(''); setMissingMediaType(''); setSort('priority_desc'); }}>
              <X size={16} /> Temizle
            </button>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="text-sm font-semibold">{selected.length} ürün seçildi</div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={() => analyzeBulk(selected)} disabled={bulkRunning}>
                <RefreshCw size={16} /> Seçilenleri Analiz Et
              </button>
              <button className="btn btn-secondary" onClick={() => analyzeBulk(selected)} disabled={bulkRunning}>
                <RefreshCw size={16} /> Analizi Yenile
              </button>
              <button className="btn btn-secondary" disabled title="Medya Merkezi bağlantısı sonraki aşamada etkinleştirilecek.">
                <Send size={16} /> Medya Görevi Oluştur
              </button>
            </div>
          </div>
        )}

        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2 font-bold">
              <FileImage size={18} className="text-brand" />
              Görsel Denetim Listesi
            </div>
            <span className="text-sm text-slate-500">{loading ? 'Yükleniyor...' : `${items.length} / ${data?.total ?? 0} kayıt`}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? [] : items.map((audit) => audit.id))} /></th>
                  <th className="px-3 py-3">Ürün görseli</th>
                  <th className="px-3 py-3">Ürün adı</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Barkod</th>
                  <th className="px-3 py-3">Kanal</th>
                  <th className="px-3 py-3">Görsel</th>
                  <th className="px-3 py-3">Kalite</th>
                  <th className="px-3 py-3">Satış önemi</th>
                  <th className="px-3 py-3">Öncelik</th>
                  <th className="px-3 py-3">Ana</th>
                  <th className="px-3 py-3">Lifestyle</th>
                  <th className="px-3 py-3">Ölçü</th>
                  <th className="px-3 py-3">Yakın</th>
                  <th className="px-3 py-3">Karar</th>
                  <th className="px-3 py-3">Analiz tarihi</th>
                  <th className="px-3 py-3">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {items.map((audit) => (
                  <tr key={audit.id} className="border-t border-line align-middle">
                    <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(audit.id)} onChange={() => toggleSelected(audit.id, setSelected)} /></td>
                    <td className="px-3 py-3"><img src={audit.images[0]?.imageUrl ? apiFileUrl(audit.images[0].imageUrl) : ''} alt="" className="h-14 w-12 rounded-md object-cover" /></td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-ink">{audit.productName}</div>
                      <div className="text-xs text-slate-500">{audit.category}</div>
                    </td>
                    <td className="px-3 py-3">{audit.sku}</td>
                    <td className="px-3 py-3">{audit.barcode}</td>
                    <td className="px-3 py-3"><Badge>{audit.channel}</Badge></td>
                    <td className="px-3 py-3">{audit.imageCount}</td>
                    <td className="px-3 py-3"><Score value={audit.overallVisualScore} max={10} /></td>
                    <td className="px-3 py-3">{audit.salesSignals.salesQuantity ?? '-'} satış</td>
                    <td className="px-3 py-3"><PriorityBadge label={audit.priorityClass} score={audit.changePriorityScore} /></td>
                    <td className="px-3 py-3"><RequirementBadge status={audit.mainImageStatus} /></td>
                    <td className="px-3 py-3"><RequirementBadge status={audit.lifestyleStatus} /></td>
                    <td className="px-3 py-3"><RequirementBadge status={audit.measurementStatus} /></td>
                    <td className="px-3 py-3"><RequirementBadge status={audit.closeUpStatus} /></td>
                    <td className="px-3 py-3"><RecommendationBadge value={audit.recommendation} /></td>
                    <td className="px-3 py-3">{audit.analyzedAt ? new Date(audit.analyzedAt).toLocaleDateString('tr-TR') : 'Bekliyor'}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-secondary min-h-9 px-3 py-1.5" onClick={() => analyzeOne(audit.id)} disabled={Boolean(analyzingId)}>
                          {analyzingId === audit.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                          Analiz Et
                        </button>
                        <button className="btn btn-secondary min-h-9 px-3 py-1.5" onClick={() => setDetail(audit)}>
                          <Eye size={15} /> Detaylı Rapor
                        </button>
                        {audit.erpDetailUrl && (
                          <Link className="btn btn-secondary min-h-9 px-3 py-1.5" href={audit.erpDetailUrl}>
                            <ArrowRight size={15} /> Detaya Git
                          </Link>
                        )}
                        {audit.salesPageUrl && (
                          <a className="btn btn-secondary min-h-9 px-3 py-1.5" href={audit.salesPageUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={15} /> Satış Sayfası
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={17} className="px-4 py-10 text-center text-sm text-slate-500">Filtrelere uygun ürün bulunamadı.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={17} className="px-4 py-10 text-center text-sm text-slate-500">Yükleniyor...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail && <DetailDrawer audit={detail} onClose={() => setDetail(null)} onAnalyze={() => analyzeOne(detail.id)} analyzing={analyzingId === detail.id} />}
    </AdminShell>
  );
}

function DetailDrawer({ audit, onClose, onAnalyze, analyzing }: { audit: Audit; onClose: () => void; onAnalyze: () => void; analyzing: boolean }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">Detaylı Görsel Rapor</h3>
            <p className="text-sm text-slate-500">{audit.productName}</p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}><X size={16} /> Kapat</button>
        </div>
        <div className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Info label="SKU" value={audit.sku} />
            <Info label="Barkod" value={audit.barcode} />
            <Info label="Kategori" value={audit.category} />
            <Info label="Kanal" value={audit.channel} />
            <Info label="Stok" value={`${audit.stockQuantity} adet`} />
            <Info label="Fiyat" value={formatMoney(audit.price)} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-line p-4">
              <div className="text-xs font-bold uppercase text-slate-500">Genel Görsel Puanı</div>
              <div className="mt-2 text-3xl font-bold">{audit.overallVisualScore.toFixed(1)} / 10</div>
            </div>
            <div className="rounded-md border border-line p-4">
              <div className="text-xs font-bold uppercase text-slate-500">Karar</div>
              <div className="mt-3"><RecommendationBadge value={audit.recommendation} /></div>
            </div>
            <div className="rounded-md border border-line p-4">
              <div className="text-xs font-bold uppercase text-slate-500">Öncelik</div>
              <div className="mt-3"><PriorityBadge label={audit.priorityClass} score={audit.changePriorityScore} /></div>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center gap-2 font-bold"><BarChart3 size={18} /> Skor Breakdown</div>
            <div className="space-y-3">
              {scoreRows.map(([key, label]) => <ScoreBar key={String(key)} label={label} value={Number(audit[key])} />)}
            </div>
          </section>

          <section className="rounded-md border border-line p-4">
            <div className="mb-2 font-bold">AI Rapor Alanı</div>
            <p className="text-sm leading-relaxed text-slate-700">{audit.aiSummary}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <List title="Tespit Edilen Sorunlar" items={audit.aiIssues.length ? audit.aiIssues : ['Kritik sorun tespit edilmedi.']} />
              <List title="Önerilen Set" items={audit.recommendedSet} />
            </div>
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{audit.aiRecommendation}</p>
          </section>

          <section>
            <div className="mb-3 font-bold">Eksik Görsel Gereksinimleri</div>
            <div className="flex flex-wrap gap-2">
              {audit.missingMediaTypes.map((type) => <Badge key={type} tone="red">{mediaTypeLabels[type] ?? type}</Badge>)}
              {!audit.missingMediaTypes.length && <Badge tone="emerald">Standart set tamam</Badge>}
            </div>
          </section>

          <section>
            <div className="mb-3 font-bold">Geçmiş Analizler</div>
            <div className="space-y-2">
              {audit.history.map((item, index) => (
                <div key={`${item.analyzedAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <span>{new Date(item.analyzedAt).toLocaleDateString('tr-TR')}</span>
                  <span>{item.overallVisualScore.toFixed(1)} / 10</span>
                  <span>{item.changePriorityScore} / 100</span>
                  <RecommendationBadge value={item.recommendation} />
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button className="btn btn-primary" onClick={onAnalyze} disabled={analyzing}>{analyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Analizi Yenile</button>
            <button className="btn btn-secondary" disabled title="Medya Merkezi entegrasyonu sonraki aşamada etkinleştirilecek."><Send size={16} /> Medya Görevi Oluştur</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, tone = 'slate' }: { title: string; value: string; tone?: 'slate' | 'red' | 'amber' | 'emerald' }) {
  const toneClass = tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-ink';
  return <div className="panel p-4"><div className="text-xs font-bold uppercase text-slate-500">{title}</div><div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div></div>;
}

function Select({ value, onChange, placeholder, options, labelMap = {} }: { value: string; onChange: (value: string) => void; placeholder: string; options: string[]; labelMap?: Record<string, string> }) {
  return (
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{labelMap[option] ?? option}</option>)}
    </select>
  );
}

function RecommendationBadge({ value }: { value: Recommendation }) {
  const cls = value === 'KEEP' ? 'bg-emerald-50 text-emerald-700' : value === 'IMPROVE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{recommendationLabel[value]}</span>;
}

function PriorityBadge({ label, score }: { label: string; score: number }) {
  const cls = score >= 80 ? 'bg-red-50 text-red-700' : score >= 60 ? 'bg-amber-50 text-amber-700' : score >= 40 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label} · {score}/100</span>;
}

function RequirementBadge({ status }: { status: RequirementStatus }) {
  if (status === 'PRESENT') return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Var</span>;
  if (status === 'NEEDS_IMPROVEMENT') return <span className="text-xs font-bold text-amber-700">İyileştir</span>;
  return <span className="text-xs font-bold text-red-700">Eksik</span>;
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'red' | 'emerald' }) {
  const cls = tone === 'red' ? 'bg-red-50 text-red-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}

function Score({ value, max }: { value: number; max: number }) {
  return <span className="font-bold">{value.toFixed(1)} / {max}</span>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{label}</span><span>{value.toFixed(1)}</span></div>
      <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(0, Math.min(100, value * 10))}%` }} /></div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line p-3"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><div className="mb-2 text-sm font-bold">{title}</div><ul className="space-y-1 text-sm text-slate-700">{items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{item}</li>)}</ul></div>;
}

function toggleSelected(id: string, setSelected: Dispatch<SetStateAction<string[]>>) {
  setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
}

const statusLabels: Record<string, string> = {
  QUEUED: 'Bekliyor',
  PROCESSING: 'Analiz Ediliyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Hata',
};

const sortLabels: Record<string, string> = {
  priority_desc: 'Öncelik en yüksek',
  score_asc: 'Görsel puanı en düşük',
  sales_desc: 'En çok satan',
  revenue_desc: 'En yüksek ciro',
  newest: 'En yeni analiz',
  oldest: 'En eski analiz',
};

const mediaTypeLabels: Record<string, string> = {
  MAIN_PRODUCT: 'Ana ürün',
  HOME_LIFESTYLE: 'Ev ortamı',
  OFFICE_LIFESTYLE: 'Ofis ortamı',
  CAFE_LIFESTYLE: 'Kafe/restoran',
  CLOSE_UP: 'Yakın çekim',
  TOP_VIEW: 'Üstten çekim',
  MEASUREMENT: 'Ölçü görseli',
  VIDEO: 'Video',
};
