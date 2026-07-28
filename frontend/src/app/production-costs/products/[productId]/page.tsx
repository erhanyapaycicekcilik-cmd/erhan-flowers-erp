'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Brain, Copy, ExternalLink, ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';
import type { StockCard } from '@/types';

const COST_LOAD_ERROR = 'Maliyet verileri yüklenemedi. Veritabanı bağlantısını kontrol edin.';

type CostGroup = 'LEAF_TRUNK' | 'POT' | 'CONSUMABLE' | 'LABOR' | 'PACKAGING' | 'OTHER';
type CostSource = 'AUTO' | 'MANUAL';

type Variant = {
  id: number;
  barcode: string;
  productName: string;
  currentModelCode: string | null;
  proposedModelCode: string | null;
  supplierStockCode: string | null;
  trendyolCategoryName: string | null;
  detectedSize: string | null;
  trendyolProductUrl: string | null;
  trendyolSalePrice: string;
  commissionPercent: string;
  images: string[] | null;
};

type VariantListItem = {
  id: number;
  barcode: string;
  productName: string;
  currentModelCode: string | null;
  proposedModelCode: string | null;
  supplierStockCode: string | null;
  trendyolCategoryName?: string | null;
  detectedSize?: string | null;
  productCostStatus?: string;
};

type MaterialItem = {
  key: string;
  id?: number | null;
  name: string;
  group: CostGroup;
  quantity: number;
  unit: string;
  source: CostSource;
  stockCardId: number | '';
  manualUnitCost: number;
  automaticUnitCost: number;
  totalCost?: number;
};

type PotItem = {
  key: string;
  id?: number | null;
  name: string;
  color: string;
  sizeText: string;
  quantity: number;
  source: CostSource;
  stockCardId: number | '';
  manualUnitCost: number;
  automaticUnitCost: number;
  totalCost?: number;
};

type ExpenseItem = {
  key: string;
  id?: number | null;
  name: string;
  amount: number;
  description: string;
  isActive: boolean;
  isDefaultExpense?: boolean;
  defaultExpenseKey?: string | null;
  defaultAmount?: number | null;
};

type DetailResponse = {
  variant: Variant;
  hasSavedCostDraft: boolean;
  previousProductId: number | null;
  nextProductId: number | null;
  nextIncompleteProductId?: number | null;
  progress?: {
    completed: number;
    total: number;
  };
  costDraft: {
    salePrice: number;
    profitMarginPercent: number;
    commissionPercent: number;
    vatPercent: number;
    shippingCost: number;
    desi: number;
    marketplaceMarkupPercent: number;
    campaignBufferPercent: number;
    items: Array<Omit<MaterialItem, 'key' | 'stockCardId'> & { stockCardId: number | null }>;
    pots: Array<any>;
  };
};

type KnowledgeStockCard = {
  id: number;
  name: string;
  unit: string;
  purchasePrice?: string | number | null;
  packageContent?: string | number | null;
  automaticUnitCost?: string | number | null;
  manualUnitCostEnabled?: boolean | null;
  manualUnitCost?: string | number | null;
  color?: string | null;
  size?: string | null;
};

type KnowledgeRecipeItem = {
  id: number;
  componentType: 'LEAF' | 'TRUNK' | 'POT' | 'CONSUMABLE' | 'LABOR' | 'ELECTRICITY' | 'PACKAGING' | 'OTHER';
  quantity: string | number;
  unit: string;
  stockCardId: number | null;
  stockCard?: KnowledgeStockCard | null;
  displayName?: string;
  source?: CostSource;
  manualUnitCost?: number;
  quantityLabel?: number;
};

type KnowledgeAnalysis = {
  plantType: { id: number; name: string; confidence: number } | null;
  productFamily: { id: number; name: string; confidence: number } | null;
  potProfile: { id: number; name: string; stockCardId: number | null; stockCard?: KnowledgeStockCard | null; confidence: number } | null;
  detected?: { plantCode: string | null; heightCm: number | null; stemCount: number | null; potType: string | null; potColor: string | null };
  heightCm: number | null;
  defaultLeafStockCard: KnowledgeStockCard | null;
  defaultTrunkStockCard: KnowledgeStockCard | null;
  recipeProfile: { id: number; name: string; items: KnowledgeRecipeItem[] } | null;
  warnings: string[];
  overallConfidence: number;
};

type StoneStockForm = {
  name: string;
  productType: string;
  color: string;
  unit: string;
  purchasePrice: number;
  criticalStockLevel: number;
  stockQuantity: number;
  supplierName: string;
  description: string;
  status: 'ACTIVE' | 'PASSIVE';
};

const materialGroups: Record<CostGroup, string> = {
  LEAF_TRUNK: 'Yaprak/Gövde',
  POT: 'Saksı',
  CONSUMABLE: 'Sarf',
  LABOR: 'Gider',
  PACKAGING: 'Paketleme',
  OTHER: 'Diğer',
};

