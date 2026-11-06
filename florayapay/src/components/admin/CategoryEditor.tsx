'use client'

import { useState, useTransition } from 'react'
import { updateProductCategory } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  'Yapay Ağaç',
  'Yapay Çiçek',
  'Bambu',
  'Sarmaşık',
  'Bodur Ağaç',
  'Dikey Bahçe',
  'Saksı & Vazo',
  'Kaktüs & Sukulent',
  'Orkide',
  'Palmiye',
  'Ficus',
  'Lavanta',
]

interface Props {
  productId: number
  currentCategory: string | null
}

export function CategoryEditor({ productId, currentCategory }: Props) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(currentCategory || '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 bg-[#F4F2EC] rounded-full text-[#5C5C52] hover:bg-[#E8E5DC] transition-colors text-left max-w-[140px] truncate"
        title={currentCategory || 'Kategori yok — düzenle'}
      >
        {currentCategory || <span className="text-[#C4C0B8]">— ekle</span>}
      </button>
    )
  }

  function save() {
    setStatus('saving')
    startTransition(async () => {
      const res = await updateProductCategory(productId, selected, null)
      if (res.ok) {
        setStatus('ok')
        setEditing(false)
        router.refresh()
      } else {
        setStatus('err')
      }
    })
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="text-xs px-2 py-1 rounded-lg border border-[#5C7A62] bg-white focus:outline-none max-w-[140px]"
        autoFocus
      >
        <option value="">— seç —</option>
        {CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={isPending || !selected}
        className="text-xs px-2 py-1 bg-[#5C7A62] text-white rounded-lg disabled:opacity-50 hover:bg-[#4a6350]"
      >
        {isPending ? '…' : '✓'}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs px-2 py-1 bg-[#F4F2EC] text-[#5C5C52] rounded-lg hover:bg-[#E0DDD4]"
      >
        ✕
      </button>
      {status === 'err' && <span className="text-xs text-red-500">Hata!</span>}
    </div>
  )
}
