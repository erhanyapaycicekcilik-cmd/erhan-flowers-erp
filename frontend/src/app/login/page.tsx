'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { api, saveAuthToken } from '@/lib/api';
import type { UserRole } from '@/types';

type LoginResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: UserRole };
};

type LoginMode = 'owner' | 'manager' | 'staff';

const modeConfig: Record<LoginMode, { label: string; email: string; roleLabel: string }> = {
  owner:   { label: 'Sistem Sahibi', email: 'owner@erhanflowers.com',   roleLabel: 'Tam yetki' },
  manager: { label: 'Müdür',         email: 'mudur@erhanflowers.com',   roleLabel: 'Finans hariç' },
  staff:   { label: 'Personel',      email: 'personel@erhanflowers.com', roleLabel: 'Sipariş & Fiyat' },
};

const roleHome: Record<UserRole, string> = {
  OWNER:   '/dashboard',
  MANAGER: '/dashboard',
  STAFF:   '/staff/orders',
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(m: LoginMode) {
    setMode(m);
    setEmail(modeConfig[m].email);
    setPassword('');
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        json: { email, password, rememberMe },
      });
      saveAuthToken(result.token);
      router.replace(roleHome[result.user.role] ?? '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] px-4">
      <form onSubmit={submit} autoComplete="off" className="panel w-full max-w-md p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white">
            <KeyRound size={21} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Erhan Flowers Panel</h1>
            <p className="text-sm text-slate-500">Giriş türünüzü seçin</p>
          </div>
        </div>

        {/* 3 mod seçici */}
        <div className="mb-5 grid grid-cols-3 gap-1.5 rounded-md border border-line bg-slate-50 p-1">
          {(Object.entries(modeConfig) as [LoginMode, typeof modeConfig[LoginMode]][]).map(([m, cfg]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex flex-col items-center rounded-md px-2 py-2 text-xs font-semibold transition ${
                mode === m ? 'bg-brand text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{cfg.label}</span>
              <span className={`mt-0.5 text-[10px] font-normal ${mode === m ? 'text-white/70' : 'text-slate-400'}`}>{cfg.roleLabel}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="label">E-posta</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Şifre</span>
            <div className="relative">
              <input
                className="field pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand"
            />
            Beni hatırla (bu cihazda oturumumu açık tut)
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button className="btn btn-primary mt-6 w-full" disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </main>
  );
}
