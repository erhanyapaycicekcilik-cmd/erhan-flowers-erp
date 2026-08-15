'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, FileText, History, ImagePlus, Minus, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';
import type { Category, CurrentUser, Status, StockCard } from '@/types';

type PanelMode = 'create' | 'edit' | 'in' | 'out' | 'history' | null;
type Movement = {
  id: number;
  type: 'IN' | 'OUT' | string;
  quantity: number;
  unit: string;
  previousStock: number;
  nextStock: number;
  reason: string | null;
  supplierName: string | null;
  documentNo: string | null;
  paymentStatus: string | null;
  note: string | null;
  createdAt: string;
};

type StockCategoryField = {
  key: string;
  label: string;
};

type StockFormState = {
  id: number;
  name: string;
  sku: string;
  model: string;
  productFamily: string;
  category: string;
  categoryAttributes: Record<string, string>;
  color: string;
  size: string;
  productType: string;
  height: string;
  width: string;
  potType: string;
  potColor: string;
  potSize: string;
  trunkType: string;
  leafFlowerType: string;
  brand: string;
  oldModelCode: string;
  barcode: string;
  salePrice: number;
  warehouse: string;
  shelfLocation: string;
  shortDescription: string;
  technicalSpecs: string;
  seoTitle: string;
  metaDescription: string;
  purchaseUnit: string;
  purchaseQuantity: number;
  unit: string;
  packageContent: number;
  purchasePrice: number;
  manualUnitCostEnabled: boolean;
  manualUnitCost: number;
  stockQuantity: number;
  criticalStockLevel: number;
  supplierName: string;
  description: string;
  status: Status;
};

const DEFAULT_STOCK_CATEGORIES = [
  'Ağaç Gövdeleri',
  'Yapraklar',
  'Saksılar',
  'Taşlar',
  'Yapay Çiçekler',
  'Dallar',
  'Demir / Metal',
  'Plastik Parçalar',
  'Ambalaj',
  'Sarf Malzemeleri',
  'Yardımcı Malzemeler',
  'Diğer',
];

const CATEGORY_FIELD_GROUPS: Record<string, StockCategoryField[]> = {
  trunks: [
    { key: 'trunkType', label: 'Gövde tipi' },
    { key: 'treeType', label: 'Ağaç türü' },
    { key: 'lengthHeight', label: 'Uzunluk / yükseklik' },
    { key: 'trunkDiameter', label: 'Gövde çapı' },
    { key: 'color', label: 'Renk' },
    { key: 'material', label: 'Malzeme' },
    { key: 'unit', label: 'Birim' },
    { key: 'packageContent', label: 'Paket / demet içeriği' },
  ],
  leaves: [
    { key: 'leafType', label: 'Yaprak tipi' },
    { key: 'plantTreeType', label: 'Bitki / ağaç türü' },
    { key: 'color', label: 'Renk' },
    { key: 'size', label: 'Boy' },
    { key: 'leafCountOnBranch', label: 'Dal üzerindeki yaprak adedi' },
    { key: 'packageContent', label: 'Paket / demet içeriği' },
    { key: 'unit', label: 'Birim' },
  ],
  pots: [
    { key: 'potType', label: 'Saksı tipi' },
    { key: 'material', label: 'Malzeme' },
    { key: 'color', label: 'Renk' },
    { key: 'diameter', label: 'Çap' },
    { key: 'height', label: 'Yükseklik' },
    { key: 'mouthDiameter', label: 'Ağız çapı' },
    { key: 'innerVolume', label: 'İç hacim / ölçü' },
    { key: 'unit', label: 'Birim' },
  ],
  stones: [
    { key: 'stoneType', label: 'Taş tipi' },
    { key: 'color', label: 'Renk' },
    { key: 'caliberSize', label: 'Kalibre / boyut' },
    { key: 'packageWeight', label: 'Paket ağırlığı' },
    { key: 'unit', label: 'Birim' },
  ],
  flowers: [
    { key: 'flowerType', label: 'Çiçek türü' },
    { key: 'color', label: 'Renk' },
    { key: 'branchLength', label: 'Dal uzunluğu' },
    { key: 'flowerCountOnBranch', label: 'Dal üzerindeki çiçek sayısı' },
    { key: 'packageContent', label: 'Paket / demet içeriği' },
    { key: 'unit', label: 'Birim' },
  ],
  branches: [
    { key: 'branchType', label: 'Dal tipi' },
    { key: 'plantType', label: 'Bitki türü' },
    { key: 'color', label: 'Renk' },
    { key: 'length', label: 'Uzunluk' },
    { key: 'leafFlowerCount', label: 'Dal üzerindeki yaprak / çiçek adedi' },
    { key: 'packageContent', label: 'Paket içeriği' },
    { key: 'unit', label: 'Birim' },
  ],
  metal: [
    { key: 'materialType', label: 'Malzeme tipi' },
    { key: 'profileDiameter', label: 'Profil / çap' },
    { key: 'thickness', label: 'Kalınlık' },
    { key: 'length', label: 'Uzunluk' },
    { key: 'colorCoating', label: 'Renk / kaplama' },
    { key: 'unit', label: 'Birim' },
  ],
  plastic: [
    { key: 'partType', label: 'Parça tipi' },
    { key: 'size', label: 'Ölçü' },
    { key: 'color', label: 'Renk' },
    { key: 'materialType', label: 'Malzeme tipi' },
    { key: 'packageContent', label: 'Paket içeriği' },
    { key: 'unit', label: 'Birim' },
  ],
  packaging: [
    { key: 'packagingType', label: 'Ambalaj tipi' },
    { key: 'size', label: 'Ölçü' },
    { key: 'color', label: 'Renk' },
    { key: 'material', label: 'Malzeme' },
    { key: 'packageContent', label: 'Paket içeriği' },
    { key: 'unit', label: 'Birim' },
  ],
  consumables: [
    { key: 'consumableType', label: 'Sarf tipi' },
    { key: 'brand', label: 'Marka' },
    { key: 'size', label: 'Ölçü' },
    { key: 'color', label: 'Renk' },
    { key: 'packageQuantity', label: 'Paket miktarı' },
    { key: 'unit', label: 'Birim' },
  ],
  auxiliary: [
    { key: 'materialType', label: 'Malzeme tipi' },
    { key: 'size', label: 'Ölçü' },
    { key: 'color', label: 'Renk' },
    { key: 'packageContent', label: 'Paket içeriği' },
    { key: 'unit', label: 'Birim' },
  ],
};

const emptyForm: StockFormState = {
  id: 0,
  name: '',
  sku: '',
  model: '',
  productFamily: '',
  category: '',
  categoryAttributes: {},
  color: '',
  size: '',
  productType: '',
  height: '',
  width: '',
  potType: '',
  potColor: '',
  potSize: '',
  trunkType: '',
  leafFlowerType: '',
  brand: 'Erhan Flowers',
  oldModelCode: '',
  barcode: '',
  salePrice: 0,
  warehouse: '',
  shelfLocation: '',
  shortDescription: '',
  technicalSpecs: '',
  seoTitle: '',
  metaDescription: '',
  purchaseUnit: 'Adet',
  purchaseQuantity: 1,
  unit: 'Adet',
  packageContent: 1,
  purchasePrice: 0,
  manualUnitCostEnabled: false,
  manualUnitCost: 0,
  stockQuantity: 0,
  criticalStockLevel: 0,
  supplierName: '',
  description: '',
  status: 'ACTIVE' as Status,
};

