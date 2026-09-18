import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  name: string
  url: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
        {items.map((item, index) => (
          <li key={item.url} className="flex items-center gap-1">
            {index < items.length - 1 ? (
              <>
                <Link href={item.url} className="hover:text-flora-600 transition-colors">
                  {item.name}
                </Link>
                <ChevronRight size={14} className="flex-shrink-0 text-gray-300" />
              </>
            ) : (
              <span className="text-gray-800 font-medium truncate max-w-[200px]">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
