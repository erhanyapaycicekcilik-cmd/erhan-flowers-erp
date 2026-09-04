'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Calculator,
  ChevronDown,
  CircleDollarSign,
  Factory,
  FileImage,
  Home,
  ListChecks,
  LogOut,
  Megaphone,
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

const navGroups: { section: string; icon: LucideIcon; items: NavItem[] }[] = [
  {
    section: 'Ana Sayfa',
    icon: Home,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: Home, ownerOnly: true }],
  },
  {
    section: 'Ürün & Stok',
    icon: Boxes,
    items: [
      { href: '/products', label: 'Ürün Merkezi', icon: Boxes, ownerOnly: true },
      { href: '/media', label: 'Medya Merkezi', icon: FileImage, ownerOnly: true },
      { href: '/model-codes', label: 'Model Kodu', icon: PackagePlus, ownerOnly: true },
      { href: '/barcodes', label: 'Barkod', icon: QrCode, ownerOnly: true },
      { href: '/stock-cards', label: 'Stok Kartları', icon: Warehouse, ownerOnly: true },
    ],
  },
  {
    section: 'Maliyet',
    icon: Factory,
    items: [
      { href: '/production-costs', label: 'Trendyol Maliyet', icon: Factory, ownerOnly: true },
      { href: '/costs', label: 'Stoktan Maliyet', icon: Factory, ownerOnly: true },
      { href: '/hesap-makinesi', label: 'Hesap Makinesi', icon: Calculator, ownerOnly: true },
    ],
  },
  {
    section: 'Satış',
    icon: ShoppingCart,
    items: [
      { href: '/orders', label: 'Siparişler', icon: ShoppingCart, ownerOnly: false },
      { href: '/sales', label: 'Satış Merkezi', icon: ShoppingCart, ownerOnly: true, enabled: process.env.NEXT_PUBLIC_ENABLE_SALES_CENTER === 'true' },
      { href: '/crm', label: 'CRM', icon: Users, ownerOnly: true },
    ],
  },
  {
    section: 'Pazaryeri',
    icon: PlugZap,
    items: [
      { href: '/integrations', label: 'Entegrasyon', icon: PlugZap, ownerOnly: true },
      { href: '/market-analizi', label: 'Pazar Analizi', icon: Megaphone, ownerOnly: true },
    ],
  },
  {
    section: 'Yönetim',
    icon: CircleDollarSign,
    items: [
      { href: '/finance', label: 'Finans', icon: CircleDollarSign, ownerOnly: true },
      { href: '/borclar', label: 'Tedarikçi Borçları', icon: Warehouse, ownerOnly: true },
      { href: '/reports', label: 'Raporlar', icon: BarChart3, ownerOnly: true },
      { href: '/staff/tasks', label: 'Personel Görev', icon: ListChecks, ownerOnly: true, enabled: process.env.NEXT_PUBLIC_ENABLE_SALES_CENTER === 'true' },
      { href: '/settings', label: 'Ayarlar', icon: Settings, ownerOnly: true },
    ],
  },
];

// STAFF yalnızca /orders görebilir; diğer her path owner-only
const staffAllowedPaths = ['/orders'];
const ownerOnlyPaths = ['/dashboard', '/products', '/media', '/model-codes', '/barcodes', '/stock-cards', '/stock-counts', '/costs', '/production-costs', '/finance', '/borclar', '/reports', '/seo-products', '/publishing', '/knowledge-center', '/settings', '/integrations', '/market-analizi', '/hesap-makinesi', '/sales', '/crm', '/staff'];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<CurrentUser>('/auth/me')
      .then((currentUser) => {
        setUser(currentUser);
        if (currentUser.role !== 'OWNER') {
          const allowed = staffAllowedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          if (!allowed) router.replace('/orders');
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    clearAuthToken();
    router.replace('/login');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      {/* TOP NAV */}
      <header className="sticky top-0 z-50 border-b border-line bg-white shadow-sm overflow-visible">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6" ref={navRef}>
          {/* Logo */}
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
              <BarChart3 size={16} />
            </div>
            <span className="hidden text-sm font-bold text-ink lg:block">Erhan Flowers</span>
          </Link>

          <div className="mx-2 hidden h-6 w-px bg-line lg:block" />

          {/* Group tabs */}
          <nav className="flex flex-1 items-center gap-0.5 flex-wrap">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) => (item.enabled ?? true) && canSeeNav(item.ownerOnly, user?.role));
              if (!visibleItems.length) return null;

              const isSingleItem = visibleItems.length === 1;
              const isActive = visibleItems.some((item) =>
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
              );
              const GroupIcon = group.icon;

              if (isSingleItem) {
                const item = visibleItems[0];
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={group.section}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                    }`}
                  >
                    <GroupIcon size={15} />
                    <span className="hidden sm:block">{group.section}</span>
                  </Link>
                );
              }

              return (
                <div key={group.section} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(openGroup === group.section ? null : group.section)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                    }`}
                  >
                    <GroupIcon size={15} />
                    <span className="hidden sm:block">{group.section}</span>
                    <ChevronDown size={13} className={`transition-transform ${openGroup === group.section ? 'rotate-180' : ''}`} />
                  </button>

                  {openGroup === group.section && (
                    <div className="absolute left-0 top-full z-[9999] mt-1 min-w-48 rounded-lg border border-line bg-white py-1 shadow-lg">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenGroup(null)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                              active ? 'bg-brand/10 text-brand' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={15} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold leading-tight">{user?.name}</div>
              <div className="text-[11px] text-slate-400">{user?.role === 'OWNER' ? 'Sistem sahibi' : 'Personel'}</div>
            </div>
            <button className="btn btn-secondary min-h-8 px-3 text-xs" onClick={logout} title="Çıkış yap">
              <LogOut size={15} />
              <span className="hidden sm:block">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT — full width */}
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}

function canSeeNav(ownerOnly: boolean, role?: UserRole) {
  return !ownerOnly || role === 'OWNER';
}
