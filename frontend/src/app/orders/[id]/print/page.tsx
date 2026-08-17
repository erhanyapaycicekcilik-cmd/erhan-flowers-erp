'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const COMPANY_ADDRESS = 'Sarılar Mahallesi Cumhuriyet Caddesi No: 52, Manavgat / Antalya';
const COMPANY_LOGO = '/logo-erhan-flowers.png';
const COMPANY_INSTAGRAM_QR = '/instagram-qr.jpg';

type SalePrintData = {
  company?: {
    name?: string;
    website?: string;
    phone?: string;
    address?: string;
  };
  sale?: Record<string, unknown> & {
    id?: number;
    status?: string;
    items?: Array<Record<string, unknown>>;
  };
};

export default function OrderPrintPreviewPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const printType = cleanPrintType(searchParams.get('type'));
  const endpoint = printEndpoint(printType);
  const title = printTitle(printType);
  // useParams() bazı geçişlerde (özellikle virgül içeren çoklu id segmentlerinde)
  // güvenilmez davranabiliyor; birincil kaynak olarak doğrudan URL yolunu kullanıyoruz.
  const rawIdSegment = useMemo(() => {
    const fromPath = pathname?.match(/^\/orders\/([^/]+)\/print/)?.[1];
    return fromPath ? decodeURIComponent(fromPath) : String(params.id || '');
  }, [pathname, params.id]);
  const orderIds = useMemo(
    () => rawIdSegment.split(',').map((id) => Number(id.trim())).filter((id) => Number.isFinite(id) && id > 0),
    [rawIdSegment],
  );
  const [pages, setPages] = useState<SalePrintData[]>([]);
  const [printedIds, setPrintedIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const barcodeRefs = useRef<Record<number, SVGSVGElement | null>>({});

  useEffect(() => {
    if (!orderIds.length) {
      if (rawIdSegment) setError('Geçersiz sipariş çıktısı bağlantısı.');
      return;
    }
    setError('');
    Promise.all(orderIds.map((orderId) => api<SalePrintData>(`/sales/${orderId}/print/${endpoint}?preview=1`)))
      .then((result) => {
        setPages(result);
        setError('');
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Yazdırma önizlemesi hazırlanamadı.'));
  }, [endpoint, orderIds]);

  useEffect(() => {
    pages.forEach((page) => {
      const sale = page.sale ?? {};
      const id = Number(sale.id);
      const trackingCode = text(sale.cargo_tracking_number ?? sale.cargoTrackingNumber);
      const ref = barcodeRefs.current[id];
      if (!trackingCode || !ref) return;
      try {
        JsBarcode(ref, trackingCode, { format: 'CODE128', width: 1.4, height: 34, margin: 0, displayValue: false });
      } catch {
        ref.innerHTML = '';
      }
    });
  }, [pages]);

  async function markPrintedAndPrint() {
    if (printing) return;
    setPrinting(true);
    try {
      for (const page of pages) {
        const sale = page.sale ?? {};
        const id = Number(sale.id);
        if (!id || printedIds.includes(id)) continue;
        await api<SalePrintData>(`/sales/${id}/print/${endpoint}`);
        if (printType === 'delivery' && canPromoteAfterPrint(text(sale.status))) {
          await api(`/sales/${id}/status`, { method: 'POST', json: { status: 'PREPARING', note: 'A5 sipariş çıktısı yazdırıldı.' } }).catch(() => null);
          await syncTrendyolPackageStatus(sale).catch(() => null);
        }
        setPrintedIds((current) => [...current, id]);
      }
      window.print();
    } finally {
      setPrinting(false);
    }
  }

  if (error) {
    return <div className="mx-auto mt-16 max-w-xl rounded-md border border-red-200 bg-red-50 p-6 text-red-800">{error}</div>;
  }

  if (!pages.length) {
    return <div className="p-10 text-center text-slate-600">Yazdırma önizlemesi hazırlanıyor...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-8 text-slate-950">
      <div className="print-toolbar sticky top-0 z-20 flex flex-wrap items-center justify-center gap-3 bg-slate-900 px-4 py-3">
        <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => router.back()}>
          <ArrowLeft size={17} />
          Geri Dön
        </button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60" type="button" onClick={markPrintedAndPrint} disabled={printing}>
          <Printer size={17} />
          {printing ? 'Hazırlanıyor...' : `${title} Yazdır`}
        </button>
      </div>

      <div className={`mx-auto mt-5 flex flex-col gap-5 ${printType === 'order' ? 'max-w-[230mm]' : printType === 'label' ? 'max-w-[120mm]' : 'max-w-[170mm]'}`}>
        {pages.map((page, index) => {
          const sale = page.sale ?? {};
          const company = page.company ?? {};
          return (
            <article className={`${printType === 'order' ? 'a4-preview' : printType === 'label' ? 'label-preview' : 'a5-preview'} bg-white shadow-xl`} key={Number(sale.id) || index}>
              {printType === 'label' ? (
                <AddressLabel sale={sale} company={company} />
              ) : printType === 'order' ? (
                <A4OrderForm sale={sale} company={company} />
              ) : (
                <A5Receipt
                  sale={sale}
                  company={company}
                  barcodeRef={(node) => {
                    barcodeRefs.current[Number(sale.id)] = node;
                  }}
                />
              )}
            </article>
          );
        })}
      </div>

      <style jsx global>{`
        .a5-preview {
          box-sizing: border-box;
          width: 148mm;
          min-height: 210mm;
          padding: 7mm;
          overflow: hidden;
        }
        .label-preview {
          box-sizing: border-box;
          width: 100mm;
          min-height: 150mm;
          padding: 8mm;
          overflow: hidden;
        }
        .a4-preview {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          padding: 12mm;
          overflow: hidden;
        }
        .a5-receipt {
          box-sizing: border-box;
          width: 100%;
          min-height: 196mm;
          overflow: hidden;
          font-family: Arial, Helvetica, sans-serif;
          font-size: clamp(8px, 1.55mm, 10px);
          line-height: 1.25;
        }
        .receipt-header {
          display: grid;
          grid-template-columns: 18mm 1fr 15mm;
          gap: 3mm;
          align-items: center;
          border-bottom: 0.8mm solid #17643e;
          padding-bottom: 3mm;
        }
        .brand-mark {
          width: 17mm;
          height: 17mm;
          object-fit: contain;
        }
        .brand-social {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8mm;
        }
        .brand-social img {
          width: 15mm;
          height: 15mm;
          object-fit: contain;
        }
        .brand-social span {
          font-size: 1.9mm;
          font-weight: 800;
          color: #334155;
        }
        .brand-copy h1 {
          margin: 0 0 1mm;
          font-size: 5.2mm;
          font-weight: 900;
          letter-spacing: 0;
        }
        .brand-copy p {
          margin: 0.4mm 0;
          color: #334155;
          font-size: 2.45mm;
          font-weight: 700;
        }
        .code-grid,
        .meta-grid,
        .customer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.4mm;
          margin-top: 2.8mm;
        }
        .code-box,
        .info-box {
          border: 0.35mm solid #cbd5e1;
          padding: 1.7mm;
          overflow: hidden;
        }
        .code-box span,
        .info-box span,
        .receipt-footer span {
          display: block;
          color: #64748b;
          font-size: 2.15mm;
          font-weight: 800;
          text-transform: uppercase;
        }
        .code-box strong,
        .info-box b {
          display: block;
          margin-top: 0.8mm;
          font-size: 2.8mm;
          font-weight: 900;
          overflow-wrap: anywhere;
        }
        .code-box strong {
          font-size: clamp(13px, 4.1mm, 16px);
        }
        .tracking-barcode {
          display: block;
          width: 100%;
          height: 9.5mm;
          margin-top: 1mm;
        }
        .customer-section h2,
        .items-section h2 {
          margin: 3mm 0 1.5mm;
          font-size: 3.2mm;
          font-weight: 900;
        }
        .info-wide {
          grid-column: 1 / -1;
        }
        .info-wide b {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        }
        .items-section table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 2.35mm;
        }
        .items-section th,
        .items-section td {
          border: 0.3mm solid #cbd5e1;
          padding: 1.2mm;
          text-align: left;
          vertical-align: top;
          overflow-wrap: anywhere;
        }
        .items-section th:nth-child(1) { width: 39%; }
        .items-section th:nth-child(2) { width: 21%; }
        .items-section th:nth-child(3) { width: 10%; }
        .items-section th:nth-child(4) { width: 30%; }
        .receipt-footer {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2mm;
          margin-top: 3mm;
          border-top: 0.5mm solid #0f172a;
          padding-top: 2mm;
        }
        .receipt-footer div {
          min-height: 13mm;
          border-bottom: 0.35mm solid #0f172a;
        }
        .receipt-footer b {
          display: block;
          margin-top: 4mm;
          font-size: 2.35mm;
          overflow-wrap: anywhere;
        }
        .label-receipt,
        .a4-order-form {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }
        .label-receipt {
          min-height: 134mm;
          display: flex;
          flex-direction: column;
          font-size: 12px;
        }
        .label-brand {
          color: #17643e;
          font-size: 22px;
          font-weight: 900;
        }
        .label-recipient {
          margin-top: 14mm;
          border-top: 0.8mm solid #0f172a;
          padding-top: 5mm;
        }
        .label-recipient span,
        .a4-info span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .label-recipient b {
          display: block;
          margin-top: 2mm;
          font-size: 20px;
          overflow-wrap: anywhere;
        }
        .label-address {
          margin-top: 6mm;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .label-code {
          margin-top: auto;
          border-top: 0.8mm solid #0f172a;
          padding-top: 4mm;
          text-align: right;
          font-size: 18px;
          font-weight: 900;
        }
        .a4-order-form header {
          display: flex;
          justify-content: space-between;
          gap: 12mm;
          border-bottom: 1mm solid #17643e;
          padding-bottom: 5mm;
        }
        .a4-order-form h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
        }
        .a4-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3mm;
          margin-top: 5mm;
        }
        .a4-info {
          border: 0.35mm solid #cbd5e1;
          padding: 3mm;
          min-height: 16mm;
        }
        .a4-info-wide {
          grid-column: 1 / -1;
        }
        .a4-info b {
          display: block;
          margin-top: 1.5mm;
          overflow-wrap: anywhere;
        }
        .a4-order-form table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6mm;
          font-size: 12px;
        }
        .a4-order-form th,
        .a4-order-form td {
          border: 0.35mm solid #cbd5e1;
          padding: 2.5mm;
          text-align: left;
          vertical-align: top;
          overflow-wrap: anywhere;
        }
        @page {
          size: ${printType === 'order' ? 'A4 portrait' : printType === 'label' ? '100mm 150mm' : 'A5 portrait'};
          margin: 7mm;
        }
        @media print {
          html,
          body {
            margin: 0 !important;
            background: white !important;
          }
          .print-toolbar {
            display: none !important;
          }
          .a5-preview,
          .a4-preview,
          .label-preview {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
          .a5-preview:last-child,
          .a4-preview:last-child,
          .label-preview:last-child {
            page-break-after: avoid;
            break-after: auto;
          }
          .a5-receipt {
            width: 100% !important;
            min-height: 196mm !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}

function A5Receipt({ sale, company, barcodeRef }: { sale: Record<string, unknown>; company: Record<string, unknown>; barcodeRef: (node: SVGSVGElement | null) => void }) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  const trackingCode = text(sale.cargo_tracking_number ?? sale.cargoTrackingNumber);
  const address = [sale.fullAddress ?? sale.full_address, sale.district, sale.city].filter(Boolean).join(' / ');
  const companyAddress = text(company.address) || COMPANY_ADDRESS;
  const printDate = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

  return (
    <section className="a5-receipt">
      <header className="receipt-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-mark" src={COMPANY_LOGO} alt="Erhan Flowers logosu" />
        <div className="brand-copy">
          <h1>{text(company.name) || 'Erhan Flowers'}</h1>
          <p>{companyAddress}</p>
          <p>{text(company.phone) || '0544 654 62 20'} | {text(company.website) || 'www.erhanflowers.com'}</p>
        </div>
        <div className="brand-social">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COMPANY_INSTAGRAM_QR} alt="Instagram: @erhanflowers" />
          <span>@erhanflowers</span>
        </div>
      </header>

      <section className="code-grid">
        <div className="code-box">
          <span>ERP Sipariş Kodu</span>
          <strong>{text(sale.sale_number ?? sale.saleNumber) || '-'}</strong>
        </div>
        <div className="code-box">
          <span>Kargo / Takip Kodu</span>
          <strong>{trackingCode || '-'}</strong>
          {trackingCode && <svg ref={barcodeRef} className="tracking-barcode" />}
        </div>
      </section>

      <section className="meta-grid">
        <Info label="Sipariş Tarihi" value={formatDate(sale.order_date ?? sale.orderDate ?? sale.created_at ?? sale.createdAt)} />
        <Info label="Son Çıkış Tarihi" value={formatDate(sale.delivery_due_at ?? sale.deliveryDueAt)} />
      </section>

      <section className="customer-section">
        <h2>Müşteri</h2>
        <div className="customer-grid">
          <Info label="Ad Soyad" value={text(sale.customerName ?? sale.customer_name)} />
          <Info label="Telefon" value={text(sale.customerPhone ?? sale.customer_phone)} />
          <Info label="Teslimat Adresi" value={address || 'Adres bilgisi yok'} wide />
        </div>
      </section>

      <section className="items-section">
        <h2>Ürünler</h2>
        <table>
          <thead>
            <tr>
              <th>Ürün Adı</th>
              <th>Model Kodu</th>
              <th>Adet</th>
              <th>Üretim / Paketleme Notu</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.id)}>
                <td>{text(item.product_name_snapshot ?? item.productNameSnapshot) || '-'}</td>
                <td>{text(item.model_code ?? item.modelCode) || '-'}</td>
                <td>{Number(item.quantity || 0)}</td>
                <td>{text(item.variation_text ?? item.variationText ?? sale.customer_note ?? sale.customerNote) || '-'}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={4}>Ürün bilgisi yok.</td></tr>}
          </tbody>
        </table>
      </section>

      <footer className="receipt-footer">
        <div><span>Hazırlayan Personel</span><b>&nbsp;</b></div>
        <div><span>Kontrol Eden Personel</span><b>&nbsp;</b></div>
        <div><span>Kontrol / İmza</span><b>&nbsp;</b></div>
        <div><span>Çıktı Tarihi</span><b>{printDate}</b></div>
      </footer>
    </section>
  );
}

function AddressLabel({ sale, company }: { sale: Record<string, unknown>; company: Record<string, unknown> }) {
  const address = [sale.fullAddress ?? sale.full_address, sale.district, sale.city].filter(Boolean).join(' / ');
  const companyAddress = text(company.address) || COMPANY_ADDRESS;
  return (
    <section className="label-receipt">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COMPANY_LOGO} alt="Erhan Flowers logosu" style={{ width: '12mm', height: '12mm', objectFit: 'contain' }} />
        <div className="label-brand">{text(company.name) || 'Erhan Flowers'}</div>
      </div>
      <div className="mt-1 text-xs font-bold uppercase text-slate-500">10x15 Kargo Etiketi</div>
      <div className="label-recipient">
        <span>Alıcı</span>
        <b>{text(sale.customerName ?? sale.customer_name) || '-'}</b>
        <b>{text(sale.customerPhone ?? sale.customer_phone) || '-'}</b>
      </div>
      <div className="label-address">{address || 'Adres bilgisi yok'}</div>
      {text(sale.delivery_note ?? sale.deliveryNote) && (
        <div className="mt-5 border-t border-slate-300 pt-3 text-xs"><b>Teslimat notu:</b> {text(sale.delivery_note ?? sale.deliveryNote)}</div>
      )}
      <div className="mt-3 border-t border-slate-300 pt-2 text-[10px] leading-snug text-slate-500">
        <b className="block text-slate-700">Gönderen: {text(company.name) || 'Erhan Flowers'}</b>
        {companyAddress}
        {' · '}
        {text(company.phone) || '0544 654 62 20'}
      </div>
      <div className="label-code">{text(sale.sale_number ?? sale.saleNumber) || '-'}</div>
    </section>
  );
}

function A4OrderForm({ sale, company }: { sale: Record<string, unknown>; company: Record<string, unknown> }) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const delivery = (sale.delivery ?? {}) as Record<string, unknown>;
  const address = [sale.fullAddress ?? sale.full_address, sale.district, sale.city].filter(Boolean).join(' / ');
  return (
    <section className="a4-order-form">
      <header>
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COMPANY_LOGO} alt="Erhan Flowers logosu" style={{ width: '18mm', height: '18mm', objectFit: 'contain' }} />
          <div>
            <h1>{text(company.name) || 'Erhan Flowers'}</h1>
            <p>{text(company.address) || COMPANY_ADDRESS}</p>
            <p>{text(company.website) || 'www.erhanflowers.com'} | {text(company.phone) || '0544 654 62 20'}</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <b>A4 Sipariş Formu</b>
          <div>{text(sale.sale_number ?? sale.saleNumber) || '-'}</div>
          <div>{formatDate(sale.created_at ?? sale.createdAt)}</div>
        </div>
      </header>
      <div className="a4-grid">
        <A4Info label="Müşteri" value={text(sale.customerName ?? sale.customer_name)} />
        <A4Info label="Telefon" value={text(sale.customerPhone ?? sale.customer_phone)} />
        <A4Info label="Kanal" value={text(sale.channel) || '-'} />
        <A4Info label="Adres" value={address || 'Adres bilgisi yok'} wide />
        <A4Info label="Teslimat Notu" value={text(sale.delivery_note ?? sale.deliveryNote ?? delivery.delivery_note ?? delivery.deliveryNote) || '-'} wide />
      </div>
      <table>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Barkod</th>
            <th>Model</th>
            <th>Adet</th>
            <th>Toplam</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={String(item.id)}>
              <td>{text(item.product_name_snapshot ?? item.productNameSnapshot) || '-'}</td>
              <td>{text(item.barcode) || '-'}</td>
              <td>{text(item.model_code ?? item.modelCode) || '-'}</td>
              <td>{Number(item.quantity || 0)}</td>
              <td>{formatMoney(item.line_total ?? item.lineTotal)}</td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={5}>Ürün bilgisi yok.</td></tr>}
        </tbody>
      </table>
      <div className="mt-6 grid grid-cols-2 gap-5 text-sm">
        <div>
          <b>Teslimat</b>
          <p>Yöntem: {text(delivery.delivery_type ?? delivery.deliveryType ?? sale.sale_type ?? sale.saleType) || '-'}</p>
          <p>Durum: {text(delivery.status) || '-'}</p>
        </div>
        <div>
          <b>Ödeme</b>
          {payments.map((payment) => (
            <div className="flex justify-between border-b border-slate-200 py-1" key={String(payment.id)}>
              <span>{text(payment.method)}</span>
              <b>{formatMoney(payment.amount)}</b>
            </div>
          ))}
          <div className="mt-3 flex justify-between"><span>Genel Toplam</span><b>{formatMoney(sale.grand_total ?? sale.grandTotal)}</b></div>
        </div>
      </div>
    </section>
  );
}

function A4Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`a4-info ${wide ? 'a4-info-wide' : ''}`}>
      <span>{label}</span>
      <b>{value || '-'}</b>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`info-box ${wide ? 'info-wide' : ''}`}>
      <span>{label}</span>
      <b>{value || '-'}</b>
    </div>
  );
}

async function syncTrendyolPackageStatus(sale: Record<string, unknown>) {
  const channel = text(sale.channel).toUpperCase();
  if (channel !== 'TRENDYOL') return;
  const shipmentPackageId = text(sale.external_order_id ?? sale.externalOrderId);
  if (!shipmentPackageId) return;
  const items = Array.isArray(sale.items) ? sale.items : [];
  const lines = items
    .map((item) => ({ lineId: Number(item.external_line_id ?? item.externalLineId), quantity: Number(item.quantity || 0) }))
    .filter((line) => Number.isFinite(line.lineId) && line.lineId > 0 && line.quantity > 0);
  if (!lines.length) return;
  try {
    await api('/integrations/orders/trendyol/package-status', {
      method: 'POST',
      json: { shipmentPackageId, status: 'Picking', lines },
    });
  } catch {
    // Trendyol tarafındaki senkronizasyon hatası, kendi sistemimizdeki yazdırma/durum akışını durdurmamalı.
  }
}

function canPromoteAfterPrint(status: string) {
  return ['DRAFT', 'PAYMENT_PENDING', 'CONFIRMED'].includes(status);
}

function cleanPrintType(value: unknown): 'delivery' | 'label' | 'order' {
  return value === 'label' || value === 'order' ? value : 'delivery';
}

function printEndpoint(value: 'delivery' | 'label' | 'order') {
  if (value === 'label') return 'address-label';
  if (value === 'order') return 'order-form';
  return 'delivery-form';
}

function printTitle(value: 'delivery' | 'label' | 'order') {
  if (value === 'label') return 'Kargo Etiketi';
  if (value === 'order') return 'A4 Sipariş Formu';
  return 'A5 Sipariş Çıktısı';
}

function formatDate(value: unknown) {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(value))) : '-';
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function text(value: unknown) {
  return String(value ?? '').trim();
}
