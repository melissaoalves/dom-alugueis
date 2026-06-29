'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trash2, CheckCircle2, Clock, Pencil } from 'lucide-react'
import { getExpenses, getPendingScheduled, deleteExpense, settleExpense } from '../services/expensesService'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getDueStatus(dueDate: string): { label: string; color: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasada`, color: 'text-rose-400 bg-rose-900/30 border-rose-900/50' }
  if (diffDays === 0) return { label: 'Vence hoje', color: 'text-amber-400 bg-amber-900/30 border-amber-900/50' }
  if (diffDays <= 7) return { label: `Vence em ${diffDays}d`, color: 'text-yellow-400 bg-yellow-900/30 border-yellow-900/50' }
  return { label: `Vence em ${diffDays}d`, color: 'text-slate-400 bg-slate-800/50 border-slate-700' }
}

export function ExpenseList() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState<any[]>([])
  const [scheduled, setScheduled] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [settled, pending] = await Promise.all([
        getExpenses(month, year),
        getPendingScheduled(),
      ])
      setExpenses(settled)
      setScheduled(pending)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta despesa?')) return
    try {
      await deleteExpense(id)
      await load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSettle = async (id: string) => {
    try {
      await settleExpense(id)
      await load()
    } catch (err: any) {
      setError(err.message)
    }
  }


  return (
    <div className="space-y-6">
      {/* Filtro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="h-10 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-10 w-24 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <Link
          href="/dashboard/finance/expenses/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          + Nova Despesa
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Despesas agendadas (pendentes) */}
      {!loading && scheduled.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Agendadas — {scheduled.length} pendente{scheduled.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {scheduled.map(expense => {
              const status = getDueStatus(expense.due_date)
              return (
                <div key={expense.id} className="flex items-center justify-between rounded-lg border border-indigo-900/40 bg-indigo-950/20 px-4 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{expense.description}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{expense.category}</span>
                      {expense.property && (
                        <>
                          <span className="text-xs text-slate-700">·</span>
                          <span className="text-xs text-slate-500">{expense.property.title}</span>
                        </>
                      )}
                      <span className="text-xs text-slate-700">·</span>
                      <span className="text-xs text-slate-500">
                        vence {new Date(expense.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-semibold text-rose-400 text-sm mr-1">{fmt(expense.amount)}</p>
                    <button
                      onClick={() => handleSettle(expense.id)}
                      title="Confirmar pagamento"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-900/50 text-emerald-500 transition hover:bg-emerald-900/20"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <Link
                      href={`/dashboard/finance/expenses/${expense.id}/edit`}
                      title="Editar"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
                    >
                      <Pencil size={13} />
                    </Link>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      title="Remover"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-slate-600 transition hover:border-rose-900/50 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* Histórico de despesas pagas */}
      <div className="space-y-3">
        {scheduled.length > 0 && (
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Histórico — {MONTHS[month - 1]} {year}
          </h2>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 py-16 text-center">
            <p className="font-medium text-white">Nenhuma despesa em {MONTHS[month - 1]} {year}</p>
            <p className="mt-2 text-sm text-slate-400">Registre despesas para acompanhar seus custos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{expense.category}</span>
                      {expense.property && (
                        <>
                          <span className="text-xs text-slate-700">·</span>
                          <span className="text-xs text-slate-500">{expense.property.title}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-1">
                    <p className="font-semibold text-rose-400">{fmt(expense.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/finance/expenses/${expense.id}/edit`}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
                  >
                    <Pencil size={13} />
                  </Link>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    title="Remover despesa"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-slate-600 transition hover:border-rose-900/50 hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
