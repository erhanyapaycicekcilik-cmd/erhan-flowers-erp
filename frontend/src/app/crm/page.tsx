'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Phone, Search, ShoppingCart, UserRound } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type CustomerRow = {
  id: number;
  customerCode: string;
  displayName: string;
  companyTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  district?: string | null;
  saleCount: number;
  totalSpent: number | string;
  lastSaleAt?: string | null;
  customerType: string;
  isActive: boolean;
};

export default function CrmPage() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(value = query) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    const clean = value.trim();
    if (clean) params.set('q', clean);

    api<CustomerRow[]>(`/sales/crm/customers?${params.toString()}`)
      .then(setRows)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Müşteri listesi yüklenemedi.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load('');
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    load(query);
  }

  return (
    <AdminShell title="CRM">
      <div className="space-y-5">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Müşteri Listesi</h2>
              <p className="text-sm text-slate-500">Telefon, müşteri adı veya firma adı ile hızlı arama.</p>
            </div>
            <Link className="btn btn-primary" href="/sales">
              <ShoppingCart size={17} />
              Yeni Satış
            </Link>
          </div>

          <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={search}>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="field pl-10"
                placeholder="Telefon, ad soyad veya firma ara"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button className="btn btn-secondary justify-center" type="submit">
              <Search size={17} />
              Ara
            </button>
          </form>

          {error && <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </section>

        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="p-3">Müşteri</th>
                  <th className="p-3">Telefon</th>
                  <th className="p-3">E-posta</th>
                  <th className="p-3">Adres</th>
                  <th className="p-3">Tip</th>
                  <th className="p-3">Sipariş</th>
                  <th className="p-3">Son Sipariş</th>
                  <th className="p-3">Toplam</th>
                  <th className="p-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line hover:bg-slate-50">
                    <td className="p-3">
                      <Link className="flex items-center gap-2 font-semibold text-brand" href={`/customers/${row.id}`}>
                        <UserRound size={16} />
                        <span>
                          {row.displayName || row.companyTitle || 'İsimsiz müşteri'}
                          <small className="block font-normal text-slate-500">{row.customerCode}</small>
                        </span>
                      </Link>
                    </td>
                    <td className="p-3">{row.phone || '-'}</td>
                    <td className="p-3">{row.email || '-'}</td>
                    <td className="p-3">{[row.district, row.city].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="p-3">{row.customerType === 'CORPORATE' ? 'Kurumsal' : 'Bireysel'}</td>
                    <td className="p-3">{row.saleCount || 0}</td>
                    <td className="p-3">{date(row.lastSaleAt)}</td>
                    <td className="p-3 font-semibold">{money(row.totalSpent)}</td>
                    <td className="p-3">
                      <span className={row.isActive ? 'text-emerald-700' : 'text-slate-500'}>{row.isActive ? 'Aktif' : 'Pasif'}</span>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-slate-500" colSpan={9}>
                      Müşteri bulunamadı.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td className="p-6 text-center text-slate-500" colSpan={9}>
                      Müşteriler yükleniyor...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function money(value: unknown) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function date(value: unknown) {
  return value ? new Intl.DateTimeFormat('tr-TR').format(new Date(String(value))) : '-';
}
