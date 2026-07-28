'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type PrintType = 'address-label' | 'delivery-form' | 'order-form';

export default function SalePrintPreviewPage() {
  const params = useParams<{ id: string; type: string }>();
  const saleId = Number(params.id);
  const printType = params.type as PrintType;
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!saleId || !['address-label', 'delivery-form', 'order-form'].includes(printType)) {
      setError('Geçersiz yazdırma bağlantısı.');
      return;
    }
    api<Record<string, any>>(`/sales/${saleId}/print/${printType}`)
      .then(setData)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Önizleme oluşturulamadı.'));
  }, [saleId, printType]);

  if (error) {
    return <div className="mx-auto mt-16 max-w-xl rounded-md border border-red-200 bg-red-50 p-6 text-red-800">{error}</div>;
  }

  if (!data) {
    return <div className="p-10 text-center text-slate-600">Yazdırma önizlemesi hazırlanıyor...</div>;
  }

  const sale = data.sale ?? {};
  const company = data.company ?? {};
  const isLabel = printType === 'address-label';
  const isA5 = printType === 'delivery-form';
  const title = isLabel ? '10×15 Adres Etiketi' : isA5 ? 'A5 Teslimat Formu' : 'A4 Sipariş Formu';
  const address = [sale.full_address ?? sale.fullAddress, sale.district, sale.city].filter(Boolean).join(' / ');

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-900">
      <div className="print-toolbar sticky top-0 z-20 flex items-center justify-center gap-3 bg-slate-900 px-4 py-3">
        <button className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => window.close()}>
          <ArrowLeft size={17} />
          Kapat
        </button>
        <button className="inline-flex items-center gap-2 rounded bg-emerald-600 px-5 py-2 text-sm font-bold text-white" type="button" onClick={() => window.print()}>
          <Printer size={17} />
          Yazdır / PDF Kaydet
        </button>
      </div>

      <article className={`print-sheet mx-auto mt-6 bg-white shadow-xl ${isLabel ? 'label-sheet' : isA5 ? 'a5-sheet' : 'a4-sheet'}`}>
        {isLabel ? (
          <AddressLabel company={company} sale={sale} address={address} title={title} />
        ) : (
          <OrderForm company={company} sale={sale} address={address} title={title} />
        )}
      </article>

      <style jsx global>{`
        .print-sheet { padding: 14mm; }
        .label-sheet { width: 100mm; min-height: 150mm; padding: 8mm; }
        .a5-sheet { width: 148mm; min-height: 210mm; }
        .a4-sheet { width: 210mm; min-height: 297mm; }
        @media print {
          @page { size: ${isLabel ? '100mm 150mm' : isA5 ? 'A5 portrait' : 'A4 portrait'}; margin: ${isLabel ? '7mm' : '12mm'}; }
          body { background: white !important; }
          .print-toolbar { display: none !important; }
          .print-sheet { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}

function AddressLabel({ company, sale, address, title }: { company: Record<string, any>; sale: Record<string, any>; address: string; title: string }) {
  return (
    <div className="flex min-h-[130mm] flex-col">
      <div className="text-2xl font-black text-emerald-700">{company.name || 'Erhan Flowers'}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{title}</div>
      <div className="mt-6 border-t-2 border-slate-900 pt-4">
        <div className="text-[11px] font-bold text-slate-500">ALICI</div>
        <div className="mt-2 text-xl font-black">{sale.customer_name ?? sale.customerName ?? '-'}</div>
        <div className="mt-1 text-lg font-bold">{sale.customer_phone ?? sale.customerPhone ?? '-'}</div>
      </div>
      <div className="mt-5 text-lg font-bold leading-relaxed">{address || 'Adres bilgisi yok'}</div>
      {(sale.address_title ?? sale.addressTitle) && <div className="mt-3 w-fit border border-slate-900 px-2 py-1 text-xs font-bold">{sale.address_title ?? sale.addressTitle}</div>}
      {(sale.delivery_note ?? sale.deliveryNote) && <div className="mt-5 border-t border-slate-300 pt-3 text-xs"><b>Teslimat notu:</b> {sale.delivery_note ?? sale.deliveryNote}</div>}
      <div className="mt-auto border-t-2 border-slate-900 pt-3 text-right text-lg font-black">{sale.sale_number ?? sale.saleNumber}</div>
    </div>
  );
}

function OrderForm({ company, sale, address, title }: { company: Record<string, any>; sale: Record<string, any>; address: string; title: string }) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const delivery = sale.delivery ?? {};

  return (
    <>
      <header className="flex justify-between gap-6 border-b-[3px] border-emerald-700 pb-4">
        <div>
          <h1 className="text-2xl font-black">{company.name || 'Erhan Flowers'}</h1>
          <p className="mt-1 text-xs text-slate-500">{company.website} · {company.phone}</p>
        </div>
        <div className="grid gap-1 text-right text-xs">
          <b className="text-sm">{title}</b>
          <span>{sale.sale_number ?? sale.saleNumber}</span>
          <span>{formatDate(sale.created_at ?? sale.createdAt)}</span>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Info label="Müşteri" value={sale.customer_name ?? sale.customerName ?? '-'} />
        <Info label="Telefon" value={sale.customer_phone ?? sale.customerPhone ?? '-'} />
        <Info label="Kaynak" value={sourceName(sale.channel)} />
        <Info label="Adres" value={address || 'Mağazadan teslim / adres yok'} wide />
        <Info label="Teslimat Notu" value={sale.delivery_note ?? sale.deliveryNote ?? delivery.note ?? '-'} wide />
      </section>

      <h2 className="mb-2 mt-5 text-sm font-bold">Ürünler</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-2 text-left">Ürün</th>
            <th className="border border-slate-300 p-2 text-left">Barkod</th>
            <th className="border border-slate-300 p-2 text-right">Adet</th>
            <th className="border border-slate-300 p-2 text-right">Birim</th>
            <th className="border border-slate-300 p-2 text-right">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: Record<string, any>) => (
            <tr key={item.id}>
              <td className="border border-slate-300 p-2">{item.product_name_snapshot ?? item.productNameSnapshot}</td>
              <td className="border border-slate-300 p-2">{item.barcode || '-'}</td>
              <td className="border border-slate-300 p-2 text-right">{Number(item.quantity)}</td>
              <td className="border border-slate-300 p-2 text-right">{formatMoney(item.unit_price ?? item.unitPrice)}</td>
              <td className="border border-slate-300 p-2 text-right">{formatMoney(item.line_total ?? item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-5 grid grid-cols-2 gap-5 text-xs">
        <div>
          <h2 className="mb-2 text-sm font-bold">Teslimat</h2>
          <p><b>Yöntem:</b> {delivery.delivery_type ?? delivery.deliveryType ?? sale.sale_type ?? sale.saleType ?? '-'}</p>
          <p className="mt-1"><b>Durum:</b> {delivery.status || '-'}</p>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold">Ödeme</h2>
          {payments.map((payment: Record<string, any>) => (
            <div className="flex justify-between border-b border-slate-200 py-1" key={payment.id}>
              <span>{payment.method}</span>
              <b>{formatMoney(payment.amount)}</b>
            </div>
          ))}
          <div className="mt-3 flex justify-between text-sm"><span>Genel Toplam</span><b>{formatMoney(sale.grand_total ?? sale.grandTotal)}</b></div>
        </div>
      </section>
    </>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-h-14 border border-slate-300 p-2 ${wide ? 'col-span-3' : ''}`}>
      <div className="mb-1 text-[10px] text-slate-500">{label}</div>
      <b>{value}</b>
    </div>
  );
}

function sourceName(value?: string) {
  return ({ STORE: 'Mağaza', PHONE: 'Telefon', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram' } as Record<string, string>)[value || ''] || value || '-';
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value));
}
