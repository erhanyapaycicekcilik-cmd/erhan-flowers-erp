'use client';

import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { apiBaseUrl, getStoredToken } from '@/lib/api';

export type Employee = {
  id: number;
  fullName: string;
  nationalId?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  position?: string | null;
  department?: string | null;
  hireDate: string;
  terminationDate?: string | null;
  terminationReason?: string | null;
  sgkNumber?: string | null;
  iban?: string | null;
  netSalary?: number | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  notes?: string | null;
  hasPhoto: boolean;
  updatedAt?: string;
  status: 'ACTIVE' | 'LEFT';
  absentDays?: number;
  leaveDays?: number;
  earlyLeaves?: number;
  lates?: number;
};

export type Attendance = {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  time?: string | null;
  note?: string | null;
  createdBy?: string | null;
};

export type EmployeeDocument = { id: number; title: string; originalName?: string | null; mimeType?: string | null; createdAt: string };

export type EmployeeDetail = Employee & { attendance: Attendance[]; documents: EmployeeDocument[] };

export const ATTENDANCE: Record<string, { label: string; unit: 'DAY' | 'TIMES'; color: string }> = {
  ABSENT: { label: 'Gelmedi', unit: 'DAY', color: 'bg-red-100 text-red-800' },
  ANNUAL_LEAVE: { label: 'Yıllık İzin', unit: 'DAY', color: 'bg-emerald-100 text-emerald-800' },
  EXCUSE_LEAVE: { label: 'Mazeret İzni', unit: 'DAY', color: 'bg-sky-100 text-sky-800' },
  UNPAID_LEAVE: { label: 'Ücretsiz İzin', unit: 'DAY', color: 'bg-slate-200 text-slate-800' },
  SICK_REPORT: { label: 'Rapor', unit: 'DAY', color: 'bg-violet-100 text-violet-800' },
  EARLY_LEAVE: { label: 'Erken Çıkış', unit: 'TIMES', color: 'bg-amber-100 text-amber-800' },
  LATE: { label: 'Geç Geldi', unit: 'TIMES', color: 'bg-orange-100 text-orange-800' },
};

export function fmtDate(v?: string | null) {
  if (!v) return '—';
  const [y, m, d] = v.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Kıdem: işe giriş → çıkış (veya bugün) */
export function seniority(hire: string, end?: string | null) {
  const a = new Date(hire);
  const b = end ? new Date(end) : new Date();
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const text = years ? `${years} yıl${rest ? ` ${rest} ay` : ''}` : `${rest} ay`;
  return { years, months, text };
}

/** 4857 s. İş Kanunu md. 53: 1-5 yıl 14 gün, 5-15 yıl 20 gün, 15+ yıl 26 gün */
export function annualLeaveRight(years: number) {
  if (years < 1) return 0;
  if (years < 5) return 14;
  if (years < 15) return 20;
  return 26;
}

/** Yetki başlığıyla fotoğrafı çeker (dosyalar herkese açık klasörde değil) */
export function EmployeePhoto({ id, hasPhoto, version, className }: { id: number; hasPhoto: boolean; version?: string | number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!hasPhoto) { setSrc(null); return; }
    let url: string | null = null;
    let cancelled = false;
    const token = getStoredToken();
    fetch(`${apiBaseUrl}/personnel/${id}/photo?v=${encodeURIComponent(String(version ?? ''))}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || cancelled) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, hasPhoto, version]);

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-slate-100 text-slate-400 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-1/2 w-1/2" />}
    </div>
  );
}

export async function openDocument(docId: number) {
  const token = getStoredToken();
  const win = window.open('', '_blank');
  const r = await fetch(`${apiBaseUrl}/personnel/documents/${docId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!r.ok) { win?.close(); alert('Belge açılamadı.'); return; }
  const url = URL.createObjectURL(await r.blob());
  if (win) win.location.href = url; else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
