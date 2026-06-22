'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, FileText, Wallet, Receipt } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/properties', label: 'Imóveis', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Inquilinos', icon: Users },
  { href: '/dashboard/contracts', label: 'Contratos', icon: FileText },
  { href: '/dashboard/finance', label: 'Mensalidades', icon: Wallet, exact: true },
  { href: '/dashboard/finance/expenses', label: 'Despesas', icon: Receipt },
]

export function MobileNav() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
