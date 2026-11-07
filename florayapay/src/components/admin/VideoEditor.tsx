'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  productId: number
  currentVideoUrl: string | null
}

export function VideoEditor({ productId, currentVideoUrl }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentVideoUrl ?? '')
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
          currentVideoUrl
            ? 'border-[#5C7A62]/40 text-[#5C7A62] bg-[#5C7A62]/5 hover:bg-[#5C7A62]/10'
            : 'border-[#E0DDD4] text-[#8C8A82] hover:border-[#5C7A62] hover:text-[#5C7A62]'
        }`}>
        {currentVideoUrl ? '▶ Video var' : '+ Video ekle'}
      </button>
    )
  }

  async function save() {
    setSaving(true)
    try {
      const secret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'dev-secret-local'
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'
      await fetch(`${apiUrl}/public/catalog/admin/set-video?secret=${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, videoUrl: value.trim() || null }),
      })
      router.refresh()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1 min-w-[200px]">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="YouTube / TikTok URL"
        autoFocus
        className="flex-1 px-2 py-1 rounded-lg border border-[#5C7A62] text-xs focus:outline-none"
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      />
      <button onClick={save} disabled={saving}
        className="px-2 py-1 bg-[#5C7A62] text-white text-xs rounded-lg disabled:opacity-50">
        {saving ? '…' : '✓'}
      </button>
      <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-[#8C8A82] hover:text-[#0D1510]">✕</button>
    </div>
  )
}
