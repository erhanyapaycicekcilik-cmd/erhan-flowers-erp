'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { Award, BarChart3, CheckCircle2, ExternalLink, Eye, FileSpreadsheet, Globe2, Heart, Instagram, Plus, Radar, RefreshCw, Save, Search, Settings2, ShieldAlert, ShoppingCart, Sparkles, Trash2, TrendingUp, XCircle } from 'lucide-react';
import { GeminiChatWidget } from './gemini-chat-widget';

type KeywordComparison = {
  keyword: string;
  categoryName: string | null;
  rivalCount: number;
  rivalAvgPrice: number;
  rivalAvgRating: number | null;
  rivalFreeCargoPercent: number;
  rivalTopPromotions: string[];
  topRival: { name: string; brand: string | null; price: number; rating: number | null; ratingCount: number; promotions: string[] } | null;
  ourListingFound: boolean;
  ourRank: number | null;
  ourPrice: number | null;
  ourRating: number | null;
};

type MarketReport = {
  id: number;
  reportDate: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  comparison: KeywordComparison[];
  generatedAt: string;
};

type Keyword = { id: number; keyword: string; isActive: boolean; category?: { name: string } | null };

type InstagramStatus = { connected: boolean; accountName?: string; connectedAt?: string };

type SocialReport = { id: number; reportDate: string; summary: string; suggestions: string[]; generatedAt: string };

type MarketMainTab = 'current' | 'deep' | 'radar' | 'saved' | 'tracking' | 'performance' | 'social';

type DeepProvider = { id: string; name: string; country: string; region: string; connected: boolean; trustScore: number; signal: string };
type DeepProduct = {
  id: string;
  imageUrl: string | null;
  productName: string;
  brand: string | null;
  seller: string | null;
  source: string;
  country: string;
  currentPrice: number | null;
  oldPrice: number | null;
  currency: 'TRY' | 'EUR' | 'USD';
  rating: number | null;
  reviewCount: number;
  bestseller: boolean;
  heightCm: number | null;
  features: string[];
  url: string | null;
  checkedAt: string;
  sourceConnected: boolean;
};
type DeepResearchResult = {
  id: string;
  query: string;
  queryVariations: string[];
  createdAt: string;
  filters: { country: string; sources: string[] };
  providers: Array<{ providerId: string; providerName: string; connected: boolean; trustScore: number; signal: string; products: DeepProduct[]; error?: string }>;
  products: DeepProduct[];
  ourProducts: DeepProduct[];
  excludedOwnMatches: number;
  opportunityScore: { total: number; demand: string; competition: string; priceOpportunity: string; visualStandard: string; seoCompetition: string; turkeyOpportunity: string; producibility: string; explanation: string };
  priceAnalysis: { min: number | null; max: number | null; average: number | null; median: number | null; byCountry: Array<{ country: string; average: number | null; currency: string; count: number }> };
  seoAnalysis: { words: Array<{ word: string; percent: number }>; suggestedTitle: string };
  reviewAnalysis: Record<string, string[]>;
  questionAnalysis: Record<string, string[]>;
  visualAnalysis: Record<string, string | number | boolean>;
  producibility: { score: number; bodyAvailable: boolean; leafAvailable: boolean; potAvailable: boolean; difficulty: string };
};
type SavedResearch = { id: string; query: string; queryVariations: string[]; createdAt: string; sources: string[]; resultCount: number; opportunityScore: number; userNote: string };
type RadarResult = { generatedAt: string; dataSourcesConnected: number; status: string; message: string; opportunities: Array<SavedResearch & { status: string }>; sampleLogic: string[] };
type ExclusionSettings = { ownBrands: string[]; negativeKeywords: string[] };

export default function MarketAnalysisPage() {
  const [tab, setTab] = useState<MarketMainTab>('current');
  const tabs: Array<{ id: MarketMainTab; label: string }> = [
    { id: 'current', label: 'Mevcut Ürün Analizi' },
    { id: 'deep', label: 'Derin Ürün Araştırması' },
    { id: 'radar', label: 'Global Fırsat Radarı' },
    { id: 'saved', label: 'Kayıtlı Araştırmalar' },
    { id: 'tracking', label: 'Rakip Takibi' },
    { id: 'performance', label: 'En İyi Performans' },
    { id: 'social', label: 'Sosyal Medya' },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'deep') setTab('deep');
  }, []);

  return (
    <AdminShell title="Pazar Analizi">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
        <Link
          className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          href="/market-analizi/urun-gorsel-denetimi"
          target="_blank"
        >
          Ürün Görsel Denetimi
        </Link>
      </div>
      {tab === 'current' && <TrendyolTab />}
      {tab === 'deep' && <DeepResearchTab />}
      {tab === 'radar' && <OpportunityRadarTab />}
      {tab === 'saved' && <SavedResearchesTab />}
      {tab === 'tracking' && <CompetitorTrackingTab />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'social' && <SocialTab />}
      <GeminiChatWidget />
    </AdminShell>
  );
}

