'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  Globe,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Megaphone,
  CreditCard,
  RefreshCw,
  Save,
  Package,
  Instagram,
  Facebook,
  Tag,
} from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Settings = Record<string, string>;

type Product = {
  id: number;
  productName: string;
  sitePrice: number | null;
  shopPrice: number | null;
  status: string;
  category: { name: string } | null;
};

const TABS = [
  { id: 'general', label: 'Genel Ayarlar', icon: Globe },
  { id: 'banner', label: 'Banner & Duyuru', icon: Megaphone },
  { id: 'payment', label: 'Ödeme Ayarları', icon: CreditCard },
  { id: 'prices', label: 'Ürün Fiyatları', icon: Tag },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SiteAdminPage() {
  const [tab, setTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<Settings>({});
  const [draft, setDraft] = useState<Settings>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');

  const loadSettings = useCallback(async () => {
    const data = await api<Settings>('/site-settings');
    setSettings(data);
    setDraft(data);
  }, []);

  const loadProducts = useCallback(async () => {
    const data = await api<Product[]>('/products?limit=500&status=ACTIVE');
    setProducts(Array.isArray(data) ? data : (data as any)?.products ?? []);
  }, []);

  useEffect(() => {
    loadSettings().catch(() => {});
    loadProducts().catch(() => {});
  }, [loadSettings, loadProducts]);

  async function saveSettings() {
    setSaving(true);
    setMsg('');
    try {
      await api('/site-settings', { method: 'PUT', json: draft });
      setSettings(draft);
      setMsg('Ayarlar kaydedildi.');
    } catch {
      setMsg('Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  }

  function set(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function savePrices() {
    const entries = Object.entries(priceDrafts).filter(([, v]) => v !== '');
    if (!entries.length) return;
    setSavingPrices(true);
    setMsg('');
    try {
      await Promise.all(
        entries.map(([id, price]) =>
          api(`/products/${id}`, { method: 'PATCH', json: { sitePrice: Number(price), shopPrice: Number(price) } }),
        ),
      );
      setPriceDrafts({});
      await loadProducts();
      setMsg(`${entries.length} ürün fiyatı güncellendi.`);
    } catch {
      setMsg('Fiyat kaydedilirken hata oluştu.');
    } finally {
      setSavingPrices(false);
    }
  }

  async function bulkSync() {
    setSyncing(true);
    setSyncResult('');
    setMsg('');
    try {
      const result = await api<{ updated: number; skipped: number }>('/public/catalog/admin/bulk-sync-site-price?secret=dev-secret-local', { method: 'POST' });
      setSyncResult(`✓ ${result.updated} ürün güncellendi, ${result.skipped} atlandı.`);
      await loadProducts();
    } catch {
      setSyncResult('Senkronizasyon sırasında hata oluştu.');
    } finally {
      setSyncing(false);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      !priceSearch ||
      p.productName?.toLowerCase().includes(priceSearch.toLowerCase()) ||
      p.category?.name?.toLowerCase().includes(priceSearch.toLowerCase()),
  );

  return (
    <AdminShell title="Site Admin Paneli">
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-line pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              tab === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle size={16} />
          {msg}
        </div>
      )}

      {/* Genel Ayarlar */}
      {tab === 'general' && (
        <div className="mt-5 space-y-5">
          <Section title="İletişim Bilgileri" icon={<Phone size={17} />}>
            <Field label="WhatsApp Numarası" hint="Başında 90 ile (örn: 905321234567)">
              <input className="field" value={draft.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="905321234567" />
            </Field>
            <Field label="Telefon">
              <input className="field" value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="05321234567" />
            </Field>
            <Field label="Adres" span2>
              <input className="field" value={draft.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="Antalya, Türkiye" />
            </Field>
            <Field label="Çalışma Saatleri" span2>
              <input className="field" value={draft.working_hours ?? ''} onChange={(e) => set('working_hours', e.target.value)} placeholder="Pzt-Cmt 09:00-18:00" />
            </Field>
          </Section>

          <Section title="Sosyal Medya" icon={<Instagram size={17} />}>
            <Field label="Instagram URL">
              <input className="field" value={draft.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/erhanflowers" />
            </Field>
            <Field label="Facebook URL">
              <input className="field" value={draft.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/erhanflowers" />
            </Field>
          </Section>

          <Section title="Site Bilgileri" icon={<Globe size={17} />}>
            <Field label="Site Adı">
              <input className="field" value={draft.site_name ?? ''} onChange={(e) => set('site_name', e.target.value)} placeholder="Erhan Flowers" />
            </Field>
          </Section>

          <Section title="Google & SEO" icon={<Globe size={17} />}>
            <Field label="Google Analytics ID" hint="Örn: G-XXXXXXXXXX">
              <input className="field font-mono text-sm" value={draft.google_analytics_id ?? ''} onChange={(e) => set('google_analytics_id', e.target.value)} placeholder="G-XXXXXXXXXX" />
            </Field>
            <Field label="Google Tag Manager ID" hint="Örn: GTM-XXXXXXX">
              <input className="field font-mono text-sm" value={draft.google_tag_manager_id ?? ''} onChange={(e) => set('google_tag_manager_id', e.target.value)} placeholder="GTM-XXXXXXX" />
            </Field>
            <Field label="Google Site Doğrulama" hint="Search Console meta tag içeriği">
              <input className="field font-mono text-sm" value={draft.google_site_verification ?? ''} onChange={(e) => set('google_site_verification', e.target.value)} placeholder="xxxxxxxxxxxxxxxxx" />
            </Field>
          </Section>

          <SaveBar saving={saving} onSave={saveSettings} />
        </div>
      )}

      {/* Banner & Duyuru */}
      {tab === 'banner' && (
        <div className="mt-5 space-y-5">
          <Section title="Üst Banner / Duyuru" icon={<Megaphone size={17} />}>
            <Field label="Banner Aktif" span2>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand"
                  checked={draft.banner_enabled === 'true'}
                  onChange={(e) => set('banner_enabled', e.target.checked ? 'true' : 'false')}
                />
                <span className="text-sm font-medium">Siteye duyuru bandı ekle</span>
              </label>
            </Field>
            <Field label="Duyuru Metni" span2>
              <textarea
                className="field min-h-[72px] resize-y"
                value={draft.banner_text ?? ''}
                onChange={(e) => set('banner_text', e.target.value)}
                placeholder="Örn: Yılbaşı kampanyası — tüm ürünlerde %15 indirim!"
              />
            </Field>
            <Field label="Banner Rengi">
              <select className="field" value={draft.banner_color ?? 'blue'} onChange={(e) => set('banner_color', e.target.value)}>
                <option value="blue">Mavi</option>
                <option value="green">Yeşil</option>
                <option value="red">Kırmızı</option>
                <option value="yellow">Sarı</option>
                <option value="purple">Mor</option>
              </select>
            </Field>
          </Section>

          {draft.banner_enabled === 'true' && draft.banner_text && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-semibold text-white ${
                {
                  blue: 'bg-blue-600',
                  green: 'bg-green-600',
                  red: 'bg-red-600',
                  yellow: 'bg-amber-500',
                  purple: 'bg-purple-600',
                }[draft.banner_color ?? 'blue'] ?? 'bg-blue-600'
              }`}
            >
              Önizleme: {draft.banner_text}
            </div>
          )}

          <SaveBar saving={saving} onSave={saveSettings} />
        </div>
      )}

      {/* Ödeme Ayarları */}
      {tab === 'payment' && (
        <div className="mt-5 space-y-5">
          <Section title="Ödeme Yöntemi" icon={<CreditCard size={17} />}>
            <Field label="Aktif Ödeme Yöntemi" span2>
              <select className="field" value={draft.payment_method ?? 'none'} onChange={(e) => set('payment_method', e.target.value)}>
                <option value="none">Ödeme Kapalı (sadece WhatsApp ile sipariş)</option>
                <option value="iyzico">iyzico</option>
                <option value="tami">Tami Sanal POS</option>
              </select>
            </Field>

            {draft.payment_method === 'tami' && (
              <>
                <Field label="Merchant Number">
                  <input className="field" value={draft.tami_merchant ?? ''} onChange={(e) => set('tami_merchant', e.target.value)} placeholder="77022811" />
                </Field>
                <Field label="Terminal Number">
                  <input className="field" value={draft.tami_terminal ?? ''} onChange={(e) => set('tami_terminal', e.target.value)} placeholder="..." />
                </Field>
                <Field label="Secret Key" span2>
                  <input className="field font-mono text-xs" value={draft.tami_secret_key ?? ''} onChange={(e) => set('tami_secret_key', e.target.value)} placeholder="ba2b4bb1-..." />
                </Field>
                <Field label="K Değeri" span2>
                  <input className="field font-mono text-xs" value={draft.tami_k_value ?? ''} onChange={(e) => set('tami_k_value', e.target.value)} placeholder="357c53a9-..." />
                </Field>
                <Field label="Kid Değeri" span2>
                  <input className="field font-mono text-xs" value={draft.tami_kid_value ?? ''} onChange={(e) => set('tami_kid_value', e.target.value)} placeholder="6Chr70PY..." />
                </Field>
              </>
            )}

            {draft.payment_method === 'iyzico' && (
              <>
                <Field label="iyzico API Key" span2>
                  <input className="field font-mono text-xs" value={draft.iyzico_api_key ?? ''} onChange={(e) => set('iyzico_api_key', e.target.value)} placeholder="sandbox-..." />
                </Field>
                <Field label="iyzico Secret Key" span2>
                  <input className="field font-mono text-xs" value={draft.iyzico_secret_key ?? ''} onChange={(e) => set('iyzico_secret_key', e.target.value)} placeholder="sandbox-..." />
                </Field>
              </>
            )}
          </Section>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Not:</strong> Ödeme bilgileri DB'de şifresiz saklanır. Terminal numarası gibi kritik bilgileri sunucu .env dosyasına eklemek daha güvenlidir.
          </div>

          <SaveBar saving={saving} onSave={saveSettings} />
        </div>
      )}

      {/* Ürün Fiyatları */}
      {tab === 'prices' && (
        <div className="mt-5 space-y-4">
          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Toplu Fiyat Senkronizasyonu</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Tüm ürünlerin site fiyatını onaylı maliyet → Trendyol fiyatı sıralamasıyla günceller.
                </p>
              </div>
              <button className="btn btn-secondary gap-2" onClick={bulkSync} disabled={syncing}>
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Senkronize ediliyor...' : 'Tümünü Senkronize Et'}
              </button>
            </div>
            {syncResult && (
              <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{syncResult}</div>
            )}
          </div>

          <div className="panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold">Manuel Fiyat Düzenleme</h3>
              <div className="flex gap-2">
                <input
                  className="field w-56"
                  placeholder="Ürün veya kategori ara..."
                  value={priceSearch}
                  onChange={(e) => setPriceSearch(e.target.value)}
                />
                {Object.keys(priceDrafts).length > 0 && (
                  <button className="btn btn-primary gap-2" onClick={savePrices} disabled={savingPrices}>
                    <Save size={15} />
                    {savingPrices ? 'Kaydediliyor...' : `${Object.keys(priceDrafts).length} Fiyatı Kaydet`}
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold text-slate-500">
                    <th className="pb-2 pr-4">Ürün</th>
                    <th className="pb-2 pr-4">Kategori</th>
                    <th className="pb-2 pr-4 text-right">Mevcut Site Fiyatı</th>
                    <th className="pb-2 text-right">Yeni Fiyat (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, 100).map((p) => (
                    <tr key={p.id} className="border-b border-line/50 hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium">{p.productName}</td>
                      <td className="py-2 pr-4 text-slate-500">{p.category?.name ?? '-'}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {p.sitePrice ? `${Number(p.sitePrice).toLocaleString('tr-TR')} ₺` : <span className="text-red-500">—</span>}
                      </td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-28 rounded border border-line px-2 py-1 text-right font-mono text-sm focus:border-brand focus:outline-none"
                          placeholder={p.sitePrice ? String(Number(p.sitePrice)) : '0'}
                          value={priceDrafts[p.id] ?? ''}
                          onChange={(e) =>
                            setPriceDrafts((d) => {
                              const next = { ...d };
                              if (e.target.value === '') delete next[p.id];
                              else next[p.id] = e.target.value;
                              return next;
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length > 100 && (
                <p className="mt-2 text-center text-xs text-slate-400">İlk 100 ürün gösteriliyor. Arama yaparak daraltın.</p>
              )}
              {filteredProducts.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">Ürün bulunamadı.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2 font-bold">
        {icon}
        {title}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, hint, span2, children }: { label: string; hint?: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1.5 ${span2 ? 'md:col-span-2' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <button className="btn btn-primary gap-2" onClick={onSave} disabled={saving}>
        <Save size={16} />
        {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
      </button>
    </div>
  );
}
