'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Factory,
  FileImage,
  Home,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  PackagePlus,
  Landmark,
  PlugZap,
  QrCode,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api, clearAuthToken } from '@/lib/api';
import type { CurrentUser, UserRole } from '@/types';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  enabled?: boolean;
};

const ALL: UserRole[] = ['OWNER', 'MANAGER', 'STAFF'];
const OWNER_MANAGER: UserRole[] = ['OWNER', 'MANAGER'];
const OWNER_ONLY: UserRole[] = ['OWNER'];

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
      { href: '/eft-yonetim', label: 'EFT Ödemeleri', icon: Landmark, roles: OWNER_MANAGER },
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

// Bottom nav tabs — her role için
type BottomTab = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  roles: UserRole[];
  isMenu?: boolean;
};

const bottomTabs: BottomTab[] = [
  { key: 'home', label: 'Ana Sayfa', icon: Home, href: '/dashboard', roles: OWNER_MANAGER },
  { key: 'products', label: 'Ürünler', icon: Boxes, href: '/products', roles: ALL },
  { key: 'orders', label: 'Siparişler', icon: ShoppingCart, href: '/orders', roles: OWNER_MANAGER },
  { key: 'orders-staff', label: 'Siparişler', icon: ShoppingCart, href: '/staff/orders', roles: ['STAFF'] },
  { key: 'integrations', label: 'Pazaryeri', icon: PlugZap, href: '/integrations', roles: OWNER_MANAGER },
  { key: 'menu', label: 'Menü', icon: Menu, roles: ALL, isMenu: true },
];

const roleAllowedPaths: Record<UserRole, string[]> = {
  OWNER: [],
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

function canSee(roles: UserRole[], userRole?: UserRole): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

// ─── Desktop Top Nav (unchanged feel) ───────────────────────────────────────

function DesktopNav({
  user,
  pathname,
  openGroup,
  setOpenGroup,
  navRef,
  logout,
}: {
  user: CurrentUser | null;
  pathname: string;
  openGroup: string | null;
  setOpenGroup: (g: string | null) => void;
  navRef: React.RefObject<HTMLDivElement>;
  logout: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white shadow-sm overflow-visible">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6" ref={navRef}>
        <Link href={roleHome[user?.role ?? 'STAFF']} className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
            <BarChart3 size={16} />
          </div>
          <span className="text-sm font-bold text-ink">Erhan Flowers</span>
        </Link>

        <div className="mx-2 h-6 w-px bg-line" />

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
                  <span>{group.section}</span>
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
                  <span>{group.section}</span>
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

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold leading-tight">{user?.name}</div>
            <div className="text-[11px] text-slate-400">{roleLabel[user?.role ?? 'STAFF']}</div>
          </div>
          <button className="btn btn-secondary min-h-8 px-3 text-xs" onClick={logout} title="Çıkış yap">
            <LogOut size={15} />
            <span>Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Mobile Top Bar ──────────────────────────────────────────────────────────

function MobileTopBar({ title, user }: { title: string; user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-line">
      <div className="flex h-[52px] items-center px-4 gap-3">
        {/* Logo marka rengi */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <BarChart3 size={14} />
        </div>

        {/* Sayfa başlığı */}
        <span className="flex-1 text-[15px] font-bold text-ink truncate">{title}</span>

        {/* Kullanıcı avatarı */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-[11px] font-bold uppercase">
          {user?.name?.slice(0, 2) ?? 'EF'}
        </div>
      </div>
    </header>
  );
}

// ─── Mobile Bottom Nav ───────────────────────────────────────────────────────

function MobileBottomNav({
  user,
  pathname,
  onMenuOpen,
}: {
  user: CurrentUser | null;
  pathname: string;
  onMenuOpen: () => void;
}) {
  const visibleTabs = bottomTabs.filter((tab) => {
    // STAFF özel tab
    if (tab.key === 'orders-staff') return user?.role === 'STAFF';
    if (tab.key === 'orders') return user?.role !== 'STAFF';
    return canSee(tab.roles, user?.role);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line safe-pb">
      <div className="flex items-center">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.href
            ? pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(`${tab.href}/`))
            : false;

          if (tab.isMenu) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={onMenuOpen}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-400 active:bg-slate-50 transition-colors"
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.key}
              href={tab.href!}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors active:bg-slate-50 ${
                isActive ? 'text-brand' : 'text-slate-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Menu Drawer (slide-up) ──────────────────────────────────────────────────

function MenuDrawer({
  open,
  onClose,
  user,
  pathname,
  logout,
}: {
  open: boolean;
  onClose: () => void;
  user: CurrentUser | null;
  pathname: string;
  logout: () => void;
}) {
  // Tüm grupları ve item'ları listele
  const allGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.enabled ?? true) && canSee(item.roles, user?.role)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] flex flex-col ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex flex-col items-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line shrink-0">
          <div>
            <div className="text-sm font-bold text-ink">{user?.name}</div>
            <div className="text-xs text-slate-400">{roleLabel[user?.role ?? 'STAFF']}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav groups */}
        <div className="overflow-y-auto flex-1 pb-8">
          {allGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.section}>
                {/* Grup başlığı */}
                <div className="flex items-center gap-2 px-5 pt-5 pb-2">
                  <GroupIcon size={13} className="text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group.section}
                  </span>
                </div>

                {/* Grup item'ları */}
                <div className="mx-4 rounded-xl overflow-hidden border border-line divide-y divide-line">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-slate-50 ${
                          isActive ? 'bg-brand/5' : 'bg-white'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon size={15} />
                        </div>
                        <span
                          className={`flex-1 text-sm font-medium ${
                            isActive ? 'text-brand font-semibold' : 'text-ink'
                          }`}
                        >
                          {item.label}
                        </span>
                        <ChevronRight size={15} className="text-slate-300" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Çıkış */}
          <div className="mx-4 mt-5">
            <button
              type="button"
              onClick={() => { onClose(); logout(); }}
              className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 transition-colors active:bg-red-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-500">
                <LogOut size={15} />
              </div>
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Shell ──────────────────────────────────────────────────────────────

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Drawer açıkken scroll engelle
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    clearAuthToken();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Yükleniyor...
      </div>
    );
  }

  return (
    <>
      {/* ── MASAÜSTÜ (lg+) ── */}
      <div className="hidden lg:block min-h-screen bg-[#f7f8f6]">
        <DesktopNav
          user={user}
          pathname={pathname}
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
          navRef={navRef as React.RefObject<HTMLDivElement>}
          logout={logout}
        />
        <main className="px-4 py-6 lg:px-8">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-ink">{title}</h1>
          </div>
          {children}
        </main>
      </div>

      {/* ── MOBİL (< lg) ── */}
      <div className="lg:hidden min-h-screen bg-[#f7f8f6]">
        <MobileTopBar title={title} user={user} />

        <main className="px-4 py-4 pb-24">
          {children}
        </main>

        <MobileBottomNav
          user={user}
          pathname={pathname}
          onMenuOpen={() => setDrawerOpen(true)}
        />

        <MenuDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={user}
          pathname={pathname}
          logout={logout}
        />
      </div>
    </>
  );
}