function TrendyolTab() {
  const [report, setReport] = useState<MarketReport | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api<MarketReport | null>('/market-intelligence/report/today').catch(() => null),
      api<Keyword[]>('/market-intelligence/keywords').catch(() => []),
    ])
      .then(([reportData, keywordData]) => {
        setReport(reportData);
        setKeywords(keywordData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function generateNow() {
    setGenerating(true);
    setMessage('');
    try {
      const result = await api<MarketReport>('/market-intelligence/report/generate', { method: 'POST' });
      setReport(result);
      setMessage('Rapor güncellendi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Analiz başarısız oldu.');
    } finally {
      setGenerating(false);
    }
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    await api('/market-intelligence/keywords', { method: 'POST', json: { keyword: newKeyword.trim() } }).catch(() => null);
    setNewKeyword('');
    load();
  }

  async function removeKeyword(id: number) {
    await api(`/market-intelligence/keywords/${id}`, { method: 'DELETE' }).catch(() => null);
    load();
  }

  if (loading) return <div className="text-sm text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold">Bugünkü Rakip Analizi</h2>
          <p className="text-sm text-slate-500">
            {report ? `Son güncelleme: ${new Date(report.generatedAt).toLocaleString('tr-TR')}` : 'Henüz bugün için rapor üretilmedi.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={generateNow} disabled={generating}>
          <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Analiz ediliyor...' : 'Şimdi Analiz Et'}
        </button>
      </div>
      {message && <div className="rounded-md border border-line bg-white p-3 text-sm">{message}</div>}

      {report && (
        <>
          <div className="card p-5">
            <p className="text-sm leading-relaxed text-slate-700">{report.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InsightCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} title="Rakiplerin Doğru Yaptığı" items={report.strengths} tone="emerald" />
            <InsightCard icon={<XCircle size={18} className="text-red-600" />} title="Bizim Hatalarımız" items={report.weaknesses} tone="red" />
            <InsightCard icon={<Sparkles size={18} className="text-amber-600" />} title="Günlük Öneriler" items={report.suggestions} tone="amber" />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-line p-4">
              <h3 className="font-bold">Kategori Bazlı Karşılaştırma</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Kategori / Anahtar Kelime</th>
                    <th className="px-4 py-3">Rakip Ort. Fiyat</th>
                    <th className="px-4 py-3">Rakip Ort. Puan</th>
                    <th className="px-4 py-3">Ücretsiz Kargo %</th>
                    <th className="px-4 py-3">En Çok Kampanya</th>
                    <th className="px-4 py-3">Biz Nerede?</th>
                  </tr>
                </thead>
                <tbody>
                  {report.comparison.map((row) => (
                    <tr key={row.keyword} className="border-t border-line">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{row.categoryName ?? row.keyword}</div>
                        <div className="text-xs text-slate-500">&quot;{row.keyword}&quot;</div>
                      </td>
                      <td className="px-4 py-3">{formatMoney(row.rivalAvgPrice)}</td>
                      <td className="px-4 py-3">{row.rivalAvgRating ?? '-'}</td>
                      <td className="px-4 py-3">%{row.rivalFreeCargoPercent}</td>
                      <td className="px-4 py-3 text-xs">{row.rivalTopPromotions.slice(0, 2).join(', ') || '-'}</td>
                      <td className="px-4 py-3">
                        {row.ourListingFound ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            {row.ourRank}. sırada · {formatMoney(row.ourPrice ?? 0)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                            <ShieldAlert size={12} /> İlk sayfada yok
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card p-5">
        <h3 className="mb-3 font-bold">Takip Edilen Anahtar Kelimeler</h3>
        <div className="mb-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Örn: yapay bambu ağacı"
            value={newKeyword}
            onChange={(event) => setNewKeyword(event.target.value)}
          />
          <button className="btn btn-secondary" onClick={addKeyword}>
            <Plus size={16} /> Ekle
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span key={keyword.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-slate-50 px-3 py-1.5 text-sm">
              {keyword.keyword}
              {keyword.category?.name && <span className="text-xs text-slate-400">({keyword.category.name})</span>}
              <button onClick={() => removeKeyword(keyword.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </span>
          ))}
          {!keywords.length && <span className="text-sm text-slate-500">Henüz anahtar kelime eklenmedi.</span>}
        </div>
      </div>
    </div>
  );
}

type FavoritedVariant = {
  id: number;
  barcode: string;
  productName: string;
  currentModelCode: string | null;
  trendyolProductUrl: string | null;
  trendyolRatingAverage: string | number | null;
  trendyolRatingCount: number;
  trendyolCommentCount: number;
  trendyolFavoriteCount: number;
  trendyolStatsSyncedAt: string | null;
};

type SellerRow = { barcode: string; productName: string; totalQuantity: number; orderCount: number };

type DeadZoneAnalysis = {
  totalActive: number;
  statsSyncedCount: number;
  deadZoneCount: number;
  deadZonePercent: number;
  insight: { summary: string; recommendation: 'düzenle' | 'sil-degistir' | 'karma'; reasons: string[] };
};

function PerformanceTab() {
  const [favorited, setFavorited] = useState<FavoritedVariant[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [analysis, setAnalysis] = useState<DeadZoneAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api<FavoritedVariant[]>('/market-intelligence/own-performance/top-favorited?limit=100').catch(() => []),
      api<SellerRow[]>('/market-intelligence/own-performance/top-sellers?limit=100').catch(() => []),
      api<DeadZoneAnalysis>('/market-intelligence/own-performance/dead-zone').catch(() => null),
    ])
      .then(([favoritedData, sellerData, analysisData]) => {
        setFavorited(favoritedData);
        setSellers(sellerData);
        setAnalysis(analysisData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function startSync() {
    setSyncing(true);
    setMessage('');
    try {
      const result = await api<{ started: boolean; message: string }>('/market-intelligence/own-performance/sync', { method: 'POST', json: { limit: 300 } });
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Senkronizasyon başlatılamadı.');
    } finally {
      setSyncing(false);
    }
  }

  async function downloadActionPlan() {
    try {
      const result = await api<{ fileName: string; mimeType: string; contentBase64: string; total: number }>('/market-intelligence/own-performance/action-plan/excel');
      const binary = atob(result.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const url = window.URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage(`${result.total} ürünlük aksiyon listesi indirildi (taranmış ürünler).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Liste indirilemedi.');
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Yükleniyor...</div>;

  const recommendationLabel = analysis?.insight.recommendation === 'sil-degistir'
    ? 'Sil / Komple Değiştir'
    : analysis?.insight.recommendation === 'düzenle'
      ? 'Tek Tek Düzenle'
      : 'Karma Yaklaşım';

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-bold">Ürün Performans Senkronizasyonu</h2>
          <p className="text-sm text-slate-500">
            {analysis ? `${analysis.statsSyncedCount} / ${analysis.totalActive} ürünün puan/favori verisi çekildi.` : 'Henüz veri yok.'} Her ürün sayfası tek tek okunduğu için arka planda kademeli ilerler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> Listeleri Yenile</button>
          <button className="btn btn-primary" onClick={startSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Başlatılıyor...' : 'Senkronizasyonu Başlat (300 ürün)'}
          </button>
          <button className="btn btn-secondary" onClick={downloadActionPlan}>
            <FileSpreadsheet size={16} /> Sil / Güncelle Listesi (Excel)
          </button>
        </div>
      </div>
      {message && <div className="rounded-md border border-line bg-white p-3 text-sm">{message}</div>}

      {analysis && (
        <div className="card space-y-3 border border-amber-100 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 font-bold">
            <Award size={18} className="text-amber-600" />
            Strateji Önerisi: {recommendationLabel}
          </div>
          <p className="text-sm text-slate-700">{analysis.insight.summary}</p>
          <div className="text-sm font-semibold text-slate-600">
            Ölçümü yapılan {analysis.statsSyncedCount} üründen {analysis.deadZoneCount} tanesi (%{analysis.deadZonePercent}) hiç favori/yorum almamış.
          </div>
          {analysis.insight.reasons.length > 0 && (
            <ul className="space-y-1 text-sm text-slate-700">
              {analysis.insight.reasons.map((reason, index) => (
                <li key={index} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line p-4 font-bold">
            <ShoppingCart size={18} className="text-emerald-600" />
            En Çok Satanlarım (sipariş geçmişimize göre, ilk 100)
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Ürün</th><th className="px-3 py-2">Adet</th><th className="px-3 py-2">Sipariş</th></tr>
              </thead>
              <tbody>
                {sellers.map((row, index) => (
                  <tr key={row.barcode} className="border-t border-line">
                    <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2">{row.productName}</td>
                    <td className="px-3 py-2 font-semibold">{row.totalQuantity}</td>
                    <td className="px-3 py-2 text-slate-500">{row.orderCount}</td>
                  </tr>
                ))}
                {!sellers.length && <tr><td colSpan={4} className="px-3 py-4 text-slate-500">Henüz Trendyol sipariş verisi yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line p-4 font-bold">
            <Heart size={18} className="text-pink-600" />
            En Çok Favori/Yorum Alanlarım (ilk 100)
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Ürün</th><th className="px-3 py-2">Favori</th><th className="px-3 py-2">Puan</th></tr>
              </thead>
              <tbody>
                {favorited.map((variant, index) => (
                  <tr key={variant.id} className="border-t border-line">
                    <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2">
                      {variant.trendyolProductUrl ? <a className="text-brand hover:underline" href={variant.trendyolProductUrl} target="_blank" rel="noreferrer">{variant.productName}</a> : variant.productName}
                    </td>
                    <td className="px-3 py-2 font-semibold">{variant.trendyolFavoriteCount}</td>
                    <td className="px-3 py-2 text-slate-500">{variant.trendyolRatingCount > 0 ? `${Number(variant.trendyolRatingAverage ?? 0).toFixed(1)} (${variant.trendyolRatingCount})` : '-'}</td>
                  </tr>
                ))}
                {!favorited.length && <tr><td colSpan={4} className="px-3 py-4 text-slate-500">Henüz senkronize edilmiş ürün yok — yukarıdaki butonla başlat.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeepResearchTab() {
  const [providers, setProviders] = useState<DeepProvider[]>([]);
  const [settings, setSettings] = useState<ExclusionSettings | null>(null);
  const [query, setQuery] = useState('Yapay Zeytin Ağacı 180 cm');
  const [country, setCountry] = useState('ALL');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minHeight: '', maxHeight: '', productType: '', potted: false, indoor: false, outdoor: false, uvResistant: false, onlyBestsellers: false, onlyHighRated: false });
  const [result, setResult] = useState<DeepResearchResult | null>(null);
  const [resultTab, setResultTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [ownBrandsText, setOwnBrandsText] = useState('');
  const [negativeWordsText, setNegativeWordsText] = useState('');

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get('query');
    if (initialQuery) setQuery(initialQuery);
    Promise.all([
      api<DeepProvider[]>('/market-intelligence/deep-research/providers').catch(() => []),
      api<ExclusionSettings>('/market-intelligence/deep-research/settings').catch(() => null),
    ]).then(([providerData, settingsData]) => {
      setProviders(providerData);
      if (settingsData) {
        setSettings(settingsData);
        setOwnBrandsText(settingsData.ownBrands.join('\n'));
        setNegativeWordsText(settingsData.negativeKeywords.join('\n'));
      }
    });
  }, []);

  const visibleProviders = useMemo(() => providers.filter((provider) => country === 'ALL' || provider.region === country || (country === 'EU' && ['EU', 'DE'].includes(provider.region))), [country, providers]);

  async function runResearch() {
    setLoading(true);
    setMessage('');
    try {
      const next = await api<DeepResearchResult>('/market-intelligence/deep-research/run', {
        method: 'POST',
        json: {
          query,
          country,
          sources: selectedSources,
          minPrice: numberOrUndefined(filters.minPrice),
          maxPrice: numberOrUndefined(filters.maxPrice),
          minHeight: numberOrUndefined(filters.minHeight),
          maxHeight: numberOrUndefined(filters.maxHeight),
          productType: filters.productType,
          potted: filters.potted,
          indoor: filters.indoor,
          outdoor: filters.outdoor,
          uvResistant: filters.uvResistant,
          onlyBestsellers: filters.onlyBestsellers,
          onlyHighRated: filters.onlyHighRated,
        },
      });
      setResult(next);
      setResultTab('overview');
      setMessage(next.providers.every((provider) => !provider.connected) ? 'Veri kaynağı henüz bağlı değil; iskelet ve filtreleme altyapısı hazır.' : 'Araştırma tamamlandı.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Araştırma çalıştırılamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function saveResearch() {
    if (!result) return;
    const saved = await api<SavedResearch>('/market-intelligence/deep-research/save', { method: 'POST', json: { result, note } });
    setMessage(`${saved.query} kayıtlı araştırmalara eklendi.`);
  }

  async function saveSettings() {
    const next = await api<ExclusionSettings>('/market-intelligence/deep-research/settings', {
      method: 'PATCH',
      json: { ownBrands: splitLines(ownBrandsText), negativeKeywords: splitLines(negativeWordsText) },
    });
    setSettings(next);
    setMessage('Hariç tutma ve negatif kelime listesi güncellendi.');
  }

  function toggleSource(id: string) {
    setSelectedSources((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const resultTabs = ['Genel Bakış', 'Ürünler', 'Rakipler', 'Fiyat', 'SEO', 'Yorumlar', 'Sorular', 'Görseller', 'Trendler', 'Fırsatlar', 'Bizim Ürünümüz'];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-brand" />
            <h2 className="text-lg font-bold">Derin Ürün Araştırması</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün adı veya anahtar kelime" />
            <select className="input" value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="ALL">Tümü</option>
              <option value="TR">Türkiye</option>
              <option value="DE">Almanya</option>
              <option value="EU">Avrupa</option>
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {visibleProviders.map((provider) => (
              <label key={provider.id} className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
                <input type="checkbox" checked={selectedSources.includes(provider.id)} onChange={() => toggleSource(provider.id)} />
                <span className="font-semibold">{provider.name}</span>
                {!provider.connected && <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Bağlı değil</span>}
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input className="input" placeholder="Minimum fiyat" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} />
            <input className="input" placeholder="Maksimum fiyat" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} />
            <input className="input" placeholder="Minimum boy" value={filters.minHeight} onChange={(event) => setFilters({ ...filters, minHeight: event.target.value })} />
            <input className="input" placeholder="Maksimum boy" value={filters.maxHeight} onChange={(event) => setFilters({ ...filters, maxHeight: event.target.value })} />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {[
              ['potted', 'Saksılı / Saksısız'],
              ['indoor', 'İç mekan'],
              ['outdoor', 'Dış mekan'],
              ['uvResistant', 'UV dayanımlı'],
              ['onlyBestsellers', 'Sadece çok satanlar'],
              ['onlyHighRated', 'Sadece yüksek puanlı'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={Boolean(filters[key as keyof typeof filters])} onChange={(event) => setFilters({ ...filters, [key]: event.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={runResearch} disabled={loading}><Radar size={16} className={loading ? 'animate-spin' : ''} /> DERİN ARAŞTIR</button>
            <button className="btn btn-secondary" onClick={saveResearch} disabled={!result}><Save size={16} /> Araştırmayı Kaydet</button>
          </div>
          {message && <div className="rounded-md border border-line bg-white p-3 text-sm font-semibold text-slate-600">{message}</div>}
        </div>

        <div className="card space-y-3 p-5">
          <div className="flex items-center gap-2 font-bold"><Settings2 size={18} className="text-slate-500" /> Analiz Hariç Tutma</div>
          <textarea className="input min-h-28" value={ownBrandsText} onChange={(event) => setOwnBrandsText(event.target.value)} />
          <div className="text-xs font-semibold uppercase text-slate-400">Negatif arama kelimeleri</div>
          <textarea className="input min-h-24" value={negativeWordsText} onChange={(event) => setNegativeWordsText(event.target.value)} />
          <button className="btn btn-secondary" onClick={saveSettings}>Ayarları Kaydet</button>
          {settings && <p className="text-xs text-slate-500">{settings.ownBrands.length} marka/satıcı ve {settings.negativeKeywords.length} negatif kelime merkezi listede.</p>}
        </div>
      </div>

      {result && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="card p-5">
              <div className="text-xs font-bold uppercase text-slate-400">Pazar Fırsat Puanı</div>
              <div className="mt-2 text-4xl font-black text-brand">{result.opportunityScore.total} / 100</div>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <ScoreLine label="Talep" value={result.opportunityScore.demand} />
                <ScoreLine label="Rekabet" value={result.opportunityScore.competition} />
                <ScoreLine label="Fiyat fırsatı" value={result.opportunityScore.priceOpportunity} />
                <ScoreLine label="Üretilebilirlik" value={result.opportunityScore.producibility} />
              </div>
            </div>
            <div className="card p-5">
              <div className="mb-2 font-bold">Bu puan neden verildi?</div>
              <p className="text-sm leading-relaxed text-slate-700">{result.opportunityScore.explanation}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.queryVariations.map((variation) => <span key={variation} className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{variation}</span>)}
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {resultTabs.map((label) => (
              <button key={label} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold ${resultTab === label ? 'bg-brand text-white' : 'border border-line bg-white text-slate-600'}`} onClick={() => setResultTab(label)}>
                {label}
              </button>
            ))}
          </div>
          <ResearchResultPanel result={result} resultTab={resultTab} note={note} setNote={setNote} />
        </div>
      )}
    </div>
  );
}

function ResearchResultPanel({ result, resultTab, note, setNote }: { result: DeepResearchResult; resultTab: string; note: string; setNote: (value: string) => void }) {
  if (resultTab === 'Ürünler' || resultTab === 'Rakipler') return <ProductsTable products={result.products} />;
  if (resultTab === 'Fiyat') return <PricePanel result={result} />;
  if (resultTab === 'SEO') return <SeoPanel result={result} />;
  if (resultTab === 'Bizim Ürünümüz') return <OurProductPanel result={result} />;
  if (resultTab === 'Yorumlar') return <PlaceholderPanel title="Yorum Analizi" text="Yorum verisi sağlayan provider bağlandığında övgü, şikayet, kalite, paketleme, gerçekçilik ve fiyat başlıkları otomatik dolacak." />;
  if (resultTab === 'Sorular') return <PlaceholderPanel title="Soru-Cevap Analizi" text="Boy, saksı, dış mekan, UV dayanımı, bakım, montaj ve gerçekçilik soruları için veri modeli hazır." />;
  if (resultTab === 'Görseller') return <PlaceholderPanel title="Görsel Analizi" text="Beyaz fon, lifestyle, yakın çekim, ölçü görseli, detay görseli, video ve saksı tipi sinyalleri için alanlar hazır." />;
  if (resultTab === 'Trendler') return <PlaceholderPanel title="Trend Değişimi" text="Aynı araştırma tekrarlandığında fiyat, sıralama, yeni/kaybolan ürün ve satıcı değişimleri karşılaştırılacak." />;
  if (resultTab === 'Fırsatlar') {
    return (
      <div className="card space-y-3 p-5">
        <div className="font-bold">Ürün Fırsatı Notu</div>
        <textarea className="input min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Araştırma notu" />
        <p className="text-sm text-slate-600">Fırsat kaydı; ürün adı, kaynaklar, skor, araştırma tarihi ve not alanını taşıyacak şekilde hazır.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ProviderStatus providers={result.providers} />
      <PricePanel result={result} />
      <SeoPanel result={result} />
    </div>
  );
}

function ProviderStatus({ providers }: { providers: DeepResearchResult['providers'] }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2 font-bold"><Globe2 size={18} className="text-brand" /> Veri Kaynakları</div>
      <div className="space-y-2">
        {providers.map((provider) => (
          <div key={provider.providerId} className="rounded-md border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{provider.providerName}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${provider.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{provider.connected ? 'Bağlı' : 'Bağlı değil'}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Güven puanı {provider.trustScore} · {provider.signal}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsTable({ products }: { products: DeepProduct[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line p-4 font-bold">Ürünler</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr><th className="px-3 py-2">Ürün</th><th className="px-3 py-2">Satıcı</th><th className="px-3 py-2">Kaynak</th><th className="px-3 py-2">Fiyat</th><th className="px-3 py-2">Puan</th><th className="px-3 py-2">İşlem</th></tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-line">
                <td className="px-3 py-2 font-semibold">{product.productName}</td>
                <td className="px-3 py-2">{product.seller || '-'}</td>
                <td className="px-3 py-2">{product.source} / {product.country}</td>
                <td className="px-3 py-2">{product.currentPrice ? formatCurrency(product.currentPrice, product.currency) : '-'}</td>
                <td className="px-3 py-2">{product.rating ? `${product.rating} (${product.reviewCount})` : '-'}</td>
                <td className="px-3 py-2"><button className="btn btn-secondary min-h-8 px-2 text-xs" onClick={() => product.url && window.open(product.url, '_blank', 'noopener,noreferrer')} disabled={!product.url}><ExternalLink size={14} /> Ürünü Aç</button></td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan={6} className="px-3 py-5 text-sm font-semibold text-slate-500">Veri kaynağı henüz bağlı değil; rakip ürünü bulunmadı.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PricePanel({ result }: { result: DeepResearchResult }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-emerald-600" /> Fiyat Analizi</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Minimum" value={moneyOrDash(result.priceAnalysis.min)} />
        <Info label="Maksimum" value={moneyOrDash(result.priceAnalysis.max)} />
        <Info label="Ortalama" value={moneyOrDash(result.priceAnalysis.average)} />
        <Info label="Medyan" value={moneyOrDash(result.priceAnalysis.median)} />
      </div>
      <div className="mt-4 rounded-md border border-dashed border-line p-3 text-xs font-semibold text-slate-500">Fiyat grafiği altyapısı hazır; veri bağlandığında ülke ve kaynak kırılımı burada dolacak.</div>
    </div>
  );
}

function SeoPanel({ result }: { result: DeepResearchResult }) {
  return (
    <div className="card p-5">
      <div className="mb-3 font-bold">SEO Analizi</div>
      <div className="space-y-2">
        {result.seoAnalysis.words.map((word) => <ScoreLine key={word.word} label={word.word} value={`%${word.percent}`} />)}
        {!result.seoAnalysis.words.length && <p className="text-sm text-slate-500">Rakip başlığı verisi henüz yok.</p>}
      </div>
      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm"><span className="font-bold">Önerilen Ürün Başlığı:</span> {result.seoAnalysis.suggestedTitle}</div>
    </div>
  );
}

function OurProductPanel({ result }: { result: DeepResearchResult }) {
  return (
    <div className="card space-y-3 p-5">
      <div className="font-bold">Bizim Ürünümüz</div>
      <div className="grid gap-3 md:grid-cols-4">
        <Info label="ERP ürün adı" value="Benzerlik servisi bağlanacak" />
        <Info label="Model kodu" value="-" />
        <Info label="Stok" value="-" />
        <Info label="Tahmini marj" value="-" />
      </div>
      <div className="flex flex-wrap gap-2">
        <OpenInternalButton href="/products" label="Ürün Merkezi'nde Aç" />
        <OpenInternalButton href="/stock-cards" label="Stokta Aç" />
        <OpenInternalButton href="/production-costs" label="Maliyeti Aç" />
        <OpenInternalButton href="/media" label="Medyada Aç" />
      </div>
      <p className="text-sm text-slate-500">Rakip hesaplarından {result.excludedOwnMatches} kendi marka eşleşmesi hariç tutuldu.</p>
    </div>
  );
}

function OpportunityRadarTab() {
  const [radar, setRadar] = useState<RadarResult | null>(null);
  useEffect(() => { api<RadarResult>('/market-intelligence/opportunity-radar').then(setRadar).catch(() => null); }, []);
  if (!radar) return <div className="text-sm text-slate-500">Yükleniyor...</div>;
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 text-lg font-bold"><Radar size={20} className="text-brand" /> Global Fırsat Radarı</div>
        <p className="mt-2 text-sm text-slate-600">{radar.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">{radar.sampleLogic.map((item) => <span key={item} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold">{item}</span>)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {radar.opportunities.map((item) => <SavedResearchCard key={item.id} item={item} extra={item.status} />)}
        {!radar.opportunities.length && <div className="card p-5 text-sm font-semibold text-slate-500">Henüz gerçek veri kaynağı bağlanmadığı için radar fırsatı listelenmiyor.</div>}
      </div>
    </div>
  );
}

function SavedResearchesTab() {
  const [items, setItems] = useState<SavedResearch[]>([]);
  useEffect(() => { api<SavedResearch[]>('/market-intelligence/deep-research/saved').then(setItems).catch(() => []); }, []);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((item) => <SavedResearchCard key={item.id} item={item} />)}
      {!items.length && <div className="card p-5 text-sm font-semibold text-slate-500">Henüz kayıtlı araştırma yok.</div>}
    </div>
  );
}

function CompetitorTrackingTab() {
  const [items, setItems] = useState<DeepProduct[]>([]);
  useEffect(() => { api<DeepProduct[]>('/market-intelligence/competitor-tracking').then(setItems).catch(() => []); }, []);
  return <ProductsTable products={items} />;
}

function SavedResearchCard({ item, extra }: { item: SavedResearch; extra?: string }) {
  return (
    <div className="card p-5">
      <div className="font-bold">{item.query}</div>
      <div className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('tr-TR')} · {item.sources.length} kaynak · {item.resultCount} sonuç</div>
      <div className="mt-4 text-2xl font-black text-brand">{item.opportunityScore} / 100</div>
      {item.userNote && <p className="mt-2 text-sm text-slate-600">{item.userNote}</p>}
      {extra && <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{extra}</span>}
    </div>
  );
}

function PlaceholderPanel({ title, text }: { title: string; text: string }) {
  return <div className="card p-5"><div className="font-bold">{title}</div><p className="mt-2 text-sm text-slate-600">{text}</p></div>;
}

function ScoreLine({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-bold">{value}</span></div>;
}

function OpenInternalButton({ href, label }: { href: string; label: string }) {
  return <button type="button" className="btn btn-secondary" onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}><Eye size={16} /> {label}</button>;
}

function SocialTab() {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [report, setReport] = useState<SocialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api<InstagramStatus>('/market-intelligence/social/instagram/status').catch(() => ({ connected: false })),
      api<SocialReport | null>('/market-intelligence/social/instagram/report/today').catch(() => null),
    ])
      .then(([statusData, reportData]) => {
        setStatus(statusData);
        setReport(reportData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function connect() {
    setMessage('');
    try {
      await api('/market-intelligence/social/instagram/connect', { method: 'POST', json: { accessToken, instagramBusinessId: businessId } });
      setMessage('Instagram hesabı bağlandı.');
      setAccessToken('');
      setBusinessId('');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bağlantı başarısız.');
    }
  }

  async function generateNow() {
    setGenerating(true);
    setMessage('');
    try {
      const result = await api<SocialReport>('/market-intelligence/social/instagram/report/generate', { method: 'POST' });
      setReport(result);
      setMessage('Rapor güncellendi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Analiz başarısız oldu.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {!status?.connected ? (
        <div className="card space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Instagram size={20} className="text-pink-600" />
            <h2 className="text-lg font-bold">Instagram Business Hesabını Bağla</h2>
          </div>
          <p className="text-sm text-slate-500">
            Meta for Developers üzerinden oluşturduğun uzun ömürlü (long-lived) erişim token&apos;ını ve Instagram Business hesap ID&apos;ini gir.
            Token bilgin şifreli olarak saklanır.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Instagram Business Hesap ID" value={businessId} onChange={(event) => setBusinessId(event.target.value)} />
            <input className="input" placeholder="Access Token" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} type="password" />
          </div>
          <button className="btn btn-primary" onClick={connect}>
            Bağla
          </button>
          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-lg font-bold">@{status.accountName} bağlı</h2>
              <p className="text-sm text-slate-500">
                {report ? `Son güncelleme: ${new Date(report.generatedAt).toLocaleString('tr-TR')}` : 'Henüz bugün için rapor üretilmedi.'}
              </p>
            </div>
            <button className="btn btn-primary" onClick={generateNow} disabled={generating}>
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Analiz ediliyor...' : 'Şimdi Analiz Et'}
            </button>
          </div>
          {message && <div className="rounded-md border border-line bg-white p-3 text-sm">{message}</div>}
          {report && (
            <>
              <div className="card p-5">
                <p className="text-sm leading-relaxed text-slate-700">{report.summary}</p>
              </div>
              <InsightCard icon={<TrendingUp size={18} className="text-amber-600" />} title="Büyüme Önerileri" items={report.suggestions} tone="amber" />
            </>
          )}
        </>
      )}
    </div>
  );
}

function InsightCard({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: 'emerald' | 'red' | 'amber' }) {
  const toneClass = tone === 'emerald' ? 'border-emerald-100 bg-emerald-50/40' : tone === 'red' ? 'border-red-100 bg-red-50/40' : 'border-amber-100 bg-amber-50/40';
  return (
    <div className={`card border p-5 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-2 font-bold">
        {icon}
        {title}
      </div>
      {items.length ? (
        <ul className="space-y-2 text-sm text-slate-700">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Veri yok.</p>
      )}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
}

function formatCurrency(value: number, currency: 'TRY' | 'EUR' | 'USD') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value || 0);
}

function moneyOrDash(value: number | null) {
  return value == null ? '-' : formatMoney(value);
}

function numberOrUndefined(value: string) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function splitLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-xs font-bold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{value}</div>
    </div>
  );
}
