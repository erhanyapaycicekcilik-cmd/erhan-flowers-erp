'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Calculator, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
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

export default function CostsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [productId, setProductId] = useState('');
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [extraCosts, setExtraCosts] = useState<RecipeExtraCost[]>([]);
  const [shopMarginPercent, setShopMarginPercent] = useState(30);
  const [siteMarginPercent, setSiteMarginPercent] = useState(45);
  const [marketplaceMarginPercent, setMarketplaceMarginPercent] = useState(65);
  const [serverCosts, setServerCosts] = useState<CostCalculation>(emptyCosts);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api<Product[]>('/products'), api<StockCard[]>('/stock-cards')])
      .then(([productData, stockData]) => {
        setProducts(productData);
        setStockCards(stockData);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!productId) return;

    api<{ recipe: ProductRecipe | null; costs: CostCalculation }>(`/costs/products/${productId}`)
      .then((result) => {
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
    if (!productId) return;

    const result = await api<{ costs: CostCalculation }>(`/costs/products/${productId}/recipe`, {
      method: 'POST',
      json: {
        shopMarginPercent,
        siteMarginPercent,
        marketplaceMarginPercent,
        items,
        extraCosts,
      },
    });

    setServerCosts(result.costs);
    setMessage('Reçete kaydedildi. Alış fiyatları stok kartlarından otomatik okunuyor.');
  }

  function addItem() {
    setItems((current) => [...current, { stockCardId: 0, quantity: 1, unit: 'adet' }]);
  }

  function addExtraCost(type: RecipeCostType) {
    setExtraCosts((current) => [...current, { type, name: costTypeLabels[type], amount: 0 }]);
  }

  return (
    <AdminShell title="Maliyet Sistemi">
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="mb-5 flex items-center gap-2">
              <Calculator size={18} />
              <h2 className="font-bold">Ürün Reçetesi</h2>
            </div>

            <label className="block space-y-1.5">
              <span className="label">Satış Ürünü</span>
              <select className="field" value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">Ürün seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} - {product.modelCode}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-bold">Bileşenler</h2>
                <p className="text-sm text-slate-500">Alış fiyatı yazılmaz; stok kartından otomatik gelir.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={addItem}>
                <Plus size={17} />
                Bileşen
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Stok Kartı</th>
                    <th className="px-5 py-3">Miktar</th>
                    <th className="px-5 py-3">Birim</th>
                    <th className="px-5 py-3">Birim Maliyet</th>
                    <th className="px-5 py-3">Tutar</th>
                    <th className="px-5 py-3">Uyarı</th>
                    <th className="px-5 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const stockCard = stockCards.find((stock) => stock.id === Number(item.stockCardId));
                    const unitCost = Number(stockCard?.automaticUnitCost ?? 0);
                    const lineTotal = Number(item.quantity || 0) * unitCost;
                    const warning = stockCard && (stockCard.purchasePrice <= 0 || stockCard.packageContent <= 0)
                      ? 'Stok kartında maliyet bilgisi eksik'
                      : '';

                    return (
                      <tr key={index} className="border-t border-line">
                        <td className="px-5 py-3">
                          <select
                            className="field"
                            value={item.stockCardId}
                            onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, stockCardId: Number(event.target.value), unit: stockCards.find((stock) => stock.id === Number(event.target.value))?.unit ?? row.unit } : row))}
                          >
                            <option value={0}>Seçiniz</option>
                            {stockCards.map((stockCardItem) => (
                              <option key={stockCardItem.id} value={stockCardItem.id}>
                                {stockCardItem.name}
                              </option>
                            ))}
                          </select>
                          {stockCard && (
                            <Link href={`/stock-cards?stockCardId=${stockCard.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                              Stok kartına git <ExternalLink size={13} />
                            </Link>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <input className="field" type="number" step="0.001" value={item.quantity} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))} />
                        </td>
                        <td className="px-5 py-3">
                          <input className="field" value={item.unit} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unit: event.target.value } : row))} />
                        </td>
                        <td className="px-5 py-3">{unitCost.toLocaleString('tr-TR')} TL</td>
                        <td className="px-5 py-3 font-semibold">{round(lineTotal).toLocaleString('tr-TR')} TL</td>
                        <td className="px-5 py-3 text-xs font-semibold text-amber-700">{warning || '-'}</td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" className="btn btn-danger min-h-9 px-3" onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.keys(costTypeLabels) as RecipeCostType[]).map((type) => (
                <button key={type} type="button" className="btn btn-secondary min-h-9 px-3" onClick={() => addExtraCost(type)}>
                  <Plus size={15} />
                  {costTypeLabels[type]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {extraCosts.map((cost, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[180px_1fr_160px_auto]">
                  <select className="field" value={cost.type} onChange={(event) => setExtraCosts((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, type: event.target.value as RecipeCostType } : row))}>
                    {(Object.keys(costTypeLabels) as RecipeCostType[]).map((type) => <option key={type} value={type}>{costTypeLabels[type]}</option>)}
                  </select>
                  <input className="field" value={cost.name} onChange={(event) => setExtraCosts((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} />
                  <input className="field" type="number" step="0.01" value={cost.amount} onChange={(event) => setExtraCosts((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, amount: Number(event.target.value) } : row))} />
                  <button type="button" className="btn btn-danger min-h-10 px-3" onClick={() => setExtraCosts((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel p-5">
            <h2 className="font-bold">Satış Fiyatları</h2>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="label">Dükkan Kar %</span>
                <input className="field" type="number" value={shopMarginPercent} onChange={(event) => setShopMarginPercent(Number(event.target.value))} />
              </label>
              <label className="block space-y-1.5">
                <span className="label">Site Kar %</span>
                <input className="field" type="number" value={siteMarginPercent} onChange={(event) => setSiteMarginPercent(Number(event.target.value))} />
              </label>
              <label className="block space-y-1.5">
                <span className="label">Pazaryeri Kar %</span>
                <input className="field" type="number" value={marketplaceMarginPercent} onChange={(event) => setMarketplaceMarginPercent(Number(event.target.value))} />
              </label>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-bold">Anlık Hesap</h2>
            <CostLine label="Bileşen Toplamı" value={liveCosts.componentTotal} />
            <CostLine label="Gider Toplamı" value={liveCosts.extraTotal} />
            <CostLine label="Toplam Maliyet" value={liveCosts.totalCost} strong />
            <div className="mt-4 border-t border-line pt-4">
              <CostLine label="Dükkan Satış" value={liveCosts.shopPrice} />
              <CostLine label="Site Satış" value={liveCosts.sitePrice} />
              <CostLine label="Pazaryeri Satış" value={liveCosts.marketplacePrice} />
            </div>
            <button className="btn btn-primary mt-5 w-full" disabled={!productId}>
              <Save size={17} />
              Reçeteyi Kaydet
            </button>
            {message && <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          </section>

          <section className="panel p-5">
            <h2 className="font-bold">Son Kaydedilen</h2>
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

function CostLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 text-sm ${strong ? 'font-bold' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span>{value.toLocaleString('tr-TR')} TL</span>
    </div>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
