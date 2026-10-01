'use client'

import { useEffect, useState } from 'react'
import { apiBaseUrl } from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  MANAGER: 'Yönetici',
  STAFF: 'Personel',
}

export default function KullanicilarPage() {
  const [adminToken, setAdminToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Şifre sıfırlama state'i
  const [resetId, setResetId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // Yeni kullanıcı state'i
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'STAFF' })

  async function adminFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function login() {
    setTokenError('')
    try {
      const data = await fetch(`${apiBaseUrl}/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': tokenInput },
        body: JSON.stringify({ password: tokenInput }),
      }).then((r) => r.json())
      if (!data.ok) { setTokenError('Şifre hatalı'); return }
      setAdminToken(tokenInput)
      sessionStorage.setItem('admin_token', tokenInput)
    } catch {
      setTokenError('Bağlantı hatası')
    }
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await adminFetch('/admin/users')
      setUsers(data)
    } catch {
      setMessage('Kullanıcılar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token')
    if (saved) setAdminToken(saved)
  }, [])

  useEffect(() => {
    if (adminToken) loadUsers()
  }, [adminToken])

  async function handleResetPassword(id: number) {
    if (!newPassword || newPassword.length < 6) { setMessage('Şifre en az 6 karakter olmalı'); return }
    try {
      await adminFetch(`/admin/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      })
      setMessage('Şifre güncellendi')
      setResetId(null)
      setNewPassword('')
    } catch {
      setMessage('Şifre güncellenemedi')
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`${name} kullanıcısını silmek istediğinizden emin misiniz?`)) return
    try {
      await adminFetch(`/admin/users/${id}`, { method: 'DELETE' })
      setMessage('Kullanıcı silindi')
      setUsers((u) => u.filter((x) => x.id !== id))
    } catch {
      setMessage('Kullanıcı silinemedi')
    }
  }

  async function handleAddUser() {
    if (!newUser.name || !newUser.email || !newUser.password) { setMessage('Tüm alanları doldurun'); return }
    try {
      const created = await adminFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      })
      setUsers((u) => [...u, created])
      setShowAdd(false)
      setNewUser({ name: '', email: '', password: '', role: 'STAFF' })
      setMessage('Kullanıcı eklendi')
    } catch {
      setMessage('Kullanıcı eklenemedi')
    }
  }

  // Admin şifre giriş ekranı
  if (!adminToken) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20">
        <h1 className="text-2xl font-bold mb-2">Kullanıcı Yönetimi</h1>
        <p className="text-gray-500 text-sm mb-6">Devam etmek için yönetici şifresini girin.</p>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
          placeholder="Yönetici şifresi"
          className="w-full border rounded-lg px-4 py-2 mb-3 text-base"
        />
        {tokenError && <p className="text-red-500 text-sm mb-3">{tokenError}</p>}
        <button
          onClick={login}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
        >
          Giriş
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} kullanıcı</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            + Yeni Kullanıcı
          </button>
          <button
            onClick={() => { setAdminToken(''); sessionStorage.removeItem('admin_token') }}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Çıkış
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex justify-between">
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      {/* Yeni kullanıcı formu */}
      {showAdd && (
        <div className="mb-6 p-4 border rounded-xl bg-gray-50">
          <h2 className="font-semibold mb-3">Yeni Kullanıcı Ekle</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Ad Soyad"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="E-posta"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Şifre (min. 6 karakter)"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="STAFF">Personel</option>
              <option value="MANAGER">Yönetici</option>
              <option value="OWNER">Sahip</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAddUser} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Ekle</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">İptal</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">E-posta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt Tarihi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    {resetId === u.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Yeni şifre"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-36"
                        />
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => { setResetId(null); setNewPassword('') }}
                          className="px-3 py-1 border rounded text-xs hover:bg-gray-100"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setResetId(u.id); setNewPassword('') }}
                          className="px-3 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600"
                        >
                          Şifre Değiştir
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
