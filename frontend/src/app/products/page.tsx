'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Boxes, Calculator, CheckCircle2, Copy, Edit3, ExternalLink, Eye, FileText, ImageIcon, PackagePlus, Plus, Printer, RefreshCw, Save, Search, Send, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiBaseUrl, apiFileUrl } from '@/lib/api';
import type { Category, CurrentUser, MediaFile } from '@/types';
import trendyolFieldMap from '@/config/channel-field-maps/trendyol-yapay-kuru-cicek.json';

type Entry = {
  id: number;
  variantId: number;
  productId: number | null;
  productName: string;
  barcode: string;
  modelCode: string;
  stockCode?: string;
  categoryId: number | null;
  categoryName: string | null;
  familyId: number | null;
  familyName: string | null;
  sizeOptionId: number | null;
  potOptionId: number | null;
  templateId: number | null;
  brand: string;
  channelCategoryName: string;
  colorVariant: string;
  description: string;
  stockQuantity: number;
  salePrice: number;
  commissionPercent: number;
  images: string[];
  costStatus: string;
  totalCost: number;
  seoApprovalStatus: string;
  status: 'ACTIVE' | 'PASSIVE';
};

type Family = {
  id: number;
  familyName: string;
  templates?: Array<{ id: number; templateName: string }>;
  sizeOptions?: Array<{ id: number; sizeLabel: string }>;
  potOptions?: Array<{ id: number; potName: string }>;
};

type CostDetail = {
  hasSavedCostDraft?: boolean;
  costDraft: {
    status?: string;
    salePrice: number;
    profitMarginPercent: number;
    commissionPercent: number;
    vatPercent: number;
    shippingCost: number;
    desi: number;
    marketplaceMarkupPercent: number;
    campaignBufferPercent: number;
    totalCost?: number;
    items: Array<{ name: string; group: string; quantity: number; unit: string; source: string; stockCardId: number | null; manualUnitCost: number; automaticUnitCost: number; totalCost?: number; isActive?: boolean; isDefaultExpense?: boolean; defaultExpenseKey?: string | null; defaultAmount?: number }>;
    pots: Array<{ name: string; potType?: string | null; color?: string | null; quantity: number; unit?: string; source: string; stockCardId: number | null; manualUnitCost: number; automaticUnitCost: number; totalCost?: number }>;
  };
};

type StockCard = {
  id: number;
  name: string;
  sku?: string | null;
  category?: string | null;
  model?: string | null;
  barcode?: string | null;
  potColor?: string | null;
  productFamily?: string | null;
  productType?: string | null;
  unit: string;
  automaticUnitCost: number;
  manualUnitCost: number;
  stockQuantity: number;
  status?: 'ACTIVE' | 'PASSIVE';
};

type ComponentRole = 'LEAF' | 'TRUNK' | 'FLOWER' | 'BRANCH' | 'POT' | 'STONE' | 'PACKAGING' | 'CONSUMABLE' | 'AUXILIARY' | 'OTHER';

type DefaultExpense = {
  id: number;
  expenseKey: string;
  name: string;
  defaultAmount: number;
  isActive: boolean;
  status: 'ACTIVE' | 'PASSIVE';
};

type PricingSummary = {
  materialCost: number;
  shippingCost: number;
  costWithShipping: number;
  shopSalePrice: number;
  siteSalePrice: number;
  ecommerceMarkup35Amount: number;
  vatAmount: number;
  commissionAmount: number;
  marketplaceBufferAmount: number;
  campaignBufferAmount: number;
  targetProfitAmount: number;
  enteredSalePrice: number;
  estimatedNetProfit: number;
  estimatedProfitRate: number;
  suggestedSalePrice: number;
  minimumSalePrice: number;
};

type ChannelPricing = {
  key: string;
  label: string;
  salePrice: number;
  netPriceWithoutVat: number;
  vatPercent: number;
  vatAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  shippingCost: number;
  customerShippingCharge: number;
  businessShippingCost: number;
  paymentFeePercent: number;
  paymentFeeAmount: number;
  serviceFee: number;
  otherExpense: number;
  netProfit: number;
  netMarginPercent: number;
  suggestedMinimumSalePrice: number;
  status: 'Uygun' | 'Eksik veri';
};

type GeminiSeoResult = {
  productName: string;
  description: string;
};

type ExcelExportResult = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  total: number;
  missingByProduct: Array<{ id: number; productName: string; missingFields: string[] }>;
};

type QuickForm = {
  productName: string;
  categoryId: string;
  productType: string;
  sizeVariant: string;
  shopPrice: number;
  sitePrice: number;
  initialStockQuantity: number;
  mainImageUrl: string;
};

type QuickResult = {
  productId: number;
  variantId: number;
  stockCardId: number | null;
  productName: string;
  modelCode: string;
  stockCode: string;
  barcode: string;
  initialStockQuantity: number;
  shopPrice: number;
  sitePrice: number;
};

type PriceResearch = {
  productName: string;
  competitorPrices: string[];
  note: string;
};

type AutoStockCardCandidate = {
  id: number;
  name: string;
  sku: string | null;
  model: string | null;
  barcode: string | null;
  category: string | null;
  status: 'ACTIVE' | 'PASSIVE';
  createdAt: string;
  stockQuantity: number;
  movementCount: number;
  linkedRecipeCount: number;
  productName: string | null;
  hardDeleteAllowed: boolean;
  recommendedAction: 'hard-delete' | 'passive';
  warning: string | null;
};

type CompositeBuilder = {
  productStockCardId: string;
  potStockCardId: string;
};

const emptyForm = {
  variantId: '',
  productId: '',
  productName: '',
  barcode: '',
  modelCode: '',
  stockCode: '',
  categoryId: '',
  familyId: '',
  sizeOptionId: '',
  potOptionId: '',
  templateId: '',
  brand: 'Erhan Flowers',
  channelCategoryName: '',
  colorVariant: '',
  description: '',
  stockQuantity: 0,
  salePrice: 0,
  commissionPercent: 20,
  images: [] as string[],
  status: 'ACTIVE' as 'ACTIVE' | 'PASSIVE',
};

const emptyQuickForm: QuickForm = {
  productName: '',
  categoryId: '',
  productType: '',
  sizeVariant: '',
  shopPrice: 0,
  sitePrice: 0,
  initialStockQuantity: 0,
  mainImageUrl: '',
};

const emptyPriceResearch: PriceResearch = {
  productName: '',
  competitorPrices: ['', '', ''],
  note: '',
};

const emptyCompositeBuilder: CompositeBuilder = {
  productStockCardId: '',
  potStockCardId: '',
};

const steps = ['Ürün Bilgileri', 'Reçete/Malzeme', 'Maliyet/Fiyat', 'Görsel/SEO', 'Kanallara Gönder'];
const visibleStepIndexes = [0, 1, 2, 3, 4] as const;
const channels = ['SHOP', 'SITE', 'TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX'] as const;
const publishableChannels = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX'] as const;
const treeVisualSlots = [
  { title: '01 Beyaz ana görsel', detail: 'Pazaryeri ana fotoğrafı: beyaz fon, ürün ortada, tam boy.' },
  { title: '02 Otel lobisi / dükkan', detail: 'Ağaç gerçek showroom, mağaza veya otel lobisinde duruyormuş gibi.' },
  { title: '03 Modern salon / ofis', detail: 'Ev veya kurumsal kullanım için salon/ofis köşesinde doğal görünüm.' },
  { title: '04 Yakın detay', detail: 'Yaprak, gövde, saksı, taş ve malzeme kalitesini gösteren yakın çekim.' },
  { title: '05 Giriş / ölçü algısı', detail: 'Kapı, konsol veya koridor yanında ürün boyunu anlatan kullanım görseli.' },
];
const treeVisualImageLimit = treeVisualSlots.length;
const treeVisualSourceReadyText = '1 ana görsel seçildi. ChatGPT bu görselden standart 5 görsel hazırlayacak; ayrı ayrı görsel seçmene gerek yok.';

