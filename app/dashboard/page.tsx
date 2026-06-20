import { createClient } from '@/src/shared/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/src/shared/components/ui/Button'
import { signOut } from '@/src/features/auth/actions/auth'
import { MonthFilter } from '@/src/features/dashboard/components/MonthFilter'
import { RevenueChart, type ChartMonth } from '@/src/features/dashboard/components/RevenueChart'
import { Suspense } from 'react'
import Link from 'next/link'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function pad(n: number) { return String(n).padStart(2, '0') }

function lastDayOf(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

interface EntryWithContract {
  is_paid: boolean
  due_date: string
  water_amount: number | null
  energy_amount: number | null
  extra_amount: number | null
  property?: { title: string } | null
  contract?: {
    rent_value: number
    water_billing_type: string
    water_value: number | null
    energy_billing_type: string
    energy_value: number | null
  } | null
}

function calcTotal(e: EntryWithContract): number {
  const c = e.contract
  const rent = c?.rent_value ?? 0
  const wb = c?.water_billing_type ?? 'not_included'
  const eb = c?.energy_billing_type ?? 'not_included'
  const water = wb === 'fixed' ? (e.water_amount || c?.water_value || 0)
    : wb === 'consumption' ? (e.water_amount || 0) : 0
  const energy = eb === 'fixed' ? (e.energy_amount || c?.energy_value || 0)
    : eb === 'consumption' ? (e.energy_amount || 0) : 0
  return rent + water + energy + (e.extra_amount || 0)
}

async function DashboardContent({ month, year }: { month: number; year: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const firstDay = `${year}-${pad(month)}-01`
  const lastDay = `${year}-${pad(month)}-${lastDayOf(year, month)}`

  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const in60Days = (() => {
    const d = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })()

  // Dados do gráfico: 6 meses anteriores ao mês selecionado
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const chartStart = `${chartMonths[0].year}-${pad(chartMonths[0].month)}-01`
  const chartEnd = lastDay

  const [
    { data: profile },
    { data: monthEntries },
    { data: monthExpenses },
    { count: totalProperties },
    { count: activeContracts },
    { data: overdueEntries },
    { data: endingSoon },
    { data: chartEntries },
    { data: chartExpenses },
    { data: monthCaucao },
    { data: chartCaucao },
  ] = await Promise.all([
    supabase.from('profiles').select('first_name').eq('id', user.id).single(),

    supabase.from('monthly_entries')
      .select('is_paid, due_date, water_amount, energy_amount, extra_amount, contract:contracts(rent_value, water_billing_type, water_value, energy_billing_type, energy_value)')
      .eq('owner_id', user.id)
      .gte('due_date', firstDay)
      .lte('due_date', lastDay),

    supabase.from('expenses')
      .select('amount')
      .eq('owner_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay),

    supabase.from('properties').select('*', { count: 'exact', head: true }),

    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),

    supabase.from('monthly_entries')
      .select('id, due_date, water_amount, energy_amount, extra_amount, property:properties(title), contract:contracts(rent_value, water_billing_type, water_value, energy_billing_type, energy_value)')
      .eq('owner_id', user.id)
      .eq('is_paid', false)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5),

    supabase.from('contracts')
      .select('id, end_date, property:properties(title), tenant:tenants(full_name)')
      .eq('status', 'ativo')
      .gte('end_date', today)
      .lte('end_date', in60Days)
      .order('end_date', { ascending: true }),

    supabase.from('monthly_entries')
      .select('due_date, is_paid, water_amount, energy_amount, extra_amount, contract:contracts(rent_value, water_billing_type, water_value, energy_billing_type, energy_value)')
      .eq('owner_id', user.id)
      .eq('is_paid', true)
      .gte('due_date', chartStart)
      .lte('due_date', chartEnd),

    supabase.from('expenses')
      .select('date, amount')
      .eq('owner_id', user.id)
      .gte('date', chartStart)
      .lte('date', chartEnd),

    // Caução: contratos novos (não renovações) com start_date no mês selecionado
    supabase.from('contracts')
      .select('guarantee_amount, start_date')
      .gte('start_date', firstDay)
      .lte('start_date', lastDay)
      .gt('guarantee_amount', 0)
      .eq('is_renewal', false),

    // Caução para o gráfico (últimos 6 meses, excluindo renovações)
    supabase.from('contracts')
      .select('guarantee_amount, start_date')
      .gte('start_date', chartStart)
      .lte('start_date', chartEnd)
      .gt('guarantee_amount', 0)
      .eq('is_renewal', false),
  ])

  // Cálculos financeiros do mês selecionado
  const entries = (monthEntries ?? []) as EntryWithContract[]
  const paid = entries.filter(e => e.is_paid)
  const pending = entries.filter(e => !e.is_paid)
  const totalRent = paid.reduce((s, e) => s + calcTotal(e), 0)
  const totalCaucao = (monthCaucao ?? []).reduce((s, c) => s + (c.guarantee_amount ?? 0), 0)
  const totalReceived = totalRent + totalCaucao
  const totalPending = pending.reduce((s, e) => s + calcTotal(e), 0)
  const totalExpenses = (monthExpenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)
  const netProfit = totalReceived - totalExpenses
  const vacantProperties = (totalProperties ?? 0) - (activeContracts ?? 0)

  // Dados do gráfico (caução somada ao Recebido)
  const chartData: ChartMonth[] = chartMonths.map(({ year: y, month: m }) => {
    const start = `${y}-${pad(m)}-01`
    const end = `${y}-${pad(m)}-${lastDayOf(y, m)}`

    const mEntries = ((chartEntries ?? []) as EntryWithContract[])
      .filter(e => e.due_date >= start && e.due_date <= end)
    const mExpenses = (chartExpenses ?? [])
      .filter((e: { date: string; amount: number }) => e.date >= start && e.date <= end)
    const mCaucao = (chartCaucao ?? [])
      .filter((c: { start_date: string; guarantee_amount: number }) => c.start_date >= start && c.start_date <= end)

    const received = mEntries.reduce((s, e) => s + calcTotal(e), 0)
      + mCaucao.reduce((s: number, c: { start_date: string; guarantee_amount: number }) => s + (c.guarantee_amount ?? 0), 0)
    const expenses = mExpenses.reduce((s: number, e: { date: string; amount: number }) => s + (e.amount ?? 0), 0)

    const label = new Date(y, m - 1, 1).toLocaleString('pt-BR', { month: 'short' })
    return { month: label, Recebido: received, Despesas: expenses }
  })

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Olá, {profile?.first_name || 'Usuário'}
          </h1>
          <p className="mt-1 text-sm text-slate-400 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <MonthFilter month={month} year={year} />
          </Suspense>
          <form action={signOut}>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
              Sair
            </Button>
          </form>
        </div>
      </div>

      {/* Resumo financeiro */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Financeiro — {monthLabel}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs text-slate-400">A receber</p>
            <p className="mt-2 text-2xl font-bold text-white">{fmt(totalPending)}</p>
            <p className="mt-1 text-xs text-slate-500">{pending.length} cobrança(s)</p>
          </div>
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-900/10 p-5">
            <p className="text-xs text-emerald-400">Recebido</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{fmt(totalReceived)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {paid.length} pago(s){totalCaucao > 0 ? ` · caução incluída` : ''}
            </p>
          </div>
          <div className="rounded-lg border border-rose-900/50 bg-rose-900/10 p-5">
            <p className="text-xs text-rose-400">Despesas</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">{fmt(totalExpenses)}</p>
            <Link href="/dashboard/finance/expenses" className="mt-1 block text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Ver despesas →
            </Link>
          </div>
          <div className={`rounded-lg border p-5 ${netProfit >= 0 ? 'border-indigo-900/50 bg-indigo-900/10' : 'border-rose-900/50 bg-rose-900/10'}`}>
            <p className={`text-xs ${netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>Lucro líquido</p>
            <p className={`mt-2 text-2xl font-bold ${netProfit >= 0 ? 'text-indigo-300' : 'text-rose-300'}`}>
              {fmt(netProfit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">recebido − despesas</p>
          </div>
        </div>
      </section>

      {/* Gráfico */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Histórico — últimos 6 meses
        </h2>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <RevenueChart data={chartData} />
        </div>
      </section>

      {/* Portfólio */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Portfólio</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs text-slate-400">Total de imóveis</p>
            <p className="mt-2 text-2xl font-bold text-white">{totalProperties ?? 0}</p>
            <Link href="/dashboard/properties" className="mt-1 block text-xs text-slate-500 hover:text-slate-300 transition-colors">Gerenciar →</Link>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs text-slate-400">Com contrato ativo</p>
            <p className="mt-2 text-2xl font-bold text-white">{activeContracts ?? 0}</p>
            <Link href="/dashboard/contracts" className="mt-1 block text-xs text-slate-500 hover:text-slate-300 transition-colors">Ver contratos →</Link>
          </div>
          <div className={`rounded-lg border p-5 ${vacantProperties > 0 ? 'border-amber-900/50 bg-amber-900/10' : 'border-slate-800 bg-slate-900'}`}>
            <p className={`text-xs ${vacantProperties > 0 ? 'text-amber-400' : 'text-slate-400'}`}>Vagos</p>
            <p className={`mt-2 text-2xl font-bold ${vacantProperties > 0 ? 'text-amber-300' : 'text-white'}`}>{vacantProperties}</p>
            <p className="mt-1 text-xs text-slate-500">sem contrato ativo</p>
          </div>
        </div>
      </section>

      {/* Alertas */}
      {((overdueEntries && overdueEntries.length > 0) || (endingSoon && endingSoon.length > 0)) && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Alertas</h2>
          <div className="space-y-3">
            {overdueEntries && overdueEntries.length > 0 && (
              <div className="rounded-lg border border-rose-900/50 bg-rose-900/10 p-5">
                <p className="mb-3 text-sm font-semibold text-rose-400">{overdueEntries.length} cobrança(s) em atraso</p>
                <div className="space-y-2">
                  {(overdueEntries as EntryWithContract[]).map((e, i) => {
                    const total = calcTotal(e)
                    const due = new Date(e.due_date + 'T00:00:00')
                    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-white">{e.property?.title ?? '—'}</span>
                          <span className="ml-2 text-xs text-rose-300/60">{days}d atraso</span>
                        </div>
                        <span className="font-medium text-rose-300">{fmt(total)}</span>
                      </div>
                    )
                  })}
                </div>
                <Link href="/dashboard/finance" className="mt-3 block text-xs text-rose-400/70 hover:text-rose-300 transition-colors">Ir para mensalidades →</Link>
              </div>
            )}

            {endingSoon && endingSoon.length > 0 && (
              <div className="rounded-lg border border-amber-900/50 bg-amber-900/10 p-5">
                <p className="mb-3 text-sm font-semibold text-amber-400">{endingSoon.length} contrato(s) encerrando em 60 dias</p>
                <div className="space-y-2">
                  {(endingSoon as { id: string; end_date: string; property: { title: string } | null; tenant: { full_name: string } | null }[]).map((c) => {
                    const end = new Date(c.end_date + 'T00:00:00')
                    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-white">{c.property?.title ?? '—'}</span>
                          <span className="ml-2 text-xs text-slate-400">{c.tenant?.full_name}</span>
                        </div>
                        <span className={`text-xs font-medium ${days <= 30 ? 'text-amber-300' : 'text-slate-400'}`}>
                          {days}d restantes
                        </span>
                      </div>
                    )
                  })}
                </div>
                <Link href="/dashboard/contracts" className="mt-3 block text-xs text-amber-400/70 hover:text-amber-300 transition-colors">Ir para contratos →</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {(totalProperties ?? 0) === 0 && (
        <div className="rounded-lg border border-indigo-900/50 bg-indigo-950/30 p-6">
          <h3 className="font-semibold text-indigo-300">Primeiros passos</h3>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-indigo-200/70">
            <li>Adicione seus imóveis</li>
            <li>Cadastre inquilinos</li>
            <li>Firme contratos com os tipos de cobrança corretos</li>
            <li>Gere mensalidades e registre pagamentos</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const month = Number(params.mes) || now.getMonth() + 1
  const year = Number(params.ano) || now.getFullYear()

  return <DashboardContent month={month} year={year} />
}
