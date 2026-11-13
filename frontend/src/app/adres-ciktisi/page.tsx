'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardPaste, FileText, Plus, Printer, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

const COMPANY_LOGO = '/logo-erhan-flowers.png';
const SENDER_STORAGE_KEY = 'adres-ciktisi-gonderen';

type LabelSize = '100x150' | 'A5' | 'A4';
type PaymentType = 'PESIN' | 'ODEMELI';

type Item = { name: string; qty: string; price: string; productId?: number; imageUrl?: string };
type ProductHit = { id: number; name: string; imageUrl?: string | null; salePrice?: number | null; trendyolSalePrice?: number | null };

type Sender = {
  name: string;
  phone: string;
  address: string;
};

const DEFAULT_SENDER: Sender = {
  name: 'Erhan Flowers',
  phone: '0544 654 62 20',
  address: 'Sarılar Mahallesi Cumhuriyet Caddesi No: 52, Manavgat / Antalya',
};

const SIZE_INFO: Record<LabelSize, { label: string; page: string; width: string; height: string }> = {
  '100x150': { label: '10x15 Kargo Etiketi', page: '100mm 150mm', width: '100mm', height: '150mm' },
  A5: { label: 'A5', page: 'A5', width: '148mm', height: '210mm' },
  A4: { label: 'A4', page: 'A4', width: '210mm', height: '297mm' },
};

type CustomerHit = { id: number; displayName: string; phone?: string | null; city?: string | null; saleCount?: number };
type CustomerDetail = {
  id: number; firstName?: string; lastName?: string | null; displayName?: string; phone?: string | null;
  email?: string | null; nationalId?: string | null;
  addresses?: Array<{ id: number; fullAddress: string; city?: string | null; district?: string | null; isDefault?: boolean }>;
};
type Msg = { type: 'ok' | 'err' | 'info'; text: string; link?: { href: string; label: string } } | null;

const SALE_CHANNELS = [
  { key: 'PHONE', label: 'Telefon' },
  { key: 'WHATSAPP', label: 'WhatsApp' },
  { key: 'INSTAGRAM', label: 'Instagram' },
  { key: 'STORE', label: 'Dükkan' },
  { key: 'OTHER', label: 'Diğer' },
];
const PAY_METHODS = [
  { key: 'CASH', label: 'Nakit' },
  { key: 'CREDIT_CARD', label: 'Kredi Kartı' },
  { key: 'BANK_TRANSFER', label: 'Havale / EFT' },
];

const PROVINCES = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop','Şırnak','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'];

const lowerTr = (v: string) => v.toLocaleLowerCase('tr-TR');
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const titleTr = (v: string) => v.trim().split(/\s+/).map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ');

