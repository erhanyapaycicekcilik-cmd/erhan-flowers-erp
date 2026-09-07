'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Factory,
  FileImage,
  Package,
  PlugZap,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import type { CurrentUser } from '@/types';

type DashboardSummary = {
  totalProducts: number;
  totalImages: number;
  totalBarcodes: number;
  criticalStockCount: number;
  totalProductCost?: number;
  criticalStocks: { id: number; productName: string; modelCode: string | null; stockQuantity: number; criticalStockLevel: number }[];
  recentlyAddedProducts: { id: number; productName: string; modelCode: string | null }[];
};

type SalesPeriod = { orderCount: number; revenue: number; platforms: Record<string, number> };
type DailySalesData = { today: SalesPeriod; yesterday: SalesPeriod; thisWeek: SalesPeriod; thisMonth: SalesPeriod };

type CostProgress = { completed: number; total: number };

const quickLinks = [
  { label: 'Trendyol Maliyet', href: '/production-costs', icon: Factory, color: 'bg-orange-50 text-orange-600' },
  { label: 'Siparişler', href: '/orders', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
  { label: 'Stok Kartları', href: '/stock-cards', icon: Warehouse, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Ürün Merkezi', href: '/products', icon: Boxes, color: 'bg-purple-50 text-purple-600' },
  { label: 'Entegrasyon', href: '/integrations', icon: PlugZap, color: 'bg-slate-100 text-slate-600' },
  { label: 'Medya Merkezi', href: '/media', icon: FileImage, color: 'bg-pink-50 text-pink-600' },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sales, setSales] = useState<DailySalesData | null>(null);
  const [costProgress, setCostProgress] = useState<CostProgress | null>(null);

  useEffect(() => {
    api<DashboardSummary>('/dashboard').then(setData).catch(() => null);
    api<CurrentUser>('/auth/me').then(setUser).catch(() => null);
    api<DailySalesData>('/dashboard/daily-sales').then(setSales).catch(() => null);
    api<CostProgress>('/production-costs/progress').then(setCostProgress).catch(() => null);
  }, []);

  const isOwner = user?.role === 'OWNER';

  return (
    <AdminShell title="Dashboard">
      {/* Satış özeti */}
      {sales && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {([
            { label: 'Bugün', period: sales.today },
            { label: 'Dün', period: sales.yesterday },
            { label: 'Bu Hafta', period: sales.thisWeek },
            { label: 'Bu Ay', period: sales.thisMonth },
          ] as { label: string; period: SalesPeriod }[]).map(({ label, period }) => (
            <section key={label} className="panel p-5">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="text-2xl font-bold text-ink">{money(period.revenue)}</div>
              <div className="mt-1 text-sm text-slate-500">{period.orderCount} sipariş</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(period.platforms).map(([platform, amount]) => (
                  <span key={platform} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {platform} · {money(amount)}
                  </span>
                ))}
                {Object.keys(period.platforms).length === 0 && (
                  <span className="text-xs text-slate-400">Henüz sipariş yok</span>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Hızlı erişim */}
          <section>
            <h2 className="mb-3 font-bold text-ink">Hızlı Erişim</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="panel flex items-center gap-3 p-4 transition hover:border-brand hover:shadow-sm">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-semibold text-ink">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Maliyet tamamlanma durumu */}
          {isOwner && costProgress && (
            <section className="panel p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand" />
                  <h2 className="font-bold">Maliyet Tamamlanma</h2>
                </div>
                <Link href="/production-costs" className="text-xs font-semibold text-brand hover:underline">Tümünü Gör →</Link>
              </div>
              <div className="mb-2 flex items-end justify-between text-sm">
                <span className="text-slate-500">Tamamlanan ürün</span>
                <span className="font-bold">{costProgress.completed} / {costProgress.total}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: costProgress.total > 0 ? `${Math.round((costProgress.completed / costProgress.total) * 100)}%` : '0%' }}
                />
              </div>
              <div className="mt-1.5 text-right text-xs font-semibold text-slate-500">
                {costProgress.total > 0 ? Math.round((costProgress.completed / costProgress.total) * 100) : 0}%
              </div>
              {costProgress.total - costProgress.completed > 0 && (
                <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {costProgress.total - costProgress.completed} ürünün maliyeti henüz girilmedi
                </div>
              )}
            </section>
          )}

          {/* Kritik stoklar */}
          {isOwner && (data?.criticalStockCount ?? 0) > 0 && (
            <section className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-bold">Kritik Stok ({data?.criticalStockCount})</h2>
              </div>
              <div className="divide-y divide-line">
                {(data?.criticalStocks ?? []).map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <div className="font-semibold">{product.productName}</div>
                      <div className="text-xs text-slate-400">{product.modelCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{product.stockQuantity}</div>
                      <div className="text-xs text-slate-400">Limit {product.criticalStockLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sağ panel — istatistikler */}
        <div className="space-y-4">
          <section className="panel divide-y divide-line overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="font-bold">Genel Durum</h2>
            </div>
            {[
              { label: 'Toplam Ürün', value: data?.totalProducts ?? 0, icon: Package },
              { label: 'Toplam Görsel', value: data?.totalImages ?? 0, icon: FileImage },
              { label: 'Toplam Barkod', value: data?.totalBarcodes ?? 0, icon: Boxes },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Icon size={15} />
                    {item.label}
                  </div>
                  <span className="font-bold text-ink">{item.value.toLocaleString('tr-TR')}</span>
                </div>
              );
            })}
            {isOwner && data?.totalProductCost !== undefined && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-600">Toplam Stok Maliyeti</span>
                <span className="font-bold text-brand">{money(data.totalProductCost)}</span>
              </div>
            )}
          </section>

          {/* Son eklenen */}
          {isOwner && (data?.recentlyAddedProducts ?? []).length > 0 && (
            <section className="panel overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-bold">Son Eklenen Ürünler</h2>
              </div>
              <div className="divide-y divide-line">
                {(data?.recentlyAddedProducts ?? []).map((product) => (
                  <div key={product.id} className="px-5 py-3 text-sm">
                    <div className="font-semibold line-clamp-1">{product.productName}</div>
                    <div className="text-xs text-slate-400">{product.modelCode ?? '-'}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}
