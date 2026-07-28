'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  Factory,
  FileImage,
  Package,
  PackagePlus,
  SearchCheck,
  Settings,
  Warehouse,
} from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import type { CurrentUser, Product } from '@/types';

type DashboardSummary = {
  totalProducts: number;
  totalImages: number;
  totalBarcodes: number;
  criticalStockCount: number;
  totalProductCost?: number;
  criticalStocks: Product[];
  recentlyAddedProducts: Product[];
};

const modules = [
  {
    title: 'Ürün Merkezi',
    description: 'Ürün listesi, satış varyasyonları, pasife alma ve ürün kartları.',
    href: '/products',
    icon: Boxes,
    ownerOnly: false,
  },
  {
    title: 'Stok Kartları',
    description: 'Malzeme, saksı, yaprak, gövde ve otomatik birim maliyet.',
    href: '/stock-cards',
    icon: Warehouse,
    ownerOnly: false,
  },
  {
    title: 'Stok Sayım',
    description: 'Depo sayımı, stok farkı kontrolü ve sayım onayı.',
    href: '/stock-counts',
    icon: ClipboardList,
    ownerOnly: true,
  },
  {
    title: 'Ürün Maliyet Merkezi',
    description: 'Ürün seç, malzeme kartları ekle ve canlı maliyeti tek ekrandan hesapla.',
    href: '/production-costs',
    icon: Factory,
    ownerOnly: true,
  },
  {
    title: 'Finans Merkezi',
    description: 'Gelir, gider, borç, alacak, kasa, banka ve nakit akışı.',
    href: '/finance',
    icon: CircleDollarSign,
    ownerOnly: true,
  },
  {
    title: 'SEO ve Ürün Adı',
    description: 'Barkodları koruyarak SEO uyumlu ürün adı dönüşümü.',
    href: '/seo-products',
    icon: SearchCheck,
    ownerOnly: true,
  },
  {
    title: 'Model Kodu Merkezi',
    description: 'ERH model kodu üretimi ve kategori bazlı kod yönetimi.',
    href: '/model-codes',
    icon: PackagePlus,
    ownerOnly: true,
  },
  {
    title: 'Barkod Merkezi',
    description: 'Barkod üretimi, ürün bağlantısı ve PDF çıktısı.',
    href: '/barcodes',
    icon: Barcode,
    ownerOnly: false,
  },
  {
    title: 'Medya Merkezi',
    description: 'Ürün görselleri, klasörleme, yükleme ve görsel eşleştirme.',
    href: '/media',
    icon: FileImage,
    ownerOnly: false,
  },
  {
    title: 'Ayarlar',
    description: 'Panel ayarları ve sistem hazırlıkları.',
    href: '/settings',
    icon: Settings,
    ownerOnly: true,
  },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    api<DashboardSummary>('/dashboard').then(setData).catch(() => null);
    api<CurrentUser>('/auth/me').then(setUser).catch(() => null);
  }, []);

  const isOwner = user?.role === 'OWNER';

  const cards = [
    { label: 'Toplam Ürün', value: data?.totalProducts ?? 0, icon: Package },
    { label: 'Toplam Görsel', value: data?.totalImages ?? 0, icon: FileImage },
    { label: 'Toplam Barkod', value: data?.totalBarcodes ?? 0, icon: Barcode },
    ...(isOwner ? [{ label: 'Toplam Ürün Maliyeti', value: money(data?.totalProductCost ?? 0), icon: Calculator }] : []),
    ...(isOwner ? [{ label: 'Kritik Stok', value: data?.criticalStockCount ?? 0, icon: AlertTriangle }] : []),
  ];

  const visibleModules = modules.filter((item) => !item.ownerOnly || isOwner);

  return (
    <AdminShell title="ERP Ana Merkezi">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Erhan Flowers Şirket Programı</h2>
        <p className="text-sm text-slate-500">Tüm ERP işleri bu ana ekrandan yönetilir. Tek giriş adresi: localhost:3001</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">{card.label}</div>
                  <div className="mt-2 text-3xl font-bold">{card.value}</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-brand">
                  <Icon size={22} />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold">Ana İş Merkezleri</h2>
          <span className="text-xs font-semibold text-slate-500">Bütün modüller tek panel içinde</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="panel block p-5 transition hover:border-brand hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-brand">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">{item.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {isOwner && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-bold">Son Eklenen Ürünler</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Ürün</th>
                    <th className="px-5 py-3">Model Kodu</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3">Stok</th>
                    <th className="px-5 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentlyAddedProducts ?? []).map((product) => (
                    <tr key={product.id} className="border-t border-line">
                      <td className="px-5 py-3 font-medium">{product.productName}</td>
                      <td className="px-5 py-3">{product.modelCode}</td>
                      <td className="px-5 py-3">{product.category?.name}</td>
                      <td className="px-5 py-3">{product.stockQuantity}</td>
                      <td className="px-5 py-3"><StatusBadge status={product.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-bold">Kritik Stoklar</h2>
            </div>
            <div className="divide-y divide-line">
              {(data?.criticalStocks ?? []).length === 0 && (
                <div className="px-5 py-6 text-sm text-slate-500">Kritik stokta ürün yok.</div>
              )}
              {(data?.criticalStocks ?? []).map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div>
                    <div className="font-semibold">{product.productName}</div>
                    <div className="text-slate-500">{product.modelCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-700">{product.stockQuantity}</div>
                    <div className="text-xs text-slate-500">Limit {product.criticalStockLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}