export default function ProductsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [importingExcel, setImportingExcel] = useState(false);
  const [openingTrendyolPanel, setOpeningTrendyolPanel] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [defaultExpenses, setDefaultExpenses] = useState<DefaultExpense[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [sourceRecipeId, setSourceRecipeId] = useState('');
  const [costDetail, setCostDetail] = useState<CostDetail | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['SHOP', 'SITE', 'TRENDYOL']);
  const [allowIncomplete, setAllowIncomplete] = useState(true);
  const [query, setQuery] = useState('');
  const [familyPickerOpen, setFamilyPickerOpen] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [message, setMessage] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendingChannels, setSendingChannels] = useState(false);
  const [quickForm, setQuickForm] = useState(emptyQuickForm);
  const [quickResult, setQuickResult] = useState<QuickResult | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickKeepCategory, setQuickKeepCategory] = useState(true);
  const [quickKeepProductType, setQuickKeepProductType] = useState(true);
  const [quickKeepPrices, setQuickKeepPrices] = useState(true);
  const [compositeBuilder, setCompositeBuilder] = useState(emptyCompositeBuilder);
  const [cleanupItems, setCleanupItems] = useState<AutoStockCardCandidate[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showPassiveEntries, setShowPassiveEntries] = useState(false);
  const [productListOpen, setProductListOpen] = useState(false);
  const [identityGenerating, setIdentityGenerating] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [treeVisualOpen, setTreeVisualOpen] = useState(false);
  const [treeVisualGenerating, setTreeVisualGenerating] = useState(false);
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const [stockCardsLoading, setStockCardsLoading] = useState(false);
  const [priceResearch, setPriceResearch] = useState(emptyPriceResearch);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [missingPanelOpen, setMissingPanelOpen] = useState(false);

  async function load() {
    const [entryData, categoryData, familyData, mediaData, stockCardData, defaultExpenseData, userData] = await Promise.all([
      api<Entry[]>('/product-center/entries').catch(() => []),
      api<Category[]>('/categories').catch(() => []),
      api<Family[]>('/production-costs/families').catch(() => []),
      api<MediaFile[]>('/media').catch(() => []),
      api<StockCard[]>('/stock-cards').catch(() => []),
      api<DefaultExpense[]>('/production-costs/default-expenses').catch(() => []),
      api<CurrentUser>('/auth/me').catch(() => null),
    ]);
    setEntries(entryData.map(normalizeEntry));
    setCategories(categoryData.map((category) => ({ ...category, name: cleanText(category.name) })));
    setFamilies(familyData.map(normalizeFamily));
    setMediaFiles(mediaData);
    setStockCards(normalizeStockCards(stockCardData));
    setCurrentUser(userData);
    setDefaultExpenses(defaultExpenseData.map((expense) => ({
      ...expense,
      name: cleanText(expense.name),
      defaultAmount: Number(expense.defaultAmount || 0),
    })));
  }

  async function downloadUnlinkedExcel() {
    try {
      const result = await api<{ fileName: string; mimeType: string; contentBase64: string; total: number }>('/product-center/export/excel');
      const binary = atob(result.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const url = window.URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage(`${result.total} bağlanmamış ürün Excel'e aktarıldı.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Excel dışa aktarılamadı.');
    }
  }

  async function importExcelFile(file: File) {
    setImportingExcel(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const result = await api<{ ok: boolean; total: number; created: number; updated: number; errors: Array<{ row: number; message: string }> }>('/product-center/import/excel', {
        method: 'POST',
        body: data,
      });
      const summary = `${result.total} satır işlendi: ${result.created} yeni bağlandı, ${result.updated} güncellendi.`;
      setMessage(result.errors.length ? `${summary} ${result.errors.length} satırda hata: ${result.errors.slice(0, 5).map((error) => `Satır ${error.row}: ${error.message}`).join(' | ')}` : summary);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Excel yüklenemedi.');
    } finally {
      setImportingExcel(false);
    }
  }

  async function refreshStockCards() {
    setStockCardsLoading(true);
    try {
      const stockCardData = await api<StockCard[]>('/stock-cards');
      setStockCards(normalizeStockCards(stockCardData));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Stok kartları güncellenemedi.');
    } finally {
      setStockCardsLoading(false);
    }
  }

  async function openComponentPicker() {
    setComponentPickerOpen(true);
    await refreshStockCards();
  }

  async function loadCleanupItems() {
    setCleanupLoading(true);
    try {
      setCleanupItems(await api<AutoStockCardCandidate[]>('/product-center/cleanup/auto-stock-cards'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deneme stok kartları listelenemedi.');
    } finally {
      setCleanupLoading(false);
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    const id = Number(new URLSearchParams(window.location.search).get('variantId'));
    if (id) api<Entry>(`/product-center/entries/${id}`).then((entry) => editEntry(normalizeEntry(entry))).catch(() => null);
  }, []);

  useEffect(() => {
    if (form.variantId || !form.productName.trim() || !form.categoryId) return;
    if (form.barcode && form.modelCode && form.stockCode) return;
    const timer = window.setTimeout(() => {
      generateIdentity('all', true).catch(() => setIdentityGenerating(false));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [form.variantId, form.productName, form.categoryId, form.colorVariant, form.barcode, form.modelCode, form.stockCode]);

  const family = useMemo(() => families.find((item) => String(item.id) === form.familyId), [families, form.familyId]);
  const filteredFamilies = useMemo(() => {
    const needle = familySearch.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return families;
    return families.filter((item) => [item.familyName, ...((item.templates ?? []).map((template) => template.templateName))].join(' ').toLocaleLowerCase('tr-TR').includes(needle));
  }, [families, familySearch]);
  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    const baseEntries = showPassiveEntries ? entries : entries.filter((entry) => entry.status !== 'PASSIVE');
    if (!needle) return baseEntries;
    return baseEntries.filter((entry) => [entry.productName, entry.barcode, entry.modelCode, entry.familyName, entry.categoryName].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(needle));
  }, [entries, query, showPassiveEntries]);
  const copySources = useMemo(() => entries.filter((entry) => entry.variantId !== Number(form.variantId) && entry.costStatus !== 'Maliyet Girilmedi'), [entries, form.variantId]);
  const activeDraft = costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent));
  const currentCostStatus = costDetail?.hasSavedCostDraft
    ? costDetail.costDraft.status === 'APPROVED' ? 'Tamamlandı' : 'Taslak'
    : entries.find((entry) => entry.variantId === Number(form.variantId))?.costStatus ?? 'Maliyet Girilmedi';
  const pricing = useMemo(() => calculatePricing(activeDraft, Number(form.salePrice), Number(form.commissionPercent)), [activeDraft, form.salePrice, form.commissionPercent]);
  const channelPricing = useMemo(() => calculateChannelPricing(activeDraft, Number(form.salePrice), Number(form.commissionPercent)), [activeDraft, form.salePrice, form.commissionPercent]);
  const priceResearchSummary = useMemo(() => calculatePriceResearch(priceResearch, pricing.suggestedSalePrice), [priceResearch, pricing.suggestedSalePrice]);
  const productStockMatches = useMemo(() => stockCards
    .filter((stockCard) => stockCard.status !== 'PASSIVE')
    .map((stockCard) => ({ stockCard, score: stockSuggestionScore(stockCard, form.productName, form.productName, form.productName) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.stockCard.name.localeCompare(b.stockCard.name, 'tr'))
    .slice(0, 8), [stockCards, form.productName]);
  const productStockSuggestions = useMemo(() => productStockMatches.map((item) => item.stockCard), [productStockMatches]);
  const bestAutoStockMatch = productStockMatches[0]?.score >= 18 ? productStockMatches[0].stockCard : null;
  const activeStockCardOptions = useMemo(() => stockCards
    .filter((stockCard) => stockCard.status !== 'PASSIVE')
    .sort((a, b) => a.name.localeCompare(b.name, 'tr')), [stockCards]);
  const compositeProductOptions = useMemo(() => activeStockCardOptions.filter((stockCard) => inferComponentRole(stockCard) !== 'POT'), [activeStockCardOptions]);
  const compositePotOptions = useMemo(() => activeStockCardOptions.filter((stockCard) => inferComponentRole(stockCard) === 'POT'), [activeStockCardOptions]);
  const selectedCompositeProduct = useMemo(() => stockCards.find((stockCard) => stockCard.id === Number(compositeBuilder.productStockCardId)) ?? null, [compositeBuilder.productStockCardId, stockCards]);
  const selectedCompositePot = useMemo(() => stockCards.find((stockCard) => stockCard.id === Number(compositeBuilder.potStockCardId)) ?? null, [compositeBuilder.potStockCardId, stockCards]);
  const compositeReady = Boolean(selectedCompositeProduct && selectedCompositePot);
  const seoProductNameSuggestion = useMemo(() => buildSeoProductName(form.productName, bestAutoStockMatch, categories, activeDraft), [form.productName, bestAutoStockMatch, categories, activeDraft]);
  const suggestedMediaFiles = useMemo(() => {
    const productText = normalizeSearchText([form.productName, form.modelCode, form.stockCode, form.barcode].filter(Boolean).join(' '));
    return mediaFiles
      .map((file) => {
        const fileText = normalizeSearchText([file.fileName, file.folderName, file.filePath].filter(Boolean).join(' '));
        const score = productText && fileText.includes(productText) ? 30 : searchTokens(productText).filter((token) => fileText.includes(token)).length * 8;
        return { file, score };
      })
      .sort((a, b) => b.score - a.score || new Date(b.file.createdAt).getTime() - new Date(a.file.createdAt).getTime())
      .slice(0, 60)
      .map((item) => item.file);
  }, [mediaFiles, form.productName, form.modelCode, form.stockCode, form.barcode]);
  const missing = useMemo(() => {
    const list = [];
    if (!form.productName.trim()) list.push('Ürün adı');
    if (!form.categoryId) list.push('Kategori');
    if (!form.description.trim()) list.push('Açıklama');
    if (Number(form.salePrice) <= 0) list.push('Satış fiyatı');
    if (form.images.length === 0) list.push('Ana görsel');
    return list;
  }, [form]);
  const ownerMode = currentUser?.role === 'OWNER';
  const preparation = useMemo(() => buildPreparationStatus(form, activeDraft, currentCostStatus), [activeDraft, currentCostStatus, form]);
  const trendyolReadiness = useMemo(() => buildTrendyolReadiness(form, activeDraft), [activeDraft, form]);
  const canResearch = preparation.blockingMissing.length === 0 && trendyolReadiness.blockingMissing.length === 0;
  const saleStageLabel = salePreparationStage(preparation, trendyolReadiness, canResearch);

  function update(name: string, value: unknown) {
    setForm((current) => {
      if (name === 'categoryId') {
        const category = categories.find((item) => String(item.id) === String(value));
        return { ...current, categoryId: value as string, channelCategoryName: category?.name ?? current.channelCategoryName };
      }
      return { ...current, [name]: value };
    });
  }

  function updatePriceResearch(name: keyof PriceResearch, value: unknown) {
    setPriceResearch((current) => ({ ...current, [name]: value }));
  }

  function updateCompetitorPrice(index: number, value: string) {
    setPriceResearch((current) => ({
      ...current,
      competitorPrices: current.competitorPrices.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  }

  function addCompetitorPriceRow() {
    setPriceResearch((current) => ({ ...current, competitorPrices: [...current.competitorPrices, ''] }));
  }

  function openResearchUrl(target: 'GOOGLE' | 'SHOPPING' | 'TRENDYOL' | 'HEPSIBURADA') {
    const query = (priceResearch.productName || form.productName || seoProductNameSuggestion || '').trim();
    if (!query) {
      setMessage('Fiyat araştırması için önce ürün adı yazın.');
      return;
    }

    const encoded = encodeURIComponent(query);
    const urls = {
      GOOGLE: `https://www.google.com/search?q=${encoded}+fiyat`,
      SHOPPING: `https://www.google.com/search?tbm=shop&q=${encoded}`,
      TRENDYOL: `https://www.trendyol.com/sr?q=${encoded}`,
      HEPSIBURADA: `https://www.hepsiburada.com/ara?q=${encoded}`,
    };
    const opened = window.open(urls[target], '_blank');
    if (!opened) {
      window.location.href = urls[target];
    }
    setMessage(`${query} için arama açıldı.`);
  }

  function applyPriceResearch() {
    const name = priceResearch.productName.trim();
    const suggestedPrice = priceResearchSummary.suggestedPrice;
    if (name) update('productName', name);
    if (suggestedPrice > 0) update('salePrice', suggestedPrice);
    setMessage(suggestedPrice > 0 ? `Fiyat araştırması uygulandı: ${money(suggestedPrice)}` : 'Ürün adı uygulandı; rakip fiyat girerseniz fiyat önerisi de oluşur.');
  }

  useEffect(() => {
    if (form.variantId || !form.productName.trim()) return;
    const categoryId = bestAutoStockMatch
      ? findCategoryIdForStock(bestAutoStockMatch, categories, form.productName)
      : findCategoryIdForProductName(form.productName, categories);
    setForm((current) => {
      const nextCategoryId = categoryId ? String(categoryId) : current.categoryId;
      if (current.categoryId || !nextCategoryId) return current;
      const category = categories.find((item) => String(item.id) === nextCategoryId);
      return { ...current, categoryId: nextCategoryId, channelCategoryName: category?.name ?? current.channelCategoryName };
    });
  }, [bestAutoStockMatch?.id, categories, form.productName, form.variantId]);

  function goToPreviousStep() {
    const currentIndex = visibleStepIndexes.findIndex((item) => item === step);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    setStep(visibleStepIndexes[Math.max(0, safeIndex - 1)]);
  }

  function goToNextStep() {
    const currentIndex = visibleStepIndexes.findIndex((item) => item === step);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    setStep(visibleStepIndexes[Math.min(visibleStepIndexes.length - 1, safeIndex + 1)]);
  }

  function updateQuick(name: keyof QuickForm, value: unknown) {
    setQuickForm((current) => ({ ...current, [name]: value }));
  }

  function updateCompositeBuilder(name: keyof CompositeBuilder, value: string) {
    setCompositeBuilder((current) => ({ ...current, [name]: value }));
  }

  async function uploadQuickImage(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setMessage('Ana ürün görseli seçin.');
      return;
    }

    const data = new FormData();
    data.append('folderName', quickForm.productName || 'Hızlı Ürün Kaydı');
    data.append('file', file);
    const media = await api<MediaFile>('/media/upload', { method: 'POST', body: data });
    updateQuick('mainImageUrl', media.filePath);
    setMessage('Ana görsel yüklendi.');
  }

  async function saveQuickEntry(event: FormEvent) {
    event.preventDefault();
    setQuickSaving(true);
    try {
      const result = await api<{ ok: boolean } & QuickResult>('/product-center/entries/quick', {
        method: 'POST',
        json: {
          ...quickForm,
          categoryId: Number(quickForm.categoryId),
          shopPrice: Number(quickForm.shopPrice),
          sitePrice: Number(quickForm.sitePrice),
          initialStockQuantity: Number(quickForm.initialStockQuantity),
        },
      });
      setQuickResult(result);
      await load();
      setMessage('Ürün başarıyla kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Hızlı ürün kaydı tamamlanamadı.');
    } finally {
      setQuickSaving(false);
    }
  }

  function newQuickEntry() {
    setQuickForm((current) => ({
      ...emptyQuickForm,
      categoryId: quickKeepCategory ? current.categoryId : '',
      productType: quickKeepProductType ? current.productType : '',
      shopPrice: quickKeepPrices ? current.shopPrice : 0,
      sitePrice: quickKeepPrices ? current.sitePrice : 0,
    }));
    setQuickResult(null);
  }

  function editQuickResult() {
    if (!quickResult) return;
    const entry = entries.find((item) => item.variantId === quickResult.variantId);
    if (entry) editEntry(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function printQuickBarcode() {
    if (!quickResult) return;
    const response = await fetch(`${apiBaseUrl}/barcodes/${quickResult.productId}/pdf`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      setMessage('Barkod PDF oluşturulamadı.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quickResult.modelCode}-barcode.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function editEntry(entry: Entry) {
    setForm({
      ...emptyForm,
      variantId: String(entry.variantId),
      productId: entry.productId ? String(entry.productId) : '',
      productName: entry.productName,
      barcode: entry.barcode,
      modelCode: entry.modelCode,
      stockCode: entry.stockCode || '',
      categoryId: entry.categoryId ? String(entry.categoryId) : '',
      familyId: entry.familyId ? String(entry.familyId) : '',
      sizeOptionId: entry.sizeOptionId ? String(entry.sizeOptionId) : '',
      potOptionId: entry.potOptionId ? String(entry.potOptionId) : '',
      templateId: entry.templateId ? String(entry.templateId) : '',
      brand: entry.brand || 'Erhan Flowers',
      channelCategoryName: entry.channelCategoryName || '',
      colorVariant: entry.colorVariant || '',
      description: entry.description || '',
      stockQuantity: Number(entry.stockQuantity || 0),
      salePrice: Number(entry.salePrice || 0),
      commissionPercent: Number(entry.commissionPercent || 20),
      images: entry.images ?? [],
      status: entry.status,
    });
    setStep(0);
    loadCost(entry.variantId).catch(() => setCostDetail(null));
  }

  async function saveEntry(event?: FormEvent) {
    event?.preventDefault();
    const result = await api<{ ok: boolean; entry: Entry }>('/product-center/entries', {
      method: 'POST',
      json: {
        ...form,
        variantId: form.variantId ? Number(form.variantId) : undefined,
        productId: form.productId ? Number(form.productId) : undefined,
        categoryId: Number(form.categoryId),
        familyId: form.familyId ? Number(form.familyId) : undefined,
        sizeOptionId: form.sizeOptionId ? Number(form.sizeOptionId) : undefined,
        potOptionId: form.potOptionId ? Number(form.potOptionId) : undefined,
        templateId: form.templateId ? Number(form.templateId) : undefined,
        stockQuantity: Number(form.stockQuantity),
        salePrice: Number(form.salePrice),
        commissionPercent: Number(form.commissionPercent),
      },
    });
    const costSaved = costDetail ? await saveCostDraftForVariant(result.entry.variantId, false) : false;
    editEntry(result.entry);
    if (costSaved) await loadCost(result.entry.variantId);
    await load();
    setMessage('Ürün kartı ve maliyet kaydı birlikte kaydedildi.');
    return result.entry;
  }

  async function generateIdentity(target: 'barcode' | 'codes' | 'all' = 'all', silent = false) {
    if (!form.categoryId) {
      if (!silent) setMessage('Kod üretmek için önce kategori seçin.');
      return;
    }
    setIdentityGenerating(true);
    const result = await api<{ modelCode: string; stockCode: string; barcode: string }>('/product-center/entries/identity', {
      method: 'POST',
      json: {
        productName: form.productName,
        categoryId: Number(form.categoryId),
        channelCategoryName: form.channelCategoryName,
        colorVariant: form.colorVariant,
      },
    });
    setIdentityGenerating(false);
    setForm((current) => ({
      ...current,
      modelCode: target !== 'barcode' && !current.modelCode ? result.modelCode : current.modelCode,
      stockCode: target !== 'barcode' && !current.stockCode ? result.stockCode : current.stockCode,
      barcode: target !== 'codes' && !current.barcode ? result.barcode : current.barcode,
    }));
    if (!silent) setMessage(target === 'barcode' ? 'Barkod üretildi.' : target === 'codes' ? 'Model kodu ve stok kodu üretildi.' : 'Barkod, model kodu ve stok kodu üretildi.');
  }

  function matchSalesStock(stockCard: StockCard) {
    applySalesStockMatch(stockCard, false);
  }

  function buildCompositeProductFromStock() {
    const productStock = stockCards.find((stockCard) => stockCard.id === Number(compositeBuilder.productStockCardId));
    const potStock = stockCards.find((stockCard) => stockCard.id === Number(compositeBuilder.potStockCardId));
    if (!productStock || !potStock) {
      setMessage('Önce ürün/bitki ve saksı stok kartını seçin.');
      return;
    }

    const productCost = Number(productStock.automaticUnitCost || productStock.manualUnitCost || 0);
    const potCost = Number(potStock.automaticUnitCost || potStock.manualUnitCost || 0);
    const totalCost = roundMoney(productCost + potCost);
    const matchedCategoryId = findCategoryIdForStock(productStock, categories, productStock.name);
    const matchedCategory = categories.find((category) => category.id === matchedCategoryId);
    const productName = titleCaseTr(dedupeSeoWords(`${productStock.name} ${potStock.name}`));
    const stockQuantity = Math.max(0, Math.min(Number(productStock.stockQuantity || 0), Number(potStock.stockQuantity || 0)));
    const suggestedSalePrice = totalCost > 0 ? roundMoney(totalCost * 2.4) : 0;

    setForm((current) => ({
      ...current,
      productName,
      categoryId: matchedCategoryId ? String(matchedCategoryId) : current.categoryId,
      channelCategoryName: matchedCategory?.name ?? current.channelCategoryName,
      colorVariant: [extractSizeText(productStock.name), potStock.productType || potStock.category || potStock.name].filter(Boolean).join(' / '),
      stockQuantity: Math.trunc(stockQuantity),
      salePrice: Number(current.salePrice || 0) > 0 ? current.salePrice : suggestedSalePrice,
    }));

    setCostDetail({
      hasSavedCostDraft: costDetail?.hasSavedCostDraft,
      costDraft: normalizeDraftTotals({
        ...defaultCostDraft(Number(form.salePrice || suggestedSalePrice), Number(form.commissionPercent)),
        items: [{
          name: productStock.name,
          group: componentRoleGroup(inferComponentRole(productStock), productStock),
          quantity: 1,
          unit: productStock.unit,
          source: 'AUTO',
          stockCardId: productStock.id,
          manualUnitCost: 0,
          automaticUnitCost: productCost,
          totalCost: productCost,
          isActive: true,
          isDefaultExpense: false,
          defaultExpenseKey: null,
          defaultAmount: 0,
        }],
        pots: [{
          name: potStock.name,
          potType: potStock.productType ?? potStock.category ?? 'Saksı',
          color: potStock.potColor ?? null,
          quantity: 1,
          unit: potStock.unit,
          source: 'AUTO',
          stockCardId: potStock.id,
          manualUnitCost: 0,
          automaticUnitCost: potCost,
          totalCost: potCost,
        }],
      }),
    });

    setMessage(`${productName} satış ürünü hazırlandı. Fiyatı ve görseli kontrol edip Kaydet'e basabilirsiniz.`);
  }

  function matchComponentStock(role: ComponentRole, stockCard: StockCard) {
    const draft = normalizeDraftTotals(costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent)));
    const unitCost = Number(stockCard.automaticUnitCost || stockCard.manualUnitCost || 0);
    const matchedCategoryId = findCategoryIdForStock(stockCard, categories, form.productName);
    if (matchedCategoryId && !form.categoryId) {
      const category = categories.find((item) => item.id === matchedCategoryId);
      setForm((current) => current.categoryId ? current : { ...current, categoryId: String(matchedCategoryId), channelCategoryName: category?.name ?? current.channelCategoryName });
    }
    if (role === 'POT') {
      const nextPot = {
        name: stockCard.name,
        potType: stockCard.productType ?? stockCard.category ?? 'Saksı',
        color: null,
        quantity: 1,
        unit: stockCard.unit,
        source: 'AUTO',
        stockCardId: stockCard.id,
        manualUnitCost: 0,
        automaticUnitCost: unitCost,
        totalCost: unitCost,
      };
      setCostDetail({
        hasSavedCostDraft: costDetail?.hasSavedCostDraft,
        costDraft: normalizeDraftTotals({
          ...draft,
          pots: [nextPot],
        }),
      });
      setMessage(`${stockCard.name} saksı olarak eşleştirildi.`);
      return;
    }

    const roleName = componentRoleLabel(role);
    const group = componentRoleGroup(role, stockCard);
    const nextItem = {
      name: stockCard.name,
      group,
      quantity: 1,
      unit: stockCard.unit,
      source: 'AUTO',
      stockCardId: stockCard.id,
      manualUnitCost: 0,
      automaticUnitCost: unitCost,
      totalCost: unitCost,
    };
    const remainingItems = draft.items.filter((item) => {
      if (item.stockCardId === stockCard.id) return false;
      if (role === 'LEAF' || role === 'TRUNK') return normalizeSearchText(item.name) !== normalizeSearchText(roleName);
      return true;
    });
    setCostDetail({
      hasSavedCostDraft: costDetail?.hasSavedCostDraft,
      costDraft: normalizeDraftTotals({
        ...draft,
        items: [...remainingItems, { ...nextItem, name: stockCard.name || roleName }],
      }),
    });
    setMessage(`${stockCard.name} ${roleName.toLocaleLowerCase('tr-TR')} olarak eşleştirildi.`);
  }

  function applySalesStockMatch(stockCard: StockCard, silent = false) {
    const draft = normalizeDraftTotals(costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent)));
    if (draft.items.some((item) => item.stockCardId === stockCard.id)) return;
    const nextItem = {
      name: stockCard.name,
      group: 'OTHER',
      quantity: 1,
      unit: stockCard.unit,
      source: 'AUTO',
      stockCardId: stockCard.id,
      manualUnitCost: 0,
      automaticUnitCost: Number(stockCard.automaticUnitCost || stockCard.manualUnitCost || 0),
      totalCost: Number(stockCard.automaticUnitCost || stockCard.manualUnitCost || 0),
    };
    setCostDetail({
      hasSavedCostDraft: costDetail?.hasSavedCostDraft,
      costDraft: normalizeDraftTotals({
        ...draft,
        items: [...draft.items.filter((item) => item.stockCardId !== stockCard.id), nextItem],
      }),
    });
    setMessage(`${stockCard.name} satışta stoktan düşecek şekilde 1 ${stockCard.unit} olarak eşleştirildi.`);
  }

  async function passiveEntry(entry: Entry) {
    const ok = window.confirm(`${entry.productName} Ürün Merkezi aktif listesinden kaldırılacak. Stok kartı ve görsel dosyası silinmez. Devam edilsin mi?`);
    if (!ok) return;

    await api<{ ok: boolean }>(`/product-center/entries/${entry.variantId}/passive`, { method: 'POST' });
    setEntries((current) => current.map((item) => item.variantId === entry.variantId ? { ...item, status: 'PASSIVE' } : item));
    if (form.variantId === String(entry.variantId)) {
      setForm(emptyForm);
      setCostDetail(null);
      setStep(0);
    }
    await load();
    setMessage('Ürün pasife alındı ve aktif listeden kaldırıldı.');
  }

  async function copyRecipe() {
    const entry = form.variantId ? null : await saveEntry();
    const variantId = Number(form.variantId || entry?.variantId);
    if (!variantId || !sourceRecipeId) return setMessage('Önce reçetesi olan kaynak ürünü seçin.');
    const result = await api<{ warning?: string | null }>(`/product-center/entries/${variantId}/copy-recipe`, {
      method: 'POST',
      json: { sourceVariantId: Number(sourceRecipeId) },
    });
    await loadCost(variantId);
    await load();
    setMessage(result.warning || 'Reçete ve maliyet ayarları kopyalandı.');
  }

  async function startTemplateRecipe() {
    const entry = form.variantId ? null : await saveEntry();
    const variantId = Number(form.variantId || entry?.variantId);
    if (!variantId) return setMessage('Önce ürünü kaydedin.');
    await api(`/production-costs/variants/${variantId}/start-template`, { method: 'POST' });
    await loadCost(variantId);
    await load();
    setMessage('Seçili şablondan reçete taslağı başlatıldı.');
  }

  async function loadCost(variantId = Number(form.variantId)) {
    if (!variantId) return;
    setCostDetail(normalizeCostDetail(await api<CostDetail>(`/production-costs/variants/${variantId}/detail`)));
  }

  async function saveCost(approve = false) {
    if (!form.variantId || !costDetail) return setMessage('Önce ürünü kaydedin ve reçeteyi hazırlayın.');
    try {
      const result = await saveCostDraftForVariant(Number(form.variantId), approve);
      if (result) {
        setCostDetail(normalizeCostDetail({ hasSavedCostDraft: true, costDraft: result.costDraft }));
      }
      await loadCost();
      await load();
      setMessage(approve ? 'Maliyet onaylandı.' : 'Maliyet taslak kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Maliyet kaydedilemedi.');
    }
  }

  async function saveCostDraftForVariant(variantId: number, approve = false) {
    const draft = costDetail?.costDraft;
    if (!variantId || !draft) return false;
    const result = await api<{ ok: boolean; costDraft: CostDetail['costDraft'] }>(`/production-costs/variants/${variantId}/${approve ? 'cost-approve' : 'cost-draft'}`, {
      method: 'POST',
      json: {
        salePrice: Number(form.salePrice),
        profitMarginPercent: draft.profitMarginPercent,
        commissionPercent: Number(form.commissionPercent),
        vatPercent: draft.vatPercent,
        shippingCost: draft.shippingCost,
        desi: draft.desi,
        marketplaceMarkupPercent: draft.marketplaceMarkupPercent,
        campaignBufferPercent: draft.campaignBufferPercent,
        items: draft.items,
        pots: draft.pots,
      },
    });
    return result;
  }

  function updateCostDraft(nextDraft: CostDetail['costDraft']) {
    setCostDetail((current) => ({ ...current, costDraft: normalizeDraftTotals(nextDraft) }));
  }

  function addManualItem() {
    const draft = costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent));
    updateCostDraft({
      ...draft,
      items: [
        ...draft.items,
        { name: 'Yeni malzeme', group: 'OTHER', quantity: 1, unit: 'adet', source: 'MANUAL', stockCardId: null, manualUnitCost: 0, automaticUnitCost: 0, totalCost: 0 },
      ],
    });
  }

  function addManualPot() {
    const draft = costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent));
    updateCostDraft({
      ...draft,
      pots: [
        ...draft.pots,
        { name: 'Saksı', quantity: 1, source: 'MANUAL', stockCardId: null, manualUnitCost: 0, automaticUnitCost: 0, totalCost: 0 },
      ],
    });
  }

  function addExpenseItem(seed: { name: string; group: string; amount: number; defaultExpenseKey?: string | null }) {
    const draft = costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent));
    const nextItem = {
      name: seed.name,
      group: seed.group,
      quantity: 1,
      unit: 'TL',
      source: 'MANUAL',
      stockCardId: null,
      manualUnitCost: Number(seed.amount || 0),
      automaticUnitCost: 0,
      totalCost: Number(seed.amount || 0),
      isActive: true,
      isDefaultExpense: Boolean(seed.defaultExpenseKey),
      defaultExpenseKey: seed.defaultExpenseKey ?? null,
      defaultAmount: Number(seed.amount || 0),
    };
    updateCostDraft({
      ...draft,
      items: [
        ...draft.items.filter((item) => !seed.defaultExpenseKey || item.defaultExpenseKey !== seed.defaultExpenseKey),
        nextItem,
      ],
    });
    setMessage(`${seed.name} maliyete eklendi.`);
  }

  function addDefaultExpense(expense: DefaultExpense) {
    addExpenseItem({
      name: expense.name,
      group: defaultExpenseGroup(expense),
      amount: Number(expense.defaultAmount || 0),
      defaultExpenseKey: expense.expenseKey,
    });
  }

  function addBlankExpenseRows() {
    const draft = costDetail?.costDraft ?? defaultCostDraft(Number(form.salePrice), Number(form.commissionPercent));
    const rows = [
      { name: 'Paketleme', group: 'PACKAGING' },
      { name: 'İşçilik', group: 'LABOR' },
      { name: 'Genel gider', group: 'OTHER' },
    ].map((item) => ({
      ...item,
      quantity: 1,
      unit: 'TL',
      source: 'MANUAL',
      stockCardId: null,
      manualUnitCost: 0,
      automaticUnitCost: 0,
      totalCost: 0,
      isActive: true,
      isDefaultExpense: false,
      defaultExpenseKey: null,
      defaultAmount: 0,
    }));
    updateCostDraft({ ...draft, items: [...draft.items, ...rows] });
    setMessage('Paketleme, işçilik ve genel gider satırları eklendi.');
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    const remainingSlots = Math.max(0, treeVisualImageLimit - form.images.length);
    if (remainingSlots === 0) return setMessage(`En fazla ${treeVisualImageLimit} ürün görseli seçilebilir.`);
    const uploaded: string[] = [];
    for (const file of Array.from(files).filter((item) => item.type.startsWith('image/')).slice(0, remainingSlots)) {
      const data = new FormData();
      data.append('folderName', [form.modelCode, form.barcode, form.productName].filter(Boolean).join('_') || 'Ürün Merkezi');
      data.append('file', file);
      if (form.productId) data.append('productId', form.productId);
      const media = await api<MediaFile>('/media/upload', { method: 'POST', body: data });
      uploaded.push(media.filePath);
    }
    const nextImages = Array.from(new Set([...form.images, ...uploaded])).slice(0, treeVisualImageLimit);
    update('images', nextImages);
    await load();
    setMessage('Görseller eklendi.');
  }

  function selectMediaImage(filePath: string) {
    if (form.images.includes(filePath)) return;
    if (form.images.length >= treeVisualImageLimit) return setMessage(`En fazla ${treeVisualImageLimit} ürün görseli seçilebilir.`);
    const nextImages = [...form.images, filePath].slice(0, treeVisualImageLimit);
    update('images', nextImages);
    setMessage(nextImages.length < treeVisualImageLimit ? `${treeVisualImageLimit - nextImages.length} görsel daha seçilmeli.` : `${treeVisualImageLimit} görsel seçildi.`);
  }

  function removeProductImage(filePath: string) {
    const nextImages = form.images.filter((image) => image !== filePath);
    update('images', nextImages);
    setMessage(nextImages.length < treeVisualImageLimit ? `${treeVisualImageLimit - nextImages.length} görsel daha seçilmeli.` : `${treeVisualImageLimit} görsel seçildi.`);
  }

  function applyTreeVisualStandard() {
    update('images', form.images.slice(0, treeVisualSlots.length));
    setMessage(form.images.length > 0 ? treeVisualSourceReadyText : 'Ağaç standardı açıldı; önce 1 ana ürün görseli seç.');
  }

  async function generateTreeVisualSet() {
    const sourceImage = form.images[0];
    if (!sourceImage) {
      setMessage('Önce 1 ana ürün görseli seç.');
      setImagePickerOpen(true);
      return;
    }
    setTreeVisualGenerating(true);
    try {
      const result = await api<{ images: string[]; note?: string }>('/media/tree-standard-set', {
        method: 'POST',
        json: {
          imagePath: sourceImage,
          productId: form.productId || undefined,
          folderName: form.modelCode || form.productName || 'Ağaç Standart Görsel',
        },
      });
      update('images', result.images.slice(0, treeVisualImageLimit));
      await load();
      setMessage(result.note || `Ağaç standart ${treeVisualImageLimit} görsel oluşturuldu.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ağaç standart görsel seti oluşturulamadı.');
    } finally {
      setTreeVisualGenerating(false);
    }
  }

  async function createShopCard() {
    const entry = form.variantId ? null : await saveEntry();
    const variantId = Number(form.variantId || entry?.variantId);
    if (!variantId) return setMessage('Önce ürünü kaydedin.');
    const result = await api<{ pdfPath: string }>(`/product-center/entries/${variantId}/shop-card`, { method: 'POST' });
    setMessage('Dükkan PDF kartı oluşturuldu.');
    window.open(apiFileUrl(result.pdfPath), '_blank', 'noopener,noreferrer');
  }

  async function generateSeoDescription() {
    const seedProductName = form.productName.trim() || seoProductNameSuggestion;
    if (!seedProductName.trim()) return setMessage('Önce ürün adı girin veya stok bileşeni seçin.');
    const potNames = activeDraft.pots.map((pot) => [pot.name, pot.potType, pot.color].filter(Boolean).join(' ')).filter(Boolean);
    const materialNames = activeDraft.items.filter(isStockRecipeItem).map((item) => item.name).filter(Boolean);
    const fillerMaterial = materialNames.find((name) => /taş|tas|alçı|alci|strafor|dolgu/i.test(name)) ?? '';
    const payload = {
      productName: seedProductName,
      productHeight: extractSizeText(seedProductName),
      potType: potNames[0] || form.colorVariant,
      potSize: extractSizeText([form.colorVariant, ...potNames].join(' ')),
      fillerMaterial,
    };

    try {
      const result = await api<GeminiSeoResult>('/products/gemini-seo', {
        method: 'POST',
        json: payload,
      });
      update('productName', result.productName || form.productName);
      update('description', result.description);
      setMessage('SEO açıklaması, bakım ve temizlik bilgisi oluşturuldu.');
    } catch (error) {
      const fallback = buildLocalSeoContent(payload);
      update('productName', fallback.productName);
      update('description', fallback.description);
      setMessage('Gemini cevap vermedi; SEO adı ve açıklama sistem içinden oluşturuldu.');
    }
  }

  async function sendToChannels() {
    if (!canResearch) {
      const blockers = [...preparation.blockingMissing, ...trendyolReadiness.blockingMissing];
      const text = `Gönderim yapılamadı. Eksik alanlar: ${blockers.join(', ') || 'Ürün hazırlığı tamamlanmadı.'}`;
      setMessage(text);
      setSendMessage(text);
      setMissingPanelOpen(true);
      return;
    }
    const selectedPricing = channelPricing.filter((item) => selectedChannels.includes(item.key));
    const blocked = selectedPricing.filter((item) => item.status === 'Eksik veri');
    if (blocked.length > 0 && !allowIncomplete) {
      const text = `Gönderim durduruldu. Eksik veri olan kanal: ${blocked.map((item) => item.label).join(', ')}`;
      setMessage(text);
      setSendMessage(text);
      return;
    }
    const platforms = selectedChannels.filter((item) => (publishableChannels as readonly string[]).includes(item));
    if (platforms.length === 0) {
      const text = 'Dükkan ve web sitesi kontrolleri hazır. Pazaryeri gönderimi için Trendyol, Hepsiburada, N11 veya Ticimax seçin.';
      setMessage(text);
      setSendMessage(text);
      return;
    }
    setSendingChannels(true);
    setSendMessage('Gönderiliyor...');
    try {
      const entry = form.variantId ? null : await saveEntry();
      const variantId = Number(form.variantId || entry?.variantId);
      const result = await api<{ success: number; failed: number; results: Array<{ ok: boolean; platform?: string; errorMessage?: string | null; successMessage?: string | null }> }>('/publishing/send', {
        method: 'POST',
        json: { variantIds: [variantId], platforms, allowIncomplete },
      });
      const errors = result.results.filter((item) => !item.ok && item.errorMessage);
      const successes = result.results.filter((item) => item.ok && item.successMessage);
      const errorText = errors.length > 0 ? ` Hatalar: ${errors.map((item) => `${item.platform ?? ''}: ${item.errorMessage}`).join(' | ')}` : '';
      const successText = successes.length > 0 ? ` ${successes.map((item) => `${item.platform ?? ''}: ${item.successMessage}`).join(' | ')}` : '';
      const text = `Gönderim tamamlandı. Başarılı: ${result.success}, Hatalı: ${result.failed}.${successText}${errorText}`;
      setMessage(text);
      setSendMessage(text);
    } catch (error) {
      const text = `Gönderim başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata.'}`;
      setMessage(text);
      setSendMessage(text);
    } finally {
      setSendingChannels(false);
    }
  }

  async function openTrendyolPanel() {
    if (!form.barcode) {
      setSendMessage('Panel linki için önce barkod gerekli.');
      return;
    }
    setOpeningTrendyolPanel(true);
    try {
      const result = await api<{ ok: boolean; message: string; panelUrl?: string }>(`/integrations/products/trendyol/panel-link/${form.barcode}`);
      if (result.ok && result.panelUrl) {
        window.open(result.panelUrl, '_blank');
      } else {
        setSendMessage(`Panel linki alınamadı: ${result.message}`);
      }
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Panel linki alınamadı.');
    } finally {
      setOpeningTrendyolPanel(false);
    }
  }

  async function downloadChannelExcel(platform: 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'TICIMAX') {
    if (!canResearch) {
      setMessage('Excel almadan önce ürün hazırlığı ve kanal zorunlu alanları tamamlanmalı.');
      return;
    }
    const entry = await saveEntry();
    const variantId = Number(entry?.variantId || form.variantId);
    if (!variantId) return setMessage('Excel için önce ürünü kaydedin.');
    const result = await api<ExcelExportResult>('/publishing/excel-export', {
      method: 'POST',
      json: { variantIds: [variantId], platform },
    });
    const binary = atob(result.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const url = window.URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    const missingCount = result.missingByProduct.reduce((sum, item) => sum + item.missingFields.length, 0);
    setMessage(missingCount > 0 ? `${channelLabel(platform)} Excel hazırlandı; ${missingCount} eksik alan uyarısı var.` : `${channelLabel(platform)} Excel hazırlandı.`);
  }

  async function cleanupAutoStockCard(item: AutoStockCardCandidate, action: 'passive' | 'hard-delete') {
    const actionText = action === 'hard-delete' ? 'kalıcı olarak silinecek' : 'pasife alınacak';
    const confirmed = window.confirm(`${item.name} ${actionText}. Görsel dosyaları silinmez. Devam edilsin mi?`);
    if (!confirmed) return;
    try {
      await api(`/product-center/cleanup/auto-stock-cards/${item.id}`, {
        method: 'POST',
        json: { action },
      });
      await Promise.all([load(), loadCleanupItems()]);
      setMessage(action === 'hard-delete' ? 'Deneme stok kartı kalıcı olarak silindi.' : 'Deneme stok kartı pasife alındı.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Temizlik işlemi tamamlanamadı.');
    }
  }

  return (
    <AdminShell title="Ürün Merkezi">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Birleşik Ürün Merkezi</h2>
          <p className="text-sm text-slate-500">Ürün, reçete, maliyet ve kanal gönderimi tek akış içinde yönetilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={downloadUnlinkedExcel}><FileText size={17} /> Bağlanmamış Ürünler Excel</button>
          <label className="btn btn-secondary cursor-pointer">
            <Upload size={17} /> {importingExcel ? 'Yükleniyor...' : 'Excel ile Toplu Yükle'}
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importingExcel} onChange={(event) => { const file = event.target.files?.[0]; if (file) importExcelFile(file); event.target.value = ''; }} />
          </label>
          <button className="btn btn-secondary" onClick={() => load()}><RefreshCw size={17} /> Yenile</button>
        </div>
      </div>
      {message && <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</div>}

      <section className="hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Hızlı Yeni Ürün Kaydı</h2>
            <p className="text-sm text-slate-500">Model kodu, stok kodu ve barkod kayıtta otomatik oluşur.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <label className="flex items-center gap-1 rounded-md border border-line px-2 py-1"><input type="checkbox" checked={quickKeepCategory} onChange={(event) => setQuickKeepCategory(event.target.checked)} /> Kategori kalsın</label>
            <label className="flex items-center gap-1 rounded-md border border-line px-2 py-1"><input type="checkbox" checked={quickKeepProductType} onChange={(event) => setQuickKeepProductType(event.target.checked)} /> Tür kalsın</label>
            <label className="flex items-center gap-1 rounded-md border border-line px-2 py-1"><input type="checkbox" checked={quickKeepPrices} onChange={(event) => setQuickKeepPrices(event.target.checked)} /> Fiyatlar kalsın</label>
          </div>
        </div>

        <form onSubmit={saveQuickEntry} className="grid gap-4 lg:grid-cols-4">
          <Field label="Ürün adı"><input className="field" value={quickForm.productName} onChange={(event) => updateQuick('productName', event.target.value)} required /></Field>
          <Field label="Ana kategori"><select className="field" value={quickForm.categoryId} onChange={(event) => updateQuick('categoryId', event.target.value)} required><option value="">Seçin</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Ürün türü"><input className="field" value={quickForm.productType} onChange={(event) => updateQuick('productType', event.target.value)} placeholder="Yapay ağaç, çiçek, saksı" required /></Field>
          <Field label="Ölçü veya varyant"><input className="field" value={quickForm.sizeVariant} onChange={(event) => updateQuick('sizeVariant', event.target.value)} placeholder="180 cm, beyaz, 30x30" required /></Field>
          <Field label="Dükkan satış fiyatı"><MoneyInput value={quickForm.shopPrice} onChange={(value) => updateQuick('shopPrice', value)} /></Field>
          <Field label="Site satış fiyatı"><MoneyInput value={quickForm.sitePrice} onChange={(value) => updateQuick('sitePrice', value)} /></Field>
          <Field label="Başlangıç stok"><input className="field" type="number" min="0" step="1" value={Number(quickForm.initialStockQuantity || 0)} onChange={(event) => updateQuick('initialStockQuantity', decimalValue(event.target.value))} required /></Field>
          <Field label="Ana ürün görseli">
            <label className="field flex cursor-pointer items-center justify-between gap-2">
              <span className="truncate">{quickForm.mainImageUrl ? 'Görsel seçildi' : 'Görsel yükle'}</span>
              <ImageIcon size={16} className="shrink-0 text-slate-400" />
              <input className="hidden" type="file" accept="image/*" onChange={(event) => uploadQuickImage(event.target.files)} />
            </label>
          </Field>
          <div className="flex flex-wrap gap-2 lg:col-span-4">
            <button className="btn btn-primary" type="submit" disabled={quickSaving}><Save size={16} /> {quickSaving ? 'Kaydediliyor' : 'Ürünü Kaydet'}</button>
            <button className="btn btn-secondary" type="button" onClick={newQuickEntry}><PackagePlus size={16} /> Yeni Ürün Ekle</button>
          </div>
        </form>

        {quickResult && (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 size={18} /> Ürün başarıyla kaydedildi</div>
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Info label="Ürün adı" value={quickResult.productName} />
              <Info label="Model kodu" value={quickResult.modelCode} />
              <Info label="Stok kodu" value={quickResult.stockCode} />
              <Info label="Barkod" value={quickResult.barcode} />
              <Info label="Başlangıç stok" value={number(quickResult.initialStockQuantity)} />
              <Info label="Dükkan fiyatı" value={money(quickResult.shopPrice)} />
              <Info label="Site fiyatı" value={money(quickResult.sitePrice)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={newQuickEntry}><PackagePlus size={16} /> Yeni Ürün Ekle</button>
              <button type="button" className="btn btn-secondary" onClick={() => window.open(`/products?variantId=${quickResult.variantId}`, '_self')}><Eye size={16} /> Ürünü Görüntüle</button>
              <button type="button" className="btn btn-secondary" onClick={printQuickBarcode}><Printer size={16} /> Barkod Yazdır</button>
              <button type="button" className="btn btn-secondary" onClick={editQuickResult}><Edit3 size={16} /> Ürünü Düzenle</button>
            </div>
          </div>
        )}
      </section>

      <section className="hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Deneme Ürün Stok Kartları</h2>
            <p className="text-sm text-slate-500">Ürün Merkezi tarafından geçmişte otomatik oluşmuş olabilecek satış ürünü stok kartlarını güvenli şekilde kontrol eder.</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={loadCleanupItems} disabled={cleanupLoading}>
            <RefreshCw size={17} />
            {cleanupLoading ? 'Kontrol ediliyor' : 'Şüpheli Kartları Listele'}
          </button>
        </div>
        {cleanupItems.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ürün / Stok kartı</th>
                  <th className="px-3 py-2">Stok kodu</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Barkod</th>
                  <th className="px-3 py-2">Oluşturma</th>
                  <th className="px-3 py-2">Stok</th>
                  <th className="px-3 py-2">Bağlantı</th>
                  <th className="px-3 py-2">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {cleanupItems.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.productName || 'Ürün eşleşmesi'} · {item.category || '-'}</div>
                      {item.warning && <div className="mt-1 text-xs font-semibold text-amber-700">{item.warning}</div>}
                    </td>
                    <td className="px-3 py-2">{item.sku || '-'}</td>
                    <td className="px-3 py-2">{item.model || '-'}</td>
                    <td className="px-3 py-2">{item.barcode || '-'}</td>
                    <td className="px-3 py-2">{new Date(item.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td className="px-3 py-2">{number(item.stockQuantity)}</td>
                    <td className="px-3 py-2">{item.movementCount} hareket · {item.linkedRecipeCount} reçete</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => cleanupAutoStockCard(item, 'passive')}>Pasife al</button>
                        {item.hardDeleteAllowed && <button type="button" className="btn btn-danger min-h-9 px-3 text-xs" onClick={() => cleanupAutoStockCard(item, 'hard-delete')}>Sil</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-line p-4 text-sm font-semibold text-slate-500">Listelemek için kontrol düğmesine basın.</div>
        )}
      </section>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => setProductListOpen((current) => !current)}>
            <Boxes size={15} />
            {productListOpen ? 'Ürün listesini kapat' : 'Ürün listesini aç'}
          </button>
          <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => { setForm(emptyForm); setCostDetail(null); setStep(0); }}>
            <PackagePlus size={15} />
            Yeni ürün
          </button>
        </div>
        <ProductNameStartPanel
          value={form.productName}
          suggestion={seoProductNameSuggestion}
          stage={saleStageLabel}
          canResearch={canResearch}
          onChange={(value) => update('productName', value)}
          onUseSuggestion={() => update('productName', seoProductNameSuggestion)}
          onGenerate={generateSeoDescription}
        />
        {canResearch ? (
          <PriceResearchPanel
            value={priceResearch}
            summary={priceResearchSummary}
            currentProductName={form.productName}
            onChange={updatePriceResearch}
            onPriceChange={updateCompetitorPrice}
            onAddPrice={addCompetitorPriceRow}
            onOpenResearch={openResearchUrl}
            onApply={applyPriceResearch}
          />
        ) : (
          <section className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-black">Araştırma / Eşleştirme kilitli</div>
                <div className="mt-1 text-sm text-slate-500">Önce ürün hazırlığı ve Trendyol zorunlu alanları tamamlanmalı.</div>
              </div>
              <span className="rounded bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{saleStageLabel}</span>
            </div>
          </section>
        )}
        {productListOpen && <section className="panel overflow-hidden">
          <div className="space-y-3 border-b border-line p-4">
            <input className="field" placeholder="Ürün, barkod, model ara" value={query} onChange={(event) => setQuery(event.target.value)} />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <input type="checkbox" checked={showPassiveEntries} onChange={(event) => setShowPassiveEntries(event.target.checked)} />
              Pasifleri göster
            </label>
          </div>
          <div className="grid max-h-[360px] gap-3 overflow-auto p-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleEntries.map((entry) => (
              <div key={entry.variantId} className={`rounded-md border border-line p-3 transition hover:bg-slate-50 ${entry.status === 'PASSIVE' ? 'bg-slate-50 opacity-70' : ''}`}>
                <div className="flex gap-3">
                  <ProductImage images={entry.images} />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-bold">{entry.productName}</div>
                    <div className="mt-1 text-xs text-slate-500">{entry.barcode} / {entry.modelCode || '-'}</div>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">{money(entry.salePrice)}</span>
                    </div>
                  </div>
                  {entry.status === 'PASSIVE' && <span className="self-start rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">Pasif</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => editEntry(entry)}><Edit3 size={14} /> Düzenle</button>
                  {entry.status !== 'PASSIVE' && (
                    <button type="button" className="btn btn-danger min-h-9 px-3 text-xs" onClick={() => passiveEntry(entry)}><Trash2 size={14} /> Pasife al</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>}

        <section className="panel p-5">
          <div className="hidden">
            <div className="rounded-md border border-line bg-white p-4">
              <div className="flex gap-4">
                <ProductImage images={form.images} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold uppercase text-slate-400">Ürünü Satışa Açma Merkezi</div>
                  <h3 className="mt-1 line-clamp-2 text-lg font-black">{form.productName || 'Yeni ürün'}</h3>
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
                    <Info label="Model" value={form.modelCode || 'Otomatik'} />
                    <Info label="Stok" value={form.stockCode || 'Otomatik'} />
                    <Info label="Barkod" value={form.barcode || 'Otomatik'} />
                    <Info label="Satış fiyatı" value={money(form.salePrice)} />
                  </div>
                </div>
              </div>
            </div>
            <LiveMarginPanel pricing={pricing} channels={channelPricing} />
          </div>

          <div className="hidden">
            {visibleStepIndexes.map((index, order) => {
              const label = steps[index];
              return (
              <button key={label} type="button" className={`rounded-md border px-3 py-2 text-sm font-semibold ${step === index ? 'border-brand bg-emerald-50 text-brand' : 'border-line bg-white text-slate-600'}`} onClick={() => setStep(index)}>
                {order + 1}. {label}
              </button>
              );
            })}
          </div>

          <form onSubmit={saveEntry} className="space-y-6">
            {(
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="hidden">
                  <input className="hidden" value={form.productName} onChange={(event) => update('productName', event.target.value)} readOnly />
                  {seoProductNameSuggestion && seoProductNameSuggestion !== form.productName.trim() && (
                    <button type="button" className="mt-2 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-800" onClick={() => update('productName', seoProductNameSuggestion)}>
                      Google ürün adı önerisi: {seoProductNameSuggestion}
                    </button>
                  )}
                </div>
                <Field label="Kategori"><select className="field" value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Seçin</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                <Field label="Renk / çeşit"><input className="field" value={form.colorVariant} onChange={(event) => update('colorVariant', event.target.value)} /></Field>
                <Field label="Tüm sitelere stok adedi">
                  <input className="field" type="number" min="0" step="1" value={Number(form.stockQuantity || 0)} onChange={(event) => update('stockQuantity', decimalValue(event.target.value))} placeholder="Örn: 10" />
                  <div className="mt-1 text-xs font-semibold text-slate-500">Bileşen stoğu değildir; Trendyol, Hepsiburada, N11 ve Ticimax'a aynı adet gider.</div>
                </Field>
                <div className="md:col-span-2 xl:col-span-4">
                  <div className="rounded-md border border-line bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold">Stok bileşenleri</div>
                        <div className="mt-1 text-xs text-slate-500">{componentSummary(activeDraft)}</div>
                      </div>
                      <button type="button" className="btn btn-secondary" onClick={openComponentPicker}><Search size={16} /> Stok bileşenlerini seç</button>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 xl:col-span-4">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 font-black text-emerald-900"><Sparkles size={18} /> ChatGPT ürün hazırlayıcı</div>
                        <div className="mt-1 text-xs font-semibold text-emerald-800">Ürünü ve saksıyı seç; sistem satış ürün adını, reçeteyi, saksı satırını ve satılabilir adedi hazırlasın.</div>
                      </div>
                      <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={refreshStockCards} disabled={stockCardsLoading}>
                        <RefreshCw size={14} className={stockCardsLoading ? 'animate-spin' : ''} /> Stokları yenile
                      </button>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                      <Field label="1. Ürün / bitki">
                        <select className="field bg-white" value={compositeBuilder.productStockCardId} onChange={(event) => updateCompositeBuilder('productStockCardId', event.target.value)}>
                          <option value="">Ürün stok kartı seçin</option>
                          {compositeProductOptions.map((stockCard) => (
                            <option key={stockCard.id} value={stockCard.id}>{stockCardOptionLabel(stockCard)}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="2. Saksı">
                        <select className="field bg-white" value={compositeBuilder.potStockCardId} onChange={(event) => updateCompositeBuilder('potStockCardId', event.target.value)}>
                          <option value="">Saksı stok kartı seçin</option>
                          {compositePotOptions.map((stockCard) => (
                            <option key={stockCard.id} value={stockCard.id}>{stockCardOptionLabel(stockCard)}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="flex items-end">
                        <button type="button" className="btn btn-primary w-full justify-center" onClick={buildCompositeProductFromStock} disabled={!compositeReady}>
                          <Sparkles size={16} /> Ürünü hazırla
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs font-semibold md:grid-cols-3">
                      <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-emerald-900">{selectedCompositeProduct ? stockCardShortSummary(selectedCompositeProduct) : 'Ürün bekliyor'}</div>
                      <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-emerald-900">{selectedCompositePot ? stockCardShortSummary(selectedCompositePot) : 'Saksı bekliyor'}</div>
                      <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-emerald-900">{compositeReady ? `Satılabilir adet: ${number(Math.min(Number(selectedCompositeProduct?.stockQuantity || 0), Number(selectedCompositePot?.stockQuantity || 0)))}` : 'İki seçim tamamlanınca hazır'}</div>
                    </div>
                    {form.productName && activeDraft.pots.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={generateSeoDescription}><FileText size={14} /> SEO metni hazırla</button>
                        <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => setImagePickerOpen(true)}><ImageIcon size={14} /> Görsel seç</button>
                        <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => { applyTreeVisualStandard(); setTreeVisualOpen(true); }}><ImageIcon size={14} /> 5 görsel seti</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 xl:col-span-4">
                  <Field label="Google SEO uyumlu satış ürün adı">
                    <input className="field" value={form.productName} onChange={(event) => update('productName', event.target.value)} placeholder="Yaprak, gövde ve saksıyı seçtikten sonra final ürün adını yazın" />
                    {seoProductNameSuggestion && seoProductNameSuggestion !== form.productName.trim() && (
                      <button type="button" className="mt-2 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-800" onClick={() => update('productName', seoProductNameSuggestion)}>
                        Google ürün adı önerisi: {seoProductNameSuggestion}
                      </button>
                    )}
                    <button type="button" className="btn btn-secondary mt-2 w-full justify-center" onClick={generateSeoDescription}><FileText size={16} /> Gemini ile SEO adı ve açıklama oluştur</button>
                  </Field>
                </div>
              </div>
            )}

            {(
              <div className="space-y-4">
                <div className="rounded-md border border-line p-4">
                  <div className="mb-1 flex items-center gap-2 font-bold"><Copy size={17} /> Benzer üründen reçete kopyala</div>
                  <p className="mb-3 text-xs text-slate-500">Kaynak ürün, reçetesi daha önce hazırlanmış üründür. Seçerseniz malzeme ve maliyet satırları bu ürüne kopyalanır.</p>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <select className="field" value={sourceRecipeId} onChange={(event) => setSourceRecipeId(event.target.value)}>
                      <option value="">Kaynak ürün seçin</option>
                      {copySources.map((entry) => <option key={entry.variantId} value={entry.variantId}>{entry.productName} - {entry.costStatus}</option>)}
                    </select>
                    <button type="button" className="btn btn-primary" onClick={copyRecipe}><Copy size={16} /> Reçeteyi Kopyala</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary" onClick={startTemplateRecipe}><Copy size={16} /> Şablondan Başlat</button>
                  <button type="button" className="btn btn-secondary" onClick={addManualItem}><Plus size={16} /> Malzeme Satırı</button>
                  <button type="button" className="btn btn-secondary" onClick={addManualPot}><Plus size={16} /> Saksı Satırı</button>
                </div>
                <div className="rounded-md border border-line bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold">Paketleme, işçilik ve genel gider</div>
                      <div className="text-xs text-slate-500">Ürünü satışa açmadan önce maliyete hızlı ekleyin; stoktan düşmez, ürün maliyetine dahil olur.</div>
                    </div>
                    <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={addBlankExpenseRows}>
                      <Plus size={15} /> Boş Gider Satırları
                    </button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {defaultExpenses.filter((expense) => expense.status !== 'PASSIVE' && expense.isActive).map((expense) => (
                      <button
                        type="button"
                        key={expense.id}
                        className="rounded-md border border-line bg-white p-3 text-left text-xs transition hover:border-brand"
                        onClick={() => addDefaultExpense(expense)}
                      >
                        <div className="font-bold">{expense.name}</div>
                        <div className="mt-1 text-slate-500">{groupLabel(defaultExpenseGroup(expense))} · {money(expense.defaultAmount)}</div>
                      </button>
                    ))}
                    {defaultExpenses.length === 0 && (
                      <>
                        <button type="button" className="rounded-md border border-line bg-white p-3 text-left text-xs transition hover:border-brand" onClick={() => addExpenseItem({ name: 'Paketleme', group: 'PACKAGING', amount: 100 })}>
                          <div className="font-bold">Paketleme</div>
                          <div className="mt-1 text-slate-500">Paketleme · 100,00 TL</div>
                        </button>
                        <button type="button" className="rounded-md border border-line bg-white p-3 text-left text-xs transition hover:border-brand" onClick={() => addExpenseItem({ name: 'İşçilik', group: 'LABOR', amount: 100 })}>
                          <div className="font-bold">İşçilik</div>
                          <div className="mt-1 text-slate-500">İşçilik · 100,00 TL</div>
                        </button>
                        <button type="button" className="rounded-md border border-line bg-white p-3 text-left text-xs transition hover:border-brand" onClick={() => addExpenseItem({ name: 'Genel gider', group: 'OTHER', amount: 100 })}>
                          <div className="font-bold">Genel gider</div>
                          <div className="mt-1 text-slate-500">Diğer · 100,00 TL</div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <CostTable detail={costDetail} stockCards={stockCards} productName={form.productName} onChange={updateCostDraft} />
              </div>
            )}

            {(
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Seçilen satış fiyatı"><MoneyInput value={form.salePrice} onChange={(value) => update('salePrice', value)} /><div className="mt-1 text-xs font-semibold text-slate-500">Boşsa aşağıdaki e-ticaret önerisini kullanın; pazaryerlerine bu fiyat gider.</div></Field>
                  <Field label="Komisyon %"><PercentInput value={form.commissionPercent} onChange={(value) => update('commissionPercent', value)} /></Field>
                  <Field label="Hedef kâr %"><PercentInput value={activeDraft.profitMarginPercent} onChange={(value) => updateCostDraft({ ...activeDraft, profitMarginPercent: value })} /></Field>
                  <Field label="KDV %"><PercentInput value={activeDraft.vatPercent} onChange={(value) => updateCostDraft({ ...activeDraft, vatPercent: value })} /></Field>
                  <Field label="Kargo maliyeti"><MoneyInput value={activeDraft.shippingCost} onChange={(value) => updateCostDraft({ ...activeDraft, shippingCost: value })} /></Field>
                  <Field label="E-ticaret ek pay %"><PercentInput value={35} onChange={() => updateCostDraft({ ...activeDraft, marketplaceMarkupPercent: 35, campaignBufferPercent: 0 })} /></Field>
                </div>
                <VisiblePricingGuide
                  summary={pricing}
                  draft={activeDraft}
                  selectedSalePrice={Number(form.salePrice)}
                  onUseShop={() => update('salePrice', pricing.shopSalePrice)}
                  onUseSite={() => update('salePrice', pricing.siteSalePrice)}
                  onUseEcommerce={() => update('salePrice', pricing.suggestedSalePrice)}
                />
                {ownerMode ? (
                  <details className="rounded-md border border-line bg-slate-50 p-4">
                    <summary className="cursor-pointer text-sm font-black text-ink">Owner kâr ve kanal fiyat analizi</summary>
                    <div className="mt-4 space-y-4">
                      <PricingRules summary={pricing} draft={activeDraft} onUseSuggested={() => update('salePrice', pricing.suggestedSalePrice)} />
                      <ChannelPricingBoard
                        channels={channelPricing}
                        onUseSuggested={(price) => update('salePrice', price)}
                      />
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Summary label="Toplam maliyet" value={money(pricing.materialCost)} />
                        <Summary label="Durum" value={currentCostStatus} />
                      </div>
                    </div>
                  </details>
                ) : (
                  <div className="rounded-md border border-line bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    Kâr ve kanal fiyat analizi sadece sistem sahibi rolüne açıktır.
                  </div>
                )}
                <div className="flex gap-2 lg:col-span-2">
                  <button type="button" className="btn btn-secondary" onClick={() => saveCost(false)}><Save size={16} /> Taslak Kaydet</button>
                  <button type="button" className="btn btn-primary" onClick={() => saveCost(true)}><CheckCircle2 size={16} /> Maliyeti Onayla</button>
                </div>
              </div>
            )}

            {(
              <div className="space-y-4">
                <button type="button" className="btn btn-secondary w-full justify-center" onClick={() => setImagePickerOpen(true)}><ImageIcon size={16} /> Görsel Seç / Yükle ({form.images.length}/{treeVisualImageLimit})</button>
                <button type="button" className="btn btn-primary w-full justify-center" onClick={createShopCard}><FileText size={16} /> Dükkan PDF Kartı Oluştur</button>
                <button type="button" className="btn btn-primary w-full justify-center" onClick={() => { applyTreeVisualStandard(); setTreeVisualOpen(true); }}><ImageIcon size={16} /> ChatGPT Standart 5 Görsel</button>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  Ağaç ürünlerinde görsel sırası: beyaz ana görsel, otel lobisi/dükkan, salon/ofis, yakın detay, giriş/ölçü alanı.
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {form.images.map((image) => (
                    <button type="button" key={image} className="group relative overflow-hidden rounded-md border border-line" onClick={() => removeProductImage(image)}>
                      <img className="aspect-square w-full object-cover" src={normalizeImage(image)} alt="Ürün görseli" />
                      <span className="absolute inset-x-0 bottom-0 bg-red-600 px-2 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">Kaldır</span>
                    </button>
                  ))}
                  {[].map((file: MediaFile) => (
                    <button type="button" key={file.id} className="overflow-hidden rounded-md border border-line" onClick={() => update('images', form.images.includes(file.filePath) ? form.images : [...form.images, file.filePath])}>
                      <img className="aspect-square w-full object-cover" src={normalizeImage(file.filePath)} alt={file.fileName} />
                    </button>
                  ))}
                </div>
                {form.images.length === 0 ? (
                  <div className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">Ağaç standardı için önce 1 ana ürün görseli seç.</div>
                ) : (
                  <div className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{treeVisualSourceReadyText}</div>
                )}
                <div className="rounded-md border border-line p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold">SEO Açıklaması</div>
                    <button type="button" className="btn btn-secondary" onClick={generateSeoDescription}><FileText size={16} /> Gemini ile Oluştur</button>
                  </div>
                  <textarea className="field min-h-40" value={form.description} onChange={(event) => update('description', event.target.value)} />
                </div>
              </div>
            )}

            {(
              <div className="space-y-4">
                {missing.length > 0 && <div className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">Eksik alanlar: {missing.join(', ')}</div>}
                <div className="rounded-md border border-line bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">Final kodları</div>
                      <div className="text-xs text-slate-500">Barkod, model kodu ve stok kodu ürün finalinde kontrol edilir; boş kalırsa kayıtta otomatik oluşur.</div>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => generateIdentity('all')} disabled={identityGenerating}>
                      <RefreshCw size={16} /> Kodları hazırla
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Barkod"><input className="field" value={form.barcode} onChange={(event) => update('barcode', event.target.value)} placeholder="Otomatik oluşur" /></Field>
                    <Field label="Model kodu"><input className="field" value={form.modelCode} onChange={(event) => update('modelCode', event.target.value.toUpperCase())} placeholder="Otomatik oluşur" /></Field>
                    <Field label="Stok kodu"><input className="field" value={form.stockCode} onChange={(event) => update('stockCode', event.target.value.toUpperCase())} placeholder="Otomatik oluşur" /></Field>
                  </div>
                  {identityGenerating && <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><RefreshCw size={14} /> Barkod, model kodu ve stok kodu hazırlanıyor.</div>}
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  {channels.map((channel) => (
                    <label key={channel} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold">
                      <input type="checkbox" checked={selectedChannels.includes(channel)} onChange={(event) => setSelectedChannels((current) => event.target.checked ? [...current, channel] : current.filter((item) => item !== channel))} />
                      {channelLabel(channel)}
                    </label>
                  ))}
                </div>
                <ChannelComparisonTable channels={channelPricing.filter((item) => selectedChannels.includes(item.key))} compact />
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  Tüm pazaryerlerine gönderilecek stok adedi: {number(form.stockQuantity)}. Stok bileşenleri sadece reçete, maliyet ve stoktan düşme için kullanılır.
                </div>
                <div className="rounded-md border border-line bg-slate-50 p-4">
                  <div className="mb-3">
                    <div className="font-bold">Excel şablonu ile dışa aktar</div>
                    <div className="text-xs text-slate-500">Ürün, pazaryerinin kendi Excel şablonu bozulmadan doldurulur. Entegrasyon gönderimi ayrı yapılır.</div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                    {publishableChannels.map((platform) => (
                      <button key={platform} type="button" className="btn btn-secondary justify-center" onClick={() => downloadChannelExcel(platform)} disabled={!canResearch}>
                        <FileText size={16} /> {channelLabel(platform)} Excel
                      </button>
                    ))}
                  </div>
                </div>
                {ownerMode && <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={allowIncomplete} onChange={(event) => setAllowIncomplete(event.target.checked)} /> Owner özel onayıyla eksik kanal uyarısını geç</label>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={sendToChannels} disabled={sendingChannels}>
                    {sendingChannels ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} {sendingChannels ? 'Gönderiliyor...' : 'Kanallara Gönder'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={openTrendyolPanel} disabled={openingTrendyolPanel}>
                    <ExternalLink size={16} /> {openingTrendyolPanel ? 'Bağlanıyor...' : "Trendyol'da Aç (Satıcı Paneli)"}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Trendyol&apos;un API&apos;si zaten yayındaki bir görseli silmeyi desteklemiyor (sadece ekleme yapabiliyoruz) — istenmeyen görseli kaldırmak için satıcı panelini kullanman gerekiyor.</p>
                {sendMessage && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{sendMessage}</div>}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-line pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => { setForm(emptyForm); setCostDetail(null); setStep(0); }}><PackagePlus size={16} /> Yeni Ürün</button>
              <div className="flex gap-2">
                <button type="button" className="hidden" onClick={goToPreviousStep}>Geri</button>
                <button className="btn btn-primary" type="submit"><Save size={16} /> Kaydet</button>
                <button type="button" className="hidden" onClick={goToNextStep}>İleri</button>
              </div>
            </div>
          </form>
        </section>
      </div>
      <BottomMissingProductPanel
        open={missingPanelOpen}
        onToggle={() => setMissingPanelOpen((current) => !current)}
        stage={saleStageLabel}
        preparation={preparation}
        channelReadiness={trendyolReadiness}
        canResearch={canResearch}
      />
      {imagePickerOpen && (
        <PickerModal title={`Ürün Görselleri (${form.images.length}/${treeVisualImageLimit})`} onClose={() => setImagePickerOpen(false)}>
          <div className="space-y-4">
            <label className="btn btn-secondary w-full justify-center">
              <ImageIcon size={16} /> Bilgisayardan görsel yükle
              <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => uploadImages(event.target.files)} />
            </label>
            {form.images.length === 0 ? (
              <div className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">Ağaç standardı için 1 ana ürün görseli seçmen yeterli.</div>
            ) : (
              <div className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{treeVisualSourceReadyText}</div>
            )}
            <div className="grid max-h-[520px] gap-3 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {suggestedMediaFiles.map((file) => {
                const selected = form.images.includes(file.filePath);
                return (
                  <button
                    type="button"
                    key={file.id}
                    className={`overflow-hidden rounded-md border text-left ${selected ? 'border-brand ring-2 ring-emerald-100' : 'border-line'}`}
                    onClick={() => selected ? removeProductImage(file.filePath) : selectMediaImage(file.filePath)}
                  >
                    <img className="aspect-square w-full object-cover" src={normalizeImage(file.filePath)} alt={file.fileName} />
                    <div className="p-2 text-xs font-semibold text-slate-600">
                      <div className="line-clamp-1">{file.fileName}</div>
                      <div className="line-clamp-1 text-slate-400">{file.folderName}</div>
                      <div className={selected ? 'mt-1 text-brand' : 'mt-1 text-slate-500'}>{selected ? 'Seçildi' : 'Seç'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </PickerModal>
      )}
      {treeVisualOpen && (
        <PickerModal title="ChatGPT Standart 5 Görsel" onClose={() => setTreeVisualOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Ağaç ürünleri için 2. görsel artık otel lobisi / dükkan / showroom ortamı olacak. Görseller bu sırayla kaydedilirse Trendyol, Hepsiburada, N11 ve Ticimax aynı düzende kullanır.
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {treeVisualSlots.map((slot, index) => {
                const image = form.images[index];
                return (
                  <div key={slot.title} className="rounded-md border border-line bg-white p-3">
                    <div className="mb-2">
                      <div className="font-black">{slot.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{slot.detail}</div>
                    </div>
                    {image ? (
                      <button type="button" className="group relative block overflow-hidden rounded-md border border-line" onClick={() => removeProductImage(image)}>
                        <img className="aspect-square w-full object-cover" src={normalizeImage(image)} alt={slot.title} />
                        <span className="absolute inset-x-0 bottom-0 bg-red-600 px-2 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">Bu görseli kaldır</span>
                      </button>
                    ) : index > 0 && form.images[0] ? (
                      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800">
                        Tek görselden 5 set oluştur butonuyla hazırlanacak
                      </div>
                    ) : (
                      <button type="button" className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-line bg-slate-50 text-center text-sm font-semibold text-slate-500" onClick={() => { setTreeVisualOpen(false); setImagePickerOpen(true); }}>
                        Görsel seç / yükle
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => { setTreeVisualOpen(false); setImagePickerOpen(true); }}><ImageIcon size={16} /> Görsel seç / yükle</button>
              <button type="button" className="btn btn-primary" onClick={generateTreeVisualSet} disabled={treeVisualGenerating}>
                {treeVisualGenerating ? 'Hazırlanıyor...' : 'Tek görselden 5 set oluştur'}
              </button>
            </div>
          </div>
        </PickerModal>
      )}
      {componentPickerOpen && (
        <PickerModal title="Stok Bileşenleri Seç" onClose={() => setComponentPickerOpen(false)}>
          <ComponentStockMatcher
            productName={form.productName}
            stockCards={stockCards}
            selectedIds={new Set([...activeDraft.items, ...activeDraft.pots].map((item) => item.stockCardId).filter(Boolean) as number[])}
            onSelect={matchComponentStock}
            onClose={() => setComponentPickerOpen(false)}
            onRefresh={refreshStockCards}
            loading={stockCardsLoading}
          />
        </PickerModal>
      )}
      {familyPickerOpen && (
        <PickerModal title="Ürün Grubu Seç" onClose={() => setFamilyPickerOpen(false)}>
          <input className="field mb-3" autoFocus placeholder="Ficus, Areka, Bambu veya şablon ara" value={familySearch} onChange={(event) => setFamilySearch(event.target.value)} />
          <div className="max-h-[420px] overflow-auto rounded-md border border-line">
            {filteredFamilies.map((item) => (
              <button
                type="button"
                key={item.id}
                className="block w-full border-b border-line px-3 py-3 text-left hover:bg-slate-50"
                onClick={() => {
                  update('familyId', String(item.id));
                  update('templateId', item.templates?.[0]?.id ? String(item.templates[0].id) : '');
                  setFamilyPickerOpen(false);
                }}
              >
                <div className="font-bold">{item.familyName}</div>
                <div className="mt-1 text-xs text-slate-500">{item.templates?.map((template) => template.templateName).join(', ') || 'Şablon yok'}</div>
              </button>
            ))}
          </div>
        </PickerModal>
      )}
    </AdminShell>
  );
}

type ReadinessItem = {
  label: string;
  status: 'done' | 'missing' | 'warning' | 'auto';
  detail: string;
};

type ReadinessSummary = {
  items: ReadinessItem[];
  blockingMissing: string[];
  autoFillable: string[];
};

function buildPreparationStatus(form: typeof emptyForm, draft: CostDetail['costDraft'], costStatus: string): ReadinessSummary {
  const recipeCount = draft.items.filter(isStockRecipeItem).length + draft.pots.length;
  const items: ReadinessItem[] = [
    readiness('Ürün adı', Boolean(form.productName.trim()), 'Satış başlığı ve açıklama için temel alan.'),
    readiness('Model kodu', Boolean(form.modelCode), form.modelCode ? 'Hazır.' : 'Kategori seçilirse otomatik üretilebilir.', 'auto'),
    readiness('Barkod', Boolean(form.barcode), form.barcode ? 'Hazır.' : 'Kategori seçilirse otomatik üretilebilir.', 'auto'),
    readiness('Ana kategori', Boolean(form.categoryId), 'Kanal alanlarını ve kod üretimini besler.'),
    readiness('Stok bağlantısı / reçete', recipeCount > 0, recipeCount > 0 ? `${recipeCount} bileşen bağlı.` : 'Stok bileşeni veya reçete seçilmeli.'),
    readiness('Ana görsel', form.images.length > 0, form.images.length > 0 ? treeVisualSourceReadyText : 'Ağaç standardı için 1 ana görsel seçilmeli.'),
    readiness('Açıklama', Boolean(form.description.trim()), form.description.trim() ? 'Hazır.' : 'SEO açıklaması otomatik önerilebilir.', 'auto'),
    readiness('Satış fiyatı', Number(form.salePrice) > 0, 'Fiyat araştırması ve kanal kontrolü için gerekir.'),
    readiness('KDV', Number(draft.vatPercent) > 0, 'Finansal alan; owner onayıyla netleşmeli.', Number(draft.vatPercent) > 0 ? 'done' : 'warning'),
    readiness('Desi / kargo', Number(draft.desi) > 0 && Number(draft.shippingCost) >= 0, 'Desi uydurulmamalı; ürün paketine göre kontrol edilmeli.', Number(draft.desi) > 0 ? 'done' : 'warning'),
    readiness('Maliyet taslağı', costStatus !== 'Maliyet Girilmedi', costStatus || 'Maliyet bilgisi bekliyor.', costStatus === 'Maliyet Girilmedi' ? 'warning' : 'done'),
  ];
  return summarizeReadiness(items);
}

function buildTrendyolReadiness(form: typeof emptyForm, draft: CostDetail['costDraft']): ReadinessSummary {
  const values: Record<string, unknown> = {
    barcode: form.barcode,
    modelCode: form.modelCode,
    brand: form.brand || 'Erhan Flowers',
    channelCategoryName: form.channelCategoryName || trendyolFieldMap.categoryCode,
    productName: form.productName,
    description: form.description,
    salePrice: Number(form.salePrice),
    stockQuantity: Number(form.stockQuantity),
    vatPercent: Number(draft.vatPercent),
  };

  const requiredItems = trendyolFieldMap.requiredFields.map((field) => {
    const value = field.erpField ? values[field.erpField] : field.defaultValue;
    const filled = value !== null && value !== undefined && String(value).trim() !== '' && Number(value) !== 0;
    const canAutoFill = ['constant', 'templateDefault', 'erpOrDefault', 'erpOrSuggestion', 'ownerConfirm'].includes(field.fill);
    return readiness(
      field.channelField,
      filled || canAutoFill,
      filled ? 'ERP alanından doldurulur.' : canAutoFill ? 'Sistem öneri veya varsayılan değer hazırlayabilir.' : 'Kullanıcıdan istenmeli.',
      filled ? 'done' : canAutoFill ? 'auto' : 'missing',
    );
  });

  const recommendedItems: ReadinessItem[] = [
    readiness('Stok Kodu', Boolean(form.stockCode || form.modelCode), form.stockCode ? 'ERP stok kodundan gelir.' : 'Model kodu stok kodu olarak önerilebilir.', 'auto'),
    readiness('Ağaç görsel seti', form.images.length > 0, form.images.length > 0 ? treeVisualSourceReadyText : 'Ağaç standardı için 1 ana görsel seçilmeli.'),
    readiness('Sevkiyat Tipi', true, 'Trendyol Excelinde boş bırakılır.', 'auto'),
    readiness('Sevkiyat Süresi', true, 'Varsayılan öneri: 2 gün.', 'auto'),
  ];

  return summarizeReadiness([...requiredItems, ...recommendedItems]);
}

function readiness(label: string, done: boolean, detail: string, fallback: ReadinessItem['status'] = 'missing'): ReadinessItem {
  return { label, status: done ? 'done' : fallback, detail };
}

function summarizeReadiness(items: ReadinessItem[]): ReadinessSummary {
  return {
    items,
    blockingMissing: items.filter((item) => item.status === 'missing').map((item) => item.label),
    autoFillable: items.filter((item) => item.status === 'auto').map((item) => item.label),
  };
}

function salePreparationStage(preparation: ReadinessSummary, channelReadiness: ReadinessSummary, canResearch: boolean) {
  if (canResearch) return 'Araştırma bekliyor';
  if (preparation.blockingMissing.length > 0) return 'Ürün bilgisi eksik';
  if (channelReadiness.blockingMissing.length > 0) return 'Kanal alanları eksik';
  return 'Satışa hazır';
}

function readinessLabel(status: ReadinessItem['status']) {
  if (status === 'done') return 'Tamam';
  if (status === 'auto') return 'Öneri';
  if (status === 'warning') return 'Uyarı';
  return 'Eksik';
}

function readinessColor(status: ReadinessItem['status']) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700';
  if (status === 'auto') return 'bg-sky-100 text-sky-700';
  if (status === 'warning') return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-700';
}

function PreparationStatusPanel({
  stage,
  preparation,
  channelReadiness,
  canResearch,
  selected,
}: {
  stage: string;
  preparation: ReadinessSummary;
  channelReadiness: ReadinessSummary;
  canResearch: boolean;
  selected: boolean;
}) {
  return (
    <section className="panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-slate-400">Satışa hazırlık durumu</div>
          <h3 className="mt-1 text-lg font-black">{stage}</h3>
        </div>
        <span className={`rounded px-3 py-2 text-xs font-bold ${canResearch ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
          {canResearch ? 'Araştırma açıldı' : 'Hazırlık devam ediyor'}
        </span>
      </div>

      {!selected && (
        <div className="mb-4 rounded-md border border-dashed border-line bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          Önce mevcut bir ürünü seçin veya yeni satış ürünü taslağına ürün adı girin.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ReadinessList title="Ürün hazırlık checklist" items={preparation.items} />
        <ReadinessList title={`${trendyolFieldMap.label} kanal alanları`} items={channelReadiness.items} />
      </div>
    </section>
  );
}

function ProductNameStartPanel({
  value,
  suggestion,
  stage,
  canResearch,
  onChange,
  onUseSuggestion,
  onGenerate,
}: {
  value: string;
  suggestion: string;
  stage: string;
  canResearch: boolean;
  onChange: (value: string) => void;
  onUseSuggestion: () => void;
  onGenerate: () => void;
}) {
  return (
    <section className="panel p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="text-xs font-bold uppercase text-slate-400">Başlangıç</div>
          <label className="mt-2 block">
            <span className="mb-1 block text-sm font-black text-ink">Ürün adı yazılımı</span>
            <input
              className="field min-h-12 text-base font-semibold"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Örn: Yapay Benjamin Ağacı 180 cm siyah saksıda"
              autoFocus
            />
          </label>
          {suggestion && suggestion !== value.trim() && (
            <button type="button" className="mt-2 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-800" onClick={onUseSuggestion}>
              Ürün adı önerisi: {suggestion}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <span className={`flex min-h-10 items-center rounded px-3 text-xs font-bold ${canResearch ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{stage}</span>
          <button type="button" className="btn btn-secondary" onClick={onGenerate}><FileText size={16} /> SEO adı ve açıklama</button>
        </div>
      </div>
    </section>
  );
}

function BottomMissingProductPanel({
  open,
  onToggle,
  stage,
  preparation,
  channelReadiness,
  canResearch,
}: {
  open: boolean;
  onToggle: () => void;
  stage: string;
  preparation: ReadinessSummary;
  channelReadiness: ReadinessSummary;
  canResearch: boolean;
}) {
  const missingItems = [...preparation.items, ...channelReadiness.items].filter((item) => item.status !== 'done');
  const missingCount = missingItems.filter((item) => item.status === 'missing').length;
  const warningCount = missingItems.filter((item) => item.status === 'warning' || item.status === 'auto').length;

  return (
    <div className={`fixed bottom-3 right-3 z-40 ${open ? 'w-[min(360px,calc(100vw-24px))]' : 'w-auto'}`}>
      <div className={`rounded-md border border-line bg-white shadow-2xl ${open ? '' : 'max-w-[240px]'}`}>
        <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={onToggle}>
          <div className="min-w-0">
            {open && <div className="text-xs font-bold uppercase text-slate-400">Eksik ürün penceresi</div>}
            <div className="truncate font-black text-ink">{canResearch ? 'Ürün hazır' : stage}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-bold ${canResearch ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {missingCount} eksik · {warningCount} uyarı
            </span>
            <span className="text-lg font-black text-slate-400">{open ? '×' : '+'}</span>
          </div>
        </button>
        {open && (
          <div className="max-h-[55vh] overflow-auto border-t border-line p-3">
            {missingItems.length > 0 ? (
              <div className="grid gap-2">
                {missingItems.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="grid grid-cols-[82px_1fr] gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className={`rounded px-2 py-1 text-center text-[11px] font-bold ${readinessColor(item.status)}`}>{readinessLabel(item.status)}</span>
                    <div>
                      <div className="font-bold text-ink">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Eksik yok. Araştırma ve kanal hazırlığı açıldı.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReadinessList({ title, items }: { title: string; items: ReadinessItem[] }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="mb-3 font-black">{title}</div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[120px_1fr] gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className={`rounded px-2 py-1 text-center text-xs font-bold ${readinessColor(item.status)}`}>{readinessLabel(item.status)}</span>
            <div>
              <div className="font-bold text-ink">{item.label}</div>
              <div className="text-xs text-slate-500">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line p-4"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-emerald-200 bg-white px-3 py-2"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 font-bold text-ink">{value}</div></div>;
}

function componentSummary(draft: CostDetail['costDraft']) {
  const names = [
    ...draft.items.filter(isStockRecipeItem),
    ...draft.pots,
  ].map((item) => cleanText(item.name)).filter(Boolean);
  if (names.length === 0) return 'Henüz stok bileşeni seçilmedi.';
  return names.slice(0, 4).join(', ') + (names.length > 4 ? ` +${names.length - 4}` : '');
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <input className="field" type="number" step="0.01" inputMode="decimal" value={Number(value || 0)} onChange={(event) => onChange(decimalValue(event.target.value))} />;
}

function MoneyTextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      className="field"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function PercentInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <input className="field" type="number" step="0.01" inputMode="decimal" value={Number(value || 0)} onChange={(event) => onChange(decimalValue(event.target.value))} />;
}

function PickerModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-md bg-white shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-line px-4 py-3">
          <div className="font-black">{title}</div>
          <button type="button" className="btn btn-secondary min-h-9 px-3" onClick={onClose} aria-label="Kapat"><X size={16} /> Kapat</button>
        </div>
        <div className="min-h-0 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function PriceResearchPanel({
  value,
  summary,
  currentProductName,
  onChange,
  onPriceChange,
  onAddPrice,
  onOpenResearch,
  onApply,
}: {
  value: PriceResearch;
  summary: ReturnType<typeof calculatePriceResearch>;
  currentProductName: string;
  onChange: (name: keyof PriceResearch, value: unknown) => void;
  onPriceChange: (index: number, value: string) => void;
  onAddPrice: () => void;
  onOpenResearch: (target: 'GOOGLE' | 'SHOPPING' | 'TRENDYOL' | 'HEPSIBURADA') => void;
  onApply: () => void;
}) {
  const searchName = value.productName || currentProductName;

  return (
    <section className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-black"><Search size={17} /> Fiyat Arastirma</div>
          <div className="text-xs text-slate-500">Urun acmadan once Google ve pazaryeri fiyatlarini kontrol edip satis fiyatina aktarabilirsiniz.</div>
        </div>
        <button type="button" className="btn btn-primary min-h-9 px-3 text-xs" onClick={onApply}>
          <Calculator size={15} /> Arastirmayi uygula
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <Field label="Arastirilacak urun adi">
            <input
              className="field"
              value={value.productName}
              onChange={(event) => onChange('productName', event.target.value)}
              placeholder={currentProductName || 'Orn: Yapay Benjamin Agaci 180 cm siyah saksida'}
            />
          </Field>
          <div className="grid gap-2 sm:grid-cols-4">
            <button type="button" className="btn btn-secondary min-h-9 justify-center px-3 text-xs" onClick={() => onOpenResearch('GOOGLE')}><ExternalLink size={14} /> Google</button>
            <button type="button" className="btn btn-secondary min-h-9 justify-center px-3 text-xs" onClick={() => onOpenResearch('SHOPPING')}><ExternalLink size={14} /> Shopping</button>
            <button type="button" className="btn btn-secondary min-h-9 justify-center px-3 text-xs" onClick={() => onOpenResearch('TRENDYOL')}><ExternalLink size={14} /> Trendyol</button>
            <button type="button" className="btn btn-secondary min-h-9 justify-center px-3 text-xs" onClick={() => onOpenResearch('HEPSIBURADA')}><ExternalLink size={14} /> Hepsiburada</button>
          </div>
          <Field label="Not">
            <input className="field" value={value.note} onChange={(event) => onChange('note', event.target.value)} placeholder="Rakip, kalite, saksı farkı veya kampanya notu" />
          </Field>
        </div>

        <div className="rounded-md border border-line bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-black">Rakip fiyatlari</div>
            <button type="button" className="btn btn-secondary min-h-8 px-2 text-xs" onClick={onAddPrice}><Plus size={13} /> Satir</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {value.competitorPrices.map((price, index) => (
              <MoneyTextInput key={index} value={price} onChange={(next) => onPriceChange(index, next)} placeholder={`Rakip ${index + 1}`} />
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Info label="Ortalama piyasa" value={summary.averagePrice > 0 ? money(summary.averagePrice) : '-'} />
            <Info label="Dusuk / yuksek" value={summary.minPrice > 0 ? `${money(summary.minPrice)} / ${money(summary.maxPrice)}` : '-'} />
            <Info label="Maliyet onerisi" value={summary.costSuggestedPrice > 0 ? money(summary.costSuggestedPrice) : '-'} />
            <Info label="Satis onerisi" value={summary.suggestedPrice > 0 ? money(summary.suggestedPrice) : '-'} />
          </div>
        </div>
      </div>
      {searchName && <div className="mt-3 text-xs font-semibold text-slate-500">Arama kelimesi: {searchName}</div>}
    </section>
  );
}

function LiveMarginPanel({ pricing, channels }: { pricing: PricingSummary; channels: ChannelPricing[] }) {
  const bestStatus = channels.every((item) => item.status === 'Uygun') ? 'Tüm kanallar uygun' : 'Kanal fiyatı kontrol et';
  const weakest = channels.reduce((lowest, item) => item.netMarginPercent < lowest.netMarginPercent ? item : lowest, channels[0]);
  return (
    <aside className="rounded-md border border-slate-200 bg-slate-950 p-4 text-white">
      <div className="text-xs font-bold uppercase text-emerald-300">Canlı maliyet özeti</div>
      <div className="mt-3 grid gap-2">
        <DarkRule label="Malzeme toplamı" value={money(pricing.materialCost)} />
        <DarkRule label="Kargo / otomatik gider" value={money(pricing.shippingCost)} />
        <DarkRule label="Toplam ürün maliyeti" value={money(pricing.costWithShipping)} strong />
      </div>
      <div className={`mt-3 rounded-md px-3 py-2 text-sm font-black ${bestStatus === 'Tüm kanallar uygun' ? 'bg-emerald-400 text-emerald-950' : 'bg-red-500 text-white'}`}>
        {bestStatus}
      </div>
      {weakest && <div className="mt-2 text-xs text-slate-300">En düşük marj: {weakest.label} %{number(weakest.netMarginPercent)}</div>}
    </aside>
  );
}

function DarkRule({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md bg-white/10 px-3 py-2">
      <div className="text-xs text-slate-300">{label}</div>
      <div className={`${strong ? 'text-xl' : 'text-base'} font-black`}>{value}</div>
    </div>
  );
}

function ChannelPricingBoard({ channels, onUseSuggested }: { channels: ChannelPricing[]; onUseSuggested: (price: number) => void }) {
  return (
    <div className="space-y-3 rounded-md border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-ink">Kanal bazlı satış fiyatı</div>
          <div className="text-xs text-slate-500">Dükkan, site ve tüm e-ticaret kanalları aynı fiyat sırasıyla hesaplanır.</div>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {channels.map((channel) => {
          const isOk = channel.status === 'Uygun';
          return (
            <div key={channel.key} className={`rounded-md border p-3 ${isOk ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-sm font-black ${isOk ? 'text-emerald-900' : 'text-red-900'}`}>{channel.label}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-600">{channel.status}</div>
                </div>
                <div className={`rounded px-2 py-1 text-xs font-black ${isOk ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>%{number(channel.netMarginPercent)}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Info label="Satış" value={money(channel.salePrice)} />
                <Info label="Net kâr" value={money(channel.netProfit)} />
                <Info label="Komisyon" value={money(channel.commissionAmount)} />
                <Info label="Kargo yükü" value={money(channel.businessShippingCost)} />
              </div>
              <button type="button" className="btn btn-secondary mt-3 min-h-9 w-full justify-center text-xs" onClick={() => onUseSuggested(channel.suggestedMinimumSalePrice)}>
                Minimumu kullan: {money(channel.suggestedMinimumSalePrice)}
              </button>
            </div>
          );
        })}
      </div>
      <ChannelComparisonTable channels={channels} />
    </div>
  );
}

function ChannelComparisonTable({ channels, compact = false }: { channels: ChannelPricing[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Kanal</th>
            <th className="px-3 py-2">KDV dahil satış</th>
            <th className="px-3 py-2">KDV hariç</th>
            <th className="px-3 py-2">Kargo</th>
            <th className="px-3 py-2">Komisyon</th>
            {!compact && <th className="px-3 py-2">POS / hizmet</th>}
            <th className="px-3 py-2">Net kazanç</th>
            <th className="px-3 py-2">Gerçek marj</th>
            <th className="px-3 py-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => (
            <tr key={channel.key} className="border-t border-line">
              <td className="px-3 py-2 font-bold">{channel.label}</td>
              <td className="px-3 py-2">{money(channel.salePrice)}</td>
              <td className="px-3 py-2">{money(channel.netPriceWithoutVat)}</td>
              <td className="px-3 py-2">{money(channel.businessShippingCost)}</td>
              <td className="px-3 py-2">{money(channel.commissionAmount)}</td>
              {!compact && <td className="px-3 py-2">{money(channel.paymentFeeAmount + channel.serviceFee + channel.otherExpense)}</td>}
              <td className="px-3 py-2 font-bold">{money(channel.netProfit)}</td>
              <td className={`px-3 py-2 font-black ${channel.status === 'Uygun' ? 'text-emerald-700' : 'text-red-700'}`}>%{number(channel.netMarginPercent)}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-1 text-xs font-black ${channel.status === 'Uygun' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{channel.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisiblePricingGuide({
  summary,
  draft,
  selectedSalePrice,
  onUseShop,
  onUseSite,
  onUseEcommerce,
}: {
  summary: PricingSummary;
  draft: CostDetail['costDraft'];
  selectedSalePrice: number;
  onUseShop: () => void;
  onUseSite: () => void;
  onUseEcommerce: () => void;
}) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-emerald-950">Satış fiyatı nasıl oluşur?</div>
          <div className="mt-1 text-xs font-semibold text-emerald-800">
            Tüm maliyet + %{number(draft.profitMarginPercent)} kâr + %{number(draft.vatPercent)} KDV = dükkan. Dükkan + kargo = site. Site + %35 = e-ticaret.
          </div>
        </div>
        <div className="rounded bg-white px-3 py-2 text-xs font-black text-emerald-900">
          Seçilen: {selectedSalePrice > 0 ? money(selectedSalePrice) : 'Henüz seçilmedi'}
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <PricePickCard title="Dükkan fiyatı" detail="Mağaza içinde kullanılacak fiyat" value={summary.shopSalePrice} onUse={onUseShop} />
        <PricePickCard title="Web site fiyatı" detail="Dükkan fiyatı + kargo" value={summary.siteSalePrice} onUse={onUseSite} />
        <PricePickCard title="Pazaryeri fiyatı" detail="Tüm e-ticaret sitelerine gidecek fiyat" value={summary.suggestedSalePrice} onUse={onUseEcommerce} primary />
      </div>
    </div>
  );
}

function PricePickCard({ title, detail, value, onUse, primary = false }: { title: string; detail: string; value: number; onUse: () => void; primary?: boolean }) {
  return (
    <div className={`rounded-md border bg-white p-3 ${primary ? 'border-emerald-400' : 'border-line'}`}>
      <div className="text-xs font-bold text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-black text-ink">{money(value)}</div>
      <div className="mt-1 min-h-8 text-xs font-semibold text-slate-500">{detail}</div>
      <button type="button" className={`btn mt-3 min-h-9 w-full justify-center text-xs ${primary ? 'btn-primary' : 'btn-secondary'}`} onClick={onUse}>
        Bu fiyatı kullan
      </button>
    </div>
  );
}

function PricingRules({ summary, draft, onUseSuggested }: { summary: PricingSummary; draft: CostDetail['costDraft']; onUseSuggested: () => void }) {
  const profitTone = summary.estimatedProfitRate >= 45 ? 'text-emerald-700' : 'text-red-700';
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-ink">Fiyat ve kâr kuralları</div>
          <div className="text-xs text-slate-500">Hesap: tüm maliyet toplamı + %45 kâr + %20 KDV = dükkan; dükkan + kargo = site; site + %35 = e-ticaret.</div>
        </div>
        <button type="button" className="btn btn-primary min-h-9 px-3 text-xs" onClick={onUseSuggested}>
          Önerilen fiyatı kullan
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Rule label="Tüm maliyet toplamı" value={money(summary.materialCost)} />
        <Rule label={`Hedef kâr %${number(draft.profitMarginPercent)}`} value={money(summary.targetProfitAmount)} />
        <Rule label={`KDV %${number(draft.vatPercent)}`} value={money(summary.vatAmount)} />
        <Rule label="Dükkan satış fiyatı" value={money(summary.shopSalePrice)} strong />
        <Rule label="Kargo maliyeti" value={money(summary.shippingCost)} />
        <Rule label="Site satış fiyatı" value={money(summary.siteSalePrice)} strong />
        <Rule label="E-ticaret +%35" value={money(summary.ecommerceMarkup35Amount)} />
        <Rule label="E-ticaret satış fiyatı" value={money(summary.suggestedSalePrice)} strong />
        <Rule label="Mevcut satışta net kâr" value={money(summary.estimatedNetProfit)} className={profitTone} />
        <Rule label="Mevcut kâr oranı" value={`%${number(summary.estimatedProfitRate)}`} className={profitTone} />
      </div>
    </div>
  );
}

function Rule({ label, value, strong, className = '' }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 ${strong ? 'text-xl font-black' : 'text-base font-bold'} ${className || 'text-ink'}`}>{value}</div>
    </div>
  );
}

function ProductImage({ images }: { images: string[] }) {
  const src = images?.[0];
  if (!src) return <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"><ImageIcon size={22} /></div>;
  return <img className="h-16 w-16 shrink-0 rounded-md object-cover" src={normalizeImage(src)} alt="Ürün" />;
}

function ComponentStockMatcher({
  productName,
  stockCards,
  selectedIds,
  onSelect,
  onClose,
  onRefresh,
  loading,
}: {
  productName: string;
  stockCards: StockCard[];
  selectedIds: Set<number>;
  onSelect: (role: ComponentRole, stockCard: StockCard) => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const searchText = search.trim();
  const rankingText = searchText || productName;
  const suggestions = stockCards
    .filter((stockCard) => stockCard.status !== 'PASSIVE')
    .map((stockCard) => {
      const role = inferComponentRole(stockCard);
      const score = stockSuggestionScore(stockCard, rankingText, productName, stockCard.category ?? '') + componentRoleScore(stockCard, role);
      return { stockCard, role, score };
    })
    .filter((item) => !searchText || item.score > 0)
    .sort((a, b) => b.score - a.score || a.stockCard.name.localeCompare(b.stockCard.name, 'tr'))
    .slice(0, 200);

  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold">Stok bileşeni ara ve ekle</div>
          <div className="text-xs text-slate-500">Ürün adı, stok adı, stok kodu veya barkod yazın; seçilen kart reçeteye aynı ad, birim, maliyet ve stok bağlantısıyla eklenir.</div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
          <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={onClose}>Geri / Kapat</button>
        </div>
      </div>
      <div className="space-y-3">
        <input
          className="field"
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Örn: ağaç gövde, menekşe, saksı, taş, stok kodu veya barkod${productName ? ` · Ürün: ${productName}` : ''}`}
        />
        <div className="max-h-[520px] overflow-auto rounded-md border border-line bg-white">
          {loading ? (
            <div className="p-4 text-sm font-semibold text-slate-500">Stok kartları güncelleniyor...</div>
          ) : suggestions.length > 0 ? suggestions.map(({ stockCard, role }) => {
            const selected = selectedIds.has(stockCard.id);
            return (
              <button
                type="button"
                key={stockCard.id}
                className={`block w-full border-b border-line px-3 py-3 text-left transition hover:bg-slate-50 ${selected ? 'bg-emerald-50' : 'bg-white'}`}
                onClick={() => {
                  onSelect(role, stockCard);
                  onClose();
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{stockCard.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{stockCard.sku || 'Stok kodu yok'} · {stockCard.category || 'Kategori yok'} · {number(stockCard.stockQuantity)} {stockCard.unit}</div>
                  </div>
                  <div className="text-right text-xs font-semibold text-slate-600">
                    <div>{componentRoleLabel(role)}</div>
                    <div className="mt-1">{money(stockCard.automaticUnitCost || stockCard.manualUnitCost)}</div>
                    {selected && <div className="mt-1 text-emerald-700">Eklendi</div>}
                  </div>
                </div>
              </button>
            );
          }) : (
            <div className="p-4 text-sm font-semibold text-slate-500">Bu aramaya uygun aktif stok kartı bulunamadı. Yeni stok eklediyseniz Yenile düğmesine basın.</div>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Gösterilen sonuç: {suggestions.length}. Daha dar sonuç için ürün adını veya stok kodunu yazın.
        </div>
      </div>
    </div>
  );
}

function StockMatchSuggestions({
  productName,
  suggestions,
  selectedIds,
  onSelect,
}: {
  productName: string;
  suggestions: StockCard[];
  selectedIds: Set<number>;
  onSelect: (stockCard: StockCard) => void;
}) {
  if (!productName.trim()) {
    return <div className="rounded-md border border-dashed border-line p-4 text-sm font-semibold text-slate-500">Ürün adını yazınca stok eşleştirme önerileri burada görünür.</div>;
  }

  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold">Stoktan eşleştir</div>
          <div className="text-xs text-slate-500">Satışta stok düşmesi için ürün adından uygun stok kartını seçin.</div>
        </div>
        <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" onClick={() => suggestions[0] && onSelect(suggestions[0])} disabled={suggestions.length === 0}>
          İlk öneriyi eşleştir
        </button>
      </div>
      {suggestions.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {suggestions.map((stockCard) => {
            const selected = selectedIds.has(stockCard.id);
            return (
              <button
                type="button"
                key={stockCard.id}
                className={`rounded-md border bg-white p-3 text-left transition hover:border-brand ${selected ? 'border-brand ring-2 ring-emerald-100' : 'border-line'}`}
                onClick={() => onSelect(stockCard)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{stockCard.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{stockCard.sku || 'Stok kodu yok'} · {stockCard.category || 'Kategori yok'}</div>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-bold ${selected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selected ? 'Eşleşti' : '1 düş'}</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-600">Stok: {number(stockCard.stockQuantity)} {stockCard.unit} · Birim maliyet: {money(stockCard.automaticUnitCost)}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line bg-white p-3 text-sm font-semibold text-slate-500">Bu ürün adına uygun aktif stok kartı bulunamadı. Stok ekranında “limon demet” gibi bir stok kartı olduğundan emin olun.</div>
      )}
    </div>
  );
}

function CostTable({ detail, stockCards, productName, onChange }: { detail: CostDetail | null; stockCards: StockCard[]; productName: string; onChange: (draft: CostDetail['costDraft']) => void }) {
  const [stockPicker, setStockPicker] = useState<{ rowType: 'items' | 'pots'; index: number } | null>(null);
  const [stockSearch, setStockSearch] = useState('');

  if (!detail) return <div className="rounded-md border border-line p-4 text-sm text-slate-500">Şablondan başlat veya manuel satır ekle; malzeme listesi burada görünür.</div>;
  const draft = detail.costDraft;
  const rows = [...draft.items.map((item, index) => ({ ...item, rowType: 'items' as const, index })), ...draft.pots.map((pot, index) => ({ ...pot, group: 'POT', unit: pot.unit ?? 'adet', rowType: 'pots' as const, index }))];
  const filteredStockCards = stockCards
    .filter((stockCard) => stockCard.status !== 'PASSIVE')
    .map((stockCard) => ({ stockCard, score: stockSuggestionScore(stockCard, stockSearch, productName, stockPicker ? rows.find((row) => row.rowType === stockPicker.rowType && row.index === stockPicker.index)?.name : '') }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.stockCard.name.localeCompare(b.stockCard.name, 'tr'))
    .slice(0, 80)
    .map((item) => item.stockCard);

  function updateRow(row: (typeof rows)[number], key: string, value: unknown) {
    const collection = row.rowType === 'items' ? [...draft.items] : [...draft.pots];
    const nextRow = { ...collection[row.index], [key]: value } as any;
    if (key === 'stockCardId') {
      const stockCard = stockCards.find((item) => item.id === Number(value));
      nextRow.stockCardId = Number(value) || null;
      nextRow.name = stockCard?.name ?? nextRow.name;
      nextRow.unit = stockCard?.unit ?? nextRow.unit;
      nextRow.source = nextRow.stockCardId ? 'AUTO' : 'MANUAL';
      nextRow.automaticUnitCost = Number(stockCard?.automaticUnitCost ?? 0);
    }
    collection[row.index] = nextRow;
    onChange({ ...draft, [row.rowType]: collection });
  }

  function removeRow(row: (typeof rows)[number]) {
    const collection = row.rowType === 'items' ? draft.items : draft.pots;
    onChange({ ...draft, [row.rowType]: collection.filter((_, index) => index !== row.index) });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Kalem</th><th className="px-3 py-2">Stok kartı</th><th className="px-3 py-2">Grup</th><th className="px-3 py-2">Miktar</th><th className="px-3 py-2">Birim</th><th className="px-3 py-2">Fiyat kaynağı</th><th className="px-3 py-2">Manuel maliyet</th><th className="px-3 py-2">Tutar</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>{rows.map((row) => <tr key={`${row.rowType}-${row.index}`} className="border-t border-line">
            <td className="px-3 py-2"><input className="field min-w-36" value={row.name} onChange={(event) => updateRow(row, 'name', event.target.value)} /></td>
            <td className="px-3 py-2">
              <button type="button" className="field flex min-w-52 items-center justify-between text-left" onClick={() => { setStockPicker({ rowType: row.rowType, index: row.index }); setStockSearch(''); }}>
                <span className="line-clamp-1">{stockCards.find((stockCard) => stockCard.id === row.stockCardId)?.name || 'Stok kartı ara'}</span>
                <Search size={15} className="text-slate-400" />
              </button>
            </td>
            <td className="px-3 py-2">{row.rowType === 'items' ? <select className="field min-w-32" value={row.group} onChange={(event) => updateRow(row, 'group', event.target.value)}>
              {['LEAF_TRUNK', 'POT', 'CONSUMABLE', 'LABOR', 'PACKAGING', 'OTHER'].map((group) => <option key={group} value={group}>{groupLabel(group)}</option>)}
            </select> : groupLabel('POT')}</td>
            <td className="px-3 py-2"><input className="field w-24" type="number" step="0.001" inputMode="decimal" value={Number(row.quantity || 0)} onChange={(event) => updateRow(row, 'quantity', decimalValue(event.target.value))} /></td>
            <td className="px-3 py-2"><input className="field w-24" value={row.unit} onChange={(event) => updateRow(row, 'unit', event.target.value)} disabled={row.rowType === 'pots'} /></td>
            <td className="px-3 py-2"><select className="field w-40" value={row.source} onChange={(event) => updateRow(row, 'source', event.target.value)}>
              <option value="AUTO">{sourceLabel('AUTO')}</option>
              <option value="MANUAL">{sourceLabel('MANUAL')}</option>
            </select></td>
            <td className="px-3 py-2"><MoneyInput value={Number(row.manualUnitCost || 0)} onChange={(value) => updateRow(row, 'manualUnitCost', value)} /></td>
            <td className="px-3 py-2 font-semibold">{money(Number(row.totalCost ?? Number(row.quantity || 0) * (row.source === 'MANUAL' ? Number(row.manualUnitCost || 0) : Number(row.automaticUnitCost || 0))))}</td>
            <td className="px-3 py-2"><button type="button" className="btn btn-secondary min-h-9 px-3" onClick={() => removeRow(row)}><Trash2 size={15} /></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {stockPicker && (
        <PickerModal title="Stok Kartı Seç" onClose={() => setStockPicker(null)}>
          <input className="field mb-3" autoFocus placeholder="Yaprak, saksı, gövde, silikon veya stok kodu ara" value={stockSearch} onChange={(event) => setStockSearch(event.target.value)} />
          <div className="max-h-[440px] overflow-auto rounded-md border border-line">
            <button type="button" className="block w-full border-b border-line px-3 py-3 text-left hover:bg-slate-50" onClick={() => { updateRow({ ...rows.find((row) => row.rowType === stockPicker.rowType && row.index === stockPicker.index)!, rowType: stockPicker.rowType, index: stockPicker.index }, 'stockCardId', ''); setStockPicker(null); }}>
              <div className="font-bold">Manuel fiyat gireceğim</div>
              <div className="text-xs text-slate-500">Stok kartına bağlanmaz, satışta stok düşmez.</div>
            </button>
            {filteredStockCards.map((stockCard) => (
              <button
                type="button"
                key={stockCard.id}
                className="block w-full border-b border-line px-3 py-3 text-left hover:bg-slate-50"
                onClick={() => {
                  const target = rows.find((row) => row.rowType === stockPicker.rowType && row.index === stockPicker.index);
                  if (target) updateRow(target, 'stockCardId', String(stockCard.id));
                  setStockPicker(null);
                }}
              >
                <div className="font-bold">{stockCard.name}</div>
                <div className="mt-1 text-xs text-slate-500">{stockCard.sku || 'Stok kodu yok'} · Stok: {number(stockCard.stockQuantity)} {stockCard.unit} · Birim: {money(stockCard.automaticUnitCost)}</div>
              </button>
            ))}
          </div>
        </PickerModal>
      )}
    </>
  );
}

function defaultCostDraft(salePrice: number, commissionPercent: number): CostDetail['costDraft'] {
  return {
    salePrice,
    profitMarginPercent: 45,
    commissionPercent: commissionPercent || 20,
    vatPercent: 20,
    shippingCost: 0,
    desi: 0,
    marketplaceMarkupPercent: 35,
    campaignBufferPercent: 0,
    totalCost: 0,
    items: [],
    pots: [],
  };
}

function normalizeDraftTotals(draft: CostDetail['costDraft']): CostDetail['costDraft'] {
  const items = draft.items.map((item) => ({ ...item, totalCost: lineTotal(item) }));
  const pots = draft.pots.map((item) => ({ ...item, totalCost: lineTotal(item) }));
  return {
    ...draft,
    items,
    pots,
    totalCost: roundMoney([...items, ...pots].reduce((sum, item) => sum + Number(item.totalCost || 0), 0)),
  };
}

function calculatePricing(draft: CostDetail['costDraft'], salePrice: number, commissionPercent: number): PricingSummary {
  const normalized = normalizeDraftTotals({ ...draft, commissionPercent: commissionPercent || draft.commissionPercent });
  const materialCost = Number(normalized.totalCost || 0);
  const shippingCost = Number(normalized.shippingCost || 0);
  const enteredSalePrice = Number(salePrice || normalized.salePrice || 0);
  const vatPercent = Number(normalized.vatPercent || 20);
  const commissionRate = Number(commissionPercent || normalized.commissionPercent || 0) / 100;
  const vatRateIncluded = vatPercent > 0 ? vatPercent / (100 + vatPercent) : 0;
  const costWithShipping = roundMoney(materialCost + shippingCost);
  const targetMarginRate = Number(normalized.profitMarginPercent || 45) / 100;
  const targetProfitAmount = roundMoney(materialCost * targetMarginRate);
  const profitIncludedBase = roundMoney(materialCost + targetProfitAmount);
  const vatAmount = roundMoney(profitIncludedBase * (Math.max(vatPercent, 0) / 100));
  const shopSalePrice = roundMoney(profitIncludedBase + vatAmount);
  const siteSalePrice = roundMoney(shopSalePrice + shippingCost);
  const ecommerceMarkupPercent = 35;
  const ecommerceMarkup35Amount = roundMoney(siteSalePrice * (ecommerceMarkupPercent / 100));
  const marketplaceBufferAmount = ecommerceMarkup35Amount;
  const campaignBufferAmount = 0;
  const minimumSalePrice = shopSalePrice;
  const commissionAmount = roundMoney(shopSalePrice * commissionRate);
  const suggestedSalePrice = roundMoney(siteSalePrice + ecommerceMarkup35Amount);
  const enteredVatAmount = roundMoney(enteredSalePrice * vatRateIncluded);
  const enteredCommissionAmount = roundMoney(enteredSalePrice * commissionRate);
  const estimatedNetProfit = roundMoney(enteredSalePrice - enteredVatAmount - enteredCommissionAmount - costWithShipping);
  const estimatedProfitRate = enteredSalePrice > 0 ? roundMoney((estimatedNetProfit / enteredSalePrice) * 100) : 0;

  return {
    materialCost,
    shippingCost,
    costWithShipping,
    shopSalePrice,
    siteSalePrice,
    ecommerceMarkup35Amount,
    vatAmount,
    commissionAmount,
    marketplaceBufferAmount,
    campaignBufferAmount,
    targetProfitAmount,
    enteredSalePrice,
    estimatedNetProfit,
    estimatedProfitRate,
    suggestedSalePrice,
    minimumSalePrice,
  };
}

function calculatePriceResearch(research: PriceResearch, costSuggestedPrice: number) {
  const prices = research.competitorPrices
    .map(parsePriceText)
    .filter((price) => Number.isFinite(price) && price > 0);
  const averagePrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const marketBasedPrice = averagePrice > 0 ? averagePrice : 0;
  const safeCostPrice = Number(costSuggestedPrice || 0);
  const suggestedPrice = roundMoney(Math.max(marketBasedPrice, safeCostPrice));

  return {
    prices,
    averagePrice: roundMoney(averagePrice),
    minPrice: roundMoney(minPrice),
    maxPrice: roundMoney(maxPrice),
    costSuggestedPrice: roundMoney(safeCostPrice),
    suggestedPrice,
  };
}

function calculateChannelPricing(draft: CostDetail['costDraft'], salePrice: number, commissionPercent: number): ChannelPricing[] {
  const normalized = normalizeDraftTotals(draft);
  const productCost = Number(normalized.totalCost || 0);
  const vatPercent = Number(normalized.vatPercent || 20);
  const targetMarginPercent = Number(normalized.profitMarginPercent || 45);
  const baseShipping = Number(normalized.shippingCost || 0);
  const summary = calculatePricing(normalized, salePrice, commissionPercent);
  const presets = [
    { key: 'SHOP', label: 'Dükkan / Fiziki Mağaza', salePrice: summary.shopSalePrice, commissionPercent: 0, shippingCost: 0, customerShippingCharge: 0, paymentFeePercent: 0, serviceFee: 0, otherExpense: 0 },
    { key: 'SITE', label: 'Mağaza Web Sitesi', salePrice: summary.siteSalePrice, commissionPercent: 0, shippingCost: baseShipping, customerShippingCharge: 0, paymentFeePercent: 0, serviceFee: 0, otherExpense: 0 },
    { key: 'TRENDYOL', label: 'Trendyol', salePrice: summary.suggestedSalePrice, commissionPercent: 0, shippingCost: baseShipping, customerShippingCharge: 0, paymentFeePercent: 0, serviceFee: 0, otherExpense: 0 },
    { key: 'HEPSIBURADA', label: 'Hepsiburada', salePrice: summary.suggestedSalePrice, commissionPercent: 0, shippingCost: baseShipping, customerShippingCharge: 0, paymentFeePercent: 0, serviceFee: 0, otherExpense: 0 },
    { key: 'N11', label: 'N11', salePrice: summary.suggestedSalePrice, commissionPercent: 0, shippingCost: baseShipping, customerShippingCharge: 0, paymentFeePercent: 0, serviceFee: 0, otherExpense: 0 },
    { key: 'TICIMAX', label: 'Diğer Pazaryeri / Ticimax', salePrice: summary.suggestedSalePrice, commissionPercent: 0, shippingCost: baseShipping, customerShippingCharge: 0, paymentFeePercent: 0, serviceFee: 0, otherExpense: 0 },
  ];

  return presets.map((preset) => {
    return calculateSingleChannelPricing({
      ...preset,
      productCost,
      vatPercent,
      targetMarginPercent,
    });
  });
}

function calculateSingleChannelPricing(input: {
  key: string;
  label: string;
  salePrice: number;
  productCost: number;
  vatPercent: number;
  targetMarginPercent: number;
  commissionPercent: number;
  shippingCost: number;
  customerShippingCharge: number;
  paymentFeePercent: number;
  serviceFee: number;
  otherExpense: number;
}): ChannelPricing {
  const vatIncludedRate = input.vatPercent > 0 ? input.vatPercent / (100 + input.vatPercent) : 0;
  const commissionRate = Math.max(input.commissionPercent, 0) / 100;
  const paymentFeeRate = Math.max(input.paymentFeePercent, 0) / 100;
  const businessShippingCost = Math.max(0, Number(input.shippingCost || 0) - Number(input.customerShippingCharge || 0));
  const fixedCosts = input.productCost + businessShippingCost + Number(input.serviceFee || 0) + Number(input.otherExpense || 0);
  const suggestedMinimumSalePrice = roundMoney(input.salePrice);
  const vatAmount = roundMoney(input.salePrice * vatIncludedRate);
  const commissionAmount = roundMoney(input.salePrice * commissionRate);
  const paymentFeeAmount = roundMoney(input.salePrice * paymentFeeRate);
  const netPriceWithoutVat = roundMoney(input.salePrice - vatAmount);
  const netProfit = roundMoney(input.salePrice - vatAmount - commissionAmount - paymentFeeAmount - fixedCosts);
  const netMarginPercent = input.salePrice > 0 ? roundMoney((netProfit / input.salePrice) * 100) : 0;
  const status = input.productCost <= 0 || input.salePrice <= 0
    ? 'Eksik veri'
    : 'Uygun';

  return {
    key: input.key,
    label: input.label,
    salePrice: input.salePrice,
    netPriceWithoutVat,
    vatPercent: input.vatPercent,
    vatAmount,
    commissionPercent: input.commissionPercent,
    commissionAmount,
    shippingCost: input.shippingCost,
    customerShippingCharge: input.customerShippingCharge,
    businessShippingCost,
    paymentFeePercent: input.paymentFeePercent,
    paymentFeeAmount,
    serviceFee: input.serviceFee,
    otherExpense: input.otherExpense,
    netProfit,
    netMarginPercent,
    suggestedMinimumSalePrice,
    status,
  };
}

function lineTotal(item: { quantity: number; source: string; manualUnitCost: number; automaticUnitCost: number; totalCost?: number; isActive?: boolean }) {
  if (item.isActive === false) return 0;
  const quantity = Number(item.quantity || 0);
  const unitCost = item.source === 'MANUAL' ? Number(item.manualUnitCost || 0) : Number(item.automaticUnitCost || 0);
  return roundMoney(quantity * unitCost);
}

function normalizeImage(path: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return apiFileUrl(path);
}

function groupLabel(value: string) {
  const labels: Record<string, string> = {
    LEAF_TRUNK: 'Yaprak / gövde',
    POT: 'Saksı',
    CONSUMABLE: 'Sarf malzeme',
    LABOR: 'İşçilik',
    PACKAGING: 'Paketleme',
    OTHER: 'Diğer',
  };
  return labels[value] ?? value;
}

function defaultExpenseGroup(expense: DefaultExpense) {
  const text = normalizeSearchText(`${expense.expenseKey} ${expense.name}`);
  if (/(^|[^a-z0-9])(paket|paketleme|ambalaj|karton|kutu|koli)([^a-z0-9]|$)/.test(text)) return 'PACKAGING';
  if (/(^|[^a-z0-9])(iscilik|is|elektrik|su|personel)([^a-z0-9]|$)/.test(text)) return 'LABOR';
  if (/(^|[^a-z0-9])(sarf|silikon|alci|strafor)([^a-z0-9]|$)/.test(text)) return 'CONSUMABLE';
  return 'OTHER';
}

function isStockRecipeItem(item: CostDetail['costDraft']['items'][number]) {
  if (item.stockCardId) return true;
  if (item.isDefaultExpense) return false;
  return !['LABOR', 'PACKAGING', 'CONSUMABLE', 'OTHER'].includes(item.group);
}

function componentRoleLabel(role: ComponentRole) {
  const labels: Record<ComponentRole, string> = {
    LEAF: 'Yaprak',
    TRUNK: 'Gövde',
    FLOWER: 'Çiçek / demet',
    BRANCH: 'Dal',
    POT: 'Saksı',
    STONE: 'Taş / dolgu',
    PACKAGING: 'Ambalaj',
    CONSUMABLE: 'Sarf malzeme',
    AUXILIARY: 'Yardımcı malzeme',
    OTHER: 'Stok kartı',
  };
  return labels[role];
}

function componentRoleGroup(role: ComponentRole, stockCard: StockCard) {
  if (role === 'POT') return 'POT';
  if (role === 'PACKAGING') return 'PACKAGING';
  if (role === 'CONSUMABLE') return 'CONSUMABLE';
  if (role === 'LEAF' || role === 'TRUNK' || role === 'FLOWER' || role === 'BRANCH') return 'LEAF_TRUNK';
  return inferCostGroupFromStockCard(stockCard);
}

function inferComponentRole(stockCard: StockCard): ComponentRole {
  const text = normalizeSearchText([
    stockCard.name,
    stockCard.category,
    stockCard.productFamily,
    stockCard.productType,
    stockCard.sku,
  ].filter(Boolean).join(' '));
  if (/(^|[^a-z0-9])(saksi|pot|kap|dekor)([^a-z0-9]|$)/.test(text)) return 'POT';
  if (/(^|[^a-z0-9])(govde|trunk|iskelet|bambu)([^a-z0-9]|$)/.test(text)) return 'TRUNK';
  if (/(^|[^a-z0-9])(yaprak|leaf|sarmasik|ficus|palmiye|areka)([^a-z0-9]|$)/.test(text)) return 'LEAF';
  if (/(^|[^a-z0-9])(cicek|demet|buket|menekse|limon|lavanta|gul)([^a-z0-9]|$)/.test(text)) return 'FLOWER';
  if (/(^|[^a-z0-9])(dal|branch)([^a-z0-9]|$)/.test(text)) return 'BRANCH';
  if (/(^|[^a-z0-9])(tas|dolgu|cakil|mermer|dolomit|strafor|alci)([^a-z0-9]|$)/.test(text)) return 'STONE';
  if (/(^|[^a-z0-9])(ambalaj|paket|kutu|koli|karton|poset|jelatin)([^a-z0-9]|$)/.test(text)) return 'PACKAGING';
  if (/(^|[^a-z0-9])(sarf|silikon|yapistirici|bant|tel|vida|elektrik)([^a-z0-9]|$)/.test(text)) return 'CONSUMABLE';
  if (/(^|[^a-z0-9])(yardimci|plastik|parca|aparat|destek|aksesuar|metal|demir)([^a-z0-9]|$)/.test(text)) return 'AUXILIARY';
  return 'OTHER';
}

function inferCostGroupFromStockCard(stockCard: StockCard) {
  const text = normalizeSearchText([
    stockCard.name,
    stockCard.category,
    stockCard.productFamily,
    stockCard.productType,
  ].filter(Boolean).join(' '));
  if (/(^|[^a-z0-9])(saksi|pot|kap|dekor)([^a-z0-9]|$)/.test(text)) return 'POT';
  if (/(^|[^a-z0-9])(ambalaj|paket|kutu|koli|karton|poset|jelatin)([^a-z0-9]|$)/.test(text)) return 'PACKAGING';
  if (/(^|[^a-z0-9])(sarf|silikon|yapistirici|bant|tel|vida|elektrik)([^a-z0-9]|$)/.test(text)) return 'CONSUMABLE';
  if (/(^|[^a-z0-9])(yaprak|govde|agac|dal|cicek|demet|buket|ficus|bambu|lavanta|gul)([^a-z0-9]|$)/.test(text)) return 'LEAF_TRUNK';
  return 'OTHER';
}

function sourceLabel(value: string) {
  return value === 'AUTO' ? 'Stok kartı maliyeti' : 'Manuel fiyat';
}

function stockCardOptionLabel(stockCard: StockCard) {
  return [
    stockCard.name,
    stockCard.sku || stockCard.model || stockCard.barcode || '',
    `${number(stockCard.stockQuantity)} ${stockCard.unit}`,
    money(stockCard.automaticUnitCost || stockCard.manualUnitCost),
  ].filter(Boolean).join(' · ');
}

function channelLabel(value: string) {
  const labels: Record<string, string> = {
    SHOP: 'Dükkan',
    SITE: 'Web sitesi',
    TRENDYOL: 'Trendyol',
    HEPSIBURADA: 'Hepsiburada',
    N11: 'N11',
    TICIMAX: 'Diğer / Ticimax',
  };
  return labels[value] ?? value;
}

function decimalValue(value: string) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePriceText(value: string) {
  const clean = String(value ?? '').replace(/[^\d.,]/g, '').trim();
  if (!clean) return 0;
  const normalized = clean.includes(',') && clean.includes('.')
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractSizeText(value: string) {
  return value.match(/\b\d{2,3}\s*cm\b/i)?.[0] ?? value.match(/\b\d{1,3}\s*x\s*\d{1,3}(?:\s*x\s*\d{1,3})?\b/i)?.[0] ?? '';
}

function stockSuggestionScore(stockCard: StockCard, searchText: string, productName: string, rowName?: string) {
  const haystack = normalizeSearchText([
    stockCard.name,
    stockCard.sku,
    stockCard.model,
    stockCard.barcode,
    stockCard.category,
    stockCard.productFamily,
    stockCard.productType,
    stockCard.unit,
  ].filter(Boolean).join(' '));
  const typedTokens = searchTokens(searchText);
  const productTokens = searchTokens(productName);
  const rowTokens = searchTokens(rowName ?? '');
  const wantedTokens = Array.from(new Set([...typedTokens, ...rowTokens, ...productTokens.filter((token) => token.length >= 4)]));

  if (wantedTokens.length === 0) return 1;

  let score = 0;
  for (const token of wantedTokens) {
    if (!haystack.includes(token)) continue;
    score += typedTokens.includes(token) ? 12 : rowTokens.includes(token) ? 9 : 4;
  }

  if (rowTokens.some((token) => ['saksi', 'pot'].includes(token)) && normalizeSearchText(`${stockCard.category ?? ''} ${stockCard.name}`).includes('saksi')) score += 14;
  if (rowTokens.some((token) => ['govde', 'agac', 'yaprak'].includes(token)) && /govde|agac|yaprak|dal/.test(haystack)) score += 10;
  if (productTokens.some((token) => haystack.includes(token))) score += 3;

  return score;
}

function componentRoleScore(stockCard: StockCard, role: ComponentRole) {
  const text = normalizeSearchText([
    stockCard.name,
    stockCard.sku,
    stockCard.model,
    stockCard.category,
    stockCard.productFamily,
    stockCard.productType,
    stockCard.unit,
  ].filter(Boolean).join(' '));

  if (role === 'OTHER') return 1;
  if (role === 'TRUNK') {
    if (/(^|[^a-z0-9])(govde|trunk|iskelet)([^a-z0-9]|$)/.test(text)) return 100;
    if (/(^|[^a-z0-9])(agac|bambu|dal)([^a-z0-9]|$)/.test(text)) return 35;
  }
  if (role === 'LEAF') {
    if (/(^|[^a-z0-9])(yaprak|leaf|sarmasik|ficus|palmiye|areka)([^a-z0-9]|$)/.test(text)) return 45;
  }
  if (role === 'FLOWER') {
    if (/(^|[^a-z0-9])(cicek|demet|buket|menekse|limon|lavanta|gul)([^a-z0-9]|$)/.test(text)) return 45;
  }
  if (role === 'BRANCH') {
    if (/(^|[^a-z0-9])(dal|branch)([^a-z0-9]|$)/.test(text)) return 45;
  }
  if (role === 'POT') {
    if (/(^|[^a-z0-9])(saksi|pot|dekor|kap)([^a-z0-9]|$)/.test(text)) return 40;
  }
  if (role === 'STONE') {
    if (/(^|[^a-z0-9])(tas|dolgu|cakil|mermer|dolomit|strafor|alci)([^a-z0-9]|$)/.test(text)) return 45;
  }
  if (role === 'PACKAGING') {
    if (/(^|[^a-z0-9])(ambalaj|paket|kutu|koli|karton|poset|jelatin)([^a-z0-9]|$)/.test(text)) return 45;
  }
  if (role === 'CONSUMABLE') {
    if (/(^|[^a-z0-9])(sarf|silikon|yapistirici|bant|tel|vida|elektrik)([^a-z0-9]|$)/.test(text)) return 45;
  }
  if (role === 'AUXILIARY') {
    if (/(^|[^a-z0-9])(yardimci|plastik|parca|aparat|destek|aksesuar|metal|demir)([^a-z0-9]|$)/.test(text)) return 45;
  }
  return 0;
}

function findCategoryIdForStock(stockCard: StockCard, categories: Category[], productName: string) {
  const stockCategory = normalizeSearchText(stockCard.category ?? '');
  const stockText = normalizeSearchText(`${stockCard.name} ${stockCard.category ?? ''} ${stockCard.productType ?? ''} ${productName}`);
  const exact = categories.find((category) => normalizeSearchText(category.name) === stockCategory);
  if (exact) return exact.id;

  const contains = categories.find((category) => {
    const categoryText = normalizeSearchText(category.name);
    return categoryText && (stockText.includes(categoryText) || categoryText.split(/[^a-z0-9]+/).some((token) => token.length >= 4 && stockText.includes(token)));
  });
  if (contains) return contains.id;

  if (/demet|buket|cicek|guller|gul|lavanta|limon/.test(stockText)) {
    return categories.find((category) => /cicek|buket/.test(normalizeSearchText(category.name)))?.id ?? null;
  }
  if (/agac|ficus|bambu|areka|palmiye|yapay/.test(stockText)) {
    return categories.find((category) => /agac|bambu/.test(normalizeSearchText(category.name)))?.id ?? null;
  }
  if (/saksi|pot|dekor/.test(stockText)) {
    return categories.find((category) => /saksi|dekor/.test(normalizeSearchText(category.name)))?.id ?? null;
  }
  return null;
}

function findCategoryIdForProductName(productName: string, categories: Category[]) {
  const text = normalizeSearchText(productName);
  const direct = categories.find((category) => {
    const categoryText = normalizeSearchText(category.name);
    return categoryText && (text.includes(categoryText) || categoryText.split(/[^a-z0-9]+/).some((token) => token.length >= 4 && text.includes(token)));
  });
  if (direct) return direct.id;
  if (/demet|buket|cicek|guller|gul|lavanta|limon/.test(text)) {
    return categories.find((category) => /cicek|buket/.test(normalizeSearchText(category.name)))?.id ?? null;
  }
  if (/agac|ficus|bambu|areka|palmiye|yapay/.test(text)) {
    return categories.find((category) => /agac|bambu/.test(normalizeSearchText(category.name)))?.id ?? null;
  }
  if (/saksi|pot|dekor/.test(text)) {
    return categories.find((category) => /saksi|dekor/.test(normalizeSearchText(category.name)))?.id ?? null;
  }
  return null;
}

function buildSeoProductName(productName: string, stockCard: StockCard | null, categories: Category[], draft?: CostDetail['costDraft']) {
  const recipeNames = draft ? [
    ...draft.items.filter(isStockRecipeItem),
    ...draft.pots,
  ].map((item) => cleanSeoProductPart(item.name)).filter(Boolean).join(' ') : '';
  const sourceName = cleanSeoProductPart(productName || recipeNames || stockCard?.name || '').trim();
  if (sourceName.length < 3) return '';
  const categoryName = stockCard ? categories.find((category) => category.id === findCategoryIdForStock(stockCard, categories, productName))?.name : '';
  const size = extractSizeText(sourceName);
  const parts = [
    normalizeSearchText(sourceName).includes('erhan flowers') ? '' : 'Erhan Flowers',
    sourceName,
    size && !normalizeSearchText(sourceName).includes(normalizeSearchText(size)) ? size : '',
    categoryName && !normalizeSearchText(sourceName).includes(normalizeSearchText(categoryName)) ? categoryName : '',
  ].filter(Boolean);
  return titleCaseTr(dedupeSeoWords(parts.join(' ').replace(/\s+/g, ' ').trim()));
}

function buildLocalSeoContent(data: { productName: string; productHeight?: string; potType?: string; potSize?: string; fillerMaterial?: string }): GeminiSeoResult {
  const productName = titleCaseTr(dedupeSeoWords(cleanSeoProductPart(data.productName || 'Erhan Flowers Yapay Çiçek').trim()));
  const details = [
    data.productHeight ? `${data.productHeight} ölçüsüyle dekorasyonda dengeli bir görünüm sunar` : '',
    data.potType ? `${data.potType} ile kullanıma hazır şekilde hazırlanır` : '',
    data.potSize ? `saksı ölçüsü ${data.potSize} olarak planlanır` : '',
    data.fillerMaterial ? `saksı içi ${data.fillerMaterial} dolgu ile tamamlanır` : '',
  ].filter(Boolean);
  const detailSentence = details.length ? `${details.join(', ')}.` : 'Ev, ofis, mağaza ve otel dekorasyonlarında doğal görünümlü tamamlayıcı ürün olarak kullanılabilir.';
  const description = [
    `${productName}, Erhan Flowers kalitesiyle hazırlanan dekoratif yapay çiçek ve bitki ürünüdür. ${detailSentence}`,
    'Bakım gerektirmeyen yapısı sayesinde canlı bitki görünümünü pratik kullanım avantajıyla birleştirir. İç mekan dekorasyonunda giriş alanı, salon, vitrin, masa çevresi ve kurumsal alanlarda şık bir atmosfer oluşturur.',
    'Yapay çiçek ve ağaç ürünlerinde temizlik için nemli ve yumuşak bir bez kullanınız. Kimyasal temizleyici, çamaşır suyu ve aşındırıcı malzemeler kullanmayınız. Ürünü doğrudan yoğun güneş ışığına, aşırı neme ve yüksek ısıya uzun süre maruz bırakmayınız. Formunu korumak için dalları ve yaprakları nazikçe şekillendiriniz.',
  ].join('\n\n');
  return { productName, description };
}

function cleanSeoProductPart(value: string) {
  return cleanText(value)
    .replace(/\b(genel\s*gider|kira|elektrik|su|işçilik|iscilik|paketleme|ambalaj|karton|silikon|strafor|alçı|alci)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeSeoWords(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const currentPair = normalizeSearchText(`${words[index]} ${words[index + 1] ?? ''}`).trim();
    const previousPair = normalizeSearchText(`${result[result.length - 2] ?? ''} ${result[result.length - 1] ?? ''}`).trim();
    if (currentPair === 'erhan flowers' && previousPair === 'erhan flowers') {
      index += 1;
      continue;
    }
    result.push(words[index]);
  }
  return result.join(' ');
}

function titleCaseTr(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((word) => word.length <= 2 ? word.toLocaleUpperCase('tr-TR') : word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
    .join(' ');
}

function searchTokens(value: string) {
  return normalizeSearchText(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !['cm', 've', 'ile', 'icin', 'renk', 'boy', 'adet', 'yapay'].includes(token));
}

function normalizeSearchText(value: string) {
  return cleanText(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeEntry(entry: Entry): Entry {
  return {
    ...entry,
    productName: cleanText(entry.productName),
    categoryName: entry.categoryName ? cleanText(entry.categoryName) : entry.categoryName,
    familyName: entry.familyName ? cleanText(entry.familyName) : entry.familyName,
    brand: cleanText(entry.brand),
    channelCategoryName: cleanText(entry.channelCategoryName),
    colorVariant: cleanText(entry.colorVariant),
    description: cleanText(entry.description),
    costStatus: cleanText(entry.costStatus),
    seoApprovalStatus: cleanText(entry.seoApprovalStatus),
  };
}

function normalizeStockCards(stockCards: StockCard[]) {
  return stockCards.map((stockCard) => ({
    ...stockCard,
    name: cleanText(stockCard.name),
    sku: stockCard.sku ? cleanText(stockCard.sku) : stockCard.sku,
    unit: cleanText(stockCard.unit),
  }));
}

function normalizeFamily(family: Family): Family {
  return {
    ...family,
    familyName: cleanText(family.familyName),
    templates: family.templates?.map((template) => ({
      ...template,
      templateName: cleanText(template.templateName),
    })),
    sizeOptions: family.sizeOptions?.map((option) => ({
      ...option,
      sizeLabel: cleanText(option.sizeLabel),
    })),
    potOptions: family.potOptions?.map((option) => ({
      ...option,
      potName: cleanText(option.potName),
    })),
  };
}

function normalizeCostDetail(detail: CostDetail): CostDetail {
  return {
    ...detail,
    costDraft: {
      ...detail.costDraft,
      items: detail.costDraft.items.map((item) => ({
        ...item,
        name: cleanText(item.name),
        group: cleanText(item.group),
        unit: cleanText(item.unit),
        source: cleanText(item.source),
      })),
      pots: detail.costDraft.pots.map((pot) => ({
        ...pot,
        name: cleanText(pot.name),
        potType: pot.potType ? cleanText(pot.potType) : pot.potType,
        color: pot.color ? cleanText(pot.color) : pot.color,
        source: cleanText(pot.source),
      })),
    },
  };
}

function cleanText(value: string) {
  if (!value) return value;
  return mojibakeReplacements.reduce((text, [bad, good]) => text.split(bad).join(good), value);
}

const mojibakeReplacements = [
  ['\u00c3\u0152', 'Ü'],
  ['\u00c3\u00bc', 'ü'],
  ['\u00c3\u2013', 'Ö'],
  ['\u00c3\u00b6', 'ö'],
  ['\u00c3\u2021', 'Ç'],
  ['\u00c3\u00a7', 'ç'],
  ['\u00c4\u00b0', 'İ'],
  ['\u00c4\u00b1', 'ı'],
  ['\u00c4\u017d', 'Ğ'],
  ['\u00c4\u0178', 'ğ'],
  ['\u00c5\u009e', 'Ş'],
  ['\u00c5\u017d', 'Ş'],
  ['\u00c5\u0178', 'ş'],
] as const;
