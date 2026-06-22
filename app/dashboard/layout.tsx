import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { MobileNav } from '@/src/features/dashboard/components/MobileNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-slate-950 selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 flex justify-center pointer-events-none z-0">
        <div className="absolute -top-32 left-1/2 h-150 w-150 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-100 w-100 rounded-full bg-cyan-600/10 blur-[100px]" />
      </div>

      {/* Navbar — desktop */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/">
              <h1 className="bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-xl font-black text-transparent transition-opacity hover:opacity-80 sm:text-2xl">
                DOM ALUGUÉIS
              </h1>
            </Link>
            {/* Links apenas no desktop */}
            <div className="hidden md:flex gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Visão Geral</Link>
              <Link href="/dashboard/properties" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Imóveis</Link>
              <Link href="/dashboard/tenants" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Inquilinos</Link>
              <Link href="/dashboard/contracts" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Contratos</Link>
              <Link href="/dashboard/finance" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Mensalidades</Link>
              <Link href="/dashboard/finance/expenses" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Despesas</Link>
            </div>
          </div>

          {/* Ícone de perfil — desktop e mobile */}
          <Link
            href="/dashboard/profile"
            title="Meu perfil"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <UserCircle size={18} />
          </Link>
        </div>
      </nav>

      {/* Main Content — pb-20 no mobile para não sobrepor a bottom nav */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:py-12 sm:pb-12 lg:px-8">
        {children}
      </main>

      {/* Bottom nav — apenas mobile */}
      <MobileNav />
    </div>
  )
}
