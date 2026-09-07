'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiBaseUrl } from '@/lib/api';
import { Eye, EyeOff, Trash2, Plus, RefreshCw, ShieldCheck, Key } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

function adminFetch(path: string, token: string, options?: RequestInit) {
  return fetch(`${apiBaseUrl}/admin${path}`, {
    ...options,
    headers: { 'x-admin-token': token, 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
}

export default function AdminPanelPage() {
  const [token, setToken] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Yeni kullanıcı formu
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('STAFF');

  // Şifre sıfırlama
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState('');

  const loadUsers = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await adminFetch('/users', t);
      if (!res.ok) { setToken(''); return; }
      setUsers(await res.json() as User[]);
    } finally { setLoading(false); }
  }, []);

  async function login() {
    setAuthError('');
    const res = await fetch(`${apiBaseUrl}/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': passwordInput },
      body: JSON.stringify({ password: passwordInput }),
    });
    const data = await res.json() as { ok: boolean; token?: string };
    if (data.ok && data.token) {
      setToken(data.token);
      await loadUsers(data.token);
    } else {
      setAuthError('Şifre hatalı.');
    }
  }

  async function createUser() {
    if (!newEmail || !newPassword || !newName) { setMsg('Tüm alanları doldurun.'); return; }
    const res = await adminFetch('/users', token, {
      method: 'POST',
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole }),
    });
    if (res.ok) {
      setMsg('Kullanıcı oluşturuldu.');
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('STAFF');
      await loadUsers(token);
    } else {
      const e = await res.json() as { message?: string };
      setMsg(e.message ?? 'Hata.');
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    await adminFetch(`/users/${id}`, token, { method: 'DELETE' });
    setMsg('Kullanıcı silindi.');
    await loadUsers(token);
  }

  async function resetPassword() {
    if (!resetId || !resetPw) return;
    const res = await adminFetch(`/users/${resetId}/password`, token, {
      method: 'PUT',
      body: JSON.stringify({ password: resetPw }),
    });
    if (res.ok) { setMsg('Şifre güncellendi.'); setResetId(null); setResetPw(''); }
  }

  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 3000); return () => clearTimeout(t); } }, [msg]);

  // Giriş ekranı
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm rounded-xl bg-slate-800 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck size={28} className="text-brand" />
            <div>
              <div className="text-lg font-bold text-white">Admin Panel</div>
              <div className="text-xs text-slate-400">Erhan Flowers ERP</div>
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm text-slate-300">Admin Şifresi</span>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 pr-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                type={showPw ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void login(); }}
                autoComplete="off"
                placeholder="••••••••••"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          {authError && <div className="mt-2 text-sm text-red-400">{authError}</div>}
          <button onClick={() => void login()} className="mt-4 w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand/90 transition">
            Giriş Yap
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} className="text-brand" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadUsers(token)} className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-700 transition">
              <RefreshCw size={13} /> Yenile
            </button>
            <button onClick={() => setToken('')} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-700 transition">
              Çıkış
            </button>
          </div>
        </div>

        {msg && <div className="rounded-lg bg-brand/20 border border-brand/30 px-4 py-2 text-sm text-brand">{msg}</div>}

        {/* Kullanıcı listesi */}
        <div className="rounded-xl bg-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 font-semibold">Kullanıcılar</div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 text-slate-400 text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">İsim</th>
                  <th className="px-5 py-3 text-left">E-posta</th>
                  <th className="px-5 py-3 text-left">Rol</th>
                  <th className="px-5 py-3 text-left">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-5 py-3 text-slate-400">#{u.id}</td>
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-slate-300">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.role === 'OWNER' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setResetId(u.id); setResetPw(''); }}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 transition"
                        >
                          <Key size={11} /> Şifre
                        </button>
                        {u.role !== 'OWNER' && (
                          <button
                            onClick={() => void deleteUser(u.id)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-red-900/40 text-red-400 hover:bg-red-900/70 transition"
                          >
                            <Trash2 size={11} /> Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Şifre sıfırlama modalı */}
        {resetId !== null && (
          <div className="rounded-xl bg-slate-800 p-5 space-y-3 border border-brand/30">
            <div className="font-semibold">#{resetId} numaralı kullanıcı şifresini sıfırla</div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                type="text"
                placeholder="Yeni şifre"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                autoComplete="off"
              />
              <button onClick={() => void resetPassword()} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white text-sm hover:bg-brand/90 transition">
                Kaydet
              </button>
              <button onClick={() => setResetId(null)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700 transition">
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Yeni kullanıcı */}
        <div className="rounded-xl bg-slate-800 p-5 space-y-4">
          <div className="font-semibold flex items-center gap-2"><Plus size={16} /> Yeni Kullanıcı</div>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand" placeholder="İsim" value={newName} onChange={(e) => setNewName(e.target.value)} autoComplete="off" />
            <input className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand" placeholder="E-posta" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="off" />
            <input className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Şifre" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="off" />
            <select className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="STAFF">Personel (STAFF)</option>
              <option value="MANAGER">Müdür (MANAGER)</option>
              <option value="OWNER">Sistem Sahibi (OWNER)</option>
            </select>
          </div>
          <button onClick={() => void createUser()} className="rounded-lg bg-brand px-5 py-2 font-semibold text-white text-sm hover:bg-brand/90 transition">
            Kullanıcı Oluştur
          </button>
        </div>
      </div>
    </main>
  );
}
