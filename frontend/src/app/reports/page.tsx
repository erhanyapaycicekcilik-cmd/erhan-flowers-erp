import Link from 'next/link';
import { BarChart3, CircleDollarSign, ClipboardList, Users } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';

const reports = [
  { href: '/dashboard', title: 'Genel ERP Özeti', text: 'Ürün, stok, barkod ve kritik stok göstergeleri', icon: BarChart3 },
  { href: '/finance', title: 'Finans Raporları', text: 'Gelir, gider, tahsilat ve ödeme raporları', icon: CircleDollarSign },
  { href: '/crm', title: 'Müşteri Raporları', text: 'Müşteri kaynağı, izinler ve alışveriş geçmişi', icon: Users },
  { href: '/stock-counts', title: 'Stok Sayım Raporları', text: 'Sayım oturumları ve stok farkları', icon: ClipboardList },
];

export default function ReportsPage() {
  return <AdminShell title="Raporlar"><div className="grid gap-4 md:grid-cols-2">{reports.map((report) => <Link key={report.href} href={report.href} className="panel flex gap-4 p-5 hover:border-brand"><report.icon className="text-brand" size={24} /><div><h2 className="font-bold">{report.title}</h2><p className="mt-1 text-sm text-slate-500">{report.text}</p></div></Link>)}</div></AdminShell>;
}
