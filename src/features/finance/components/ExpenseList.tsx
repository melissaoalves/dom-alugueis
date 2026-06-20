'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { getExpenses, deleteExpense } from '../services/expensesService'
import { ExpenseCategoryChart } from './ExpenseCategoryChart'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function ExpenseList() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getExpenses(month, year)
      setExpenses(data)
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
      setExpenses(prev => prev.filter(e => e.id !== id))
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

      {expenses.length > 0 && (
        <ExpenseCategoryChart expenses={expenses} />
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
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-rose-400">{fmt(expense.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
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
  )
}
