'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Plus, ShoppingCart } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type CustomerDetail = {
  id: number;
  customerCode: string;
  customerType: string;
  displayName: string;
  companyTitle?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  customerNote?: string | null;
  isActive: boolean;
  addresses: CustomerAddress[];
  recentSales: CustomerSale[];
  summary?: {
    saleCount?: number;
    totalSpent?: number | string;
    firstSaleAt?: string | null;
    lastSaleAt?: string | null;
  };
};

type CustomerAddress = {
  id: number;
  title: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  fullAddress: string;
  locationDescription?: string | null;
  deliveryNote?: string | null;
  isDefault: boolean;
};

type CustomerSale = {
  id: number;
  saleNumber: string;
  status: string;
  channel: string;
  grandTotal: number | string;
  paidTotal: number | string;
  remainingTotal: number | string;
  createdAt: string;
};

const emptyAddress = {
  title: 'Teslimat',
  recipientName: '',
  recipientPhone: '',
  city: '',
  district: '',
  neighborhood: '',
  fullAddress: '',
  locationDescription: '',
  deliveryNote: '',
  isDefault: false,
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [address, setAddress] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setError('');
    api<CustomerDetail>(`/sales/customers/${params.id}`)
      .then(setCustomer)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Müşteri kartı açılamadı.'));
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function addAddress(event: FormEvent) {
    event.preventDefault();
    if (!address.fullAddress.trim()) {
      setError('Açık adres zorunludur.');
      return;
    }

    setSavingAddress(true);
    setError('');
    try {
      await api(`/sales/customers/${params.id}/addresses`, { method: 'POST', json: address });
      setAddress(emptyAddress);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Adres kaydedilemedi.');
    } finally {
      setSavingAddress(false);
    }
  }

  return (
    <AdminShell title="Müşteri Detayı">
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!customer && !error && <div className="panel p-5">Müşteri yükleniyor...</div>}
      {customer && (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-between gap-3">
            <Link className="btn btn-secondary" href="/crm">
              <ArrowLeft size={17} />
              CRM Listesine Dön
            </Link>
            <Link className="btn btn-primary" href={`/sales?customerId=${customer.id}`}>
              <ShoppingCart size={17} />
              Yeni Satış
            </Link>
          </div>

          <section className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink">{customer.displayName || customer.companyTitle || 'İsimsiz müşteri'}</h2>
                <p className="text-sm text-slate-500">
                  {customer.customerCode} · {customer.customerType === 'CORPORATE' ? 'Kurumsal' : 'Bireysel'} · {customer.isActive ? 'Aktif' : 'Pasif'}
                </p>
              </div>
              <div className="text-sm text-slate-600">
                <div>{customer.phone || '-'}</div>
                <div>{customer.email || '-'}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Metric label="Toplam Sipariş" value={customer.summary?.saleCount || 0} />
              <Metric label="Toplam Harcama" value={money(customer.summary?.totalSpent)} />
              <Metric label="İlk Sipariş" value={date(customer.summary?.firstSaleAt)} />
              <Metric label="Son Sipariş" value={date(customer.summary?.lastSaleAt)} />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
            <div className="panel p-5">
              <h3 className="text-lg font-bold text-ink">Müşteri Bilgileri</h3>
              <Info
                rows={[
                  ['Telefon', customer.phone],
                  ['İkinci Telefon', customer.secondaryPhone],
                  ['WhatsApp', customer.whatsappPhone || customer.phone],
                  ['E-posta', customer.email],
                  ['Firma', customer.companyTitle],
                  ['Vergi Dairesi', customer.taxOffice],
                  ['Vergi No', customer.taxNumber],
                  ['TCKN', customer.nationalId],
                  ['Not', customer.customerNote],
                ]}
              />
            </div>

            <div className="panel p-5">
              <h3 className="text-lg font-bold text-ink">Adresler</h3>
              <div className="mt-3 space-y-3">
                {customer.addresses.map((item) => (
                  <div key={item.id} className="rounded border border-line p-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <MapPin size={16} />
                      {item.title || 'Adres'}
                      {item.isDefault && <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Varsayılan</span>}
                    </div>
                    <div className="mt-2 text-sm">{item.fullAddress}</div>
                    <div className="text-sm text-slate-500">{[item.neighborhood, item.district, item.city].filter(Boolean).join(' / ') || '-'}</div>
                    {(item.recipientName || item.recipientPhone) && (
                      <div className="mt-1 text-xs text-slate-500">
                        Alıcı: {item.recipientName || '-'} · {item.recipientPhone || '-'}
                      </div>
                    )}
                  </div>
                ))}
                {customer.addresses.length === 0 && <div className="rounded border border-dashed border-line p-4 text-sm text-slate-500">Kayıtlı adres yok.</div>}
              </div>

              <form className="mt-5 grid gap-2" onSubmit={addAddress}>
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="field" placeholder="Adres başlığı" value={address.title} onChange={(event) => setAddress({ ...address, title: event.target.value })} />
                  <input className="field" placeholder="Alıcı adı" value={address.recipientName} onChange={(event) => setAddress({ ...address, recipientName: event.target.value })} />
                  <input className="field" placeholder="Alıcı telefonu" value={address.recipientPhone} onChange={(event) => setAddress({ ...address, recipientPhone: event.target.value })} />
                  <input className="field" placeholder="İl" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} />
                  <input className="field" placeholder="İlçe" value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} />
                  <input className="field" placeholder="Mahalle" value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} />
                </div>
                <textarea className="field min-h-24" placeholder="Açık adres" value={address.fullAddress} onChange={(event) => setAddress({ ...address, fullAddress: event.target.value })} />
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="field" placeholder="Konum tarifi" value={address.locationDescription} onChange={(event) => setAddress({ ...address, locationDescription: event.target.value })} />
                  <input className="field" placeholder="Teslimat notu" value={address.deliveryNote} onChange={(event) => setAddress({ ...address, deliveryNote: event.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={address.isDefault} onChange={(event) => setAddress({ ...address, isDefault: event.target.checked })} />
                  Varsayılan adres yap
                </label>
                <button className="btn btn-secondary w-fit" type="submit" disabled={savingAddress}>
                  <Plus size={17} />
                  {savingAddress ? 'Kaydediliyor...' : 'Adres Ekle'}
                </button>
              </form>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-line p-5">
              <h3 className="text-lg font-bold text-ink">Sipariş Geçmişi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="p-3">Sipariş No</th>
                    <th className="p-3">Tarih</th>
                    <th className="p-3">Kanal</th>
                    <th className="p-3">Durum</th>
                    <th className="p-3">Toplam</th>
                    <th className="p-3">Ödenen</th>
                    <th className="p-3">Kalan</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-line">
                      <td className="p-3">
                        <Link className="font-semibold text-brand" href={`/sales?saleId=${sale.id}`}>
                          {sale.saleNumber}
                        </Link>
                      </td>
                      <td className="p-3">{date(sale.createdAt)}</td>
                      <td className="p-3">{sale.channel}</td>
                      <td className="p-3">{sale.status}</td>
                      <td className="p-3 font-semibold">{money(sale.grandTotal)}</td>
                      <td className="p-3">{money(sale.paidTotal)}</td>
                      <td className="p-3">{money(sale.remainingTotal)}</td>
                    </tr>
                  ))}
                  {customer.recentSales.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-slate-500" colSpan={7}>
                        Bu müşteri için sipariş geçmişi yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-line bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-ink">{value}</div>
    </div>
  );
}

function Info({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="border-b border-line pb-2">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-sm text-ink">{String(value || '-')}</div>
        </div>
      ))}
    </div>
  );
}

function money(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function date(value: unknown) {
  return value ? new Intl.DateTimeFormat('tr-TR').format(new Date(String(value))) : '-';
}
