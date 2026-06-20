'use client'

import { useAuth } from '@/src/features/auth/hooks/useAuth'
import Link from 'next/link'

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">Dom Aluguéis</span>
        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Entrar
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500"
              >
                Começar grátis
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 pb-32 pt-24 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-indigo-400">
          Gestão de imóveis
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Controle seus imóveis com{' '}
          <span className="text-indigo-400">clareza</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          Cadastre propriedades, gerencie inquilinos e acompanhe contratos e receitas
          em um único lugar. Simples e direto ao ponto.
        </p>

        {!isAuthenticated && (
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold transition hover:bg-indigo-500"
            >
              Criar conta gratuita
            </Link>
            <Link
              href="/auth/login"
              className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Já tenho conta
            </Link>
          </div>
        )}

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 gap-px rounded-2xl border border-slate-800 bg-slate-800 md:grid-cols-3">
          {[
            {
              title: 'Imóveis',
              description: 'Cadastre e organize todo o seu portfólio de propriedades.',
            },
            {
              title: 'Inquilinos',
              description: 'Mantenha os dados dos seus inquilinos sempre atualizados.',
            },
            {
              title: 'Contratos',
              description: 'Crie contratos, defina valores e acompanhe vencimentos.',
            },
          ].map((item) => (
            <div key={item.title} className="bg-slate-950 p-8 text-left first:rounded-l-2xl last:rounded-r-2xl">
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        © {new Date().getFullYear()} Dom Aluguéis
      </footer>
    </div>
  )
}