export default function ProductCostDetailPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const productId = Number(params.productId);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [variants, setVariants] = useState<VariantListItem[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [pots, setPots] = useState<PotItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [profitMarginPercent, setProfitMarginPercent] = useState(45);
  const [vatPercent, setVatPercent] = useState(20);
  const [shippingCost, setShippingCost] = useState(0);
  const [desi, setDesi] = useState(0);
  const [marketplaceMarkupPercent, setMarketplaceMarkupPercent] = useState(25);
  const [campaignBufferPercent, setCampaignBufferPercent] = useState(10);
  const [stockWarningAccepted, setStockWarningAccepted] = useState(false);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeResult, setKnowledgeResult] = useState<KnowledgeAnalysis | null>(null);
  const [stoneModalOpen, setStoneModalOpen] = useState(false);
  const [stoneForm, setStoneForm] = useState<StoneStockForm>({
    name: 'Beyaz Dolomit Taşı',
    productType: 'Dolomit Taşı',
    color: 'Beyaz',
    unit: 'KG',
    purchasePrice: 40,
    criticalStockLevel: 0,
    stockQuantity: 0,
    supplierName: '',
    description: '',
    status: 'ACTIVE',
  });
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyQuery, setCopyQuery] = useState('');
  const [copySourceId, setCopySourceId] = useState<number | null>(null);
  const [copyOptions, setCopyOptions] = useState({
    copyMaterials: true,
    copyExpenses: true,
    copyShippingAndDesi: true,
    copyPriceRates: true,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedSettings = window.localStorage.getItem('ef_cost_price_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (Number.isFinite(Number(parsed.marketplaceMarkupPercent))) setMarketplaceMarkupPercent(Number(parsed.marketplaceMarkupPercent));
        if (Number.isFinite(Number(parsed.campaignBufferPercent))) setCampaignBufferPercent(Number(parsed.campaignBufferPercent));
      } catch {
        // Geçersiz ayar kaydı yok sayılır.
      }
    }
    Promise.all([
      api<DetailResponse>(`/production-costs/variants/${productId}/detail`),
      api<StockCard[]>('/stock-cards'),
      api<VariantListItem[]>('/production-costs/variants').catch(() => []),
    ])
      .then(([data, stockData, variantData]) => {
        setDetail(data);
        setStockCards(stockData);
        setVariants(variantData);
        const savedMaterials = data.costDraft.items
          .filter((item: any) => !(item.source === 'MANUAL' && (item.isDefaultExpense || ['LABOR', 'OTHER', 'PACKAGING'].includes(item.group))))
          .map((item) => hydrateMaterialItem(item, stockData));
        const savedExpenses = data.costDraft.items
          .filter((item: any) => item.source === 'MANUAL' && (item.isDefaultExpense || ['LABOR', 'OTHER', 'PACKAGING'].includes(item.group)))
          .map((item: any) => ({
            key: crypto.randomUUID(),
            id: item.id,
            name: item.name,
            amount: Number(item.manualUnitCost || 0),
            description: '',
            isActive: item.isActive !== false,
            isDefaultExpense: Boolean(item.isDefaultExpense),
            defaultExpenseKey: item.defaultExpenseKey ?? null,
            defaultAmount: item.defaultAmount === null || item.defaultAmount === undefined ? Number(item.manualUnitCost || 0) : Number(item.defaultAmount),
          }));
        setMaterials(savedMaterials.length > 0 ? savedMaterials : starterMaterials());
        setExpenses(savedExpenses.length > 0 ? savedExpenses : starterExpenses());
        setPots((data.costDraft.pots ?? []).map((pot: any) => ({
          key: crypto.randomUUID(),
          id: pot.id,
          name: pot.name ?? 'Saksı',
          color: pot.color ?? '',
          sizeText: [pot.width, pot.length, pot.height, pot.diameter].filter((value) => Number(value) > 0).join(' x '),
          quantity: Number(pot.quantity ?? 1),
          source: pot.source ?? 'AUTO',
          stockCardId: pot.stockCardId ?? '',
          manualUnitCost: Number(pot.manualUnitCost ?? 0),
          automaticUnitCost: Number(pot.automaticUnitCost ?? 0),
        })));
        setProfitMarginPercent(data.costDraft.profitMarginPercent || 45);
        setVatPercent(data.costDraft.vatPercent || 20);
        setShippingCost(Number(data.costDraft.shippingCost || 0));
        setDesi(Number(data.costDraft.desi || 0));
        setMarketplaceMarkupPercent(Number(data.costDraft.marketplaceMarkupPercent || 25));
        setCampaignBufferPercent(Number(data.costDraft.campaignBufferPercent || 10));
        if (!data.hasSavedCostDraft && data.variant.productName) {
          setKnowledgeLoading(true);
          api<KnowledgeAnalysis>('/knowledge-base/analyze-product-name', {
            method: 'POST',
            json: { text: data.variant.productName },
          }).then((result) => {
            setKnowledgeResult(result);
            applyKnowledgeToForm(result);
            setMessage('Ürün adı otomatik analiz edildi. Reçete forma getirildi; henüz kaydedilmedi.');
          }).catch((error) => {
            setMessage(error instanceof Error ? error.message : 'Ürün Bilgi Motoru otomatik analizi yapılamadı.');
          }).finally(() => setKnowledgeLoading(false));
        }
      })
      .catch(() => setMessage(COST_LOAD_ERROR));
  }, [productId]);

  const totals = useMemo(() => {
    const stockTotal = materials.filter((item) => item.group !== 'CONSUMABLE' && item.group !== 'PACKAGING').reduce((sum, item) => sum + materialTotal(item), 0);
    const consumableTotal = materials.filter((item) => item.group === 'CONSUMABLE' || item.group === 'PACKAGING').reduce((sum, item) => sum + materialTotal(item), 0);
    const potTotalValue = pots.reduce((sum, item) => sum + potTotal(item), 0);
    const automaticExpenseTotal = expenses
      .filter((item) => item.isDefaultExpense)
      .reduce((sum, item) => sum + (item.isActive ? Number(item.amount || 0) : 0), 0);
    const manualExpenseTotal = expenses
      .filter((item) => !item.isDefaultExpense)
      .reduce((sum, item) => sum + (item.isActive ? Number(item.amount || 0) : 0), 0);
    const materialTotalValue = stockTotal + consumableTotal + potTotalValue;
    const totalCost = materialTotalValue + automaticExpenseTotal + manualExpenseTotal;
    const vatAmount = totalCost * (Math.max(vatPercent, 0) / 100);
    const vatIncludedCost = totalCost + vatAmount;
    const profitAmount = vatIncludedCost * (Math.max(profitMarginPercent, 0) / 100);
    const shopSalePrice = vatIncludedCost + profitAmount;
    const siteSalePrice = shopSalePrice + Math.max(shippingCost, 0);
    const marketplaceBasePrice = siteSalePrice * (1 + Math.max(marketplaceMarkupPercent, 0) / 100);
    const marketplaceSalePrice = marketplaceBasePrice * (1 + Math.max(campaignBufferPercent, 0) / 100);
    return {
      stockTotal,
      consumableTotal,
      potTotalValue,
      materialTotalValue,
      automaticExpenseTotal,
      manualExpenseTotal,
      totalCost,
      vatAmount,
      vatIncludedCost,
      profitAmount,
      shopSalePrice,
      siteSalePrice,
      marketplaceBasePrice,
      marketplaceSalePrice,
    };
  }, [campaignBufferPercent, expenses, marketplaceMarkupPercent, materials, pots, profitMarginPercent, shippingCost, vatPercent]);

  const unverifiedStockCards = useMemo(() => {
    return [...materials, ...pots]
      .filter((item) => item.source === 'AUTO' && item.stockCardId)
      .map((item) => stockCards.find((stock) => stock.id === Number(item.stockCardId)))
      .filter((stock): stock is StockCard => Boolean(stock))
      .filter((stock) => Number(stock.stockQuantity ?? 0) <= 0);
  }, [materials, pots, stockCards]);

  const productResults = useMemo(() => {
    const needle = productQuery.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return [];
    return variants
      .filter((item) =>
        [item.productName, item.barcode, item.currentModelCode, item.proposedModelCode, item.supplierStockCode]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(needle)),
      )
      .slice(0, 8);
  }, [productQuery, variants]);

  const copyResults = useMemo(() => {
    const needle = copyQuery.trim().toLocaleLowerCase('tr-TR');
    const list = variants.filter((item) => item.id !== productId);
    if (!needle) return list.slice(0, 12);
    return list
      .filter((item) =>
        [item.productName, item.barcode, item.currentModelCode, item.proposedModelCode, item.supplierStockCode, item.trendyolCategoryName, item.detectedSize]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(needle)),
      )
      .slice(0, 12);
  }, [copyQuery, productId, variants]);

  function addMaterial(seed?: Partial<MaterialItem>) {
    setMaterials((current) => [...current, {
      key: crypto.randomUUID(),
      name: seed?.name ?? '',
      group: seed?.group ?? 'CONSUMABLE',
      quantity: seed?.quantity ?? 0,
      unit: seed?.unit ?? 'adet',
      source: seed?.source ?? 'AUTO',
      stockCardId: '',
      manualUnitCost: seed?.manualUnitCost ?? 0,
      automaticUnitCost: 0,
    }]);
  }

  function addPot(seed?: Partial<PotItem>) {
    setPots((current) => [...current, {
      key: crypto.randomUUID(),
      name: seed?.name ?? '',
      color: seed?.color ?? '',
      sizeText: seed?.sizeText ?? '',
      quantity: seed?.quantity ?? 1,
      source: seed?.source ?? 'AUTO',
      stockCardId: '',
      manualUnitCost: seed?.manualUnitCost ?? 0,
      automaticUnitCost: 0,
    }]);
  }

  function addExpense(name = '') {
    setExpenses((current) => [...current, { key: crypto.randomUUID(), name, amount: 0, description: '', isActive: true }]);
  }

  function updateMaterial(key: string, patch: Partial<MaterialItem>) {
    setMaterials((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function updatePot(key: string, patch: Partial<PotItem>) {
    setPots((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function updateExpense(key: string, patch: Partial<ExpenseItem>) {
    setExpenses((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function selectStock(item: MaterialItem, stockCardId: string) {
    const stock = stockCards.find((card) => card.id === Number(stockCardId));
    updateMaterial(item.key, {
      stockCardId: stock?.id ?? '',
      name: stock?.name ?? item.name,
      unit: stock?.unit ?? item.unit,
      automaticUnitCost: stockUnitCost(stock),
      source: 'AUTO',
    });
  }

  function selectPotStock(item: PotItem, stockCardId: string) {
    const stock = stockCards.find((card) => card.id === Number(stockCardId));
    updatePot(item.key, {
      stockCardId: stock?.id ?? '',
      name: stock?.name ?? item.name,
      color: stock?.color ?? item.color,
      sizeText: stock?.size ?? item.sizeText,
      automaticUnitCost: stockUnitCost(stock),
      source: 'AUTO',
    });
  }

  async function createStoneStockCard() {
    try {
      const saved = await api<StockCard>('/stock-cards', {
        method: 'POST',
        json: {
          name: stoneForm.name,
          category: 'Taş',
          productFamily: 'Taş',
          productType: stoneForm.productType,
          color: stoneForm.color,
          purchaseUnit: stoneForm.unit,
          purchaseQuantity: 1,
          unit: stoneForm.unit,
          packageContent: 1,
          purchasePrice: stoneForm.purchasePrice,
          criticalStockLevel: stoneForm.criticalStockLevel,
          stockQuantity: stoneForm.stockQuantity,
          supplierName: stoneForm.supplierName,
          description: stoneForm.description,
          status: stoneForm.status,
        },
      });
      setStockCards((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setMaterials((current) => [...current, {
        key: crypto.randomUUID(),
        name: saved.name,
        group: 'CONSUMABLE',
        quantity: 1,
        unit: saved.unit || stoneForm.unit,
        source: 'AUTO',
        stockCardId: saved.id,
        manualUnitCost: 0,
        automaticUnitCost: stockUnitCost(saved),
      }]);
      setStoneModalOpen(false);
      setMessage(`${saved.name} stok kartı oluşturuldu ve maliyet formuna eklendi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Taş stok kartı oluşturulamadı.');
    }
  }

  async function fillFromKnowledge() {
    if (!variant?.productName) {
      setMessage('Analiz edilecek ürün adı bulunamadı.');
      return;
    }
    setKnowledgeLoading(true);
    try {
      const result = await api<KnowledgeAnalysis>('/knowledge-base/analyze-product-name', {
        method: 'POST',
        json: { text: variant.productName },
      });
      setKnowledgeResult(result);
      applyKnowledgeToForm(result);
      setMessage('Ürün adı analiz edildi. Önerilen reçete forma getirildi; henüz kaydedilmedi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ürün Bilgi Motoru analizi yapılamadı.');
    } finally {
      setKnowledgeLoading(false);
    }
  }

  function applyKnowledgeToForm(result: KnowledgeAnalysis) {
    const recipeItems = result.recipeProfile?.items ?? [];
    const nextMaterials = recipeItems
      .filter((item) => item.componentType !== 'POT')
      .map((item) => knowledgeItemToMaterial(item));

    const fallbackMaterials = [
      result.defaultLeafStockCard ? stockToMaterial(result.defaultLeafStockCard, 'LEAF') : null,
      result.defaultTrunkStockCard ? stockToMaterial(result.defaultTrunkStockCard, 'TRUNK', 1) : null,
    ].filter((item): item is MaterialItem => Boolean(item));

    setMaterials(nextMaterials.length > 0 ? nextMaterials : (fallbackMaterials.length > 0 ? fallbackMaterials : starterMaterials()));

    const recipePots = recipeItems
      .filter((item) => item.componentType === 'POT')
      .map((item) => knowledgeItemToPot(item, result.potProfile?.name ?? 'Saksı'));

    if (recipePots.length > 0) {
      setPots(recipePots);
    } else if (result.potProfile) {
      const stock = result.potProfile.stockCard ?? (result.potProfile.stockCardId ? findStockLike(result.potProfile.stockCardId) : undefined);
      setPots([{
        key: crypto.randomUUID(),
        name: stock?.name ?? result.potProfile.name,
        color: stock?.color ?? '',
        sizeText: stock?.size ?? '',
        quantity: 1,
        source: 'AUTO',
        stockCardId: stock?.id ?? '',
        manualUnitCost: 0,
        automaticUnitCost: stockUnitCost(stock),
      }]);
    }
  }

  function knowledgeItemToMaterial(item: KnowledgeRecipeItem): MaterialItem {
    const stock = item.stockCard ?? findStockLike(item.stockCardId);
    return {
      key: crypto.randomUUID(),
      name: stock?.name ?? item.displayName ?? knowledgeComponentLabel(item.componentType),
      group: knowledgeComponentGroup(item.componentType),
      quantity: Number(item.quantity || 0),
      unit: stock?.unit ?? item.unit,
      source: item.source ?? (stock ? 'AUTO' : 'MANUAL'),
      stockCardId: stock?.id ?? '',
      manualUnitCost: Number(item.manualUnitCost ?? 0),
      automaticUnitCost: stockUnitCost(stock),
    };
  }

  function knowledgeItemToPot(item: KnowledgeRecipeItem, fallbackName: string): PotItem {
    const stock = item.stockCard ?? findStockLike(item.stockCardId);
    return {
      key: crypto.randomUUID(),
      name: stock?.name ?? fallbackName,
      color: stock?.color ?? '',
      sizeText: stock?.size ?? '',
      quantity: Number(item.quantity || 1),
      source: item.source ?? (stock ? 'AUTO' : 'MANUAL'),
      stockCardId: stock?.id ?? '',
      manualUnitCost: 0,
      automaticUnitCost: stockUnitCost(stock),
    };
  }

  function stockToMaterial(stock: KnowledgeStockCard, componentType: KnowledgeRecipeItem['componentType'], quantity = 0): MaterialItem {
    return {
      key: crypto.randomUUID(),
      name: stock.name,
      group: knowledgeComponentGroup(componentType),
      quantity,
      unit: stock.unit,
      source: 'AUTO',
      stockCardId: stock.id,
      manualUnitCost: 0,
      automaticUnitCost: stockUnitCost(stock),
    };
  }

  function findStockLike(id: number | null | undefined): StockCard | undefined {
    if (!id) return undefined;
    return stockCards.find((stock) => stock.id === Number(id));
  }

  async function save(approve = false) {
    if (unverifiedStockCards.length > 0 && !stockWarningAccepted) {
      setMessage('Stok sayımı doğrulanmamış malzeme var. Devam Et butonuna basarak uyarıyı onaylayın.');
      return;
    }
    const endpoint = approve ? 'cost-approve' : 'cost-draft';
    const mergedItems = [
      ...materials,
      ...expenses.map((item) => ({
        id: item.id,
        key: item.key,
        name: item.name || 'Gider',
        group: item.name.toLocaleLowerCase('tr-TR').includes('iş') ? 'LABOR' as CostGroup : 'OTHER' as CostGroup,
        quantity: 1,
        unit: 'TL',
        source: 'MANUAL' as CostSource,
        stockCardId: '',
        manualUnitCost: item.amount,
        automaticUnitCost: 0,
        isActive: item.isActive,
        isDefaultExpense: Boolean(item.isDefaultExpense),
        defaultExpenseKey: item.defaultExpenseKey,
        defaultAmount: item.defaultAmount,
      })),
    ];
    try {
      const result = await api<{ ok: boolean }>(`/production-costs/variants/${productId}/${endpoint}`, {
        method: 'POST',
        json: {
          salePrice: totals.shopSalePrice,
          profitMarginPercent,
          commissionPercent: 0,
          vatPercent,
          shippingCost,
          desi,
          marketplaceMarkupPercent,
          campaignBufferPercent,
          items: mergedItems,
          pots: pots.map((pot) => ({ ...pot, width: 0, length: 0, height: 0, diameter: 0 })),
        },
      });
      if (result.ok) setMessage(approve ? 'Maliyet kaydedildi.' : 'Taslak kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Maliyet kaydedilemedi.');
    }
  }

  async function saveAndNext() {
    await save(true);
    if (detail?.nextIncompleteProductId) router.push(`/production-costs/products/${detail.nextIncompleteProductId}`);
  }

  async function copySummary() {
    const text = [
      `Ürün: ${detail?.variant.productName ?? ''}`,
      `Toplam maliyet: ${money(totals.totalCost)}`,
      `KDV dahil maliyet: ${money(totals.vatIncludedCost)}`,
      `Dükkan satış fiyatı: ${money(totals.shopSalePrice)}`,
      `Site satış fiyatı: ${money(totals.siteSalePrice)}`,
      `Pazaryeri satış fiyatı: ${money(totals.marketplaceSalePrice)}`,
    ].join('\n');
    await navigator.clipboard.writeText(text).catch(() => null);
    setMessage('Maliyet özeti kopyalandı.');
  }

  async function copyRecipe() {
    const text = [
      `Ürün: ${detail?.variant.productName ?? ''}`,
      '',
      'Stoklu Malzemeler',
      ...materials.map((item) => `${item.name || 'Malzeme'} | ${item.quantity || 0} ${item.unit} | ${money4(item.source === 'MANUAL' ? item.manualUnitCost : item.automaticUnitCost)} | ${money(materialTotal(item))}`),
      '',
      'Saksılar',
      ...pots.map((item) => `${item.name || 'Saksı'} | ${item.quantity || 0} adet | ${money4(item.source === 'MANUAL' ? item.manualUnitCost : item.automaticUnitCost)} | ${money(potTotal(item))}`),
      '',
      'Giderler',
      ...expenses.map((item) => `${item.name || 'Gider'} | ${money(item.amount)} | ${item.isActive ? 'Aktif' : 'Pasif'}`),
    ].join('\n');
    await navigator.clipboard.writeText(text).catch(() => null);
    setMessage('Reçete kopyalandı.');
  }

  async function reloadDetail() {
    const refreshed = await api<DetailResponse>(`/production-costs/variants/${productId}/detail`);
    setDetail(refreshed);
    setMaterials(refreshed.costDraft.items
      .filter((item: any) => !(item.source === 'MANUAL' && (item.isDefaultExpense || ['LABOR', 'OTHER', 'PACKAGING'].includes(item.group))))
      .map((item) => hydrateMaterialItem(item, stockCards)));
    setExpenses(refreshed.costDraft.items
      .filter((item: any) => item.source === 'MANUAL' && (item.isDefaultExpense || ['LABOR', 'OTHER', 'PACKAGING'].includes(item.group)))
      .map((item: any) => ({
        key: crypto.randomUUID(),
        id: item.id,
        name: item.name,
        amount: Number(item.manualUnitCost || 0),
        description: '',
        isActive: item.isActive !== false,
        isDefaultExpense: Boolean(item.isDefaultExpense),
        defaultExpenseKey: item.defaultExpenseKey ?? null,
        defaultAmount: item.defaultAmount === null || item.defaultAmount === undefined ? Number(item.manualUnitCost || 0) : Number(item.defaultAmount),
      })));
    setPots((refreshed.costDraft.pots ?? []).map((pot: any) => ({
      key: crypto.randomUUID(),
      id: pot.id,
      name: pot.name ?? 'Saksı',
      color: pot.color ?? '',
      sizeText: [pot.width, pot.length, pot.height, pot.diameter].filter((value) => Number(value) > 0).join(' x '),
      quantity: Number(pot.quantity ?? 1),
      source: pot.source ?? 'AUTO',
      stockCardId: pot.stockCardId ?? '',
      manualUnitCost: Number(pot.manualUnitCost ?? 0),
      automaticUnitCost: Number(pot.automaticUnitCost ?? 0),
    })));
    setShippingCost(Number(refreshed.costDraft.shippingCost || 0));
    setDesi(Number(refreshed.costDraft.desi || 0));
    setProfitMarginPercent(Number(refreshed.costDraft.profitMarginPercent || 45));
    setVatPercent(Number(refreshed.costDraft.vatPercent || 20));
    setMarketplaceMarkupPercent(Number(refreshed.costDraft.marketplaceMarkupPercent || 25));
    setCampaignBufferPercent(Number(refreshed.costDraft.campaignBufferPercent || 10));
  }

  async function copyRecipeFromProduct() {
    if (!copySourceId) {
      setMessage('Kopyalanacak kaynak ürün seçin.');
      return;
    }
    try {
      const result = await api<{ ok: boolean; warning?: string | null }>(`/production-costs/variants/${productId}/copy-recipe`, {
        method: 'POST',
        json: {
          sourceVariantId: copySourceId,
          ...copyOptions,
        },
      });
      setCopyModalOpen(false);
      setCopySourceId(null);
      setCopyQuery('');
      await reloadDetail();
      setMessage(result.warning ?? 'Reçete taslak olarak kopyalandı.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reçete kopyalanamadı.');
    }
  }

  function exportPriceUpdateFile() {
    const rows = [
      ['Barkod', 'Model Kodu', 'Ürün Adı', 'Eski Fiyat', 'Yeni Fiyat', 'Trendyol Fiyatı', 'Hepsiburada Fiyatı', 'N11 Fiyatı', 'Güncelleme Durumu'],
      [
        variant?.barcode ?? '',
        variant?.proposedModelCode || variant?.currentModelCode || '',
        variant?.productName ?? '',
        money(parseMoney(variant?.trendyolSalePrice)),
        money(totals.marketplaceSalePrice),
        money(totals.marketplaceSalePrice),
        money(totals.marketplaceSalePrice),
        money(totals.marketplaceSalePrice),
        'Hazır - API gönderimi yok',
      ],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fiyat-guncelleme-${variant?.barcode ?? productId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const variant = detail?.variant;
  const mainImage = variant?.images?.[0];

  return (
    <AdminShell title="Ürün Maliyet Merkezi">
      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_360px]">
        <section className="panel p-4 xl:sticky xl:top-24 xl:self-start">
          <div className="mb-3">
            {detail?.progress && (
              <div className="mb-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                Tamamlanan: {detail.progress.completed} / {detail.progress.total}
              </div>
            )}
            <TextInput label="Ürün ara" value={productQuery} onChange={setProductQuery} />
            {productResults.length > 0 && (
              <div className="mt-2 max-h-52 overflow-auto rounded-md border border-line bg-white">
                {productResults.map((item) => (
                  <button
                    key={item.id}
                    className="block w-full border-b border-line px-2 py-2 text-left text-xs hover:bg-slate-50"
                    onClick={() => router.push(`/production-costs/products/${item.id}`)}
                  >
                    <div className="line-clamp-1 font-bold">{item.productName}</div>
                    <div className="text-slate-500">{item.barcode} · {item.proposedModelCode || item.currentModelCode || item.supplierStockCode || '-'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mb-3 flex gap-2">
            <Link className="btn btn-secondary min-h-9 flex-1 px-2 text-xs" href="/production-costs"><ArrowLeft size={15} />Liste</Link>
            {detail?.previousProductId && <Link className="btn btn-secondary min-h-9 px-2 text-xs" href={`/production-costs/products/${detail.previousProductId}`}>Önceki</Link>}
            {detail?.nextProductId && <Link className="btn btn-secondary min-h-9 px-2 text-xs" href={`/production-costs/products/${detail.nextProductId}`}>Sonraki</Link>}
          </div>
          <ProductImage src={mainImage} />
          <h2 className="mt-3 text-base font-bold leading-5">{variant?.productName ?? 'Ürün'}</h2>
          <div className="mt-3 grid gap-2 text-xs">
            <Info label="Barkod" value={variant?.barcode ?? '-'} />
            <Info label="Eski model" value={variant?.currentModelCode ?? variant?.supplierStockCode ?? '-'} />
            <Info label="Yeni model" value={variant?.proposedModelCode ?? '-'} />
            <Info label="Boy" value={variant?.detectedSize ?? '-'} />
            <Info label="Mevcut satış" value={money(parseMoney(variant?.trendyolSalePrice))} />
          </div>
          {variant?.trendyolProductUrl && (
            <a className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand" href={variant.trendyolProductUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Trendyol’da aç
            </a>
          )}
          {message && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{message}</div>}
        </section>

        <section className="space-y-3">
          <CompactPanel
            title="Ürün Bilgi Motoru"
            action={
              <button className="btn btn-primary min-h-8 px-2 text-xs" onClick={fillFromKnowledge} disabled={knowledgeLoading}>
                <Brain size={14} />
                {knowledgeLoading ? 'Analiz ediliyor' : 'Ürün Adından Reçete Getir'}
              </button>
            }
          >
            <div className="grid gap-2 text-xs md:grid-cols-4">
              <Info label="Okunan ürün adı" value={variant?.productName ?? '-'} />
              <Info label="Bitki" value={knowledgeResult?.plantType?.name ?? '-'} />
              <Info label="Boy" value={knowledgeResult?.heightCm ? `${knowledgeResult.heightCm} cm` : '-'} />
              <Info label="Saksı" value={knowledgeResult?.potProfile?.name ?? '-'} />
              <Info label="Bambu/Gövde adedi" value={knowledgeResult?.detected?.stemCount ? `${knowledgeResult.detected.stemCount} adet` : '-'} />
            </div>
            {knowledgeResult?.recipeProfile && (
              <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Önerilen reçete: {knowledgeResult.recipeProfile.name}
              </div>
            )}
            {knowledgeResult?.warnings?.length ? (
              <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                {knowledgeResult.warnings.join(' ')}
              </div>
            ) : null}
          </CompactPanel>

          <CompactPanel
            title="Stoklu Malzemeler"
            action={
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary min-h-8 px-2 text-xs" onClick={() => setStoneModalOpen(true)}><Plus size={14} />Yeni Taş Ekle</button>
                <button className="btn btn-primary min-h-8 px-2 text-xs" onClick={() => addMaterial()}><Plus size={14} />Malzeme Ekle</button>
              </div>
            }
          >
            {unverifiedStockCards.length > 0 && !stockWarningAccepted && (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                <div>Bu stok kartının fiziksel sayımı henüz doğrulanmamıştır.</div>
                <div className="mt-1 text-amber-700">{Array.from(new Set(unverifiedStockCards.map((stock) => stock.name))).join(', ')}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded-md bg-amber-600 px-3 py-1.5 text-white" onClick={() => setStockWarningAccepted(true)}>Devam Et</button>
                  <button className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-amber-800" onClick={() => router.push('/production-costs')}>İptal</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {materials.map((item) => (
                <MaterialRow
                  key={item.key}
                  item={item}
                  stockCards={stockCards}
                  onChange={(patch) => updateMaterial(item.key, patch)}
                  onSelectStock={(stockId) => selectStock(item, stockId)}
                  onDelete={() => setMaterials((rows) => rows.filter((row) => row.key !== item.key))}
                />
              ))}
            </div>
          </CompactPanel>

          <CompactPanel
            title="Saksı"
            action={<button className="btn btn-secondary min-h-8 px-2 text-xs" onClick={() => addPot()}><Plus size={14} />Saksı Ekle</button>}
          >
            <div className="space-y-2">
              {pots.length === 0 && <div className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Saksı yoksa boş bırak.</div>}
              {pots.map((pot) => (
                <PotRow
                  key={pot.key}
                  item={pot}
                  stockCards={stockCards}
                  onChange={(patch) => updatePot(pot.key, patch)}
                  onSelectStock={(stockId) => selectPotStock(pot, stockId)}
                  onDelete={() => setPots((rows) => rows.filter((row) => row.key !== pot.key))}
                />
              ))}
            </div>
          </CompactPanel>

          <CompactPanel
            title="Stok Dışı Giderler"
            action={<button className="btn btn-secondary min-h-8 px-2 text-xs" onClick={() => addExpense()}><Plus size={14} />Gider Ekle</button>}
          >
            <div className="space-y-2">
              {expenses.map((item) => (
                <ExpenseRow
                  key={item.key}
                  item={item}
                  onChange={(patch) => updateExpense(item.key, patch)}
                  onDelete={() => setExpenses((rows) => rows.filter((row) => row.key !== item.key))}
                />
              ))}
            </div>
          </CompactPanel>
        </section>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Canlı Özet</h2>
              <div className="text-2xl font-bold text-brand">{money(totals.totalCost)}</div>
            </div>
            <div className="space-y-2">
              <Summary label="Malzeme Toplamı" value={totals.materialTotalValue} />
              <Summary label="Otomatik Giderler" value={totals.automaticExpenseTotal} />
              <Summary label="Manuel Giderler" value={totals.manualExpenseTotal} />
              <Summary label="Toplam Ürün Maliyeti" value={totals.totalCost} strong />
              <NumberField label="KDV oranı" value={vatPercent} onChange={setVatPercent} suffix="%" />
              <Summary label="KDV Tutarı" value={totals.vatAmount} />
              <Summary label="KDV dahil maliyet" value={totals.vatIncludedCost} strong />
              <NumberField label="Kâr oranı" value={profitMarginPercent} onChange={setProfitMarginPercent} suffix="%" />
              {profitMarginPercent < 45 && <Warning text="Erhan Flowers minimum kâr oranı %45'tir." />}
              <Summary label="Kâr Tutarı" value={totals.profitAmount} />
              <Summary label="Dükkan Satış Fiyatı" value={totals.shopSalePrice} strong />
              <NumberField label="Kargo Bedeli" value={shippingCost} onChange={setShippingCost} suffix="TL" />
              <NumberField label="Desi" value={desi} onChange={setDesi} />
              <Summary label="Site Satış Fiyatı" value={totals.siteSalePrice} strong />
              <NumberField label="Pazaryeri Farkı" value={marketplaceMarkupPercent} onChange={setMarketplaceMarkupPercent} suffix="%" />
              <NumberField label="Kampanya Tamponu" value={campaignBufferPercent} onChange={setCampaignBufferPercent} suffix="%" />
              <PriceLine label="Trendyol Fiyatı" value={totals.marketplaceSalePrice} />
              <PriceLine label="Hepsiburada Fiyatı" value={totals.marketplaceSalePrice} />
              <PriceLine label="N11 Fiyatı" value={totals.marketplaceSalePrice} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn btn-secondary justify-center" onClick={() => save(false)}><Save size={16} />Taslak Kaydet</button>
              <button className="btn btn-primary justify-center" onClick={() => save(true)}>Maliyeti Kaydet</button>
              <button className="btn btn-secondary justify-center" onClick={() => setCopyModalOpen(true)}><Copy size={16} />Reçeteyi Kopyala</button>
              <button className="btn btn-secondary justify-center" onClick={copySummary}><Copy size={16} />Özeti Kopyala</button>
              <button className="btn btn-secondary justify-center" onClick={copyRecipe}><Copy size={16} />Reçete Metni</button>
              <button className="btn btn-secondary justify-center" onClick={exportPriceUpdateFile}>Fiyat Dosyası</button>
              <button className="btn btn-primary justify-center" onClick={saveAndNext}>Kaydet ve Sonraki Ürüne Geç</button>
            </div>
          </section>
        </aside>
      </div>
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Reçete Kopyala</h2>
                <p className="mt-1 text-sm text-slate-500">Kaynak ürünü seçin, kopyalanacak alanları işaretleyin.</p>
              </div>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => setCopyModalOpen(false)}>Kapat</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TextInput label="Ürün adı, barkod, model kodu, kategori veya boy ara" value={copyQuery} onChange={setCopyQuery} />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <CopyOption label="Malzemeleri kopyala" checked={copyOptions.copyMaterials} onChange={(value) => setCopyOptions({ ...copyOptions, copyMaterials: value })} />
                <CopyOption label="Giderleri kopyala" checked={copyOptions.copyExpenses} onChange={(value) => setCopyOptions({ ...copyOptions, copyExpenses: value })} />
                <CopyOption label="Kargo ve desiyi kopyala" checked={copyOptions.copyShippingAndDesi} onChange={(value) => setCopyOptions({ ...copyOptions, copyShippingAndDesi: value })} />
                <CopyOption label="Fiyat oranlarını kopyala" checked={copyOptions.copyPriceRates} onChange={(value) => setCopyOptions({ ...copyOptions, copyPriceRates: value })} />
              </div>
            </div>
            <div className="mt-4 max-h-80 overflow-auto rounded-md border border-line">
              {copyResults.map((item) => (
                <button
                  key={item.id}
                  className={`block w-full border-b border-line px-3 py-3 text-left text-sm hover:bg-slate-50 ${copySourceId === item.id ? 'bg-emerald-50' : 'bg-white'}`}
                  onClick={() => setCopySourceId(item.id)}
                >
                  <div className="font-bold">{item.productName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.barcode} · {item.proposedModelCode || item.currentModelCode || item.supplierStockCode || '-'} · {item.trendyolCategoryName || '-'} · {item.detectedSize || '-'}
                  </div>
                </button>
              ))}
              {copyResults.length === 0 && <div className="px-3 py-4 text-sm font-semibold text-slate-500">Sonuç bulunamadı.</div>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setCopyModalOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={copyRecipeFromProduct}>Seçili Reçeteyi Taslak Olarak Kopyala</button>
            </div>
          </div>
        </div>
      )}
      {stoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Yeni Taş Stok Kartı</h2>
                <p className="mt-1 text-sm text-slate-500">Bu kayıt gerçek stok kartı olarak oluşturulur ve maliyet formunda seçilir.</p>
              </div>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => setStoneModalOpen(false)}>Kapat</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TextInput label="Stok kartı adı" value={stoneForm.name} onChange={(name) => setStoneForm({ ...stoneForm, name })} />
              <TextInput label="Taş türü" value={stoneForm.productType} onChange={(productType) => setStoneForm({ ...stoneForm, productType })} />
              <TextInput label="Renk" value={stoneForm.color} onChange={(color) => setStoneForm({ ...stoneForm, color })} />
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Birim</span>
                <select className="w-full rounded-md border border-line bg-white px-2 py-1.5" value={stoneForm.unit} onChange={(event) => setStoneForm({ ...stoneForm, unit: event.target.value })}>
                  <option value="KG">KG</option>
                  <option value="Çuval">Çuval</option>
                  <option value="Paket">Paket</option>
                  <option value="Adet">Adet</option>
                </select>
              </label>
              <NumberField compact label="Alış fiyatı" value={stoneForm.purchasePrice} onChange={(purchasePrice) => setStoneForm({ ...stoneForm, purchasePrice })} />
              <NumberField compact label="Minimum stok" value={stoneForm.criticalStockLevel} onChange={(criticalStockLevel) => setStoneForm({ ...stoneForm, criticalStockLevel })} />
              <NumberField compact label="Mevcut stok" value={stoneForm.stockQuantity} onChange={(stockQuantity) => setStoneForm({ ...stoneForm, stockQuantity })} />
              <TextInput label="Tedarikçi" value={stoneForm.supplierName} onChange={(supplierName) => setStoneForm({ ...stoneForm, supplierName })} />
              <label className="block md:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Açıklama</span>
                <textarea className="min-h-20 w-full rounded-md border border-line px-2 py-1.5 outline-none focus:border-brand" value={stoneForm.description} onChange={(event) => setStoneForm({ ...stoneForm, description: event.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Durum</span>
                <select className="w-full rounded-md border border-line bg-white px-2 py-1.5" value={stoneForm.status} onChange={(event) => setStoneForm({ ...stoneForm, status: event.target.value as StoneStockForm['status'] })}>
                  <option value="ACTIVE">Aktif</option>
                  <option value="PASSIVE">Pasif</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setStoneModalOpen(false)}>İptal</button>
              <button className="btn btn-primary" onClick={createStoneStockCard}>Stok Kartını Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function starterMaterials(): MaterialItem[] {
  return [
    materialSeed('Yaprak', 'LEAF_TRUNK', 'adet'),
    materialSeed('G\u00f6vde', 'LEAF_TRUNK', 'adet', 1),
  ];
}

function starterExpenses(): ExpenseItem[] {
  return [
    defaultExpenseSeed('Genel Gider + Kira', 100, 'genel-kira', true),
    defaultExpenseSeed('Al\u00e7\u0131 + Strafor + Paketleme + Karton + Silikon', 100, 'sarf-toplam', true),
    defaultExpenseSeed('Elektrik + Su + \u0130\u015f\u00e7ilik', 100, 'elektrik-su-iscilik', true),
  ];
}

function defaultExpenseSeed(name: string, amount: number, key: string, isActive: boolean): ExpenseItem {
  return { key: crypto.randomUUID(), name, amount, description: '', isActive, isDefaultExpense: true, defaultExpenseKey: key, defaultAmount: amount };
}

function materialSeed(name: string, group: CostGroup, unit: string, quantity = 0): MaterialItem {
  return { key: crypto.randomUUID(), name, group, unit, quantity, source: 'AUTO', stockCardId: '', manualUnitCost: 0, automaticUnitCost: 0 };
}

function CompactPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel p-3"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="font-bold">{title}</h2>{action}</div>{children}</section>;
}

function CopyOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-slate-50 px-2 py-2 font-semibold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function ProductImage({ src }: { src?: string }) {
  if (!src) return <div className="flex aspect-square w-full items-center justify-center rounded-md border border-line bg-slate-50 text-slate-400"><ImageIcon size={30} /></div>;
  return <img className="aspect-square w-full rounded-md border border-line object-cover" src={normalizeImage(src)} alt="Ürün görseli" />;
}

function MaterialRow({ item, stockCards, onChange, onSelectStock, onDelete }: {
  item: MaterialItem;
  stockCards: StockCard[];
  onChange: (patch: Partial<MaterialItem>) => void;
  onSelectStock: (stockId: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-line bg-white p-2 text-xs xl:grid-cols-[1.1fr_82px_96px_1.2fr_84px_32px] xl:items-end">
      <TextInput label="Malzeme" value={item.name} onChange={(value) => onChange({ name: value })} />
      <NumberField compact label="Miktar" value={item.quantity} onChange={(value) => onChange({ quantity: value })} />
      <ReadonlyField label="Kullanım birimi" value={item.unit || 'adet'} />
      {item.source === 'AUTO' ? <StockSelect value={item.stockCardId} stockCards={stockCards} onChange={onSelectStock} /> : <NumberField compact label="Manuel" value={item.manualUnitCost} onChange={(value) => onChange({ manualUnitCost: value })} />}
      <label className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-2 font-semibold">
        <input type="checkbox" checked={item.source === 'MANUAL'} onChange={(event) => onChange({ source: event.target.checked ? 'MANUAL' : 'AUTO' })} />
        Manuel
      </label>
      <button className="rounded-md border border-line p-2 text-red-700" onClick={onDelete}><Trash2 size={16} /></button>
      <div className="xl:col-span-6 flex flex-wrap items-center justify-end gap-3 font-bold text-brand">
        <span>Kullanım miktarı: {Number(item.quantity || 0).toLocaleString('tr-TR')} {item.unit || 'adet'}</span>
        <span>Birim maliyet: {money4(item.source === 'MANUAL' ? item.manualUnitCost : item.automaticUnitCost)}</span>
        <span>Toplam: {money(materialTotal(item))}</span>
      </div>
    </div>
  );
}

function PotRow({ item, stockCards, onChange, onSelectStock, onDelete }: {
  item: PotItem;
  stockCards: StockCard[];
  onChange: (patch: Partial<PotItem>) => void;
  onSelectStock: (stockId: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-line bg-white p-2 text-xs xl:grid-cols-[1fr_80px_90px_70px_1.1fr_32px] xl:items-end">
      <TextInput label="Saksı adı" value={item.name} onChange={(value) => onChange({ name: value })} />
      <TextInput label="Renk" value={item.color} onChange={(value) => onChange({ color: value })} />
      <TextInput label="Ölçü" value={item.sizeText} onChange={(value) => onChange({ sizeText: value })} />
      <NumberField compact label="Adet" value={item.quantity} onChange={(value) => onChange({ quantity: value })} />
      {item.source === 'AUTO' ? <StockSelect value={item.stockCardId} stockCards={stockCards} onChange={onSelectStock} /> : <NumberField compact label="Fiyat" value={item.manualUnitCost} onChange={(value) => onChange({ manualUnitCost: value })} />}
      <button className="rounded-md border border-line p-2 text-red-700" onClick={onDelete}><Trash2 size={16} /></button>
      <label className="xl:col-span-3 flex items-center gap-2 rounded-md bg-slate-50 px-2 py-2 font-semibold">
        <input type="checkbox" checked={item.source === 'MANUAL'} onChange={(event) => onChange({ source: event.target.checked ? 'MANUAL' : 'AUTO' })} />
        Manuel saksı fiyatı
      </label>
      <div className="xl:col-span-3 flex flex-wrap items-center justify-end gap-3 font-bold text-brand">
        <span>Birim maliyet: {money4(item.source === 'MANUAL' ? item.manualUnitCost : item.automaticUnitCost)}</span>
        <span>Toplam: {money(potTotal(item))}</span>
      </div>
    </div>
  );
}

function ExpenseRow({ item, onChange, onDelete }: { item: ExpenseItem; onChange: (patch: Partial<ExpenseItem>) => void; onDelete: () => void }) {
  return (
    <div className={`grid gap-2 rounded-md border p-2 text-xs xl:grid-cols-[1fr_90px_92px_96px_32px] xl:items-end ${item.isActive ? 'border-line bg-white' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
      <TextInput label="Gider adı" value={item.name} onChange={(value) => onChange({ name: value })} />
      <NumberField compact label="Fiyat" value={item.amount} onChange={(value) => onChange({ amount: value })} />
      <label className="flex items-center gap-2 rounded-md bg-white px-2 py-2 font-semibold">
        <input type="checkbox" checked={item.isActive} onChange={(event) => onChange({ isActive: event.target.checked })} />
        {item.isActive ? 'Aktif' : 'Pasif'}
      </label>
      <button
        className="rounded-md border border-line bg-white px-2 py-2 font-semibold text-slate-700"
        onClick={() => onChange({ amount: Number(item.defaultAmount ?? item.amount), isActive: true })}
        type="button"
      >
        Varsayılana dön
      </button>
      <button className="rounded-md border border-line p-2 text-red-700" onClick={onDelete}><Trash2 size={16} /></button>
      <div className="xl:col-span-5 text-right font-bold text-brand">Toplam: {money(item.isActive ? item.amount : 0)}</div>
    </div>
  );
}

function StockSelect({ value, onChange, stockCards }: { value: number | ''; onChange: (value: string) => void; stockCards: StockCard[] }) {
  const [query, setQuery] = useState('');
  const selected = stockCards.find((stock) => stock.id === Number(value));
  const needle = query.trim().toLocaleLowerCase('tr-TR');
  const filtered = (needle
    ? stockCards.filter((stock) => [stock.name, stock.sku, stock.category, stock.color, stock.model, stock.size].filter(Boolean).some((field) => String(field).toLocaleLowerCase('tr-TR').includes(needle)))
    : stockCards).slice(0, 60);
  return (
    <div>
      <input className="mb-1 w-full rounded-md border border-line px-2 py-1.5 outline-none focus:border-brand" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={selected?.name ?? 'Stok ara'} />
      <select className="w-full rounded-md border border-line bg-white px-2 py-1.5" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Stok kartı</option>
        {selected && !filtered.some((stock) => stock.id === selected.id) && <option value={selected.id}>{selected.name}</option>}
        {filtered.map((stock) => <option key={stock.id} value={stock.id}>{stock.name} - {money4(Number(stock.automaticUnitCost || 0))} / {stock.unit}</option>)}
      </select>
      {selected && <Link className="mt-1 inline-flex items-center gap-1 font-semibold text-brand" href={`/stock-cards?stockCardId=${selected.id}`} target="_blank"><ExternalLink size={12} />Aç</Link>}
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span><input className="w-full rounded-md border border-line px-2 py-1.5 outline-none focus:border-brand" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      <div className="rounded-md border border-line bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, compact = false }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; compact?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      <div className="flex rounded-md border border-line bg-white focus-within:border-brand">
        <input className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} min-w-0 flex-1 rounded-md text-sm outline-none`} type="number" min="0" step="0.01" value={value === 0 ? '' : value} onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
        {suffix && <span className="flex items-center px-2 text-xs font-semibold text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 px-2 py-1.5"><span className="text-[11px] font-semibold text-slate-400">{label}</span><div className="font-semibold text-slate-700">{value}</div></div>;
}

function Summary({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-base font-bold' : 'text-sm'}`}><span className="text-slate-500">{label}</span><span className="font-bold">{money(value)}</span></div>;
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
      <div className="text-xs font-semibold text-emerald-700">{label}</div>
      <div className="mt-1 text-lg font-bold text-emerald-900">{money(value)}</div>
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{text}</div>;
}

function hydrateMaterialItem(item: any, stockCards: StockCard[]): MaterialItem {
  const stockCardId = item.stockCardId ? Number(item.stockCardId) : '';
  const stock = stockCardId ? stockCards.find((card) => card.id === stockCardId) : undefined;
  const quantity = Number(item.quantity ?? 0);
  const automaticUnitCost = stockUnitCost(stock) || Number(item.automaticUnitCost ?? 0);
  return {
    ...item,
    key: crypto.randomUUID(),
    stockCardId,
    quantity,
    manualUnitCost: Number(item.manualUnitCost ?? 0),
    automaticUnitCost,
    totalCost: Number(item.totalCost ?? quantity * automaticUnitCost),
  };
}

function hydratePotItem(pot: any, stockCards: StockCard[]): PotItem {
  const stockCardId = pot.stockCardId ? Number(pot.stockCardId) : '';
  const stock = stockCardId ? stockCards.find((card) => card.id === stockCardId) : undefined;
  const quantity = Number(pot.quantity ?? 1);
  const automaticUnitCost = stockUnitCost(stock) || Number(pot.automaticUnitCost ?? 0);
  return {
    key: crypto.randomUUID(),
    id: pot.id,
    name: pot.name ?? 'Saksı',
    color: pot.color ?? '',
    sizeText: [pot.width, pot.length, pot.height, pot.diameter].filter((value) => Number(value) > 0).join(' x '),
    quantity,
    source: pot.source ?? 'AUTO',
    stockCardId,
    manualUnitCost: Number(pot.manualUnitCost ?? 0),
    automaticUnitCost,
    totalCost: Number(pot.totalCost ?? quantity * automaticUnitCost),
  };
}

function materialTotal(item: MaterialItem) {
  const quantity = Number(item.quantity || 0);
  const unitCost = Number(item.source === 'MANUAL' ? item.manualUnitCost : item.automaticUnitCost) || 0;
  const liveTotal = quantity * unitCost;
  return liveTotal > 0 ? liveTotal : Number(item.totalCost || 0);
}

function potTotal(item: PotItem) {
  const quantity = Number(item.quantity || 0);
  const unitCost = Number(item.source === 'MANUAL' ? item.manualUnitCost : item.automaticUnitCost) || 0;
  const liveTotal = quantity * unitCost;
  return liveTotal > 0 ? liveTotal : Number(item.totalCost || 0);
}

function knowledgeComponentLabel(value: KnowledgeRecipeItem['componentType']) {
  const labels: Record<KnowledgeRecipeItem['componentType'], string> = {
    LEAF: 'Yaprak',
    TRUNK: 'Gövde',
    POT: 'Saksı',
    CONSUMABLE: 'Sarf Malzeme',
    LABOR: 'İşçilik',
    ELECTRICITY: 'Elektrik',
    PACKAGING: 'Paketleme',
    OTHER: 'Diğer',
  };
  return labels[value] ?? 'Malzeme';
}

function knowledgeComponentGroup(value: KnowledgeRecipeItem['componentType']): CostGroup {
  if (value === 'LEAF' || value === 'TRUNK') return 'LEAF_TRUNK';
  if (value === 'POT') return 'POT';
  if (value === 'PACKAGING') return 'PACKAGING';
  if (value === 'LABOR' || value === 'ELECTRICITY' || value === 'OTHER') return 'OTHER';
  return 'CONSUMABLE';
}

function normalizeImage(path: string) {
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return apiFileUrl(path);
  return path;
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').replace('%', '').replace(/[^\d.,-]/g, '');
  if (!raw) return 0;

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(raw.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.')) || 0;
  }

  if (lastComma > -1) {
    return Number(raw.replace(',', '.')) || 0;
  }

  if (lastDot > -1) {
    const decimals = raw.length - lastDot - 1;
    if (decimals > 0 && decimals <= 2) return Number(raw) || 0;
    return Number(raw.replaceAll('.', '')) || 0;
  }

  return Number(raw) || 0;
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function money4(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} TL`;
}

function stockUnitCost(stock?: Pick<StockCard, 'purchasePrice' | 'packageContent' | 'automaticUnitCost' | 'manualUnitCostEnabled' | 'manualUnitCost'> | KnowledgeStockCard) {
  if (!stock) return 0;
  if (stock.manualUnitCostEnabled) return Number(stock.manualUnitCost || 0);
  const purchasePrice = Number(stock.purchasePrice || 0);
  const packageContent = Number(stock.packageContent || 0);
  if (purchasePrice > 0 && packageContent > 0) return purchasePrice / packageContent;
  return Number(stock.automaticUnitCost || 0);
}