const emptyMovement = {
  quantity: 0,
  purchasePrice: 0,
  supplierName: '',
  documentNo: '',
  paymentStatus: 'Peşin',
  reason: '',
  note: '',
};

export default function StockCardsPage() {
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [selected, setSelected] = useState<StockCard | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [form, setForm] = useState(emptyForm);
  const [formImageFiles, setFormImageFiles] = useState<File[]>([]);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [categoryRecords, setCategoryRecords] = useState<Category[]>([]);
  const [showStockCountPrint, setShowStockCountPrint] = useState(false);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    sku: '',
    category: '',
    stockStatus: '',
    criticalOnly: false,
    missingImage: false,
    outOfStock: false,
  });

  async function load() {
    setStockCards(await api<StockCard[]>('/stock-cards'));
  }

  useEffect(() => {
    Promise.all([
      load(),
      api<CurrentUser>('/auth/me').then(setCurrentUser),
      api<Category[]>('/categories').then(setCategoryRecords).catch(() => setCategoryRecords([])),
    ]).catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    const stockCardId = Number(new URLSearchParams(window.location.search).get('stockCardId'));
    if (!stockCardId || stockCards.length === 0) return;
    const stockCard = stockCards.find((item) => item.id === stockCardId);
    if (!stockCard) return;
    setFilters((current) => ({
      ...current,
      name: stockCard.name,
      sku: '',
      category: '',
      stockStatus: '',
      criticalOnly: false,
      missingImage: false,
      outOfStock: false,
    }));
    setMessage(`${stockCard.name} stok kartı açıldı.`);
  }, [stockCards]);

  const isStaff = currentUser?.role === 'STAFF';

  const categories = useMemo(() => {
    const values = [
      ...DEFAULT_STOCK_CATEGORIES,
      ...categoryRecords.map((item) => item.name),
      ...(stockCards.map((item) => item.category).filter(Boolean) as string[]),
    ];
    return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [categoryRecords, stockCards]);

  const filtered = useMemo(() => {
    return stockCards.filter((item) => {
      const criticalLevel = Number(item.criticalStockLevel ?? 0);
      const stockQuantity = Number(item.stockQuantity ?? 0);
      const isCritical = !isStaff && criticalLevel > 0 && stockQuantity <= criticalLevel;
      if (filters.name && !stockSearchText(item).includes(normalize(filters.name))) return false;
      if (filters.sku && !normalize([item.sku, item.model, item.barcode].filter(Boolean).join(' ')).includes(normalize(filters.sku))) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.stockStatus && item.status !== filters.stockStatus) return false;
      if (!isStaff && filters.criticalOnly && !isCritical) return false;
      if (filters.missingImage && stockImages(item).length > 0) return false;
      if (!isStaff && filters.outOfStock && stockQuantity > 0) return false;
      return true;
    });
  }, [stockCards, filters, isStaff]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, StockCard[]>>((acc, item) => {
      const category = item.category || 'Kategorisiz';
      acc[category] = acc[category] ?? [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const ownerTotals = useMemo(() => {
    return {
      stockCardCount: stockCards.length,
      imageCount: stockCards.reduce((sum, item) => sum + stockImages(item).length, 0),
      totalProductCost: stockCards.reduce((sum, item) => sum + stockTotalValue(item), 0),
    };
  }, [stockCards]);

  async function submitStock(event: FormEvent) {
    event.preventDefault();
    try {
    const selectedCategory = form.category.trim();
    if (!selectedCategory) {
      setMessage('Stok kategorisi seçilmeden stok kartı kaydedilemez.');
      return;
    }
    const payload = {
      name: form.name,
      sku: form.sku,
      model: form.model,
      barcode: form.barcode,
      category: selectedCategory,
      color: form.color,
      size: form.size,
      productFamily: form.productFamily,
      productType: form.productType,
      height: form.height,
      width: form.width,
      potType: form.potType,
      potColor: form.potColor,
      potSize: form.potSize,
      trunkType: form.trunkType,
      leafFlowerType: form.leafFlowerType,
      brand: form.brand,
      oldModelCode: form.oldModelCode,
      salePrice: Number(form.salePrice),
      warehouse: form.warehouse,
      shelfLocation: form.shelfLocation,
      shortDescription: form.shortDescription,
      technicalSpecs: serializeCategoryTechnicalSpecs(selectedCategory, form.categoryAttributes, form.technicalSpecs),
      seoTitle: form.seoTitle,
      metaDescription: form.metaDescription,
      purchaseUnit: form.purchaseUnit,
      purchaseQuantity: Number(form.purchaseQuantity),
      unit: form.unit,
      packageContent: Number(form.packageContent),
      purchasePrice: Number(form.purchasePrice),
      manualUnitCostEnabled: form.manualUnitCostEnabled,
      manualUnitCost: Number(form.manualUnitCost),
      ...(!isStaff ? { stockQuantity: Number(form.stockQuantity), criticalStockLevel: Number(form.criticalStockLevel) } : {}),
      supplierName: form.supplierName,
      description: form.description,
      status: form.status,
    };
    const saved = form.id
      ? await api<StockCard>(`/stock-cards/${form.id}`, { method: 'PATCH', json: payload })
      : await api<StockCard>('/stock-cards', { method: 'POST', json: payload });
    let finalSaved = saved;
    for (const file of formImageFiles) {
      finalSaved = await uploadStockImage(saved.id, file);
    }
    setSelected(finalSaved);
    setPanelMode(null);
    setFormImageFiles([]);
    setMessage(form.id ? 'Stok kartı güncellendi.' : 'Yeni stok kartı oluşturuldu.');
    await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Stok kartı kaydedilemedi.');
    }
  }

  async function submitMovement(event: FormEvent) {
    event.preventDefault();
    if (!selected || (panelMode !== 'in' && panelMode !== 'out')) return;
    try {
      const saved = await api<StockCard>(`/stock-cards/${selected.id}/movements`, {
        method: 'POST',
        json: {
          type: panelMode === 'in' ? 'IN' : 'OUT',
          quantity: panelMode === 'in'
            ? stockInputQuantityToUsageQuantity(Number(movementForm.quantity), selected.purchaseUnit ?? selected.unit, selected.unit, Number(selected.packageContent || 1))
            : Number(movementForm.quantity),
          purchasePrice: panelMode === 'in' ? Number(movementForm.purchasePrice) : undefined,
          supplierName: movementForm.supplierName,
          documentNo: movementForm.documentNo,
          paymentStatus: movementForm.paymentStatus,
          reason: movementForm.reason,
          note: movementForm.note,
        },
      });
      setSelected(saved);
      setPanelMode(null);
      setMovementForm(emptyMovement);
      setMessage(panelMode === 'in' ? 'Stok eklendi.' : 'Stok düşüldü.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Stok hareketi kaydedilemedi.');
    }
  }

  async function uploadStockImage(stockCardId: number, file: File, makeMain = false) {
    const formData = new FormData();
    formData.append('file', file);
    const query = makeMain ? '?makeMain=true' : '';
    return api<StockCard>(`/stock-cards/${stockCardId}/image${query}`, {
      method: 'POST',
      body: formData,
    });
  }

  async function uploadImages(stockCard: StockCard, files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    let saved = stockCard;
    for (const [index, file] of selectedFiles.entries()) {
      saved = await uploadStockImage(stockCard.id, file, index === selectedFiles.length - 1);
    }
    setSelected(saved);
    setMessage(`${files.length} görsel eklendi.`);
    await load();
  }

  async function uploadImage(stockCard: StockCard, file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const saved = await api<StockCard>(`/stock-cards/${stockCard.id}/image`, {
      method: 'POST',
      body: formData,
    });
    setSelected(saved);
    setMessage('Görsel güncellendi.');
    await load();
  }

  async function setMainImage(stockCard: StockCard, imageId: number) {
    if (imageId <= 0) {
      setMessage('Eski görsel kaydı ana görsel olarak değiştirilemez. Lütfen görseli yeniden yükleyin.');
      return;
    }

    try {
      const saved = await api<StockCard>(`/stock-cards/${stockCard.id}/images/${imageId}/main`, { method: 'POST' });
      setSelected(saved);
      setMessage('Ana görsel değiştirildi.');
      await load();
    } catch {
      setMessage('Ana görsel değiştirilemedi. Lütfen tekrar deneyin.');
    }
  }

  async function openHistory(stockCard: StockCard) {
    setSelected(stockCard);
    setPanelMode('history');
    setMovements(await api<Movement[]>(`/stock-cards/${stockCard.id}/movements`));
  }

  async function passiveStock(stockCard: StockCard) {
    const confirmed = window.confirm(`${stockCard.name} pasife alınacak. Aktif stok listesinde görünmeyecek. Devam edilsin mi?`);
    if (!confirmed) return;
    try {
      await api(`/stock-cards/${stockCard.id}`, { method: 'DELETE' });
      setStockCards((current) => current.map((item) => item.id === stockCard.id ? { ...item, status: 'PASSIVE' } : item));
      setSelected(null);
      setMessage('Stok kartı pasife alındı ve aktif listeden kaldırıldı.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Stok kartı pasife alınamadı.');
    }
  }

  async function deleteTestStock(stockCard: StockCard) {
    const confirmed = window.confirm('Bu deneme/test stok kartı kalıcı olarak silinecek. Devam edilsin mi?');
    if (!confirmed) return;
    try {
      await api(`/stock-cards/${stockCard.id}?hard=true`, { method: 'DELETE' });
      setStockCards((current) => current.filter((item) => item.id !== stockCard.id));
      setSelected(null);
      setMessage('Deneme/test stok kartı silindi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deneme/test stok kartı silinemedi.');
    }
  }

  function openStockForm(mode: 'create' | 'edit', stockCard?: StockCard) {
    if (mode === 'create') {
      setForm(emptyForm);
      setSelected(null);
      setFormImageFiles([]);
    } else if (stockCard) {
      const parsedTechnicalSpecs = parseCategoryTechnicalSpecs(stockCard.technicalSpecs);
      setSelected(stockCard);
      setFormImageFiles([]);
      setForm({
        id: stockCard.id,
        name: stockCard.name,
        sku: stockCard.sku ?? '',
        model: stockCard.model ?? '',
        productFamily: stockCard.productFamily ?? '',
        category: stockCard.category ?? '',
        categoryAttributes: parsedTechnicalSpecs.attributes,
        color: stockCard.color ?? '',
        size: stockCard.size ?? '',
        productType: stockCard.productType ?? '',
        height: stockCard.height ?? '',
        width: stockCard.width ?? '',
        potType: stockCard.potType ?? '',
        potColor: stockCard.potColor ?? '',
        potSize: stockCard.potSize ?? '',
        trunkType: stockCard.trunkType ?? '',
        leafFlowerType: stockCard.leafFlowerType ?? '',
        brand: stockCard.brand ?? '',
        oldModelCode: stockCard.oldModelCode ?? '',
        barcode: stockCard.barcode ?? '',
        salePrice: Number(stockCard.salePrice ?? 0),
        warehouse: stockCard.warehouse ?? '',
        shelfLocation: stockCard.shelfLocation ?? '',
        shortDescription: stockCard.shortDescription ?? '',
        technicalSpecs: parsedTechnicalSpecs.note,
        seoTitle: stockCard.seoTitle ?? '',
        metaDescription: stockCard.metaDescription ?? '',
        purchaseUnit: stockCard.purchaseUnit ?? stockCard.unit,
        purchaseQuantity: stockCard.purchaseQuantity ?? 1,
        unit: stockCard.unit,
        packageContent: stockCard.packageContent,
        purchasePrice: stockCard.purchasePrice,
        manualUnitCostEnabled: stockCard.manualUnitCostEnabled ?? false,
        manualUnitCost: stockCard.manualUnitCost ?? 0,
        stockQuantity: Number(stockCard.stockQuantity ?? 0),
        criticalStockLevel: stockCard.criticalStockLevel ?? 0,
        supplierName: stockCard.supplierName ?? '',
        description: stockCard.description ?? '',
        status: stockCard.status,
      });
    }
    setPanelMode(mode);
  }

  function openMovement(mode: 'in' | 'out', stockCard: StockCard) {
    setSelected(stockCard);
    setMovementForm({
      ...emptyMovement,
      purchasePrice: stockCard.purchasePrice,
      supplierName: stockCard.supplierName ?? '',
      reason: mode === 'in' ? 'Stok girişi' : 'Üretimde kullanıldı',
    });
    setPanelMode(mode);
  }

  function prepareStoneStock() {
    setForm({
      ...form,
      category: 'Taş',
      productFamily: 'Taş',
      productType: form.productType || 'Dekoratif Taş',
      purchaseUnit: 'KG',
      unit: 'KG',
      purchaseQuantity: 1,
      packageContent: 1,
      brand: form.brand || 'Erhan Flowers',
    });
  }

  if (showStockCountPrint) {
    return (
      <StockCountPrintView
        items={stockCards}
        onBack={() => setShowStockCountPrint(false)}
      />
    );
  }

  return (
    <AdminShell title="Stok Kartları">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Görselli Stok Merkezi</h2>
          <p className="text-sm text-slate-500">Eski görselli kart yapısı ERP içinde kullanılır. Stok fiyatı maliyet sisteminin ana kaynağıdır.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" type="button" onClick={() => setShowStockCountPrint(true)}>
            <Printer size={18} />
            A4 Sayım Listesi
          </button>
          <button className="btn btn-primary" onClick={() => openStockForm('create')}>
            <Plus size={18} />
            Yeni Stok Kartı
          </button>
        </div>
      </div>

      {message && <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      {!isStaff && (
        <section className="mb-5 grid gap-4 md:grid-cols-3">
          <div className="panel p-5">
            <div className="text-sm text-slate-500">Toplam Ürün Maliyeti</div>
            <div className="mt-2 text-2xl font-bold">{money(ownerTotals.totalProductCost)}</div>
          </div>
          <div className="panel p-5">
            <div className="text-sm text-slate-500">Stok Kartı</div>
            <div className="mt-2 text-2xl font-bold">{ownerTotals.stockCardCount.toLocaleString('tr-TR')}</div>
          </div>
          <div className="panel p-5">
            <div className="text-sm text-slate-500">Görselli Stok</div>
            <div className="mt-2 text-2xl font-bold">{ownerTotals.imageCount.toLocaleString('tr-TR')}</div>
          </div>
        </section>
      )}

      <section className="panel mb-5 p-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input className="field" placeholder="Ürün / kategori / model ara" value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
          <input className="field" placeholder="Stok kodu ara" value={filters.sku} onChange={(event) => setFilters({ ...filters, sku: event.target.value })} />
          <select className="field" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
            <option value="">Tüm kategoriler</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select className="field" value={filters.stockStatus} onChange={(event) => setFilters({ ...filters, stockStatus: event.target.value })}>
            <option value="">Tüm durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
          </select>
          {!isStaff && (
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
              <input type="checkbox" checked={filters.criticalOnly} onChange={(event) => setFilters({ ...filters, criticalOnly: event.target.checked })} />
              Kritik stok
            </label>
          )}
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
            <input type="checkbox" checked={filters.missingImage} onChange={(event) => setFilters({ ...filters, missingImage: event.target.checked })} />
            Görseli olmayan
          </label>
          {!isStaff && (
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
              <input type="checkbox" checked={filters.outOfStock} onChange={(event) => setFilters({ ...filters, outOfStock: event.target.checked })} />
              Stokta olmayan
            </label>
          )}
        </div>
      </section>

      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items], index) => {
          const total = items.reduce((sum, item) => sum + Number(item.stockQuantity || 0), 0);
          return (
            <details key={category} className="panel overflow-hidden" open={index === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-3 border-b border-line px-5 py-4">
                <span className="font-bold">{category}</span>
                <span className="text-sm text-slate-500">{items.length} ürün{isStaff ? '' : ` · ${total.toLocaleString('tr-TR')} stok`}</span>
              </summary>
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((item) => (
                  <StockVisualCard
                    key={item.id}
                    item={item}
                    onEdit={() => openStockForm('edit', item)}
                    onStockIn={() => openMovement('in', item)}
                    onStockOut={() => openMovement('out', item)}
                    onHistory={() => openHistory(item)}
                    onPassive={() => passiveStock(item)}
                    onDeleteTest={() => deleteTestStock(item)}
                    onUpload={(files) => uploadImages(item, files)}
                    onSetMainImage={(imageId) => setMainImage(item, imageId)}
                    isStaff={isStaff}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>

      {panelMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/40">
          <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-lg font-bold">{panelTitle(panelMode)}</h3>
                {selected && <p className="text-sm text-slate-500">{selected.name}</p>}
              </div>
              <button className="btn btn-secondary min-h-9 px-3" onClick={() => setPanelMode(null)}>
                <X size={16} />
                Kapat
              </button>
            </div>

            {(panelMode === 'create' || panelMode === 'edit') && (
              <form className="flex-1 overflow-y-auto p-5" onSubmit={submitStock}>
                <StockForm
                  form={form}
                  setForm={setForm}
                  isStaff={isStaff}
                  categoryOptions={categories}
                  imageFiles={formImageFiles}
                  setImageFiles={setFormImageFiles}
                  existingImagePath={panelMode === 'edit' ? selected?.imagePath ?? null : null}
                />
                <button className="btn btn-primary mt-5 w-full">
                  <Save size={17} />
                  Kaydet
                </button>
              </form>
            )}

            {(panelMode === 'in' || panelMode === 'out') && selected && (
              <form className="flex-1 overflow-y-auto p-5" onSubmit={submitMovement}>
                <div className="mb-4 overflow-hidden rounded-md border border-line bg-slate-50">
                  <StockImage item={selected} />
                </div>
                <label className="mb-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-brand shadow-sm">
                  <ImagePlus size={17} />
                  {selected.imagePath ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
                  <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => uploadImages(selected, event.target.files)} />
                </label>
                <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm">
                  {isStaff ? (
                    <div>Personel girişinde toplam stok miktarı gizlidir. Bu ekrandan stok girişi ve alış fiyatı kaydedebilirsin.</div>
                  ) : (
                    <>
                      <div>Mevcut stok: <strong>{Number(selected.stockQuantity ?? 0).toLocaleString('tr-TR')} {selected.unit}</strong></div>
                      {panelMode === 'out' && (
                        <div className="mt-1">Bu işlemden sonra kalan stok: <strong>{Math.max(0, Number(selected.stockQuantity ?? 0) - Number(movementForm.quantity || 0)).toLocaleString('tr-TR')} {selected.unit}</strong></div>
                      )}
                    </>
                  )}
                </div>
                <MovementForm mode={panelMode} form={movementForm} setForm={setMovementForm} unit={selected.unit} purchaseUnit={selected.purchaseUnit ?? selected.unit} packageContent={Number(selected.packageContent || 1)} />
                <button className="btn btn-primary mt-5 w-full">
                  <Save size={17} />
                  Kaydet
                </button>
              </form>
            )}

            {panelMode === 'history' && (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-3">
                  {movements.length === 0 && <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">Hareket kaydı yok.</div>}
                  {movements.map((movement) => (
                    <div key={movement.id} className="rounded-md border border-line p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <strong>{movement.type === 'IN' ? 'Giriş' : 'Çıkış'} · {movement.quantity.toLocaleString('tr-TR')} {movement.unit}</strong>
                        <span className="text-xs text-slate-500">{new Date(movement.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="mt-2 grid gap-2 text-slate-600 sm:grid-cols-2">
                        <span>Önceki: {movement.previousStock.toLocaleString('tr-TR')}</span>
                        <span>Sonraki: {movement.nextStock.toLocaleString('tr-TR')}</span>
                        <span>Neden: {movement.reason || '-'}</span>
                        <span>Tedarikçi: {movement.supplierName || '-'}</span>
                      </div>
                      {movement.note && <p className="mt-2 text-slate-500">{movement.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </AdminShell>
  );
}

function StockCountPrintView({ items, onBack }: { items: StockCard[]; onBack: () => void }) {
  const activeItems = useMemo(() => {
    return [...items]
      .filter((item) => item.status !== 'PASSIVE')
      .sort((a, b) => {
        const categoryCompare = String(a.category ?? '').localeCompare(String(b.category ?? ''), 'tr');
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name, 'tr');
      });
  }, [items]);
  const totalQuantity = activeItems.reduce((sum, item) => sum + Number(item.stockQuantity ?? 0), 0);
  const printDate = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-100 text-ink">
      <div className="stock-print-toolbar sticky top-0 z-20 flex flex-wrap items-center justify-center gap-3 bg-slate-900 px-4 py-3">
        <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-slate-900" type="button" onClick={onBack}>
          <X size={16} />
          Stok Merkezine Dön
        </button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white" type="button" onClick={() => window.print()}>
          <Printer size={16} />
          Yazdır / PDF Kaydet
        </button>
      </div>

      <section className="stock-count-sheet mx-auto my-6 bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
          <div>
            <h1 className="text-2xl font-black tracking-normal">Stok Sayım Listesi</h1>
            <p className="mt-1 text-sm text-slate-600">Görselli ürün adı ve adet kontrol listesi</p>
          </div>
          <div className="text-right text-xs font-semibold text-slate-600">
            <div>Çıktı: {printDate}</div>
            <div>Ürün: {activeItems.length.toLocaleString('tr-TR')}</div>
            <div>Sistem toplamı: {totalQuantity.toLocaleString('tr-TR')}</div>
          </div>
        </header>

        <table className="stock-count-table w-full border-collapse text-left">
          <thead>
            <tr>
              <th>Görsel</th>
              <th>Ürün</th>
              <th>Stok kodu</th>
              <th>Kategori</th>
              <th>Sistem adedi</th>
              <th>Sayım</th>
            </tr>
          </thead>
          <tbody>
            {activeItems.map((item) => {
              const image = stockImages(item)[0];
              return (
                <tr key={item.id}>
                  <td className="stock-count-image-cell">
                    {image ? (
                      <img className="stock-count-image" src={apiFileUrl(image.filePath)} alt={item.name} />
                    ) : (
                      <div className="stock-count-no-image">Yok</div>
                    )}
                  </td>
                  <td>
                    <div className="stock-count-name">{item.name}</div>
                    {item.model && <div className="stock-count-sub">Model: {item.model}</div>}
                  </td>
                  <td>{item.sku || '-'}</td>
                  <td>{item.category || 'Kategorisiz'}</td>
                  <td className="stock-count-quantity">{Number(item.stockQuantity ?? 0).toLocaleString('tr-TR')} {item.unit}</td>
                  <td><div className="stock-count-blank" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <style jsx>{`
        .stock-count-sheet {
          width: 210mm;
          min-height: 297mm;
        }
        .stock-count-table th {
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          padding: 7px 8px;
          font-size: 11px;
          font-weight: 900;
        }
        .stock-count-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          font-size: 11px;
          vertical-align: middle;
        }
        .stock-count-image-cell {
          width: 56px;
        }
        .stock-count-image,
        .stock-count-no-image {
          width: 44px;
          height: 44px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }
        .stock-count-image {
          object-fit: contain;
          background: #fff;
        }
        .stock-count-no-image {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
        }
        .stock-count-name {
          max-width: 250px;
          font-weight: 900;
          line-height: 1.25;
        }
        .stock-count-sub {
          margin-top: 2px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }
        .stock-count-quantity {
          white-space: nowrap;
          font-weight: 900;
        }
        .stock-count-blank {
          height: 24px;
          min-width: 74px;
          border-bottom: 1px solid #64748b;
        }
        @page {
          size: A4 portrait;
          margin: 9mm;
        }
        @media print {
          .stock-print-toolbar {
            display: none !important;
          }
          main {
            min-height: 0 !important;
            background: white !important;
          }
          .stock-count-sheet {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .stock-count-table {
            page-break-inside: auto;
          }
          .stock-count-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}

function StockVisualCard({
  item,
  onEdit,
  onStockIn,
  onStockOut,
  onHistory,
  onPassive,
  onDeleteTest,
  onUpload,
  onSetMainImage,
  isStaff,
}: {
  item: StockCard;
  onEdit: () => void;
  onStockIn: () => void;
  onStockOut: () => void;
  onHistory: () => void;
  onPassive: () => void;
  onDeleteTest: () => void;
  onUpload: (files: FileList | null) => void;
  onSetMainImage: (imageId: number) => void;
  isStaff: boolean;
}) {
  const criticalLevel = Number(item.criticalStockLevel ?? 0);
  const stockQuantity = Number(item.stockQuantity ?? 0);
  const isCritical = !isStaff && criticalLevel > 0 && stockQuantity <= criticalLevel;
  const isTestRecord = isTestStockCard(item);
  const usageUnitCost = unitCost(item);
  const usedInProductCount = Number(item._count?.productCostItems ?? 0) + Number(item._count?.productPotItems ?? 0);
  const images = stockImages(item);
  const categorySpecs = visibleCategorySpecs(item);
  return (
    <article className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
      <div className="relative h-56 bg-slate-50">
        <StockImage item={item} />
        <label className="absolute right-3 top-3 flex cursor-pointer items-center gap-1 rounded-md bg-white/95 px-3 py-2 text-xs font-bold shadow-sm">
          <ImagePlus size={15} />
          {item.imagePath ? 'Görsel Değiştir' : 'Görsel Ekle'}
          <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => onUpload(event.target.files)} />
        </label>
      </div>
      <div className="space-y-3 p-4">
        {images.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {images.map((image) => (
              <div key={image.id} className="shrink-0">
                <SafeStockImage
                  className={`h-12 w-12 rounded-md border object-cover ${image.isMain ? 'border-brand ring-2 ring-brand/20' : 'border-line'}`}
                  src={image.filePath}
                  alt={image.fileName}
                  compact
                />
                {image.isMain ? (
                  <div className="mt-1 text-center text-[10px] font-bold text-brand">Ana</div>
                ) : (
                  <button type="button" className="mt-1 text-[10px] font-bold text-brand" onClick={() => onSetMainImage(image.id)}>
                    Ana yap
                  </button>
                )}
              </div>
            ))}
            <span className="shrink-0 text-xs font-semibold text-slate-500">{images.length} görsel</span>
          </div>
        )}
        <div>
          <h3 className="line-clamp-2 min-h-10 font-bold leading-5">{item.name}</h3>
          <p className="text-xs text-slate-500">{item.sku || '-'} · {item.category || 'Kategorisiz'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {!isStaff && <Info label="Mevcut stok" value={`${stockQuantity.toLocaleString('tr-TR')} ${item.unit}`} strong={isCritical} />}
          {!isStaff && <Info label="Kritik seviye" value={criticalLevel > 0 ? criticalLevel.toLocaleString('tr-TR') : '-'} />}
          <Info label="Alış fiyatı" value={`${money(item.purchasePrice)} / ${item.purchaseUnit ?? item.unit}`} />
          {!isStaff && <Info label="Toplam değer" value={money(stockTotalValue(item))} />}
          <Info label="Kullanım birimi" value={item.unit} />
          <Info label="Birim maliyet" value={`${money4(usageUnitCost)} / ${item.unit}`} />
          <Info label="Kullanan ürün" value={usedInProductCount > 0 ? `${usedInProductCount} ürün` : '-'} />
          {!isStaff && <Info label="Son hareket" value={item.lastMovementAt ? new Date(item.lastMovementAt).toLocaleDateString('tr-TR') : '-'} />}
        </div>

        {categorySpecs.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {categorySpecs.map((spec) => <Info key={spec.label} label={spec.label} value={spec.value} />)}
          </div>
        )}

        {item.description && <p className="line-clamp-2 text-sm text-slate-500">{item.description}</p>}
        {isCritical && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Kritik stok seviyesinde</div>}
        {!item.imagePath && <div className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Görsel eklenmedi</div>}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary min-h-10" onClick={onStockIn}><Plus size={16} /> Stok Ekle</button>
          {!isStaff && <button className="btn btn-secondary min-h-10" onClick={onStockOut}><Minus size={16} /> Stok Düş</button>}
          <button className="btn btn-secondary min-h-10" onClick={onEdit}><Edit3 size={16} /> Düzenle</button>
          {!isStaff && <button className="btn btn-secondary min-h-10" onClick={onHistory}><History size={16} /> Hareketler</button>}
          {!isStaff && <button className="btn btn-secondary min-h-10" onClick={() => window.print()}><FileText size={16} /> A5 Çıktı</button>}
          {!isStaff && <button type="button" className="btn btn-secondary min-h-10 text-red-700" onClick={onPassive}><Trash2 size={16} /> Pasife Al</button>}
          {!isStaff && isTestRecord && (
            <button type="button" className="btn btn-danger col-span-2 min-h-10" onClick={onDeleteTest}>
              <Trash2 size={16} />
              Test Kaydını Sil
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function StockImage({ item }: { item: StockCard }) {
  const mainImage = stockImages(item)[0];
  if (!mainImage) {
    return <div className="flex h-full w-full items-center justify-center bg-white text-sm font-semibold text-slate-400">Görsel Eklenmedi</div>;
  }
  return <SafeStockImage className="h-full w-full object-contain" src={mainImage.filePath} alt={item.name} />;
}

function SafeStockImage({ className, src, alt, compact = false }: { className: string; src: string; alt: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-white text-center font-semibold text-slate-400 ${compact ? 'text-[10px]' : 'text-sm'} ${className}`}>
        {compact ? 'Yok' : 'Görsel yüklenemedi'}
      </div>
    );
  }

  return <img className={className} src={apiFileUrl(src)} alt={alt} onError={() => setFailed(true)} />;
}

function stockImages(item: StockCard) {
  const images = [...(item.images ?? [])].sort((a, b) => Number(b.isMain) - Number(a.isMain));
  const legacyImage = item.imagePath && !images.some((image) => image.filePath === item.imagePath) ? [{
    id: 0,
    fileName: item.name,
    filePath: item.imagePath,
    folderName: '',
    fileType: 'image/*',
    isMain: true,
    createdAt: item.createdAt,
  }] : [];
  return [...legacyImage, ...images];
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 font-bold ${strong ? 'text-red-700' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function categoryGroupKey(category: string | null | undefined) {
  const value = normalize(category ?? '');
  if (!value) return '';
  if (value.includes('tas')) return 'stones';
  if (value.includes('saksi')) return 'pots';
  if (value.includes('yaprak')) return 'leaves';
  if (value.includes('govde') || value.includes('agac govde')) return 'trunks';
  if (value.includes('cicek')) return 'flowers';
  if (value.includes('dal')) return 'branches';
  if (value.includes('demir') || value.includes('metal')) return 'metal';
  if (value.includes('plastik')) return 'plastic';
  if (value.includes('ambalaj')) return 'packaging';
  if (value.includes('sarf')) return 'consumables';
  if (value.includes('yardimci')) return 'auxiliary';
  return '';
}

function categoryFieldsFor(category: string | null | undefined) {
  const key = categoryGroupKey(category);
  return key ? CATEGORY_FIELD_GROUPS[key] ?? [] : [];
}

function isStoneCategory(category: string | null | undefined) {
  return categoryGroupKey(category) === 'stones';
}

function parseCategoryTechnicalSpecs(value: string | null | undefined): { attributes: Record<string, string>; note: string } {
  const text = String(value ?? '').trim();
  if (!text) return { attributes: {}, note: '' };
  try {
    const parsed = JSON.parse(text) as { attributes?: Record<string, unknown>; note?: unknown };
    if (!parsed || typeof parsed !== 'object' || !parsed.attributes || typeof parsed.attributes !== 'object') {
      return { attributes: {}, note: text };
    }
    const attributes = Object.fromEntries(
      Object.entries(parsed.attributes).map(([key, item]) => [key, String(item ?? '')]),
    );
    return { attributes, note: typeof parsed.note === 'string' ? parsed.note : '' };
  } catch {
    return { attributes: {}, note: text };
  }
}

function serializeCategoryTechnicalSpecs(category: string, attributes: Record<string, string>, note: string) {
  const cleanAttributes = Object.fromEntries(
    Object.entries(attributes)
      .map(([key, value]) => [key, String(value ?? '').trim()])
      .filter(([, value]) => value),
  );
  const cleanNote = note.trim();
  if (Object.keys(cleanAttributes).length === 0) return cleanNote || null;
  return JSON.stringify({
    version: 1,
    category,
    attributes: cleanAttributes,
    note: cleanNote || undefined,
  });
}

function visibleCategorySpecs(item: StockCard) {
  const parsed = parseCategoryTechnicalSpecs(item.technicalSpecs);
  const fields = categoryFieldsFor(item.category);
  return fields
    .map((field) => ({ label: field.label, value: parsed.attributes[field.key]?.trim() ?? '' }))
    .filter((field) => field.value);
}

function StockForm({
  form,
  setForm,
  isStaff,
  categoryOptions,
  imageFiles,
  setImageFiles,
  existingImagePath,
}: {
  form: StockFormState;
  setForm: (form: StockFormState) => void;
  isStaff: boolean;
  categoryOptions: string[];
  imageFiles: File[];
  setImageFiles: (files: File[]) => void;
  existingImagePath: string | null;
}) {
  const categoryFields = categoryFieldsFor(form.category);

  function prepareStone(name?: string) {
    setForm({
      ...form,
      name: name ?? form.name,
      category: 'Taşlar',
      productFamily: 'Taş',
      productType: name ?? form.productType ?? 'Dekoratif Taş',
      purchaseUnit: 'KG',
      unit: 'KG',
      purchaseQuantity: 1,
      packageContent: 1,
      brand: form.brand || 'Erhan Flowers',
    });
  }

  function updateCategory(nextCategory: string) {
    const hasCategoryAttributes = Object.values(form.categoryAttributes).some((value) => String(value ?? '').trim());
    if (form.category && form.category !== nextCategory && hasCategoryAttributes) {
      const confirmed = window.confirm('Kategori değiştirildiğinde önceki kategoriye özel özellikler temizlenecek. Devam etmek istiyor musunuz?');
      if (!confirmed) return;
      setForm({ ...form, category: nextCategory, categoryAttributes: {} });
      return;
    }
    setForm({ ...form, category: nextCategory });
  }

  function updateCategoryAttribute(key: string, value: string) {
    setForm({
      ...form,
      categoryAttributes: {
        ...form.categoryAttributes,
        [key]: value,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed border-line bg-slate-50 p-4">
        <div className="mb-2 text-sm font-bold">Stok Fotoğrafı</div>
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand shadow-sm">
          <ImagePlus size={17} />
          {imageFiles.length > 0 ? `${imageFiles.length} fotoğraf seçildi` : 'Fotoğraf Ekle'}
          <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))} />
        </label>
        <div className="mt-2 text-xs text-slate-500">
          {imageFiles.length > 0 ? imageFiles.map((file) => file.name).join(', ') : existingImagePath ? 'Mevcut fotoğraf korunur. Yeni fotoğraf seçersen listeye eklenir.' : 'Stok kartı kaydedilince fotoğraf klasörü stok koduna göre oluşturulur.'}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="label">Stok kategorisi</span>
        <select className="field" value={form.category} onChange={(event) => updateCategory(event.target.value)} required>
          <option value="">Kategori seçin</option>
          {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>

      {isStoneCategory(form.category) && (
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
        <div className="mb-2 text-xs font-bold text-emerald-800">Taş stok kartı hızlı hazırlık</div>
        <div className="flex flex-wrap gap-2">
          {['Beyaz Dolomit Taşı', 'Siyah Dekoratif Taş', 'Dere Taşı', 'Beyaz Çakıl Taşı', 'Siyah Çakıl Taşı', 'Mermer Kırığı'].map((name) => (
            <button key={name} className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-xs font-semibold text-emerald-800" type="button" onClick={() => prepareStone(name)}>{name}</button>
          ))}
        </div>
      </div>
      )}

      <label className="block space-y-1.5"><span className="label">Stok adı</span><input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5"><span className="label">Stok kodu</span><input className="field" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
        <label className="block space-y-1.5"><span className="label">Model kodu</span><input className="field" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
        <label className="block space-y-1.5"><span className="label">Barkod</span><input className="field" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label>
        <label className="block space-y-1.5"><span className="label">Depo</span><input className="field" value={form.warehouse} onChange={(event) => setForm({ ...form, warehouse: event.target.value })} /></label>
        <label className="block space-y-1.5"><span className="label">Raf</span><input className="field" value={form.shelfLocation} onChange={(event) => setForm({ ...form, shelfLocation: event.target.value })} /></label>
      </div>

      {categoryFields.length > 0 && (
        <div className="rounded-md border border-line bg-white p-3">
          <div className="mb-3 text-sm font-bold">Kategoriye özel teknik özellikler</div>
          <div className="grid grid-cols-2 gap-3">
            {categoryFields.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="label">{field.label}</span>
                <input className="field" value={form.categoryAttributes[field.key] ?? ''} onChange={(event) => updateCategoryAttribute(field.key, event.target.value)} />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {!isStaff && <NumberField label="Mevcut stok" value={form.stockQuantity} onChange={(stockQuantity) => setForm({ ...form, stockQuantity })} />}
        {!isStaff && <NumberField label="Kritik stok" value={form.criticalStockLevel} onChange={(criticalStockLevel) => setForm({ ...form, criticalStockLevel })} />}
        <label className="block space-y-1.5"><span className="label">Alış birimi</span><input className="field" list="stock-unit-options" value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })} placeholder="Adet, Demet, Koli" /></label>
        <NumberField label="Alış miktarı" value={form.purchaseQuantity} onChange={(purchaseQuantity) => setForm({ ...form, purchaseQuantity })} />
        <NumberField label="Alış fiyatı" value={form.purchasePrice} onChange={(purchasePrice) => setForm({ ...form, purchasePrice })} />
        <NumberField label="Paket/demet içeriği" value={form.packageContent} onChange={(packageContent) => setForm({ ...form, packageContent })} />
        <label className="block space-y-1.5"><span className="label">Kullanım birimi</span><input className="field" list="stock-unit-options" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="Adet, gr, metre" /><datalist id="stock-unit-options"><option value="KG" /><option value="Çuval" /><option value="Paket" /><option value="Adet" /><option value="gr" /><option value="Metre" /></datalist></label>
        <label className="block space-y-1.5"><span className="label">Tedarikçi</span><input className="field" value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} /></label>
      </div>

      <div className="rounded-md border border-line bg-slate-50 p-3">
        <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.manualUnitCostEnabled} onChange={(event) => setForm({ ...form, manualUnitCostEnabled: event.target.checked })} />
          Manuel birim maliyeti kullan
        </label>
        {form.manualUnitCostEnabled ? (
          <NumberField label={`Manuel ${form.unit || 'birim'} maliyeti`} value={form.manualUnitCost} onChange={(manualUnitCost) => setForm({ ...form, manualUnitCost })} />
        ) : (
          <div className="text-sm">
            <div className="text-slate-500">Otomatik kullanım birimi maliyeti</div>
            <div className="mt-1 text-xl font-bold text-brand">{money4(form.packageContent > 0 ? form.purchasePrice / form.packageContent : 0)} / {form.unit || 'birim'}</div>
          </div>
        )}
      </div>

      <label className="block space-y-1.5"><span className="label">Stok açıklaması</span><textarea className="field min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <label className="block space-y-1.5">
        <span className="label">Durum</span>
        <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })}>
          <option value="ACTIVE">Aktif</option>
          <option value="PASSIVE">Pasif</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed border-line bg-slate-50 p-4">
        <div className="mb-2 text-sm font-bold">Stok Fotoğrafı</div>
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand shadow-sm">
          <ImagePlus size={17} />
          {imageFiles.length > 0 ? `${imageFiles.length} fotoğraf seçildi` : existingImagePath ? 'Fotoğraf Ekle' : 'Fotoğraf Ekle'}
          <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))} />
        </label>
        <div className="mt-2 text-xs text-slate-500">
          {imageFiles.length > 0 ? imageFiles.map((file) => file.name).join(', ') : existingImagePath ? 'Mevcut fotoğraflar korunur. Yeni fotoğraf seçersen listeye eklenir.' : 'Yeni stok kartı kaydedilince seçilen tüm fotoğraflar otomatik yüklenir.'}
        </div>
      </div>
      <label className="block space-y-1.5"><span className="label">Ürün adı</span><input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5"><span className="label">Stok kodu</span><input className="field" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
        <label className="block space-y-1.5"><span className="label">Model kodu</span><input className="field" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
        {!isStaff && <label className="block space-y-1.5"><span className="label">Eski model kodu</span><input className="field" value={form.oldModelCode} onChange={(event) => setForm({ ...form, oldModelCode: event.target.value })} /></label>}
        <label className="block space-y-1.5"><span className="label">Barkod</span><input className="field" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label>
        {!isStaff && <label className="block space-y-1.5"><span className="label">Ürün ailesi</span><input className="field" value={form.productFamily} onChange={(event) => setForm({ ...form, productFamily: event.target.value })} placeholder="Ficus, Benjamin, Bambu" /></label>}
        <label className="block space-y-1.5"><span className="label">Kategori</span><input className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        {!isStaff && <label className="block space-y-1.5"><span className="label">Ürün tipi</span><input className="field" value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })} /></label>}
        {!isStaff && <label className="block space-y-1.5"><span className="label">Marka</span><input className="field" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></label>}
        <label className="block space-y-1.5"><span className="label">Depo</span><input className="field" value={form.warehouse} onChange={(event) => setForm({ ...form, warehouse: event.target.value })} /></label>
        <label className="block space-y-1.5"><span className="label">Raf konumu</span><input className="field" value={form.shelfLocation} onChange={(event) => setForm({ ...form, shelfLocation: event.target.value })} /></label>
      </div>
      {!isStaff && (
        <div className="rounded-md border border-line bg-white p-3">
          <div className="mb-3 text-sm font-bold">Ölçü, saksı ve ürün detayı</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5"><span className="label">Yükseklik</span><input className="field" value={form.height} onChange={(event) => setForm({ ...form, height: event.target.value })} placeholder="180 cm" /></label>
            <label className="block space-y-1.5"><span className="label">Genişlik</span><input className="field" value={form.width} onChange={(event) => setForm({ ...form, width: event.target.value })} placeholder="70 cm" /></label>
            <label className="block space-y-1.5"><span className="label">Saksı türü</span><input className="field" value={form.potType} onChange={(event) => setForm({ ...form, potType: event.target.value })} /></label>
            <label className="block space-y-1.5"><span className="label">Saksı rengi</span><input className="field" value={form.potColor} onChange={(event) => setForm({ ...form, potColor: event.target.value })} /></label>
            <label className="block space-y-1.5"><span className="label">Saksı ölçüsü</span><input className="field" value={form.potSize} onChange={(event) => setForm({ ...form, potSize: event.target.value })} placeholder="30x30" /></label>
            <label className="block space-y-1.5"><span className="label">Gövde türü</span><input className="field" value={form.trunkType} onChange={(event) => setForm({ ...form, trunkType: event.target.value })} /></label>
            <label className="col-span-2 block space-y-1.5"><span className="label">Yaprak veya çiçek türü</span><input className="field" value={form.leafFlowerType} onChange={(event) => setForm({ ...form, leafFlowerType: event.target.value })} /></label>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {!isStaff && <NumberField label="Mevcut stok" value={form.stockQuantity} onChange={(stockQuantity) => setForm({ ...form, stockQuantity })} />}
        {!isStaff && <NumberField label="Kritik stok seviyesi" value={form.criticalStockLevel} onChange={(criticalStockLevel) => setForm({ ...form, criticalStockLevel })} />}
        <label className="block space-y-1.5"><span className="label">Alış birimi</span><input className="field" value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })} placeholder="Demet, koli, kg" /></label>
        <NumberField label="Alış miktarı" value={form.purchaseQuantity} onChange={(purchaseQuantity) => setForm({ ...form, purchaseQuantity })} />
        <NumberField label="Alış fiyatı" value={form.purchasePrice} onChange={(purchasePrice) => setForm({ ...form, purchasePrice })} />
        {!isStaff && <NumberField label="Satış fiyatı" value={form.salePrice} onChange={(salePrice) => setForm({ ...form, salePrice })} />}
        <NumberField label="Paket/demet içeriği" value={form.packageContent} onChange={(packageContent) => setForm({ ...form, packageContent })} />
        <label className="block space-y-1.5"><span className="label">Kullanım birimi</span><input className="field" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="Adet, gr, metre" /></label>
        <label className="block space-y-1.5"><span className="label">Tedarikçi</span><input className="field" value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} /></label>
      </div>
      <div className="rounded-md border border-line bg-slate-50 p-3">
        <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.manualUnitCostEnabled} onChange={(event) => setForm({ ...form, manualUnitCostEnabled: event.target.checked })} />
          Manuel birim maliyeti kullan
        </label>
        {form.manualUnitCostEnabled ? (
          <NumberField label={`Manuel ${form.unit || 'birim'} maliyeti`} value={form.manualUnitCost} onChange={(manualUnitCost) => setForm({ ...form, manualUnitCost })} />
        ) : (
          <div className="text-sm">
            <div className="text-slate-500">Otomatik kullanım birimi maliyeti</div>
            <div className="mt-1 text-xl font-bold text-brand">{money4(form.packageContent > 0 ? form.purchasePrice / form.packageContent : 0)} / {form.unit || 'birim'}</div>
          </div>
        )}
      </div>
      {!isStaff && (
        <div className="space-y-3 rounded-md border border-line bg-white p-3">
          <div className="text-sm font-bold">Açıklama ve SEO</div>
          <label className="block space-y-1.5"><span className="label">Ürün açıklaması</span><textarea className="field min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block space-y-1.5"><span className="label">Kısa açıklama</span><textarea className="field min-h-20" value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} /></label>
          <label className="block space-y-1.5"><span className="label">Teknik özellikler</span><textarea className="field min-h-20" value={form.technicalSpecs} onChange={(event) => setForm({ ...form, technicalSpecs: event.target.value })} /></label>
          <label className="block space-y-1.5"><span className="label">SEO başlığı</span><input className="field" value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} /></label>
          <label className="block space-y-1.5"><span className="label">Meta açıklaması</span><textarea className="field min-h-20" value={form.metaDescription} onChange={(event) => setForm({ ...form, metaDescription: event.target.value })} /></label>
        </div>
      )}
      <label className="block space-y-1.5">
        <span className="label">Durum</span>
        <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })}>
          <option value="ACTIVE">Aktif</option>
          <option value="PASSIVE">Pasif</option>
        </select>
      </label>
    </div>
  );
}

function MovementForm({ mode, form, setForm, unit, purchaseUnit, packageContent }: { mode: 'in' | 'out'; form: typeof emptyMovement; setForm: (form: typeof emptyMovement) => void; unit: string; purchaseUnit: string; packageContent: number }) {
  const usageQuantity = stockInputQuantityToUsageQuantity(Number(form.quantity || 0), purchaseUnit, unit, packageContent);

  return (
    <div className="space-y-4">
      <NumberField label={`${mode === 'in' ? 'Eklenecek' : 'Düşülecek'} miktar (${mode === 'in' ? purchaseUnit : unit})`} value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
      {mode === 'in' && <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">Stoğa yazılacak kullanım miktarı: {usageQuantity.toLocaleString('tr-TR')} {unit}</div>}
      {mode === 'in' && <NumberField label="Alış fiyatı" value={form.purchasePrice} onChange={(purchasePrice) => setForm({ ...form, purchasePrice })} />}
      {mode === 'in' && <label className="block space-y-1.5"><span className="label">Tedarikçi</span><input className="field" value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} /></label>}
      {mode === 'in' && <label className="block space-y-1.5"><span className="label">Fatura veya belge numarası</span><input className="field" value={form.documentNo} onChange={(event) => setForm({ ...form, documentNo: event.target.value })} /></label>}
      {mode === 'in' && (
        <label className="block space-y-1.5">
          <span className="label">Ödeme durumu</span>
          <select className="field" value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}>
            <option>Peşin</option>
            <option>Kısmi</option>
            <option>Vadeli</option>
          </select>
        </label>
      )}
      {mode === 'out' && (
        <label className="block space-y-1.5">
          <span className="label">Düşme nedeni</span>
          <select className="field" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
            <option>Üretimde kullanıldı</option>
            <option>Siparişe çıktı</option>
            <option>Hasarlı</option>
            <option>Sayım düzeltmesi</option>
            <option>Numune</option>
            <option>Diğer</option>
          </select>
        </label>
      )}
      <label className="block space-y-1.5"><span className="label">Açıklama</span><textarea className="field min-h-24" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      <input className="field" type="number" step="0.001" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function panelTitle(mode: PanelMode) {
  if (mode === 'create') return 'Yeni Stok Kartı';
  if (mode === 'edit') return 'Stok Kartı Düzenle';
  if (mode === 'in') return 'Stok Ekle';
  if (mode === 'out') return 'Stok Düş';
  if (mode === 'history') return 'Stok Hareketleri';
  return '';
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function money4(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} TL`;
}

function unitCost(item: StockCard) {
  if (item.manualUnitCostEnabled) return Number(item.manualUnitCost || 0);
  if (Number(item.automaticUnitCost || 0) > 0) return Number(item.automaticUnitCost);
  return Number(item.packageContent || 0) > 0 ? Number(item.purchasePrice || 0) / Number(item.packageContent) : 0;
}

function stockTotalValue(item: StockCard) {
  return unitCost(item) * Number(item.stockQuantity || 0);
}

function stockInputQuantityToUsageQuantity(quantity: number, purchaseUnit: string, usageUnit: string, packageContent: number) {
  const multiplier = normalize(purchaseUnit || '') === normalize(usageUnit || '') ? 1 : Number(packageContent || 1);
  return roundQuantity(Number(quantity || 0) * multiplier);
}

function roundQuantity(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function stockSearchText(item: StockCard) {
  return normalize([
    item.name,
    item.sku,
    item.model,
    item.oldModelCode,
    item.barcode,
    item.category,
    item.productFamily,
    item.productType,
    item.color,
    item.size,
    item.height,
    item.width,
    item.potType,
    item.potColor,
    item.potSize,
    item.trunkType,
    item.leafFlowerType,
    item.brand,
    item.supplierName,
    item.shortDescription,
    item.description,
  ].filter(Boolean).join(' '));
}

function isTestStockCard(item: StockCard) {
  const text = normalize(`${item.name} ${item.sku ?? ''} ${item.category ?? ''} ${item.description ?? ''}`);
  return text.includes('test') || text.includes('deneme');
}