function formatPhone(raw: string) {
  let d = onlyDigits(raw);
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.length === 10) d = `0${d}`;
  if (d.length !== 11) return raw.trim();
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/** WhatsApp/Instagram'dan kopyalanan serbest metni ad, telefon, TC, e-posta, adres, il, ilçe olarak ayırır. */
function parsePasted(text: string) {
  let rest = text.replace(/\r/g, '');
  const out: { name?: string; phone?: string; nationalId?: string; email?: string; address?: string; city?: string; district?: string } = {};
  const take = (re: RegExp) => {
    const m = rest.match(re);
    if (!m) return null;
    rest = rest.replace(m[0], ' ');
    return m;
  };
  const email = take(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (email) out.email = email[0];
  const phone = take(/(?:\+?90[\s-]*)?\(?0?5\d{2}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/);
  if (phone) out.phone = formatPhone(phone[0]);
  const tc = take(/\b[1-9]\d{10}\b/);
  if (tc) out.nationalId = tc[0];
  // Etiketleri temizle ("Ad Soyad:", "Adres:", "Tel:" ...)
  rest = rest.replace(/\b(ad\s*soyad|isim|alıcı|adres|açık adres|tel(efon)?|gsm|cep|tc( kimlik)?( no)?|il|ilçe|e-?posta|mail)\s*[:：]/gi, '\n');

  const lines = rest.split('\n').map((l) => l.replace(/\s+/g, ' ').replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')).filter(Boolean);
  // İl / ilçe: "Manavgat / Antalya", "Manavgat Antalya" veya tek başına il adı
  // Not: JS'de \\b Türkçe harfleri (İ, Ş...) tanımaz; harf sınırı lookaround ile kontrol edilir
  const P = PROVINCES.join('|');
  const provinceRe = new RegExp(`(?:(\\p{L}+)\\s*[/,-]?\\s*)?(?<!\\p{L})(${P})(?!\\p{L})(?!.*(?<!\\p{L})(?:${P})(?!\\p{L}))`, 'iu');
  for (let i = lines.length - 1; i >= 0 && !out.city; i--) {
    const m = lines[i].match(provinceRe);
    if (!m) continue;
    out.city = PROVINCES.find((p) => lowerTr(p) === lowerTr(m[2])) ?? titleTr(m[2]);
    const before = m[1] && !/^(mah|mahallesi|cad|caddesi|sok|sokak|no|sk)$/i.test(m[1]) ? m[1] : '';
    if (before && lowerTr(before) !== lowerTr(out.city)) out.district = titleTr(before);
    const remaining = lines[i].replace(m[0], ' ').replace(/[\s/,-]+$/g, '').trim();
    if (remaining) lines[i] = remaining; else lines.splice(i, 1);
  }
  // Ad: rakam içermeyen, kısa, adres kelimesi geçmeyen ilk satır
  const addrWord = /(mah|cad|sok|sk\.|no[:\s.]|daire|kat|apt|blok|bulvar|bul\.|site|köy|\d)/i;
  const nameIdx = lines.findIndex((l) => !addrWord.test(l) && l.split(' ').length <= 4);
  if (nameIdx >= 0 && lines.length > 1) out.name = titleTr(lines.splice(nameIdx, 1)[0]);
  else if (lines.length === 1) {
    // Tek satır: baştaki iki kelime ad soyad, devamı adres
    const m = lines[0].match(/^(\p{L}+\s+\p{L}+)\s+(.+)$/u);
    if (m && addrWord.test(m[2]) && !addrWord.test(m[1])) { out.name = titleTr(m[1]); lines[0] = m[2]; }
  }
  if (lines.length) out.address = lines.join(', ');
  return out;
}

function todayText() {
  return new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function makeRef() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `EF-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export default function AddressPrintPage() {
  const [sender, setSender] = useState<Sender>(DEFAULT_SENDER);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [items, setItems] = useState<Item[]>([{ name: '', qty: '1', price: '' }]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState('PHONE');
  const [payMethod, setPayMethod] = useState('CASH');
  const [pasteText, setPasteText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [busy, setBusy] = useState<'' | 'save' | 'print' | 'invoice'>('');
  const [msg, setMsg] = useState<Msg>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [note, setNote] = useState('');
  const [cargo, setCargo] = useState('');
  const [payment, setPayment] = useState<PaymentType>('PESIN');
  const [codAmount, setCodAmount] = useState('');
  const [fragile, setFragile] = useState(true);
  const [size, setSize] = useState<LabelSize>('100x150');
  const [copies, setCopies] = useState(1);
  const [refCode, setRefCode] = useState('');
  const [date, setDate] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<Record<number, ProductHit[]>>({});
  const [activeProductSearch, setActiveProductSearch] = useState<number | null>(null);
  const productSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<{ role?: string }>('/auth/me').then((u) => setIsOwner(u?.role === 'OWNER')).catch(() => null);
  }, []);

  // Müşteri arama (isim veya telefon)
  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) { setHits([]); return; }
    const t = setTimeout(() => {
      api<CustomerHit[]>(`/sales/customers/search?q=${encodeURIComponent(q)}`)
        .then((rows) => setHits(Array.isArray(rows) ? rows : []))
        .catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    setRefCode(makeRef());
    setDate(todayText());
    try {
      const saved = localStorage.getItem(SENDER_STORAGE_KEY);
      if (saved) setSender({ ...DEFAULT_SENDER, ...JSON.parse(saved) });
    } catch {
      // yoksay
    }
  }, []);

  function updateSender(patch: Partial<Sender>) {
    setSender((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(SENDER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // yoksay
      }
      return next;
    });
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const searchProducts = useCallback((index: number, q: string) => {
    if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
    if (q.trim().length < 2) { setProductSuggestions((s) => ({ ...s, [index]: [] })); return; }
    productSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api<{ items?: ProductHit[]; results?: ProductHit[] } | ProductHit[]>(`/sales/products/search?q=${encodeURIComponent(q)}&limit=6`);
        const list: ProductHit[] = Array.isArray(res) ? res : (res.items ?? res.results ?? []);
        setProductSuggestions((s) => ({ ...s, [index]: list }));
        setActiveProductSearch(index);
      } catch { /* silent */ }
    }, 280);
  }, []);

  function pickProduct(index: number, hit: ProductHit) {
    const price = hit.salePrice ?? hit.trendyolSalePrice ?? 0;
    updateItem(index, {
      name: hit.name,
      productId: hit.id,
      imageUrl: hit.imageUrl ?? undefined,
      price: price > 0 ? String(price) : items[index].price,
    });
    setProductSuggestions((s) => ({ ...s, [index]: [] }));
    setActiveProductSearch(null);
  }

  async function pickCustomer(hit: CustomerHit) {
    setHits([]);
    setSearchQ('');
    try {
      const c = await api<CustomerDetail>(`/sales/customers/${hit.id}`);
      setCustomerId(c.id);
      setName(c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' '));
      setPhone(c.phone ? formatPhone(c.phone) : '');
      setNationalId(c.nationalId ?? '');
      setEmail(c.email ?? '');
      const a = c.addresses?.[0];
      setAddress(a?.fullAddress ?? '');
      setDistrict(a?.district ?? '');
      setCity(a?.city ?? '');
      setMsg({ type: 'info', text: `Kayıtlı müşteri yüklendi: ${c.displayName ?? hit.displayName}` });
    } catch {
      setMsg({ type: 'err', text: 'Müşteri bilgisi alınamadı.' });
    }
  }

  function applyPaste() {
    const p = parsePasted(pasteText);
    if (p.name) setName(p.name);
    if (p.phone) setPhone(p.phone);
    if (p.nationalId) setNationalId(p.nationalId);
    if (p.email) setEmail(p.email);
    if (p.address) setAddress(p.address);
    if (p.city) setCity(p.city);
    if (p.district) setDistrict(p.district);
    setCustomerId(null);
    setPasteText('');
    setMsg({ type: 'info', text: 'Bilgiler ayrıştırıldı — kontrol edip düzeltebilirsiniz.' });
  }

  function validate(forInvoice: boolean): string | null {
    if (!name.trim()) return 'Ad soyad zorunlu.';
    if (onlyDigits(phone).length < 10) return 'Kayıt için geçerli bir telefon zorunlu.';
    if (!address.trim()) return 'Açık adres zorunlu.';
    if (nationalId && onlyDigits(nationalId).length !== 11) return 'TC kimlik no 11 haneli olmalı (bilinmiyorsa boş bırakın).';
    if (forInvoice) {
      if (!city.trim() || !district.trim()) return 'Fatura için il ve ilçe zorunlu.';
      if (!filledItems.length) return 'Fatura için en az bir ürün girin.';
      const bad = filledItems.find((i) => !(Number(i.price.replace(',', '.')) > 0));
      if (bad) return `"${bad.name}" için birim fiyat girin.`;
    }
    return null;
  }

  function customerPayload() {
    const { firstName, lastName } = splitName(name);
    return {
      customerType: 'INDIVIDUAL',
      firstName,
      lastName,
      phone: phone.trim(),
      email: email.trim() || undefined,
      nationalId: onlyDigits(nationalId) || undefined,
      source: channel,
    };
  }

  function addressPayload() {
    return {
      title: 'Teslimat',
      recipientName: name.trim(),
      recipientPhone: phone.trim(),
      fullAddress: address.trim(),
      city: city.trim(),
      district: district.trim(),
    };
  }

  async function saveCustomer(silent = false) {
    const err = validate(false);
    if (err) { if (!silent) setMsg({ type: 'err', text: err }); return false; }
    try {
      const saved = await api<{ id: number; customerCode?: string }>('/sales/customers', {
        method: 'POST',
        json: { ...customerPayload(), address: addressPayload() },
      });
      setCustomerId(saved.id);
      if (!silent) setMsg({ type: 'ok', text: `Müşteri kaydedildi${saved.customerCode ? ` (${saved.customerCode})` : ''}.` });
      return true;
    } catch (e) {
      setMsg({ type: 'err', text: `Kayıt yapılamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}` });
      return false;
    }
  }

  async function handleSave() {
    setBusy('save');
    await saveCustomer(false);
    setBusy('');
  }

  async function handlePrint() {
    setBusy('print');
    if (onlyDigits(phone).length >= 10) {
      await saveCustomer(true);
    }

    // Ürün varsa personel ekranına sipariş olarak düş (CONFIRMED)
    if (filledItems.length > 0 && name.trim() && address.trim()) {
      try {
        const sale = await api<{ id: number; saleNumber?: string }>('/sales', {
          method: 'POST',
          json: {
            clientRequestId: `adres-print-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            channel,
            saleType: 'STORE_SALE',
            delivery: {
              deliveryType: cargo.toLowerCase().includes('kurye') || cargo.toLowerCase().includes('elden') ? 'COURIER' : 'CARGO',
              note: [note.trim(), cargo.trim() ? `Kargo: ${cargo.trim()}` : ''].filter(Boolean).join(' | ') || undefined,
            },
            payments: [{ method: payMethod, amount: invoiceTotal || 0, clientKey: `pay-print-${Date.now()}` }],
            customer: customerPayload(),
            address: addressPayload(),
            items: filledItems.map((i) => ({
              productName: i.name.trim(),
              quantity: Number(i.qty) || 1,
              unitPrice: Number(i.price.replace(',', '.')) || 0,
              discountAmount: 0,
              stockFulfillmentType: 'READY_STOCK',
              ...(i.productId ? { productId: i.productId } : {}),
            })),
            customerNote: note.trim() || undefined,
          },
        });
        const saleNo = sale.saleNumber ?? `#${sale.id}`;
        if (sale.saleNumber) setRefCode(sale.saleNumber);
        setMsg({ type: 'ok', text: `Sipariş ${saleNo} personel ekranına düştü. Çıktı hazırlanıyor.` });
      } catch {
        setMsg({ type: 'info', text: 'Müşteri kaydedildi. Sipariş oluşturulamadı — çıktı yazdırılıyor.' });
      }
    } else {
      setMsg({ type: 'ok', text: 'Çıktı hazırlanıyor.' });
    }

    setBusy('');
    setTimeout(() => window.print(), 100);
  }

  async function handleInvoice() {
    const err = validate(true);
    if (err) { setMsg({ type: 'err', text: err }); return; }
    const total = filledItems.reduce((sum, i) => sum + (Number(i.qty) || 1) * Number(i.price.replace(',', '.')), 0);
    const totalText = total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    if (!confirm(`${name} adına ${totalText} tutarında satış kaydedilecek${isOwner ? ' ve e-Arşiv fatura kesilecek' : ''}. Onaylıyor musunuz?`)) return;
    setBusy('invoice');
    setMsg(null);
    try {
      const sale = await api<{ id: number; saleNumber?: string }>('/sales', {
        method: 'POST',
        json: {
          clientRequestId: `adres-ciktisi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          channel,
          saleType: 'STORE_SALE',
          delivery: { deliveryType: cargo.toLowerCase().includes('kurye') || cargo.toLowerCase().includes('elden') ? 'COURIER' : 'CARGO', note: note.trim() || undefined },
          payments: [{ method: payMethod, amount: total, clientKey: `pay-${Date.now()}` }],
          customer: customerPayload(),
          address: addressPayload(),
          items: filledItems.map((i) => ({
            productName: i.name.trim(),
            quantity: Number(i.qty) || 1,
            unitPrice: Number(i.price.replace(',', '.')),
            discountAmount: 0,
            // Serbest ürün: stok kartı bağlı değil, stok düşmez
            stockFulfillmentType: 'READY_STOCK',
          })),
          customerNote: note.trim() || undefined,
        },
      });
      await api(`/sales/${sale.id}/complete`, { method: 'POST', json: { force: true } });
      const saleNo = sale.saleNumber ?? `#${sale.id}`;
      if (sale.saleNumber) setRefCode(sale.saleNumber);

      if (!isOwner) {
        setMsg({ type: 'ok', text: `Satış ${saleNo} kaydedildi. Fatura, e-Dönüşüm listesine düştü (yönetici keser).` });
        return;
      }
      const res = await api<{ issued: number; failed: number }>('/e-invoices/issue', {
        method: 'POST',
        json: { items: [{ sourceType: 'RETAIL_SALE', sourceId: sale.id }] },
      });
      if (res.issued > 0) {
        setMsg({ type: 'ok', text: `✅ Satış ${saleNo} kaydedildi ve e-Arşiv fatura kesildi.`, link: { href: '/e-donusum', label: 'Faturayı gör' } });
      } else {
        setMsg({ type: 'err', text: `Satış ${saleNo} kaydedildi ama fatura kesilemedi. Hata detayı ve tekrar deneme e-Dönüşüm sayfasında.`, link: { href: '/e-donusum', label: 'e-Dönüşüm’e git' } });
      }
    } catch (e) {
      setMsg({ type: 'err', text: `İşlem başarısız: ${e instanceof Error ? e.message : 'bilinmeyen hata'}` });
    } finally {
      setBusy('');
    }
  }

  function resetForm() {
    setCustomerId(null);
    setNationalId('');
    setEmail('');
    setMsg(null);
    setName('');
    setPhone('');
    setAddress('');
    setDistrict('');
    setCity('');
    setItems([{ name: '', qty: '1', price: '' }]);
    setNote('');
    setCargo('');
    setPayment('PESIN');
    setCodAmount('');
    setRefCode(makeRef());
    setDate(todayText());
  }

  const filledItems = useMemo(() => items.filter((item) => item.name.trim()), [items]);
  const totalQty = filledItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const info = SIZE_INFO[size];
  const canPrint = name.trim() && address.trim();
  const invoiceTotal = filledItems.reduce((sum, i) => sum + (Number(i.qty) || 1) * (Number(i.price.replace(',', '.')) || 0), 0);

  const label = (
    <ShippingLabel
      sender={sender}
      name={name}
      phone={phone}
      address={address}
      district={district}
      city={city}
      items={filledItems}
      totalQty={totalQty}
      note={note}
      cargo={cargo}
      payment={payment}
      codAmount={codAmount}
      fragile={fragile}
      refCode={refCode}
      date={date}
      size={size}
    />
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="no-print sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-slate-900 px-4 py-3">
        <Link href="/orders" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-800">
          <ArrowLeft size={17} />
          Geri
        </Link>
        <h1 className="text-base font-bold text-white">Bireysel Müşteri · Adres Çıktısı · Fatura</h1>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={resetForm} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white">
            <RotateCcw size={16} />
            Yeni
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={!!busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Save size={16} />
            {busy === 'save' ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={!canPrint || !!busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Printer size={17} />
            Kaydet + Yazdır
          </button>
        </div>
      </div>

      <div className="no-print mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[minmax(0,460px)_1fr]">
        <section className="space-y-4">
          {msg && (
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : msg.type === 'err' ? 'border-red-200 bg-red-50 text-red-700' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
              {msg.text}
              {msg.link && <Link href={msg.link.href} className="ml-2 font-bold underline">{msg.link.label}</Link>}
            </div>
          )}

          <Card title="Kayıtlı Müşteri Bul">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input" style={{ paddingLeft: 32 }} value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="İsim veya telefon yazın…" />
              {hits.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {hits.map((h) => (
                    <button key={h.id} type="button" onClick={() => void pickCustomer(h)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-emerald-50">
                      <div className="font-semibold">{h.displayName}</div>
                      <div className="text-xs text-slate-500">{[h.phone, h.city, h.saleCount ? `${h.saleCount} satış` : ''].filter(Boolean).join(' · ')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {customerId && <div className="text-xs font-semibold text-emerald-700">✓ Kayıtlı müşteri seçili — değişiklikler kaydedince güncellenir.</div>}
          </Card>

          <Card title="Hızlı Yapıştır">
            <textarea className="input min-h-[84px]" value={pasteText} onChange={(e) => setPasteText(e.target.value)}
              placeholder={'WhatsApp / Instagram mesajını buraya yapıştırın:\nAyşe Yılmaz\n0532 123 45 67\nAtatürk Mah. 123 Sok. No:5 D:3\nManavgat / Antalya'} />
            <button type="button" onClick={applyPaste} disabled={!pasteText.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <ClipboardPaste size={15} /> Ayır ve Doldur
            </button>
          </Card>

          <Card title="Alıcı">
            <Field label="Ad Soyad *">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Müşteri adı" autoFocus />
            </Field>
            <Field label="Telefon (kayıt için zorunlu)">
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhone((p) => (p ? formatPhone(p) : p))} placeholder="05xx xxx xx xx" inputMode="tel" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TC Kimlik No (fatura, isteğe bağlı)">
                <input className="input" value={nationalId} onChange={(e) => setNationalId(onlyDigits(e.target.value).slice(0, 11))} inputMode="numeric" placeholder="11 hane" />
              </Field>
              <Field label="E-posta (isteğe bağlı)">
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="fatura e-postası" />
              </Field>
            </div>
            <Field label="Açık Adres *">
              <textarea className="input min-h-[84px]" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mahalle, cadde/sokak, no, daire" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="İlçe">
                <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </Field>
              <Field label="İl">
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card
            title="Ürünler"
            action={
              <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700" onClick={() => setItems((c) => [...c, { name: '', qty: '1', price: '' }])}>
                <Plus size={15} /> Ürün ekle
              </button>
            }
          >
            {items.map((item, index) => (
              <div className="flex items-start gap-2" key={index}>
                <div className="relative" style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-1">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="h-8 w-8 flex-none rounded object-cover" />
                    )}
                    <input
                      className="input w-full"
                      value={item.name}
                      onChange={(e) => {
                        updateItem(index, { name: e.target.value, productId: undefined, imageUrl: undefined });
                        searchProducts(index, e.target.value);
                      }}
                      onFocus={() => { if ((productSuggestions[index]?.length ?? 0) > 0) setActiveProductSearch(index); }}
                      onBlur={() => setTimeout(() => setActiveProductSearch(null), 200)}
                      placeholder={`Ürün ${index + 1}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { setActiveProductSearch(null); setProductSuggestions((s) => ({ ...s, [index]: [] })); }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setItems((c) => [...c, { name: '', qty: '1', price: '' }]);
                        }
                      }}
                    />
                  </div>
                  {activeProductSearch === index && (productSuggestions[index]?.length ?? 0) > 0 && (
                    <ul className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                      {productSuggestions[index].map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50"
                            onMouseDown={() => pickProduct(index, hit)}
                          >
                            {hit.imageUrl && <img src={hit.imageUrl} alt="" className="h-8 w-8 flex-none rounded object-cover" />}
                            <span className="flex-1 truncate">{hit.name}</span>
                            {(hit.salePrice ?? hit.trendyolSalePrice ?? 0) > 0 && (
                              <span className="flex-none text-slate-500">₺{hit.salePrice ?? hit.trendyolSalePrice}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <input className="input text-center" style={{ width: 56, flex: 'none' }} value={item.qty} onChange={(e) => updateItem(index, { qty: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" title="Adet" />
                <input className="input text-right" style={{ width: 88, flex: 'none' }} value={item.price} onChange={(e) => updateItem(index, { price: e.target.value.replace(/[^0-9.,]/g, '') })} inputMode="decimal" placeholder="₺ fiyat" title="Birim fiyat (KDV dahil) — fatura için" />
                <button
                  type="button"
                  aria-label="Ürünü sil"
                  className="mt-1 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setItems((c) => (c.length > 1 ? c.filter((_, i) => i !== index) : [{ name: '', qty: '1', price: '' }]))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </Card>

          <Card title="Gönderi">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kargo Firması">
                <input className="input" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Yurtiçi, Aras..." list="cargo-list" />
                <datalist id="cargo-list">
                  {['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'Sürat Kargo', 'PTT Kargo', 'Kurye / Elden'].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Ödeme">
                <select className="input" value={payment} onChange={(e) => setPayment(e.target.value as PaymentType)}>
                  <option value="PESIN">Gönderici Ödemeli</option>
                  <option value="ODEMELI">Alıcı Ödemeli</option>
                </select>
              </Field>
            </div>
            {payment === 'ODEMELI' && (
              <Field label="Tahsil Edilecek Tutar (₺)">
                <input className="input" value={codAmount} onChange={(e) => setCodAmount(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </Field>
            )}
            <Field label="Not">
              <textarea className="input min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Teslimat notu (isteğe bağlı)" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={fragile} onChange={(e) => setFragile(e.target.checked)} />
              &quot;Kırılacak eşya / Dikkatli taşıyın&quot; uyarısı ekle
            </label>
          </Card>

          <Card title="Satış + e-Arşiv Fatura">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Satış Kanalı">
                <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {SALE_CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Ödeme Şekli">
                <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {PAY_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Toplam (KDV dahil)</span>
              <b>{invoiceTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</b>
            </div>
            <button type="button" onClick={() => void handleInvoice()} disabled={!!busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <FileText size={16} />
              {busy === 'invoice' ? 'İşleniyor…' : isOwner ? 'Satışı Kaydet + Fatura Kes' : 'Satışı Kaydet (Faturaya Gönder)'}
            </button>
            <p className="text-xs text-slate-500">
              Müşteri ve adres bu bilgilerle kaydedilir, satış oluşturulur ve e-Arşiv fatura bu ad/TC/adresle kesilir. Ürünler serbest yazıldığı için stok düşmez — stoktan satış için Hızlı Satış’ı kullanın.
            </p>
          </Card>

          <Card title="Çıktı">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kağıt Boyutu">
                <select className="input" value={size} onChange={(e) => setSize(e.target.value as LabelSize)}>
                  {(Object.keys(SIZE_INFO) as LabelSize[]).map((key) => (
                    <option key={key} value={key}>{SIZE_INFO[key].label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kopya">
                <input className="input" type="number" min={1} max={20} value={copies} onChange={(e) => setCopies(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
              </Field>
            </div>
          </Card>

          <Card title="Gönderen (kaydedilir)">
            <Field label="Firma">
              <input className="input" value={sender.name} onChange={(e) => updateSender({ name: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <input className="input" value={sender.phone} onChange={(e) => updateSender({ phone: e.target.value })} />
            </Field>
            <Field label="Adres">
              <textarea className="input min-h-[60px]" value={sender.address} onChange={(e) => updateSender({ address: e.target.value })} />
            </Field>
          </Card>
        </section>

        <section className="flex flex-col items-center">
          <div className="mb-3 text-sm font-semibold text-slate-500">Önizleme · {info.label}</div>
          <div className="label-sheet bg-white shadow-xl" style={{ width: info.width, minHeight: info.height }}>
            {label}
          </div>
        </section>
      </div>

      <div className="print-only">
        {Array.from({ length: copies }).map((_, i) => (
          <div className="label-sheet print-page" key={i}>
            {label}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #059669;
          box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.15);
        }
        .print-only {
          display: none;
        }
        .label-sheet {
          box-sizing: border-box;
          display: flex;
        }
        @media print {
          @page {
            size: ${info.page};
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          main {
            background: white !important;
            min-height: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block;
          }
          .print-page {
            width: ${info.width};
            height: ${info.height};
            overflow: hidden;
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </main>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h2>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

type LabelProps = {
  sender: Sender;
  name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  items: Item[];
  totalQty: number;
  note: string;
  cargo: string;
  payment: PaymentType;
  codAmount: string;
  fragile: boolean;
  refCode: string;
  date: string;
  size: LabelSize;
};

function ShippingLabel(props: LabelProps) {
  const { sender, name, phone, address, district, city, items, totalQty, note, cargo, payment, codAmount, fragile, refCode, date, size } = props;
  const scale = size === 'A4' ? 1.9 : size === 'A5' ? 1.4 : 1;
  const mm = (n: number) => `${n * scale}mm`;
  const location = [district, city].filter((v) => v.trim()).join(' / ');
  const maxItems = size === '100x150' ? 6 : 12;
  const shownItems = items.slice(0, maxItems);
  const hiddenCount = items.length - shownItems.length;
  const border = `${mm(0.4)} solid #1e293b`;
  const borderThin = `${mm(0.25)} solid #cbd5e1`;

  return (
    /* Dış çerçeve */
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#0f172a',
        border,
        borderRadius: mm(2),
        overflow: 'hidden',
      }}
    >
      {/* Üst bant: logo + gönderen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: mm(3), borderBottom: border, padding: `${mm(2)} ${mm(3)}`, background: '#f8fafc' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COMPANY_LOGO} alt="" style={{ width: mm(14), height: mm(14), objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, borderLeft: borderThin, paddingLeft: mm(3) }}>
          <div style={{ fontSize: mm(2.1), fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: mm(0.5) }}>GÖNDEREN</div>
          <div style={{ fontSize: mm(3.8), fontWeight: 900, lineHeight: 1.1 }}>{sender.name || '-'}</div>
          <div style={{ fontSize: mm(2.3), lineHeight: 1.4, color: '#475569', marginTop: mm(0.5) }}>{sender.address}</div>
          <div style={{ fontSize: mm(2.5), fontWeight: 700, color: '#334155', marginTop: mm(0.3) }}>Tel: {sender.phone}</div>
        </div>
      </div>

      {/* Alıcı başlık */}
      <div style={{ background: '#1e293b', color: 'white', fontSize: mm(2.6), fontWeight: 900, letterSpacing: '0.15em', padding: `${mm(1)} ${mm(3)}` }}>
        ALICI BİLGİLERİ
      </div>

      {/* Alıcı içerik */}
      <div style={{ padding: `${mm(2.5)} ${mm(3)}`, borderBottom: border }}>
        <div style={{ fontSize: mm(5.8), fontWeight: 900, lineHeight: 1.1, textTransform: 'uppercase', wordBreak: 'break-word' }}>{name || 'Ad Soyad'}</div>
        {phone && <div style={{ fontSize: mm(4), fontWeight: 800, marginTop: mm(1), color: '#1e293b' }}>📞 {phone}</div>}
        <div style={{ fontSize: mm(3.4), fontWeight: 600, lineHeight: 1.4, marginTop: mm(1.5), whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#334155' }}>
          {address || 'Açık adres'}
        </div>
        {location && (
          <div style={{ fontSize: mm(4.8), fontWeight: 900, marginTop: mm(1.5), textTransform: 'uppercase', letterSpacing: '0.03em', borderTop: borderThin, paddingTop: mm(1.5) }}>
            {location}
          </div>
        )}
      </div>

      {/* Kargo + Ödeme satırı */}
      <div style={{ display: 'flex', borderBottom: border }}>
        <div style={{ flex: 1, padding: `${mm(1.5)} ${mm(3)}`, borderRight: border }}>
          <div style={{ fontSize: mm(2.1), fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: mm(0.5) }}>KARGO</div>
          <div style={{ fontSize: mm(3.2), fontWeight: 900 }}>{cargo || '—'}</div>
        </div>
        <div style={{ flex: 1, padding: `${mm(1.5)} ${mm(3)}`, background: payment === 'ODEMELI' ? '#1e293b' : 'white', color: payment === 'ODEMELI' ? 'white' : '#0f172a', borderRight: payment === 'ODEMELI' && codAmount ? border : 'none' }}>
          <div style={{ fontSize: mm(2.1), fontWeight: 800, letterSpacing: '0.1em', opacity: 0.65, marginBottom: mm(0.5) }}>ÖDEME</div>
          <div style={{ fontSize: mm(3.2), fontWeight: 900 }}>{payment === 'ODEMELI' ? 'ALICI ÖDEMELİ' : 'GÖNDERİCİ ÖDEMELİ'}</div>
        </div>
        {payment === 'ODEMELI' && codAmount && (
          <div style={{ flex: 1, padding: `${mm(1.5)} ${mm(3)}`, background: '#0f172a', color: 'white' }}>
            <div style={{ fontSize: mm(2.1), fontWeight: 800, letterSpacing: '0.1em', opacity: 0.65, marginBottom: mm(0.5) }}>TAHSİLAT</div>
            <div style={{ fontSize: mm(3.6), fontWeight: 900 }}>{codAmount} ₺</div>
          </div>
        )}
      </div>

      {/* Ürünler */}
      {items.length > 0 && (
        <div style={{ borderBottom: border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: `${mm(1)} ${mm(3)}`, borderBottom: borderThin }}>
            <span style={{ fontSize: mm(2.1), fontWeight: 800, letterSpacing: '0.1em', color: '#64748b' }}>İÇERİK</span>
            <span style={{ fontSize: mm(2.1), fontWeight: 800, letterSpacing: '0.1em', color: '#64748b' }}>{totalQty} ADET</span>
          </div>
          <div style={{ padding: `${mm(1)} ${mm(3)}` }}>
            {shownItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: mm(2), fontSize: mm(3), fontWeight: 600, lineHeight: 1.4, borderTop: i ? borderThin : 'none', paddingTop: i ? mm(0.8) : 0, paddingBottom: mm(0.8) }}>
                <span style={{ wordBreak: 'break-word' }}>{item.name}</span>
                <b style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{Number(item.qty) || 1} Adet</b>
              </div>
            ))}
            {hiddenCount > 0 && <div style={{ fontSize: mm(2.6), color: '#64748b' }}>+{hiddenCount} ürün daha</div>}
          </div>
        </div>
      )}

      {/* Not */}
      {note.trim() && (
        <div style={{ fontSize: mm(2.8), lineHeight: 1.4, background: '#fefce8', borderBottom: border, borderLeft: `${mm(1.2)} solid #eab308`, padding: `${mm(1.5)} ${mm(3)}` }}>
          <b>Not:</b> {note}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Kırılacak eşya */}
      {fragile && (
        <div style={{ textAlign: 'center', borderTop: `${mm(0.4)} dashed #1e293b`, borderBottom: `${mm(0.4)} dashed #1e293b`, fontSize: mm(3), fontWeight: 900, letterSpacing: '0.08em', padding: `${mm(1.2)} ${mm(3)}`, background: '#fafafa' }}>
          ⚠ KIRILACAK EŞYA · DİKKATLİ TAŞIYINIZ
        </div>
      )}

      {/* Alt bilgi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: border, padding: `${mm(1.5)} ${mm(3)}`, background: '#f8fafc' }}>
        <span style={{ fontSize: mm(2.4), fontWeight: 700, color: '#64748b' }}>{date}</span>
        <span style={{ fontFamily: 'monospace', fontSize: mm(3.4), fontWeight: 900, letterSpacing: '0.08em', background: '#1e293b', color: 'white', padding: `${mm(0.6)} ${mm(1.5)}`, borderRadius: mm(0.8) }}>{refCode}</span>
      </div>
    </div>
  );
}

function InfoBox({ mm, label, value, strong }: { mm: (n: number) => string; label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        border: `${mm(0.3)} solid ${strong ? '#0f172a' : '#94a3b8'}`,
        background: strong ? '#0f172a' : 'white',
        color: strong ? 'white' : '#0f172a',
        borderRadius: mm(1.5),
        padding: `${mm(1)} ${mm(2)}`,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: mm(2.2), fontWeight: 800, letterSpacing: '0.08em', opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: mm(3), fontWeight: 900, lineHeight: 1.2, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
