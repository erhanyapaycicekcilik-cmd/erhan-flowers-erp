'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, CreditCard, Eye, FileText, MapPin, Phone, Plus, Printer, Search, ShoppingCart, Trash2, Truck, UserRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';

type SaleProduct = {
  id: number;
  variantId?: number | null;
  barcode: string;
  productName: string;
  originalProductName: string;
  currentModelCode?: string | null;
  proposedModelCode?: string | null;
  supplierStockCode?: string | null;
  categoryName?: string | null;
  familyName?: string | null;
  size?: string | null;
  pot?: string | null;
  stockQuantity: number;
  stockCardId?: number | null;
  stockUnit?: string | null;
  salePrice: number;
  trendyolSalePrice: number;
  trendyolProductUrl?: string | null;
  imageUrl?: string | null;
};

type SaleItem = SaleProduct & {
  quantity: number;
  unitPrice: number;
  discount: number;
  stockFulfillmentType?: 'READY_STOCK' | 'CUSTOM_PRODUCTION' | 'NON_STOCK_SERVICE';
};

type CustomerSummary = {
  id: number;
  displayName: string;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  addresses: Array<{ id: number; title: string; fullAddress?: string | null }>;
  summary?: {
    saleCount?: number;
    totalSpent?: number | string;
    firstSaleAt?: string | null;
    lastSaleAt?: string | null;
  };
};

type SaleListRow = {
  id: string | number;
  saleNumber: string;
  status: string;
  channel: string;
  saleType: string;
  grandTotal: number | string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
};

type PrintType = 'address-label' | 'delivery-form' | 'order-form';

const requiredCustomerSources = [
  { id: -1, code: 'STORE', name: 'Mağaza', isActive: true },
  { id: -2, code: 'PHONE', name: 'Telefon', isActive: true },
  { id: -3, code: 'WHATSAPP', name: 'WhatsApp', isActive: true },
  { id: -4, code: 'INSTAGRAM', name: 'Instagram', isActive: true },
];

const STORE_PICKUP = 'Mağazadan teslim';

const emptyCustomer = {
  customerType: 'INDIVIDUAL',
  firstName: '',
  lastName: '',
  companyTitle: '',
  taxOffice: '',
  taxNumber: '',
  nationalId: '',
  isEInvoicePayer: false,
  currentAccountCode: '',
  phone: '',
  whatsappPhone: '',
  secondPhone: '',
  email: '',
  note: '',
  source: 'STORE',
  orderCommunicationAllowed: true,
  whatsappMarketingAllowed: false,
  smsMarketingAllowed: false,
  emailMarketingAllowed: false,
  consentSource: 'Satış ekranı',
  tagIds: [] as number[],
};

const emptyAddress = {
  id: null as number | null,
  title: 'Ev',
  fullAddress: '',
  city: '',
  district: '',
  neighborhood: '',
  postalCode: '',
  deliveryNote: '',
  locationNote: '',
};

const emptyPayment = {
  clientKey: '',
  method: 'Nakit',
  paidAmount: 0,
};

const emptyDelivery = {
  method: 'Kendi aracımızla teslim',
  date: '',
  status: 'Bekliyor',
  staff: '',
  note: '',
};

const emptyManualProduct = {
  productName: '',
  barcode: '',
  modelCode: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
};

export default function SalesCenterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Yukleniyor...</div>}>
      <SalesCenterPageContent />
    </Suspense>
  );
}

