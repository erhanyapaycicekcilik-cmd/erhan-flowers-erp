'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/production-costs', label: 'Ürün Maliyet Merkezi' },
];

export function ProductionCostNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
            pathname === link.href ? 'bg-brand text-white' : 'border border-line bg-white text-slate-700'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
