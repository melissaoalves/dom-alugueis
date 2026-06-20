'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMonthlyEntries, generateMonthEntries } from '../services/monthlyEntriesService'
import { MonthlyEntryCard } from './MonthlyEntryCard'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function entryTotal(e: any): number {
  const c = e.contract
  const rent = c?.rent_value ?? 0
  const waterBilling = c?.water_billing_type ?? 'not_included'
  const energyBilling = c?.energy_billing_type ?? 'not_included'
  const water = waterBilling === 'fixed'
    ? (e.water_amount || c?.water_value || 0)
    : waterBilling === 'consumption'
    ? (e.water_amount || 0)
    : 0
  const energy = energyBilling === 'fixed'
    ? (e.energy_amount || c?.energy_value || 0)
    : energyBilling === 'consumption'
    ? (e.energy_amount || 0)
    : 0
  return rent + water + energy + (e.extra_amount || 0)
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function toReferenceMonth(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function MonthlyEntryList() {
  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const [month, setMonth] = useState(prevMonth)
  const [year, setYear] = useState(prevYear)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMonthlyEntries(toReferenceMonth(month, year))
      setEntries(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(null)
    try {
      const refMonth = toReferenceMonth(month, year)
      const { total, created } = await generateMonthEntries(refMonth)
      if (created === 0) {
        setSuccess(`${total} contrato(s) encontrado(s) — cobranças já geradas para este mês.`)
      } else {
        setSuccess(`${created} cobrança(s) gerada(s) com sucesso.`)
      }
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const paid = entries.filter(e => e.is_paid)
  const pending = entries.filter(e => !e.is_paid)
  const totalPaid = paid.reduce((s, e) => s + entryTotal(e), 0)
  const totalPending = pending.reduce((s, e) => s + entryTotal(e), 0)

  return (
    <div className="space-y-6">
      {/* Filtro + botão */}
      <div className="flex flex-wrap items-center gap-3">
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
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {generating ? 'Gerando...' : 'Gerar Cobranças do Mês'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-900/50 bg-emerald-900/20 p-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Resumo */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Cobranças</p>
            <p className="mt-1 text-xl font-bold text-white">{entries.length}</p>
          </div>
          <div className="rounded-lg border border-yellow-900/50 bg-yellow-900/20 p-4">
            <p className="text-xs text-yellow-400">A receber</p>
            <p className="mt-1 text-xl font-bold text-yellow-300">{fmt(totalPending)}</p>
          </div>
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-900/20 p-4">
            <p className="text-xs text-emerald-400">Recebido</p>
            <p className="mt-1 text-xl font-bold text-emerald-300">{fmt(totalPaid)}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 py-16 text-center">
          <p className="font-medium text-white">Nenhuma cobrança para {MONTHS[month - 1]} {year}</p>
          <p className="mt-2 text-sm text-slate-400">
            Clique em "Gerar Cobranças do Mês" para criar os lançamentos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <MonthlyEntryCard key={entry.id} entry={entry} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  )
}
