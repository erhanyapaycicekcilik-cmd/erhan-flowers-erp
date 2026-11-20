'use client'

import { AdminShell } from '@/components/AdminShell'
import { BillsPanel } from '@/components/BillsPanel'

export default function FaturalarPage() {
  return (
    <AdminShell title="Fatura & Ödeme Takibi">
      <div className="p-4 max-w-6xl mx-auto">
        <BillsPanel />
      </div>
    </AdminShell>
  )
}
