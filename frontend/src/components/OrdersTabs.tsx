'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Role = 'OWNER' | 'MANAGER' | 'STAFF';

/** Sipariş sayfaları tek yerde: menüde tek "Siparişler", sayfaların üstünde bu sekmeler. */
const TABS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/orders', label: 'Pazaryeri Siparişleri', roles: ['OWNER', 'MANAGER'] },
  { href: '/web-siparisler', label: 'Web & Telefon Siparişleri', roles: ['OWNER', 'MANAGER'] },
  { href: '/sabah-ciktisi', label: '🖨️ Çıktı Merkezi (A5)', roles: ['OWNER', 'MANAGER', 'STAFF'] },
  { href: '/adres-ciktisi', label: 'Telefon Siparişi Gir · Adres', roles: ['OWNER', 'MANAGER', 'STAFF'] },
  { href: '/iade-takip', label: 'İadeler', roles: ['OWNER', 'MANAGER'] },
  { href: '/eft-yonetim', label: 'EFT Ödemeleri', roles: ['OWNER', 'MANAGER'] },
  { href: '/staff/photo-archive', label: 'Fotoğraf Arşivi', roles: ['OWNER', 'MANAGER', 'STAFF'] },
];

let cachedRole: Role | null = null;

export function OrdersTabs() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(cachedRole);

  useEffect(() => {
    if (cachedRole) return;
    api<{ role: Role }>('/auth/me')
      .then((u) => { cachedRole = u.role; setRole(u.role); })
      .catch(() => null);
  }, []);

  const tabs = TABS.filter((t) => !role || t.roles.includes(role));

  return (
    <nav className="mb-4 -mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-0">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              active ? 'border-emerald-600 bg-white text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