function SalesCenterPageContent() {
  const searchParams = useSearchParams();
  const clientRequestId = useRef(crypto.randomUUID());
  const quickBarcodeLoaded = useRef('');
  const [saleNumber, setSaleNumber] = useState('');
  const [customer, setCustomer] = useState(emptyCustomer);
  const [address, setAddress] = useState(emptyAddress);
  const [payments, setPayments] = useState([{ ...emptyPayment, clientKey: crypto.randomUUID() }]);
  const [delivery, setDelivery] = useState(emptyDelivery);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SaleProduct[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [manualProduct, setManualProduct] = useState(emptyManualProduct);
  const [savedSale, setSavedSale] = useState<Record<string, any> | null>(null);
  const [message, setMessage] = useState('');
  const [customerSummary, setCustomerSummary] = useState<CustomerSummary | null>(null);
  const [customerTags, setCustomerTags] = useState<Array<{ id: number; name: string; color?: string }>>([]);
  const [newTagName, setNewTagName] = useState('');
  const [customerSources, setCustomerSources] = useState<Array<{ id: number; code: string; name: string; isActive: boolean }>>([]);
  const [sales, setSales] = useState<SaleListRow[]>([]);
  const [selectedSale, setSelectedSale] = useState<Record<string, any> | null>(null);
  const [loadingSaleId, setLoadingSaleId] = useState<string | number | null>(null);
  const [quickSaleLoading, setQuickSaleLoading] = useState(false);
  const quickBarcode = searchParams.get('barcode')?.trim() ?? '';

  useEffect(() => {
    api<{ saleNumber: string }>('/sales/next-number')
      .then((data) => setSaleNumber(data.saleNumber))
      .catch(() => setSaleNumber('SAT-TASLAK'));
    api<Array<{ id: number; name: string; color?: string; isActive?: boolean }>>('/sales/customer-tags/list').then((items) => setCustomerTags(items.filter((item) => item.isActive !== false))).catch(() => setCustomerTags([]));
    api<Array<{ id: number; code: string; name: string; isActive: boolean }>>('/sales/crm/sources').then((items) => setCustomerSources(items.filter((item) => item.isActive))).catch(() => setCustomerSources([]));
    loadSales();
  }, []);

  const sourceOptions = useMemo(() => {
    const merged = new Map(requiredCustomerSources.map((source) => [source.code, source]));
    customerSources.forEach((source) => merged.set(source.code, source));
    return [...merged.values()];
  }, [customerSources]);

  const isStorePickup = delivery.method === STORE_PICKUP;

  useEffect(() => {
    if (!quickBarcode || quickBarcodeLoaded.current === quickBarcode) return;
    quickBarcodeLoaded.current = quickBarcode;
    setQuery(quickBarcode);
    setDelivery((current) => ({ ...current, method: STORE_PICKUP }));
    setCustomer((current) => ({
      ...current,
      firstName: current.firstName || 'Dukkan',
      lastName: current.lastName || 'Satis',
      phone: current.phone || '0000000000',
      whatsappPhone: current.whatsappPhone || current.phone || '0000000000',
      source: 'STORE',
    }));
    api<SaleProduct[]>(`/sales/products/search?q=${encodeURIComponent(quickBarcode)}`)
      .then((data) => {
        setResults(data);
        const exact = data.find((product) =>
          [product.barcode, product.currentModelCode, product.proposedModelCode, product.supplierStockCode]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase('tr-TR') === quickBarcode.toLocaleLowerCase('tr-TR')),
        );
        const product = exact ?? data[0];
        if (product) {
          addItem(product);
          setMessage('QR kod okutuldu. Urun sepete eklendi, dukkan satisi tek tikla tamamlanabilir.');
        } else {
          setMessage('QR barkodu ile eslesen urun bulunamadi.');
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'QR barkodu aranirken hata olustu.'));
  }, [quickBarcode]);

  async function loadSales() {
    try {
      setSales(await api<SaleListRow[]>('/sales'));
    } catch {
      setSales([]);
    }
  }

  const totals = useMemo(() => {
    const gross = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = items.reduce((sum, item) => sum + item.discount, 0);
    const total = Math.max(0, gross - discount);
    const paid = payments
      .filter((payment) => payment.method !== 'Veresiye')
      .reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);
    const remaining = Math.max(0, total - paid);
    return { gross, discount, total, remaining };
  }, [items, payments]);

  const manualPreview = useMemo(() => {
    const quantity = Math.max(1, Number(manualProduct.quantity || 1));
    const unitPrice = Math.max(0, Number(manualProduct.unitPrice || 0));
    const discount = Math.max(0, Number(manualProduct.discount || 0));
    return {
      quantity,
      unitPrice,
      discount,
      total: Math.max(0, quantity * unitPrice - discount),
    };
  }, [manualProduct]);

  async function searchProducts(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const data = await api<SaleProduct[]>(`/sales/products/search?q=${encodeURIComponent(query.trim())}`);
    setResults(data);
  }

  function addItem(product: SaleProduct) {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1, unitPrice: product.salePrice || product.trendyolSalePrice || 0, discount: 0 }];
    });
  }

  function updateItem(id: number, data: Partial<SaleItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...data } : item)));
  }

  function removeItem(id: number) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addManualItem(event: FormEvent) {
    event.preventDefault();
    const productName = manualProduct.productName.trim();
    if (!productName) {
      setMessage('Manuel ürün için ürün adı zorunludur.');
      return;
    }
    const quantity = Math.max(1, Number(manualProduct.quantity || 1));
    const unitPrice = Math.max(0, Number(manualProduct.unitPrice || 0));
    const discount = Math.max(0, Number(manualProduct.discount || 0));
    const manualItem: SaleItem = {
      id: -Date.now(),
      variantId: null,
      barcode: manualProduct.barcode.trim(),
      productName,
      originalProductName: productName,
      currentModelCode: manualProduct.modelCode.trim() || null,
      proposedModelCode: manualProduct.modelCode.trim() || null,
      supplierStockCode: null,
      categoryName: 'Manuel',
      familyName: null,
      size: null,
      pot: null,
      stockQuantity: 0,
      stockUnit: 'Adet',
      stockCardId: null,
      salePrice: unitPrice,
      trendyolSalePrice: unitPrice,
      trendyolProductUrl: null,
      imageUrl: null,
      quantity,
      unitPrice,
      discount,
      stockFulfillmentType: 'NON_STOCK_SERVICE',
    };
    setItems((current) => [...current, manualItem]);
    setManualProduct(emptyManualProduct);
    setMessage('Manuel ürün satış kalemlerine eklendi. Bu satır stoktan düşmez.');
  }

  async function findCustomerByPhone() {
    if (customer.phone.trim().length < 5) return;
    const data = await api<Array<Record<string, any>>>(`/sales/customers/search?q=${encodeURIComponent(customer.phone)}`);
    const match = data[0];
    if (!match) {
      setCustomerSummary(null);
      setMessage('Bu telefonla kayıtlı müşteri bulunamadı. Yeni müşteri olarak devam edilebilir.');
      return;
    }
    const detail = await api<CustomerSummary>(`/sales/customers/${match.id}`);
    setCustomerSummary(detail);
    setCustomer({
      ...emptyCustomer,
      firstName: String(match.firstName ?? ''),
      lastName: String(match.lastName ?? ''),
      phone: String(match.phone ?? customer.phone),
      whatsappPhone: String(detail.whatsappPhone ?? match.phone ?? customer.phone),
      secondPhone: String(match.secondaryPhone ?? ''),
      email: String(match.email ?? ''),
      note: String(match.customerNote ?? ''),
      source: String((detail as any).sourceCode ?? (detail as any).source ?? 'STORE'),
      orderCommunicationAllowed: (detail as any).orderCommunicationAllowed !== false,
      whatsappMarketingAllowed: Boolean((detail as any).whatsappMarketingAllowed),
      smsMarketingAllowed: Boolean((detail as any).smsMarketingAllowed),
      emailMarketingAllowed: Boolean((detail as any).emailMarketingAllowed),
      consentSource: String((detail as any).consentSource ?? 'Satış ekranı'),
      tagIds: Array.isArray((detail as any).tags) ? (detail as any).tags.map((tag: { id: number }) => tag.id) : [],
    });
    setMessage(`${match.displayName} müşteri kaydı bulundu.`);
  }

  async function saveCustomer() {
    setMessage('');
    const saved = await api<CustomerSummary>('/sales/customers', {
      method: 'POST',
      json: { ...customer, address: address.fullAddress.trim() ? { ...address, recipientName: `${customer.firstName} ${customer.lastName}`.trim(), recipientPhone: customer.phone } : undefined },
    });
    setCustomerSummary(saved);
    setMessage('Müşteri kaydı kaydedildi. Sipariş oluşturmadan bu kayıt korunacaktır.');
  }

  async function createCustomerTag() {
    if (!newTagName.trim()) return;
    const tag = await api<{ id: number; name: string; color?: string }>('/sales/customer-tags', { method: 'POST', json: { name: newTagName.trim() } });
    setCustomerTags((current) => [...current.filter((item) => item.id !== tag.id), tag].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
    setCustomer({ ...customer, tagIds: [...new Set([...customer.tagIds, tag.id])] });
    setNewTagName('');
  }

  async function saveSale(status: 'DRAFT' | 'CONFIRMED' = 'DRAFT', overrides: { customer?: typeof emptyCustomer; delivery?: typeof emptyDelivery; payments?: typeof payments } = {}) {
    setMessage('');
    if (!validateSale(overrides.customer, overrides.delivery)) return null;
    const payload = buildSalePayload(status, overrides);
    const sale = await api<Record<string, any>>('/sales', { method: 'POST', json: payload });
    setSavedSale(sale);
    setSelectedSale(sale);
    setSaleNumber(String(sale.sale_number ?? sale.saleNumber ?? saleNumber));
    setMessage(status === 'DRAFT' ? 'Satış taslağı kaydedildi.' : 'Satış kaydedildi.');
    await loadSales();
    return sale;
  }

  async function completeSale() {
    const sale = savedSale ?? await saveSale('CONFIRMED');
    if (!sale) return;
    const completed = await api<Record<string, any>>(`/sales/${sale.id}/complete`, { method: 'POST' });
    setSavedSale(completed);
    setSelectedSale(completed);
    setMessage('Satış tamamlandı. Finans kaydı ve stok hareketi güvenli şekilde işlendi.');
    await loadSales();
  }

  async function completeQuickStoreSale() {
    if (items.length === 0) {
      setMessage('Stoktan dusmek icin once QR urununun sepete eklenmesi gerekir.');
      return;
    }
    setQuickSaleLoading(true);
    const quickCustomer = {
      ...customer,
      firstName: customer.firstName || 'Dukkan',
      lastName: customer.lastName || 'Satis',
      phone: customer.phone || '0000000000',
      whatsappPhone: customer.whatsappPhone || customer.phone || '0000000000',
      source: 'STORE',
    };
    const quickDelivery = { ...delivery, method: STORE_PICKUP };
    const quickPayments = [{ ...(payments[0] ?? emptyPayment), clientKey: payments[0]?.clientKey ?? crypto.randomUUID(), method: 'Nakit', paidAmount: totals.total }];
    setCustomer(quickCustomer);
    setDelivery(quickDelivery);
    setPayments(quickPayments);
    try {
      const sale = savedSale ?? await saveSale('CONFIRMED', { customer: quickCustomer, delivery: quickDelivery, payments: quickPayments });
      if (!sale) return;
      const completed = await api<Record<string, any>>(`/sales/${sale.id}/complete`, { method: 'POST' });
      setSavedSale(completed);
      setSelectedSale(completed);
      setMessage('Dukkan satisi tamamlandi. Stok hareketi islendi.');
      await loadSales();
    } finally {
      setQuickSaleLoading(false);
    }
  }

  function validateSale(nextCustomer = customer, nextDelivery = delivery) {
    const nextIsStorePickup = nextDelivery.method === STORE_PICKUP;
    if (!nextCustomer.firstName.trim() || !nextCustomer.lastName.trim() || !nextCustomer.phone.trim()) {
      setMessage('Ad soyad ve telefon alanları zorunludur.');
      return false;
    }
    if (items.length === 0) {
      setMessage('Siparişi kaydetmek için en az bir ürün ekleyin.');
      return false;
    }
    if (!nextIsStorePickup && (!address.title.trim() || !address.city.trim() || !address.district.trim() || !address.fullAddress.trim())) {
      setMessage('Eve teslim siparişlerinde adres başlığı, il, ilçe ve açık adres zorunludur.');
      return false;
    }
    return true;
  }

  function openPrint(saleId: string | number, type: PrintType) {
    const win = window.open(`/sales/print/${saleId}/${type}`, '_blank', 'noopener,noreferrer');
    if (!win) setMessage('Yazdırma önizlemesi açılamadı. Tarayıcının açılır pencere iznini kontrol edin.');
  }

  async function showSaleDetail(id: string | number, scrollToPrint = false) {
    setLoadingSaleId(id);
    try {
      const detail = await api<Record<string, any>>(`/sales/${id}`);
      setSelectedSale(detail);
      if (scrollToPrint) {
        window.setTimeout(() => document.getElementById('eski-siparis-yazdir')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
    } finally {
      setLoadingSaleId(null);
    }
  }

  async function openCustomerCard(saleId: string | number) {
    const detail = await api<Record<string, any>>(`/sales/${saleId}`);
    const customerId = detail.customer_id ?? detail.customerId;
    if (customerId) window.open(`/customers/${customerId}`, '_blank', 'noopener,noreferrer');
  }

  function buildSalePayload(status: 'DRAFT' | 'CONFIRMED', overrides: { customer?: typeof emptyCustomer; delivery?: typeof emptyDelivery; payments?: typeof payments } = {}) {
    const effectiveCustomer = overrides.customer ?? customer;
    const effectiveDelivery = overrides.delivery ?? delivery;
    const effectivePayments = overrides.payments ?? payments;
    const effectiveIsStorePickup = effectiveDelivery.method === STORE_PICKUP;
    return {
      clientRequestId: clientRequestId.current,
      status,
      channel: effectiveCustomer.source,
      saleType: effectiveIsStorePickup ? 'STORE_SALE' : 'DELIVERY_SALE',
      customer: effectiveCustomer,
      address: {
        ...address,
        recipientName: `${effectiveCustomer.firstName} ${effectiveCustomer.lastName}`.trim(),
        recipientPhone: effectiveCustomer.phone,
      },
      items: items.map((item) => ({
        variantId: 'variantId' in item ? item.variantId : item.id,
        stockCardId: item.stockCardId,
        barcode: item.barcode,
        modelCode: item.proposedModelCode || item.currentModelCode,
        productNameSnapshot: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discount,
        stockFulfillmentType: item.stockFulfillmentType ?? 'READY_STOCK',
      })),
      payments: effectivePayments.map((payment) => ({
          method: payment.method,
          amount: Number(payment.paidAmount || 0),
          clientKey: payment.clientKey,
        })),
      delivery: {
        ...effectiveDelivery,
        note: effectiveDelivery.note || address.deliveryNote,
      },
    };
  }

  return (
    <AdminShell title="Satış Merkezi">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Yeni Bireysel Satış</h2>
                <p className="text-sm text-slate-500">Satış No: {saleNumber}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary" type="button" onClick={() => saveSale('DRAFT')}>
                  Taslak Kaydet
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => saveSale('CONFIRMED')}>
                  Müşteri ve Siparişi Kaydet
                </button>
                {savedSale && customerSummary && (
                  <a className="btn btn-secondary" href={`/customers/${customerSummary.id}`} target="_blank" rel="noreferrer">
                    Müşteri Kartını Aç
                  </a>
                )}
                {savedSale && (
                  <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
                    Yeni Sipariş Oluştur
                  </button>
                )}
                <button className="btn btn-primary" type="button" onClick={completeSale}>
                  <ShoppingCart size={17} />
                  Satışı Tamamla
                </button>
                {quickBarcode && (
                  <button className="btn btn-primary" type="button" onClick={completeQuickStoreSale} disabled={quickSaleLoading || items.length === 0}>
                    <ShoppingCart size={17} />
                    Dukkandan Sat - Stoktan Dus
                  </button>
                )}
              </div>
            </div>
            {message && <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}
            {savedSale && (
              <div className="mt-5">
                <PrintActions
                  sale={savedSale}
                  title="YAZDIR"
                />
              </div>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserRound size={18} />
                <h3 className="font-bold">Müşteri</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="field sm:col-span-2" value={customer.customerType} onChange={(e) => setCustomer({ ...customer, customerType: e.target.value })}>
                  <option value="INDIVIDUAL">Bireysel müşteri</option>
                  <option value="CORPORATE">Kurumsal müşteri</option>
                </select>
                {customer.customerType === 'CORPORATE' && (
                  <>
                    <input className="field sm:col-span-2" placeholder="Firma ünvanı" value={customer.companyTitle} onChange={(e) => setCustomer({ ...customer, companyTitle: e.target.value })} />
                    <input className="field" placeholder="Vergi dairesi" value={customer.taxOffice} onChange={(e) => setCustomer({ ...customer, taxOffice: e.target.value })} />
                    <input className="field" placeholder="Vergi no" value={customer.taxNumber} onChange={(e) => setCustomer({ ...customer, taxNumber: e.target.value })} />
                    <input className="field" placeholder="TCKN" value={customer.nationalId} onChange={(e) => setCustomer({ ...customer, nationalId: e.target.value })} />
                    <input className="field" placeholder="Cari kod" value={customer.currentAccountCode} onChange={(e) => setCustomer({ ...customer, currentAccountCode: e.target.value })} />
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={customer.isEInvoicePayer} onChange={(e) => setCustomer({ ...customer, isEInvoicePayer: e.target.checked })} />
                      e-Fatura mükellefi
                    </label>
                  </>
                )}
                <input className="field" required placeholder="Ad *" value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
                <input className="field" placeholder="Soyad" value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input className="field" required placeholder="Telefon *" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} onBlur={findCustomerByPhone} />
                  <button className="btn btn-secondary justify-center" type="button" onClick={findCustomerByPhone} title="Müşteri bul">
                    <Phone size={17} />
                  </button>
                </div>
                <input className="field" placeholder="WhatsApp telefonu" value={customer.whatsappPhone} onChange={(e) => setCustomer({ ...customer, whatsappPhone: e.target.value })} />
                <input className="field sm:col-span-2" placeholder="E-posta" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                <select className="field sm:col-span-2" value={customer.source} onChange={(e) => setCustomer({ ...customer, source: e.target.value })}>
                  {sourceOptions.map((source) => <option key={source.code} value={source.code}>{source.name}</option>)}
                </select>
                {customer.source === 'PHONE' && (
                  <div className="sm:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    Kaynak: Telefon
                  </div>
                )}
                <textarea className="field sm:col-span-2 min-h-20" placeholder="Müşteri notu" value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} />
                <div className="sm:col-span-2 grid gap-2 text-sm text-slate-700">
                  <label><input className="mr-2" type="checkbox" checked={customer.orderCommunicationAllowed} onChange={(e) => setCustomer({ ...customer, orderCommunicationAllowed: e.target.checked })} />Sipariş ve teslimat iletişimi</label>
                  <label><input className="mr-2" type="checkbox" checked={customer.whatsappMarketingAllowed} onChange={(e) => setCustomer({ ...customer, whatsappMarketingAllowed: e.target.checked })} />WhatsApp kampanya izni</label>
                  <label><input className="mr-2" type="checkbox" checked={customer.smsMarketingAllowed} onChange={(e) => setCustomer({ ...customer, smsMarketingAllowed: e.target.checked })} />SMS kampanya izni</label>
                  <label><input className="mr-2" type="checkbox" checked={customer.emailMarketingAllowed} onChange={(e) => setCustomer({ ...customer, emailMarketingAllowed: e.target.checked })} />E-posta kampanya izni</label>
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  {customerTags.map((tag) => (
                    <label key={tag.id} className="rounded border border-line px-2 py-1 text-xs">
                      <input className="mr-1" type="checkbox" checked={customer.tagIds.includes(tag.id)} onChange={(e) => setCustomer({ ...customer, tagIds: e.target.checked ? [...customer.tagIds, tag.id] : customer.tagIds.filter((id) => id !== tag.id) })} />
                      {tag.name}
                    </label>
                  ))}
                </div>
                <div className="sm:col-span-2 grid grid-cols-[1fr_auto] gap-2">
                  <input className="field" placeholder="Yeni müşteri etiketi" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                  <button className="btn btn-secondary" type="button" onClick={createCustomerTag}>Etiket Ekle</button>
                </div>
                <button className="btn btn-secondary sm:col-span-2 justify-center" type="button" onClick={saveCustomer}>Müşteriyi Kaydet</button>
              </div>
              {customerSummary && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-ink">{customerSummary.displayName}</div>
                      <div className="mt-1 text-sm text-slate-600">Telefon: {customerSummary.phone || '-'}</div>
                      <div className="mt-1 text-sm text-emerald-700">WhatsApp: ✓</div>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <div>Adresler</div>
                      <div className="mt-1 font-semibold text-ink">
                        {customerSummary.addresses.length > 0
                          ? customerSummary.addresses.map((item) => item.title).join(', ')
                          : 'Kayıtlı adres yok'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <CustomerMetric label="Siparişler" value={String(customerSummary.summary?.saleCount ?? 0)} />
                    <CustomerMetric label="Toplam" value={formatMoney(Number(customerSummary.summary?.totalSpent ?? 0))} />
                    <CustomerMetric label="İlk Sipariş" value={formatDate(customerSummary.summary?.firstSaleAt)} />
                    <CustomerMetric label="Son Sipariş" value={formatDate(customerSummary.summary?.lastSaleAt)} />
                  </div>
                </div>
              )}
            </div>

            <div className="panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin size={18} />
                <h3 className="font-bold">Adres</h3>
              </div>
              {customerSummary?.addresses?.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {customerSummary.addresses.map((savedAddress) => (
                    <button key={savedAddress.id} className="btn btn-secondary" type="button" onClick={() => setAddress({ ...emptyAddress, ...savedAddress, id: savedAddress.id, fullAddress: savedAddress.fullAddress || '' })}>
                      {savedAddress.title}
                    </button>
                  ))}
                  <button className="btn btn-secondary" type="button" onClick={() => setAddress(emptyAddress)}>+ Yeni Adres</button>
                </div>
              ) : null}
              <p className="mb-3 text-xs text-slate-500">Teslimat siparişlerinde adres zorunludur. Mağazadan teslimde boş bırakılabilir.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="field" placeholder="Adres başlığı" value={address.title} onChange={(e) => setAddress({ ...address, title: e.target.value })} />
                <input className="field" placeholder="Mahalle" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                <input className="field" placeholder="İl" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <input className="field" placeholder="İlçe" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} />
                <textarea className="field sm:col-span-2 min-h-20" placeholder="Açık adres" value={address.fullAddress} onChange={(e) => setAddress({ ...address, fullAddress: e.target.value })} />
                <input className="field" placeholder="Posta kodu" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
                <input className="field" placeholder="Konum açıklaması" value={address.locationNote} onChange={(e) => setAddress({ ...address, locationNote: e.target.value })} />
                <textarea className="field sm:col-span-2 min-h-16" placeholder="Teslimat notu" value={address.deliveryNote} onChange={(e) => setAddress({ ...address, deliveryNote: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <Search size={18} />
              <h3 className="font-bold">Ürün Ekle</h3>
            </div>
            <form onSubmit={searchProducts} className="mb-4 grid gap-2 md:grid-cols-[1fr_auto]">
              <input className="field" placeholder="Barkod, model kodu veya ürün adı yaz" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="btn btn-secondary" type="submit">
                <Search size={17} />
                Ara
              </button>
            </form>
            <div className="grid gap-3">
              {results.map((product) => (
                <button key={product.id} type="button" className="rounded-md border border-line bg-white p-3 text-left hover:border-brand" onClick={() => addItem(product)}>
                  <div className="flex gap-3">
                    {product.imageUrl ? <img src={apiFileUrl(product.imageUrl)} alt="" className="h-16 w-16 rounded object-cover" /> : <div className="h-16 w-16 rounded bg-slate-100" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{product.productName}</div>
                      <div className="mt-1 text-xs text-slate-500">Barkod: {product.barcode} | Model: {product.proposedModelCode || product.currentModelCode || '-'}</div>
                      <div className="mt-1 text-xs text-slate-500">Stok: {product.stockQuantity} {product.stockUnit || 'Adet'} | Fiyat: {formatMoney(product.salePrice || product.trendyolSalePrice)}</div>
                    </div>
                    <Plus className="mt-1 text-brand" size={20} />
                  </div>
                </button>
              ))}
              {query.trim().length > 1 && results.length === 0 && <div className="text-sm text-slate-500">Sonuç yok veya henüz arama yapılmadı.</div>}
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <div className="mb-3 flex items-center gap-2">
                <Calculator size={18} className="text-brand" />
                <div>
                  <h4 className="font-semibold">Manuel Ürün Hesap Makinesi</h4>
                  <p className="text-sm text-slate-500">Yazdığınız satır hesaplanır ve Ekle ile aşağıdaki satış listesine aktarılır.</p>
                </div>
              </div>
              <form onSubmit={addManualItem} className="grid gap-2 lg:grid-cols-[1.4fr_1fr_90px_120px_120px_auto]">
                <input
                  className="field"
                  placeholder="Ürün adı"
                  value={manualProduct.productName}
                  onChange={(e) => setManualProduct({ ...manualProduct, productName: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="Barkod / model kodu"
                  value={manualProduct.modelCode}
                  onChange={(e) => setManualProduct({ ...manualProduct, modelCode: e.target.value, barcode: e.target.value })}
                />
                <input
                  className="field"
                  type="number"
                  min="1"
                  placeholder="Adet"
                  value={manualProduct.quantity}
                  onChange={(e) => setManualProduct({ ...manualProduct, quantity: Number(e.target.value) })}
                />
                <input
                  className="field"
                  type="number"
                  min="0"
                  placeholder="Birim fiyat"
                  value={manualProduct.unitPrice}
                  onChange={(e) => setManualProduct({ ...manualProduct, unitPrice: Number(e.target.value) })}
                />
                <input
                  className="field"
                  type="number"
                  min="0"
                  placeholder="İndirim"
                  value={manualProduct.discount}
                  onChange={(e) => setManualProduct({ ...manualProduct, discount: Number(e.target.value) })}
                />
                <button className="btn btn-secondary justify-center" type="submit">
                  <Plus size={17} />
                  Ekle
                </button>
              </form>
              <div className="mt-3 grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm sm:grid-cols-4">
                <CustomerMetric label="Adet" value={manualPreview.quantity.toLocaleString('tr-TR')} />
                <CustomerMetric label="Birim fiyat" value={formatMoney(manualPreview.unitPrice)} />
                <CustomerMetric label="İndirim" value={formatMoney(manualPreview.discount)} />
                <CustomerMetric label="Listeye eklenecek toplam" value={formatMoney(manualPreview.total)} />
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <h3 className="mb-4 font-bold">Satış Kalemleri</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border border-line p-3 lg:grid-cols-[1fr_90px_130px_120px_44px]">
                  <div>
                    <div className="font-semibold">{item.productName}</div>
                    <div className="text-xs text-slate-500">
                      {item.barcode || '-'} | {item.proposedModelCode || item.currentModelCode || '-'}
                      {item.stockFulfillmentType === 'NON_STOCK_SERVICE' ? ' | Manuel / stoktan düşmez' : ''}
                    </div>
                  </div>
                  <input className="field" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} />
                  <input className="field" type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} />
                  <input className="field" type="number" min="0" value={item.discount} onChange={(e) => updateItem(item.id, { discount: Number(e.target.value) })} />
                  <button className="btn btn-secondary justify-center" type="button" onClick={() => removeItem(item.id)} title="Sil">
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              {items.length === 0 && <div className="rounded-md border border-dashed border-line p-5 text-sm text-slate-500">Henüz ürün eklenmedi.</div>}
            </div>
          </section>
          <section className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Satış Listesi</h3>
                <p className="text-sm text-slate-500">Eski siparişleri görüntüleyin ve yeniden yazdırın.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={loadSales}>Listeyi Yenile</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">Sipariş</th>
                    <th className="px-3 py-3">Müşteri</th>
                    <th className="px-3 py-3">Kaynak</th>
                    <th className="px-3 py-3">Tarih</th>
                    <th className="px-3 py-3 text-right">Toplam</th>
                    <th className="px-3 py-3 text-right">Hızlı İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-3 font-semibold text-ink">{sale.saleNumber}</td>
                      <td className="px-3 py-3">
                        <div>{sale.customerName || 'Müşteri'}</div>
                        <div className="text-xs text-slate-500">{sale.customerPhone || '-'}</div>
                      </td>
                      <td className="px-3 py-3">{sourceName(sale.channel)}</td>
                      <td className="px-3 py-3">{formatDate(sale.createdAt)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatMoney(Number(sale.grandTotal || 0))}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button className="btn btn-secondary" type="button" onClick={() => showSaleDetail(sale.id)} disabled={loadingSaleId === sale.id}>
                            <Eye size={16} />
                            Görüntüle
                          </button>
                          <details className="relative">
                            <summary className="btn btn-secondary cursor-pointer list-none">
                              <Printer size={16} />
                              Yazdır
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 w-60 rounded-md border border-line bg-white p-2 shadow-xl">
                              <button className="w-full rounded px-3 py-2 text-left hover:bg-slate-50" type="button" onClick={() => openPrint(sale.id, 'address-label')}>10×15 Adres Etiketi</button>
                              <button className="w-full rounded px-3 py-2 text-left hover:bg-slate-50" type="button" onClick={() => openPrint(sale.id, 'delivery-form')}>A5 Teslimat Formu</button>
                              <button className="w-full rounded px-3 py-2 text-left hover:bg-slate-50" type="button" onClick={() => openPrint(sale.id, 'order-form')}>A4 Sipariş Formu</button>
                            </div>
                          </details>
                          <button className="btn btn-secondary" type="button" onClick={() => openCustomerCard(sale.id)}>
                            <UserRound size={16} />
                            Müşteri Kartı
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && <div className="py-8 text-center text-sm text-slate-500">Kayıtlı satış bulunamadı.</div>}
            </div>
          </section>

          {selectedSale && (
            <section id="eski-siparis-yazdir" className="panel p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Sipariş Detayı</h3>
                  <p className="text-sm text-slate-500">
                    {saleNumberOf(selectedSale)} · Kaynak: {sourceName(String(selectedSale.channel || ''))}
                  </p>
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedSale(null)}>Kapat</button>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <CustomerMetric label="Müşteri" value={String(selectedSale.customer_name ?? selectedSale.customerName ?? '-')} />
                <CustomerMetric label="Telefon" value={String(selectedSale.customer_phone ?? selectedSale.customerPhone ?? '-')} />
                <CustomerMetric label="Toplam" value={formatMoney(Number(selectedSale.grand_total ?? selectedSale.grandTotal ?? 0))} />
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <CustomerMetric label="Satış" value={formatMoney(Number(selectedSale.subtotal ?? 0))} />
                <CustomerMetric label="Ürün maliyeti" value={formatMoney(Number(selectedSale.productCostTotal ?? 0))} />
                <CustomerMetric label="Diğer sipariş maliyetleri" value={formatMoney(Number(selectedSale.otherOrderCosts ?? 0))} />
                <CustomerMetric label="Net satış getirisi" value={formatMoney(Number(selectedSale.netSalesReturn ?? 0))} />
                <CustomerMetric label="Kâr" value={formatMoney(Number(selectedSale.profit ?? 0))} />
                <CustomerMetric label="Kâr oranı" value={`%${Number(selectedSale.profitMargin ?? 0).toFixed(1)}`} />
              </div>
              <PrintActions
                sale={selectedSale}
                title="YAZDIR"
              />
            </section>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={18} />
              <h3 className="font-bold">Ödeme</h3>
            </div>
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={payment.clientKey}>
                  <select
                    className="field"
                    value={payment.method}
                    onChange={(e) => setPayments((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, method: e.target.value } : row))}
                  >
                    <option>Nakit</option>
                    <option>Kredi kartı</option>
                    <option>Havale</option>
                    <option>Veresiye</option>
                  </select>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    placeholder="Ödenen tutar"
                    value={payment.paidAmount}
                    onChange={(e) => setPayments((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, paidAmount: Number(e.target.value) } : row))}
                  />
                  <button
                    className="btn btn-secondary justify-center"
                    type="button"
                    disabled={payments.length === 1}
                    onClick={() => setPayments((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                    title="Ödeme satırını sil"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button
                className="btn btn-secondary w-full justify-center"
                type="button"
                onClick={() => setPayments((current) => [...current, { ...emptyPayment, clientKey: crypto.randomUUID() }])}
              >
                <Plus size={17} />
                Ödeme Satırı Ekle
              </button>
            </div>
          </section>

          <section className="panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <Truck size={18} />
              <h3 className="font-bold">Teslimat</h3>
            </div>
            <div className="space-y-3">
              <select className="field" value={delivery.method} onChange={(e) => setDelivery({ ...delivery, method: e.target.value })}>
                <option>Mağazadan teslim</option>
                <option>Kendi aracımızla teslim</option>
                <option>Kargo</option>
                <option>Kurye</option>
              </select>
              <input className="field" type="date" value={delivery.date} onChange={(e) => setDelivery({ ...delivery, date: e.target.value })} />
              <input className="field" placeholder="Teslimat görevlisi" value={delivery.staff} onChange={(e) => setDelivery({ ...delivery, staff: e.target.value })} />
              <textarea className="field min-h-16" placeholder="Teslimat notu" value={delivery.note} onChange={(e) => setDelivery({ ...delivery, note: e.target.value })} />
            </div>
          </section>

          <section className="panel p-5">
            <h3 className="mb-4 font-bold">Canlı Satış Özeti</h3>
            <SummaryRow label="Ara toplam" value={formatMoney(totals.gross)} />
            <SummaryRow label="İndirim" value={formatMoney(totals.discount)} />
            <SummaryRow label="Genel toplam" value={formatMoney(totals.total)} strong />
            <SummaryRow label="Ödenen" value={formatMoney(totals.total - totals.remaining)} />
            <SummaryRow label="Kalan" value={formatMoney(totals.remaining)} danger={totals.remaining > 0} />
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              Kaydetme sonrası sırayla satış numarası, finans kaydı, stok hareketi, teslimat kaydı ve gün sonu raporu bağlantısı oluşturulacak.
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}

function PrintActions({
  sale,
  title,
}: {
  sale: Record<string, any>;
  title: string;
}) {
  const pickup = sale.sale_type === 'STORE_SALE'
    || sale.saleType === 'STORE_SALE'
    || sale.delivery?.delivery_type === 'STORE_PICKUP'
    || sale.delivery?.deliveryType === 'STORE_PICKUP';
  return (
    <div className="rounded-md border-2 border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <Printer size={19} />
            {title}
          </div>
          <div className="mt-1 text-sm text-emerald-800">
            {saleNumberOf(sale)} · Kaynak: {sourceName(String(sale.channel || ''))}
          </div>
        </div>
        {pickup && <span className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Mağazadan teslim</span>}
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {pickup ? (
          <button className="btn btn-secondary justify-center" type="button" disabled title="Mağazadan teslim siparişinde adres etiketi kullanılmaz.">
            <MapPin size={17} />
            10×15 Adres Etiketi Yazdır
          </button>
        ) : (
          <a className="btn btn-secondary justify-center" href={`/sales/print/${sale.id}/address-label`} target="_blank" rel="noreferrer">
            <MapPin size={17} />
            10×15 Adres Etiketi Yazdır
          </a>
        )}
        <a className="btn btn-secondary justify-center" href={`/sales/print/${sale.id}/delivery-form`} target="_blank" rel="noreferrer">
          <Truck size={17} />
          A5 Teslimat Formu Yazdır
        </a>
        <a className="btn btn-primary justify-center" href={`/sales/print/${sale.id}/order-form`} target="_blank" rel="noreferrer">
          <FileText size={17} />
          A4 Sipariş Formu Yazdır
        </a>
      </div>
      <p className="mt-3 text-xs text-emerald-800">Butonlar yazdırmaya hazır belge önizlemesini yeni sekmede açar.</p>
    </div>
  );
}

function buildPrintPreview(data: Record<string, any>, type: PrintType) {
  const sale = data.sale ?? {};
  const company = data.company ?? {};
  const items = Array.isArray(sale.items) ? sale.items : [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const delivery = sale.delivery ?? {};
  const title = type === 'address-label'
    ? '10×15 Adres Etiketi'
    : type === 'delivery-form'
      ? 'A5 Teslimat Formu'
      : 'A4 Sipariş Formu';
  const pageSize = type === 'address-label' ? '100mm 150mm' : type === 'delivery-form' ? 'A5 portrait' : 'A4 portrait';
  const compact = type === 'address-label';
  const address = [
    sale.full_address ?? sale.fullAddress,
    sale.district,
    sale.city,
  ].filter(Boolean).map(escapeHtml).join(' / ');
  const itemRows = items.map((item: Record<string, any>) => `
    <tr>
      <td>${escapeHtml(item.product_name_snapshot ?? item.productNameSnapshot ?? '-')}</td>
      <td>${escapeHtml(item.barcode ?? '-')}</td>
      <td class="number">${escapeHtml(item.quantity ?? 0)}</td>
      <td class="number">${formatPrintMoney(item.unit_price ?? item.unitPrice ?? 0)}</td>
      <td class="number">${formatPrintMoney(item.line_total ?? item.lineTotal ?? 0)}</td>
    </tr>`).join('');
  const paymentRows = payments.map((payment: Record<string, any>) => `
    <tr><td>${escapeHtml(payment.method ?? '-')}</td><td class="number">${formatPrintMoney(payment.amount ?? 0)}</td></tr>`).join('');

  const addressLabel = `
    <main class="label">
      <div class="brand">${escapeHtml(company.name ?? 'Erhan Flowers')}</div>
      <div class="document-title">${title}</div>
      <div class="label-block">
        <span>ALICI</span>
        <strong>${escapeHtml(sale.customer_name ?? sale.customerName ?? '-')}</strong>
        <strong>${escapeHtml(sale.customer_phone ?? sale.customerPhone ?? '-')}</strong>
      </div>
      <div class="address">${address || 'Adres bilgisi yok'}</div>
      ${sale.address_title || sale.addressTitle ? `<div class="tag">${escapeHtml(sale.address_title ?? sale.addressTitle)}</div>` : ''}
      ${sale.delivery_note || sale.deliveryNote ? `<div class="note"><b>Teslimat notu:</b> ${escapeHtml(sale.delivery_note ?? sale.deliveryNote)}</div>` : ''}
      <div class="sale-number">${escapeHtml(saleNumberOf(sale))}</div>
    </main>`;

  const formBody = `
    <header>
      <div><h1>${escapeHtml(company.name ?? 'Erhan Flowers')}</h1><p>${escapeHtml(company.website ?? '')} · ${escapeHtml(company.phone ?? '')}</p></div>
      <div class="doc-meta"><b>${title}</b><span>${escapeHtml(saleNumberOf(sale))}</span><span>${escapeHtml(formatDate(sale.created_at ?? sale.createdAt))}</span></div>
    </header>
    <section class="info-grid">
      <div><span>Müşteri</span><b>${escapeHtml(sale.customer_name ?? sale.customerName ?? '-')}</b></div>
      <div><span>Telefon</span><b>${escapeHtml(sale.customer_phone ?? sale.customerPhone ?? '-')}</b></div>
      <div><span>Kaynak</span><b>${escapeHtml(sourceName(String(sale.channel || '')))}</b></div>
      <div class="wide"><span>Adres</span><b>${address || 'Mağazadan teslim / adres yok'}</b></div>
      <div class="wide"><span>Teslimat Notu</span><b>${escapeHtml(sale.delivery_note ?? sale.deliveryNote ?? delivery.note ?? '-')}</b></div>
    </section>
    <h2>Ürünler</h2>
    <table>
      <thead><tr><th>Ürün</th><th>Barkod</th><th class="number">Adet</th><th class="number">Birim</th><th class="number">Toplam</th></tr></thead>
      <tbody>${itemRows || '<tr><td colspan="5">Ürün kaydı yok</td></tr>'}</tbody>
    </table>
    <div class="bottom-grid">
      <div>
        <h2>Teslimat</h2>
        <p><b>Yöntem:</b> ${escapeHtml(delivery.delivery_type ?? delivery.deliveryType ?? sale.sale_type ?? '-')}</p>
        <p><b>Durum:</b> ${escapeHtml(delivery.status ?? '-')}</p>
      </div>
      <div>
        <h2>Ödeme</h2>
        <table><tbody>${paymentRows || '<tr><td>Ödeme kaydı yok</td><td></td></tr>'}</tbody></table>
        <div class="total">Genel Toplam <b>${formatPrintMoney(sale.grand_total ?? sale.grandTotal ?? 0)}</b></div>
      </div>
    </div>`;

  return `<!doctype html>
  <html lang="tr">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)} - ${escapeHtml(saleNumberOf(sale))}</title>
      <style>
        @page { size: ${pageSize}; margin: ${compact ? '7mm' : '12mm'}; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #17211b; background: #eef2ef; font-family: Arial, sans-serif; }
        .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 8px; padding: 12px; background: #17211b; }
        .toolbar button { border: 0; border-radius: 5px; padding: 10px 18px; cursor: pointer; font-weight: 700; }
        .toolbar .print { color: white; background: #18794e; }
        .sheet { width: ${compact ? '100mm' : type === 'delivery-form' ? '148mm' : '210mm'}; min-height: ${compact ? '150mm' : type === 'delivery-form' ? '210mm' : '297mm'}; margin: 24px auto; padding: ${compact ? '8mm' : '14mm'}; background: white; box-shadow: 0 8px 28px rgba(0,0,0,.16); }
        header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #18794e; padding-bottom: 14px; }
        h1 { margin: 0; font-size: 25px; } h2 { margin: 18px 0 8px; font-size: 15px; }
        p { margin: 4px 0; } .doc-meta { display: grid; gap: 3px; text-align: right; font-size: 13px; }
        .info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 16px; }
        .info-grid div { min-height: 55px; border: 1px solid #d8e0db; padding: 8px; }
        .info-grid span { display: block; margin-bottom: 5px; color: #647067; font-size: 11px; } .info-grid .wide { grid-column: 1 / -1; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; } th, td { border: 1px solid #d8e0db; padding: 7px; } th { background: #f2f6f3; } .number { text-align: right; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; } .total { margin-top: 8px; text-align: right; font-size: 15px; }
        .label { display: flex; min-height: 130mm; flex-direction: column; } .brand { color: #18794e; font-size: 24px; font-weight: 800; }
        .document-title { margin: 4px 0 22px; color: #647067; font-size: 12px; text-transform: uppercase; }
        .label-block { display: grid; gap: 7px; border-top: 2px solid #17211b; padding-top: 16px; font-size: 19px; }
        .label-block span { font-size: 11px; } .address { margin-top: 18px; font-size: 17px; font-weight: 700; line-height: 1.45; }
        .tag { align-self: flex-start; margin-top: 12px; border: 1px solid #17211b; padding: 5px 8px; font-size: 12px; }
        .note { margin-top: 16px; border-top: 1px solid #d8e0db; padding-top: 12px; font-size: 12px; }
        .sale-number { margin-top: auto; border-top: 2px solid #17211b; padding-top: 12px; text-align: right; font-size: 18px; font-weight: 800; }
        @media print {
          body { background: white; }
          .toolbar { display: none; }
          .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <button class="print" onclick="window.print()">Yazdır / PDF Kaydet</button>
        <button onclick="window.close()">Kapat</button>
      </div>
      <div class="sheet">${compact ? addressLabel : formBody}</div>
    </body>
  </html>`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatPrintMoney(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function sourceName(value: string) {
  return {
    STORE: 'Mağaza',
    PHONE: 'Telefon',
    WHATSAPP: 'WhatsApp',
    INSTAGRAM: 'Instagram',
    WEBSITE: 'Web Sitesi',
  }[value] ?? value ?? '-';
}

function saleNumberOf(sale: Record<string, any>) {
  return String(sale.sale_number ?? sale.saleNumber ?? '-');
}

function SummaryRow({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-line py-2 ${strong ? 'font-bold' : 'text-sm'}`}>
      <span className="text-slate-600">{label}</span>
      <span className={danger ? 'text-red-600' : 'text-ink'}>{value}</span>
    </div>
  );
}

function CustomerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-ink">{value}</div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}
