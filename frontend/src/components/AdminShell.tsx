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
  // hangi roller görebilir
  roles: UserRole[];
  enabled?: boolean;
};

// Rol hiyerarşisi: OWNER > MANAGER > STAFF
const ALL: UserRole[] = ['OWNER', 'MANAGER', 'STAFF'];
const OWNER_MANAGER: UserRole[] = ['OWNER', 'MANAGER'];
const OWNER_ONLY: UserRole[] = ['OWNER'];
const STAFF_ONLY: UserRole[] = ['STAFF'];

const navGroups: { section: string; icon: LucideIcon; items: NavItem[] }[] = [
  {
    section: 'Ana Sayfa',
    icon: Home,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: Home, roles: OWNER_MANAGER }],
  },
  {
    section: 'Ürün & Stok',
    icon: Boxes,
    items: [
      { href: '/products', label: 'Ürün Merkezi', icon: Boxes, roles: ALL },
      { href: '/media', label: 'Medya Merkezi', icon: FileImage, roles: OWNER_MANAGER },
      { href: '/model-codes', label: 'Model Kodu', icon: PackagePlus, roles: OWNER_MANAGER },
      { href: '/barcodes', label: 'Barkod', icon: QrCode, roles: OWNER_MANAGER },
      { href: '/stock-cards', label: 'Stok Kartları', icon: Warehouse, roles: OWNER_MANAGER },
    ],
  },
  {
    section: 'Maliyet',
    icon: Factory,
    items: [
      { href: '/production-costs', label: 'Trendyol Maliyet', icon: Factory, roles: OWNER_ONLY },
      { href: '/costs', label: 'Stoktan Maliyet', icon: Factory, roles: OWNER_ONLY },
      { href: '/hesap-makinesi', label: 'Hesap Makinesi', icon: Calculator, roles: OWNER_MANAGER },
    ],
  },
  {
    section: 'Satış',
    icon: ShoppingCart,
    items: [
      { href: '/orders', label: 'Siparişler', icon: ShoppingCart, roles: OWNER_MANAGER },
      { href: '/staff/orders', label: 'Personel Sipariş', icon: ShoppingCart, roles: ALL },
      { href: '/sales', label: 'Satış Merkezi', icon: ShoppingCart, roles: OWNER_MANAGER, enabled: process.env.NEXT_PUBLIC_ENABLE_SALES_CENTER === 'true' },
      { href: '/crm', label: 'CRM', icon: Users, roles: OWNER_MANAGER },
    ],
  },
  {
    section: 'Pazaryeri',
    icon: PlugZap,
    items: [
      { href: '/integrations', label: 'Entegrasyon', icon: PlugZap, roles: OWNER_MANAGER },
      { href: '/market-analizi', label: 'Pazar Analizi', icon: Megaphone, roles: OWNER_MANAGER },
    ],
  },
  {
    section: 'Yönetim',
    icon: CircleDollarSign,
    items: [
      { href: '/finance', label: 'Finans', icon: CircleDollarSign, roles: OWNER_ONLY },
      { href: '/borclar', label: 'Tedarikçi Borçları', icon: Warehouse, roles: OWNER_ONLY },
      { href: '/reports', label: 'Raporlar', icon: BarChart3, roles: OWNER_MANAGER },
      { href: '/staff/tasks', label: 'Personel Görev', icon: ListChecks, roles: OWNER_MANAGER, enabled: process.env.NEXT_PUBLIC_ENABLE_SALES_CENTER === 'true' },
      { href: '/settings', label: 'Ayarlar', icon: Settings, roles: OWNER_ONLY },
    ],
  },
];

// hangi path'lere hangi roller erişebilir
const roleAllowedPaths: Record<UserRole, string[]> = {
  OWNER: [], // boş = hepsine erişebilir
  MANAGER: [
    '/dashboard', '/products', '/media', '/model-codes', '/barcodes', '/stock-cards',
    '/hesap-makinesi', '/orders', '/staff/orders', '/sales', '/crm',
    '/integrations', '/market-analizi', '/reports', '/staff/tasks',
  ],
  STAFF: ['/staff/orders', '/products'],
};

const roleLabel: Record<UserRole, string> = {
  OWNER: 'Sistem sahibi',
  MANAGER: 'Müdür',
  STAFF: 'Personel',
};

const roleHome: Record<UserRole, string> = {
  OWNER: '/dashboard',
  MANAGER: '/dashboard',
  STAFF: '/staff/orders',
};

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
        const role = currentUser.role;
        if (role !== 'OWNER') {
          const allowed = roleAllowedPaths[role] ?? [];
          const canAccess = allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          if (!canAccess) router.replace(roleHome[role]);
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
          <Link href={roleHome[user?.role ?? 'STAFF']} className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
              <BarChart3 size={16} />
            </div>
            <span className="hidden text-sm font-bold text-ink lg:block">Erhan Flowers</span>
          </Link>

          <div className="mx-2 hidden h-6 w-px bg-line lg:block" />

          {/* Group tabs */}
          <nav className="flex flex-1 items-center gap-0.5 flex-wrap">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(
                (item) => (item.enabled ?? true) && canSee(item.roles, user?.role)
              );
              if (!visibleItems.length) return null;

              const isSingleItem = visibleItems.length === 1;
              const isActive = visibleItems.some(
                (item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
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
              <div className="text-[11px] text-slate-400">{roleLabel[user?.role ?? 'STAFF']}</div>
            </div>
            <button className="btn btn-secondary min-h-8 px-3 text-xs" onClick={logout} title="Çıkış yap">
              <LogOut size={15} />
              <span className="hidden sm:block">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}

function canSee(roles: UserRole[], userRole?: UserRole): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}
