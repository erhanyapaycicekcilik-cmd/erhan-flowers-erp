'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { Award, CheckCircle2, FileSpreadsheet, Heart, Instagram, Plus, RefreshCw, ShieldAlert, ShoppingCart, Sparkles, Trash2, TrendingUp, XCircle } from 'lucide-react';
import { ClaudeChatWidget } from './claude-chat-widget';

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

export default function MarketAnalysisPage() {
  const [tab, setTab] = useState<'trendyol' | 'social' | 'performance'>('trendyol');

  return (
    <AdminShell title="Pazar Analizi">
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'trendyol' ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
          onClick={() => setTab('trendyol')}
        >
          Trendyol Rakip Analizi
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'performance' ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
          onClick={() => setTab('performance')}
        >
          En İyi Performans
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'social' ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
          onClick={() => setTab('social')}
        >
          Sosyal Medya
        </button>
      </div>
      {tab === 'trendyol' ? <TrendyolTab /> : tab === 'performance' ? <PerformanceTab /> : <SocialTab />}
      <ClaudeChatWidget />
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
