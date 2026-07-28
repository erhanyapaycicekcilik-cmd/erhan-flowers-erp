'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { api, saveAuthToken } from '@/lib/api';
import type { UserRole } from '@/types';

type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
};

const loginPresets = [
  {
    label: 'Sistem Sahibi',
    email: 'owner@erhanflowers.com',
    password: 'ErhanFlowers123!',
  },
  {
    label: 'Personel',
    email: 'personel@erhanflowers.com',
    password: '123456',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@erhanflowers.com');
  const [password, setPassword] = useState('ErhanFlowers123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await login(email, password);
  }

  async function login(loginEmail: string, loginPassword: string) {
    setError('');
    setLoading(true);

    try {
      const result = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        json: { email: loginEmail, password: loginPassword, rememberMe },
      });
      saveAuthToken(result.token);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] px-4">
      <form onSubmit={submit} className="panel w-full max-w-md p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white">
            <KeyRound size={21} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Erhan Flowers Panel</h1>
            <p className="text-sm text-slate-500">Sistem sahibi veya personel girişi</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-md border border-line bg-slate-50 p-2">
          {loginPresets.map((preset) => (
            <button
              key={preset.email}
              type="button"
              onClick={() => {
                setEmail(preset.email);
                setPassword(preset.password);
                setError('');
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                email === preset.email ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-secondary mb-4 w-full"
          onClick={() => {
            setEmail('personel@erhanflowers.com');
            setPassword('123456');
            setError('');
            void login('personel@erhanflowers.com', '123456');
          }}
          disabled={loading}
        >
          Personel Girişi
        </button>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="label">E-posta</span>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Şifre</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand"
            />
            Beni hatırla
          </label>
        </div>

        {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <button className="btn btn-primary mt-6 w-full" disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </main>
  );
}
