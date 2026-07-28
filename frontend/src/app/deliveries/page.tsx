'use client';

import { useEffect, useState } from 'react';
import { MapPin, Phone, Printer, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type DeliveryRow = {
  id: number;
  saleId: number;
  saleNumber: string;
  saleStatus: string;
  invoiceStatus: string;
  deliveryType: string;
  status: string;
  plannedDate?: string | null;
  plannedTime?: string | null;
  customerName: string;
  customerPhone?: string | null;
  fullAddress?: string | null;
  city?: string | null;
  district?: string | null;
  grandTotal: string | number;
};

const filters = [
  { label: 'Bekleyen', value: 'WAITING' },
  { label: 'Hazırlanan', value: 'PREPARING' },
  { label: 'Yolda', value: 'OUT_FOR_DELIVERY' },
  { label: 'Teslim Edildi', value: 'DELIVERED' },
];

export default function DeliveriesPage() {
  const [status, setStatus] = useState('WAITING');
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, [status]);

  async function load() {
    setMessage('');
    const data = await api<DeliveryRow[]>(`/deliveries?status=${encodeURIComponent(status)}`);
    setRows(data);
  }

  async function updateStatus(id: number, nextStatus: string) {
    await api(`/deliveries/${id}/status`, { method: 'POST', json: { status: nextStatus } });
    setMessage('Teslimat durumu güncellendi.');
    await load();
  }

  async function openPrint(saleId: number, type: 'address-label' | 'delivery-form' | 'order-form') {
    const data = await api<Record<string, unknown>>(`/sales/${saleId}/print/${type}`);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<pre style="font:14px Arial;white-space:pre-wrap">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`);
    win.document.close();
  }

  return (
    <AdminShell title="Teslimatlar">
      <div className="space-y-5">
        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Teslimat Listesi</h2>
              <p className="text-sm text-slate-500">Hazır ürün satışlarından oluşan teslimat kayıtları</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={load}>
              <RefreshCw size={17} />
              Yenile
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button key={item.value} className={`btn ${status === item.value ? 'btn-primary' : 'btn-secondary'}`} type="button" onClick={() => setStatus(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
          {message && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        </section>

        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sipariş</th>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Adres</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Fatura</th>
                  <th className="px-4 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.saleNumber}</div>
                      <div className="text-xs text-slate-500">{formatMoney(Number(row.grandTotal || 0))}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.customerName}</div>
                      <a className="text-xs text-brand" href={row.customerPhone ? `tel:${row.customerPhone}` : undefined}>
                        {row.customerPhone || '-'}
                      </a>
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-600">{row.fullAddress || '-'}</td>
                    <td className="px-4 py-3">
                      <select className="field min-w-40" value={row.status} onChange={(event) => updateStatus(row.id, event.target.value)}>
                        <option value="WAITING">Bekleyen</option>
                        <option value="PREPARING">Hazırlanan</option>
                        <option value="OUT_FOR_DELIVERY">Yolda</option>
                        <option value="DELIVERED">Teslim Edildi</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">{invoiceLabel(row.invoiceStatus)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-secondary" type="button" onClick={() => openPrint(row.saleId, 'address-label')}>
                          <Printer size={16} />
                          Etiket
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => openPrint(row.saleId, 'delivery-form')}>
                          A5
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => openPrint(row.saleId, 'order-form')}>
                          A4
                        </button>
                        <a className="btn btn-secondary" href={row.customerPhone ? `tel:${row.customerPhone}` : undefined}>
                          <Phone size={16} />
                        </a>
                        <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.fullAddress || '')}`}>
                          <MapPin size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                      Bu filtrede teslimat kaydı yok.
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

function invoiceLabel(value: string) {
  const labels: Record<string, string> = {
    WAITING: 'Bekliyor',
    E_ARCHIVE: 'e-Arşiv',
    E_INVOICE: 'e-Fatura',
    ISSUED: 'Kesildi',
    CANCELLED: 'İptal',
    RETURNED: 'İade',
  };
  return labels[value] ?? value ?? 'Bekliyor';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value || 0));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] || char);
}
