'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Calculator,
  CircleDollarSign,
  Factory,
  FileImage,
  Home,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  PackagePlus,
  PlugZap,
  QrCode,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { api, clearAuthToken } from '@/lib/api';
import type { CurrentUser, UserRole } from '@/types';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly: boolean;
  enabled?: boolean;
};

const navGroups: { section: string | null; items: NavItem[] }[] = [
  {
    section: null,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: Home, ownerOnly: false }],
  },
  {
    section: 'Ürün & Stok',
    items: [
      { href: '/products', label: 'Ürün Merkezi', icon: Boxes, ownerOnly: false },
      { href: '/media', label: 'Medya Merkezi', icon: FileImage, ownerOnly: false },
      { href: '/model-codes', label: 'Model Kodu', icon: PackagePlus, ownerOnly: true },
      { href: '/barcodes', label: 'Barkod', icon: QrCode, ownerOnly: false },
      { href: '/stock-cards', label: 'Stok', icon: Warehouse, ownerOnly: false },
    ],
  },
  {
    section: 'Maliyet',
    items: [
      { href: '/production-costs', label: 'Trendyol Maliyet', icon: Factory, ownerOnly: true },
      { href: '/costs', label: 'Stoktan Maliyet', icon: Factory, ownerOnly: true },
    ],
  },
  {
    section: 'Satış',
    items: [
      { href: '/orders', label: 'Siparişler', icon: ShoppingCart, ownerOnly: false },
      { href: '/sales', label: 'Satış', icon: ShoppingCart, ownerOnly: false, enabled: process.env.NEXT_PUBLIC_ENABLE_SALES_CENTER === 'true' },
      { href: '/crm', label: 'CRM', icon: Users, ownerOnly: false },
    ],
  },
  {
    section: 'Pazaryeri',
    items: [
      { href: '/integrations', label: 'Entegrasyon', icon: PlugZap, ownerOnly: true },
      { href: '/market-analizi', label: 'Pazar Analizi', icon: Megaphone, ownerOnly: true },
    ],
  },
  {
    section: 'Araçlar',
    items: [{ href: '/hesap-makinesi', label: 'Hesap Makinesi', icon: Calculator, ownerOnly: true }],
  },
  {
    section: 'Ekip',
    items: [{ href: '/staff/tasks', label: 'Personel Görev', icon: ListChecks, ownerOnly: false, enabled: process.env.NEXT_PUBLIC_ENABLE_SALES_CENTER === 'true' }],
  },
  {
    section: 'Yönetim',
    items: [
      { href: '/finance', label: 'Finans', icon: CircleDollarSign, ownerOnly: true },
      { href: '/reports', label: 'Raporlar', icon: BarChart3, ownerOnly: true },
      { href: '/settings', label: 'Ayarlar', icon: Settings, ownerOnly: true },
    ],
  },
];

const nav = navGroups.flatMap((group) => group.items);

const ownerOnlyPaths = ['/stock-counts', '/costs', '/production-costs', '/finance', '/reports', '/seo-products', '/publishing', '/model-codes', '/knowledge-center', '/settings', '/integrations', '/market-analizi', '/hesap-makinesi'];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    api<CurrentUser>('/auth/me')
      .then((currentUser) => {
        setUser(currentUser);
        if (currentUser.role !== 'OWNER' && ownerOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
          router.replace('/stock-cards');
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    clearAuthToken();
    router.replace('/login');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Yükleniyor...</div>;
  }

  const visibleNav = nav.filter((item) => (item.enabled ?? true) && canSeeNav(item.ownerOnly, user?.role));

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      <aside className={`fixed inset-y-0 left-0 hidden border-r border-line bg-white transition-all lg:block ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className={`flex h-16 items-center gap-3 border-b border-line ${sidebarCollapsed ? 'justify-center px-3' : 'px-6'}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white">
            <BarChart3 size={20} />
          </div>
          {!sidebarCollapsed && <div>
            <div className="text-sm font-bold">Erhan Flowers</div>
            <div className="text-xs text-slate-500">ERP Admin Panel</div>
          </div>}
        </div>

        <nav className="space-y-1 px-3 py-4">
          <button
            type="button"
            className={`mb-3 flex w-full items-center rounded-md px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? 'Menüyü aç' : 'Menüyü daralt'}
          >
            <Menu size={18} />
            {!sidebarCollapsed && 'Menüyü daralt'}
          </button>
          {navGroups.map((group) => {
            const groupItems = group.items.filter((item) => (item.enabled ?? true) && canSeeNav(item.ownerOnly, user?.role));
            if (!groupItems.length) return null;
            return (
              <div key={group.section ?? 'root'} className="mb-1">
                {group.section && !sidebarCollapsed && (
                  <div className="mb-1 mt-3 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.section}</div>
                )}
                {group.section && sidebarCollapsed && <div className="my-2 border-t border-line" />}
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium ${sidebarCollapsed ? 'justify-center' : 'gap-3'} ${
                        active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
                      }`}
                    >
                      <Icon size={18} />
                      {!sidebarCollapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className={`transition-all ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-ink">{title}</h1>
              <p className="text-sm text-slate-500">{user?.role === 'OWNER' ? 'Sistem sahibi yönetim alanı' : 'Personel çalışma alanı'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <button className="btn btn-secondary" onClick={logout} title="Çıkış yap">
                <LogOut size={17} />
                Çıkış
              </button>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${
                  pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function canSeeNav(ownerOnly: boolean, role?: UserRole) {
  return !ownerOnly || role === 'OWNER';
}
