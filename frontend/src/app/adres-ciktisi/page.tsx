'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';

const COMPANY_LOGO = '/logo-erhan-flowers.png';
const SENDER_STORAGE_KEY = 'adres-ciktisi-gonderen';

type LabelSize = '100x150' | 'A5' | 'A4';
type PaymentType = 'PESIN' | 'ODEMELI';

type Item = { name: string; qty: string };

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
  const [items, setItems] = useState<Item[]>([{ name: '', qty: '1' }]);
  const [note, setNote] = useState('');
  const [cargo, setCargo] = useState('');
  const [payment, setPayment] = useState<PaymentType>('PESIN');
  const [codAmount, setCodAmount] = useState('');
  const [fragile, setFragile] = useState(true);
  const [size, setSize] = useState<LabelSize>('100x150');
  const [copies, setCopies] = useState(1);
  const [refCode, setRefCode] = useState('');
  const [date, setDate] = useState('');

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

  function resetForm() {
    setName('');
    setPhone('');
    setAddress('');
    setDistrict('');
    setCity('');
    setItems([{ name: '', qty: '1' }]);
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
        <h1 className="text-base font-bold text-white">Adres Çıktısı</h1>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={resetForm} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white">
            <RotateCcw size={16} />
            Yeni
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!canPrint}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Printer size={17} />
            Yazdır
          </button>
        </div>
      </div>

      <div className="no-print mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[minmax(0,460px)_1fr]">
        <section className="space-y-4">
          <Card title="Alıcı">
            <Field label="Ad Soyad *">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Müşteri adı" autoFocus />
            </Field>
            <Field label="Telefon">
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" inputMode="tel" />
            </Field>
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
              <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700" onClick={() => setItems((c) => [...c, { name: '', qty: '1' }])}>
                <Plus size={15} /> Ürün ekle
              </button>
            }
          >
            {items.map((item, index) => (
              <div className="flex items-center gap-2" key={index}>
                <input
                  className="input"
                  style={{ flex: 1, width: 'auto', minWidth: 0 }}
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder={`Ürün ${index + 1}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setItems((c) => [...c, { name: '', qty: '1' }]);
                    }
                  }}
                />
                <input className="input text-center" style={{ width: 64, flex: 'none' }} value={item.qty} onChange={(e) => updateItem(index, { qty: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" />
                <button
                  type="button"
                  aria-label="Ürünü sil"
                  className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setItems((c) => (c.length > 1 ? c.filter((_, i) => i !== index) : [{ name: '', qty: '1' }]))}
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

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: mm(4),
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#0f172a',
        gap: mm(2.5),
      }}
    >
      {/* Üst bant: logo + gönderen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: mm(3), borderBottom: `${mm(0.6)} solid #0f172a`, paddingBottom: mm(2.5) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COMPANY_LOGO} alt="" style={{ width: mm(13), height: mm(13), objectFit: 'contain' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: mm(2.3), fontWeight: 800, letterSpacing: '0.08em', color: '#64748b' }}>GÖNDEREN</div>
          <div style={{ fontSize: mm(4.2), fontWeight: 900, lineHeight: 1.1 }}>{sender.name || '-'}</div>
          <div style={{ fontSize: mm(2.5), lineHeight: 1.3, color: '#334155' }}>{sender.address}</div>
          <div style={{ fontSize: mm(2.7), fontWeight: 700 }}>Tel: {sender.phone}</div>
        </div>
      </div>

      {/* Alıcı */}
      <div style={{ border: `${mm(0.6)} solid #0f172a`, borderRadius: mm(1.5), overflow: 'hidden' }}>
        <div style={{ background: '#0f172a', color: 'white', fontSize: mm(2.8), fontWeight: 900, letterSpacing: '0.12em', padding: `${mm(1)} ${mm(2.5)}` }}>ALICI</div>
        <div style={{ padding: mm(2.5) }}>
          <div style={{ fontSize: mm(5.6), fontWeight: 900, lineHeight: 1.1, textTransform: 'uppercase', wordBreak: 'break-word' }}>{name || 'Ad Soyad'}</div>
          {phone && <div style={{ fontSize: mm(4.2), fontWeight: 800, marginTop: mm(1) }}>☎ {phone}</div>}
          <div style={{ fontSize: mm(3.6), fontWeight: 600, lineHeight: 1.35, marginTop: mm(1.5), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {address || 'Açık adres'}
          </div>
          {location && <div style={{ fontSize: mm(4.6), fontWeight: 900, marginTop: mm(1.5), textTransform: 'uppercase' }}>{location}</div>}
        </div>
      </div>

      {/* Ödeme / kargo */}
      <div style={{ display: 'flex', gap: mm(2) }}>
        <InfoBox mm={mm} label="KARGO" value={cargo || '—'} />
        <InfoBox mm={mm} label="ÖDEME" value={payment === 'ODEMELI' ? 'ALICI ÖDEMELİ' : 'GÖNDERİCİ ÖDEMELİ'} strong={payment === 'ODEMELI'} />
        {payment === 'ODEMELI' && codAmount && <InfoBox mm={mm} label="TAHSİLAT" value={`${codAmount} ₺`} strong />}
      </div>

      {/* Ürünler */}
      {items.length > 0 && (
        <div style={{ border: `${mm(0.3)} solid #94a3b8`, borderRadius: mm(1.5), padding: `${mm(1.5)} ${mm(2.5)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: mm(2.4), fontWeight: 800, letterSpacing: '0.08em', color: '#64748b', marginBottom: mm(1) }}>
            <span>İÇERİK</span>
            <span>{totalQty} ADET</span>
          </div>
          {shownItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: mm(2), fontSize: mm(3), fontWeight: 600, lineHeight: 1.35, borderTop: i ? `${mm(0.2)} dashed #cbd5e1` : 'none', paddingTop: i ? mm(0.6) : 0 }}>
              <span style={{ wordBreak: 'break-word' }}>{item.name}</span>
              <b style={{ whiteSpace: 'nowrap' }}>x{Number(item.qty) || 1}</b>
            </div>
          ))}
          {hiddenCount > 0 && <div style={{ fontSize: mm(2.6), color: '#64748b', marginTop: mm(0.6) }}>+{hiddenCount} ürün daha</div>}
        </div>
      )}

      {note.trim() && (
        <div style={{ fontSize: mm(2.9), lineHeight: 1.35, background: '#f1f5f9', borderLeft: `${mm(1)} solid #0f172a`, padding: `${mm(1.5)} ${mm(2.5)}` }}>
          <b>Not:</b> {note}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {fragile && (
        <div style={{ textAlign: 'center', border: `${mm(0.5)} dashed #0f172a`, fontSize: mm(3.2), fontWeight: 900, letterSpacing: '0.06em', padding: mm(1.2) }}>
          ⚠ KIRILACAK EŞYA · DİKKATLİ TAŞIYINIZ
        </div>
      )}

      {/* Alt bilgi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `${mm(0.6)} solid #0f172a`, paddingTop: mm(1.5), fontSize: mm(2.6), fontWeight: 700 }}>
        <span>{date}</span>
        <span style={{ fontFamily: 'monospace', fontSize: mm(3.2), fontWeight: 900, letterSpacing: '0.05em' }}>{refCode}</span>
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
