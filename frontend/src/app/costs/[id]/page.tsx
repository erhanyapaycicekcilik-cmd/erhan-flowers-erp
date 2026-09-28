'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import type { CostCalculation, Product, ProductRecipe, RecipeCostType, RecipeExtraCost, RecipeItem, StockCard } from '@/types';

const costTypeLabels: Record<RecipeCostType, string> = {
  LABOR: 'İşçilik',
  ELECTRICITY: 'Elektrik',
  SILICONE: 'Silikon',
  PACKAGING: 'Paketleme',
  SHIPPING: 'Kargo',
  OTHER: 'Diğer',
};

const emptyCosts: CostCalculation = {
  componentTotal: 0,
  extraTotal: 0,
  totalCost: 0,
  shopPrice: 0,
  sitePrice: 0,
  marketplacePrice: 0,
};

export default function CostDetailPage({ params }: { params: { id: string } }) {
  const productId = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [extraCosts, setExtraCosts] = useState<RecipeExtraCost[]>([]);
  const [shopMarginPercent, setShopMarginPercent] = useState(30);
  const [siteMarginPercent, setSiteMarginPercent] = useState(45);
  const [marketplaceMarginPercent, setMarketplaceMarginPercent] = useState(65);
  const [serverCosts, setServerCosts] = useState<CostCalculation>(emptyCosts);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api<StockCard[]>('/stock-cards'),
      api<{ product: Product; recipe: ProductRecipe | null; costs: CostCalculation }>(`/costs/products/${productId}`),
    ])
      .then(([stockData, result]) => {
        setStockCards(stockData);
        setProduct(result.product);
        setItems(result.recipe?.items.map((item) => ({
          stockCardId: item.stockCardId,
          quantity: item.quantity,
          unit: item.unit,
        })) ?? []);
        setExtraCosts(result.recipe?.extraCosts.map((item) => ({
          type: item.type,
          name: item.name,
          amount: item.amount,
        })) ?? []);
        setShopMarginPercent(result.recipe?.shopMarginPercent ?? 30);
        setSiteMarginPercent(result.recipe?.siteMarginPercent ?? 45);
        setMarketplaceMarginPercent(result.recipe?.marketplaceMarginPercent ?? 65);
        setServerCosts(result.costs);
      })
      .catch(() => null);
  }, [productId]);

  const liveCosts = useMemo(() => {
    const componentTotal = items.reduce((sum, item) => {
      const stockCard = stockCards.find((stock) => stock.id === Number(item.stockCardId));
      return sum + Number(item.quantity || 0) * Number(stockCard?.automaticUnitCost ?? 0);
    }, 0);
    const extraTotal = extraCosts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalCost = componentTotal + extraTotal;
    return {
      componentTotal: round(componentTotal),
      extraTotal: round(extraTotal),
      totalCost: round(totalCost),
      shopPrice: round(totalCost * (1 + shopMarginPercent / 100)),
      sitePrice: round(totalCost * (1 + siteMarginPercent / 100)),
      marketplacePrice: round(totalCost * (1 + marketplaceMarginPercent / 100)),
    };
  }, [extraCosts, items, marketplaceMarginPercent, shopMarginPercent, siteMarginPercent, stockCards]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await api<{ costs: CostCalculation }>(`/costs/products/${productId}/recipe`, {
      method: 'POST',
      json: { shopMarginPercent, siteMarginPercent, marketplaceMarginPercent, items, extraCosts },
    });
    setServerCosts(result.costs);
    setMessage(result.costs.sitePrice > 0
      ? `✓ Kaydedildi. Dükkan: ₺${result.costs.shopPrice} · Site: ₺${result.costs.sitePrice} · Platform: ₺${result.costs.marketplacePrice} — Trendyol/N11/HB'ye gönderildi.`
      : 'Reçete kaydedildi. Stok kartı alış fiyatları eksik — platform güncellemesi yapılmadı.');
  }

  return (
    <AdminShell title={product ? `${product.productName} — Reçete` : 'Reçete'}>
      <div className="mb-4">
        <Link href="/costs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Tüm ürünlere dön
        </Link>
      </div>

      {product && (
        <div className="mb-5 flex items-center gap-3">
          <Calculator size={20} />
          <div>
            <h1 className="font-bold text-lg">{product.productName}</h1>
            <p className="text-sm text-slate-500">{product.modelCode}</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-bold">Bileşenler</h2>
                <p className="text-sm text-slate-500">Alış fiyatı stok kartından otomatik gelir.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setItems((c) => [...c, { stockCardId: 0, quantity: 1, unit: 'adet' }])}>
                <Plus size={17} /> Bileşen
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Stok Kartı</th>
                    <th className="px-5 py-3 w-28">Miktar</th>
                    <th className="px-5 py-3 w-24">Birim</th>
                    <th className="px-5 py-3 w-32">Birim Maliyet</th>
                    <th className="px-5 py-3 w-28">Tutar</th>
                    <th className="px-5 py-3 w-40">Uyarı</th>
                    <th className="px-5 py-3 w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const sc = stockCards.find((s) => s.id === Number(item.stockCardId));
                    const unitCost = Number(sc?.automaticUnitCost ?? 0);
                    const lineTotal = Number(item.quantity || 0) * unitCost;
                    const warning = sc && (sc.purchasePrice <= 0 || sc.packageContent <= 0) ? 'Maliyet eksik' : '';
                    return (
                      <tr key={index} className="border-t border-line">
                        <td className="px-5 py-3">
                          <select className="field" value={item.stockCardId}
                            onChange={(e) => setItems((c) => c.map((r, i) => i === index ? { ...r, stockCardId: Number(e.target.value), unit: stockCards.find((s) => s.id === Number(e.target.value))?.unit ?? r.unit } : r))}>
                            <option value={0}>Seçiniz</option>
                            {stockCards.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          {sc && <Link href={`/stock-cards?stockCardId=${sc.id}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-xs text-brand"><ExternalLink size={12} /> Stok kartı</Link>}
                        </td>
                        <td className="px-5 py-3"><input className="field" type="number" step="0.001" value={item.quantity} onChange={(e) => setItems((c) => c.map((r, i) => i === index ? { ...r, quantity: Number(e.target.value) } : r))} /></td>
                        <td className="px-5 py-3"><input className="field" value={item.unit} onChange={(e) => setItems((c) => c.map((r, i) => i === index ? { ...r, unit: e.target.value } : r))} /></td>
                        <td className="px-5 py-3">{unitCost.toLocaleString('tr-TR')} ₺</td>
                        <td className="px-5 py-3 font-semibold">{round(lineTotal).toLocaleString('tr-TR')} ₺</td>
                        <td className="px-5 py-3 text-xs text-amber-700">{warning}</td>
                        <td className="px-5 py-3 text-right"><button type="button" className="btn btn-danger min-h-9 px-3" onClick={() => setItems((c) => c.filter((_, i) => i !== index))}><Trash2 size={15} /></button></td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && <tr><td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-400">Henüz bileşen eklenmedi</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-bold mb-3">Ek Giderler</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.keys(costTypeLabels) as RecipeCostType[]).map((type) => (
                <button key={type} type="button" className="btn btn-secondary min-h-9 px-3" onClick={() => setExtraCosts((c) => [...c, { type, name: costTypeLabels[type], amount: 0 }])}>
                  <Plus size={15} /> {costTypeLabels[type]}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {extraCosts.map((cost, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[160px_1fr_140px_auto]">
                  <select className="field" value={cost.type} onChange={(e) => setExtraCosts((c) => c.map((r, i) => i === index ? { ...r, type: e.target.value as RecipeCostType } : r))}>
                    {(Object.keys(costTypeLabels) as RecipeCostType[]).map((t) => <option key={t} value={t}>{costTypeLabels[t]}</option>)}
                  </select>
                  <input className="field" value={cost.name} onChange={(e) => setExtraCosts((c) => c.map((r, i) => i === index ? { ...r, name: e.target.value } : r))} />
                  <input className="field" type="number" step="0.01" value={cost.amount} onChange={(e) => setExtraCosts((c) => c.map((r, i) => i === index ? { ...r, amount: Number(e.target.value) } : r))} />
                  <button type="button" className="btn btn-danger min-h-10 px-3" onClick={() => setExtraCosts((c) => c.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
                </div>
              ))}
              {extraCosts.length === 0 && <p className="text-sm text-slate-400">Ek gider yok</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel p-5">
            <h2 className="font-bold mb-4">Kar Marjları</h2>
            <div className="space-y-3">
              {[
                { label: 'Dükkan Kar %', value: shopMarginPercent, set: setShopMarginPercent },
                { label: 'Site Kar %', value: siteMarginPercent, set: setSiteMarginPercent },
                { label: 'Pazaryeri Kar %', value: marketplaceMarginPercent, set: setMarketplaceMarginPercent },
              ].map(({ label, value, set }) => (
                <label key={label} className="block space-y-1.5">
                  <span className="label">{label}</span>
                  <input className="field" type="number" value={value} onChange={(e) => set(Number(e.target.value))} />
                </label>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-bold mb-3">Anlık Hesap</h2>
            <CostLine label="Bileşen Toplamı" value={liveCosts.componentTotal} />
            <CostLine label="Gider Toplamı" value={liveCosts.extraTotal} />
            <CostLine label="Toplam Maliyet" value={liveCosts.totalCost} strong />
            <div className="mt-3 border-t border-line pt-3">
              <CostLine label="Dükkan" value={liveCosts.shopPrice} highlight />
              <CostLine label="Site" value={liveCosts.sitePrice} highlight />
              <CostLine label="Pazaryeri" value={liveCosts.marketplacePrice} highlight />
            </div>
            <button className="btn btn-primary mt-5 w-full">
              <Save size={17} /> Kaydet &amp; Platformlara Gönder
            </button>
            {message && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          </section>

          <section className="panel p-5">
            <h2 className="font-bold mb-2 text-sm text-slate-500">Son Kaydedilen</h2>
            <CostLine label="Toplam Maliyet" value={serverCosts.totalCost} strong />
            <CostLine label="Dükkan" value={serverCosts.shopPrice} />
            <CostLine label="Site" value={serverCosts.sitePrice} />
            <CostLine label="Pazaryeri" value={serverCosts.marketplacePrice} />
          </section>
        </aside>
      </form>
    </AdminShell>
  );
}

function CostLine({ label, value, strong = false, highlight = false }: { label: string; value: number; strong?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 text-sm ${strong ? 'font-bold' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? 'font-semibold text-brand' : ''}>{value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
    </div>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
