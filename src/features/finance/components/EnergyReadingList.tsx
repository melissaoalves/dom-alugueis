'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react'
import { getMonthlyEntries } from '../services/monthlyEntriesService'
import {
  calcEnergyCharge,
  getEnergyRate,
  getReadingsContext,
  saveBaselineReading,
  deleteBaselineReading,
  saveEnergyReadings,
  EnergyReadingInput,
  ReadingsContext,
} from '../services/energyReadingsService'
import { EnergyReadingKind } from '@/src/shared/types/database'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtKwh = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const inputClass = "h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60"

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const KIND_LABELS: Record<EnergyReadingKind, string> = {
  regular: 'Leitura',
  initial: 'Leitura inicial',
  meter_reset: 'Troca de relógio',
}

type Filter = 'pending' | 'billed' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'billed', label: 'Lançadas' },
  { value: 'all', label: 'Todas' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  initialMonth: number
  initialYear: number
}

export function EnergyReadingList({ initialMonth, initialYear }: Props) {
  const today = todayStr()

  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [entries, setEntries] = useState<any[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [ctx, setCtx] = useState<ReadingsContext>({ own: {}, previous: {}, history: {} })
  const [curr, setCurr] = useState<Record<string, string>>({})
  // leitura inicial (base) digitada na linha quando o imóvel ainda não tem leitura; default 0
  const [initialKwh, setInitialKwh] = useState<Record<string, string>>({})
  const [rate, setRate] = useState('')
  const [readingDate, setReadingDate] = useState(today)
  const [filter, setFilter] = useState<Filter>('pending')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<Record<string, { kwh: string; date: string }>>({})
  // linha com o formulário de troca de relógio aberto (fica escondido por padrão)
  const [meterResetId, setMeterResetId] = useState<string | null>(null)
  // leitura aguardando confirmação de exclusão (confirmação inline — o app bloqueia window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // keepTyped: preserva leituras digitadas e ainda não salvas (ex: ao registrar uma leitura inicial)
  const load = useCallback(async (keepTyped = false) => {
    setLoading(true)
    setError(null)
    try {
      const referenceMonth = `${year}-${String(month).padStart(2, '0')}-01`
      const all = await getMonthlyEntries(referenceMonth)
      const consumption = all.filter((e: any) => e.contract?.energy_billing_type === 'consumption')
      const [context, savedRate] = await Promise.all([getReadingsContext(consumption), getEnergyRate()])

      setTotalEntries(all.length)
      setEntries(consumption)
      setCtx(context)
      setRate(r => r !== '' ? r : savedRate != null ? String(savedRate) : '')
      setCurr(typed => Object.fromEntries(consumption.map((e: any) => [
        e.id,
        keepTyped && typed[e.id] ? typed[e.id] : e.energy_curr_reading != null ? String(e.energy_curr_reading) : '',
      ])))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const rateNum = Number(rate) || 0

  const rows = entries.map(e => {
    const baseSource = ctx.previous[e.id]?.reading_kwh ?? e.energy_prev_reading
    const hasBaseline = baseSource != null
    // Sem leitura anterior: a base é digitada na linha (começa em 0)
    const initialStr = initialKwh[e.id] ?? '0'
    const prev = hasBaseline
      ? Number(baseSource)
      : initialStr !== '' ? Number(initialStr) : null
    const needsInitial = !hasBaseline
    const typed = curr[e.id] ?? ''
    const currNum = typed !== '' ? Number(typed) : null
    const billed = e.energy_curr_reading != null
    const charge = prev !== null && currNum !== null ? calcEnergyCharge(prev, currNum, rateNum) : null
    const rowError = charge && charge.kwh < 0 ? 'Leitura atual menor que a anterior.' : null
    const dirty = !e.is_paid && charge !== null && (
      !billed ||
      currNum !== Number(e.energy_curr_reading) ||
      prev !== Number(e.energy_prev_reading) ||
      rateNum !== Number(e.energy_kwh_rate)
    )
    return { entry: e, prev, currNum, billed, charge, rowError, dirty, needsInitial, initialStr }
  })

  const billedCount = rows.filter(r => r.billed).length
  const term = search.trim().toLowerCase()
  const visibleRows = rows.filter(r => {
    if (filter === 'pending' && r.billed) return false
    if (filter === 'billed' && !r.billed) return false
    if (!term) return true
    return `${r.entry.property?.title ?? ''} ${r.entry.contract?.tenant?.full_name ?? ''}`.toLowerCase().includes(term)
  })

  const dirtyRows = rows.filter(r => r.dirty)
  const hasErrors = dirtyRows.some(r => r.rowError)
  const totalKwh = rows.reduce((s, r) => s + (r.charge && !r.rowError ? r.charge.kwh : 0), 0)
  const totalAmount = rows.reduce((s, r) => s + (r.charge && !r.rowError ? r.charge.amount : 0), 0)

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    if (rateNum <= 0) {
      setError('Informe a tarifa (R$/kWh).')
      return
    }

    const payload: EnergyReadingInput[] = dirtyRows.map(r => {
      // Só a tarifa ou a base mudou: mantém a data em que a leitura foi feita
      const own = ctx.own[r.entry.id]
      const sameReading = own && r.currNum === Number(r.entry.energy_curr_reading)
      return {
        entryId: r.entry.id,
        propertyId: r.entry.property_id,
        prevReading: r.prev as number,
        currReading: r.currNum as number,
        readingDate: sameReading ? own.reading_date : readingDate,
      }
    })

    setSaving(true)
    try {
      // Cria a leitura inicial (base) dos imóveis que ainda não tinham leitura,
      // datada no 1º dia do mês de referência — serve de base e mostra o período na conta.
      const refFirstDay = `${year}-${String(month).padStart(2, '0')}-01`
      for (const r of dirtyRows) {
        if (r.needsInitial) {
          await saveBaselineReading({
            propertyId: r.entry.property_id,
            readingKwh: r.prev as number,
            readingDate: refFirstDay,
            kind: 'initial',
          })
        }
      }
      const { billed } = await saveEnergyReadings({ rate: rateNum, rows: payload })
      setSuccess(`Energia calculada em ${billed} cobrança(s).`)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBaseline = async (entry: any) => {
    const form = baseline[entry.id]
    const hasHistory = (ctx.history[entry.property_id] ?? []).length > 0
    setError(null)
    setSuccess(null)
    if (!form || form.kwh === '' || !form.date) {
      setError('Informe o valor e a data da leitura.')
      return
    }
    setSaving(true)
    try {
      await saveBaselineReading({
        propertyId: entry.property_id,
        readingKwh: Number(form.kwh),
        readingDate: form.date,
        kind: hasHistory ? 'meter_reset' : 'initial',
      })
      setBaseline(b => ({ ...b, [entry.id]: { kwh: '', date: today } }))
      setMeterResetId(null)
      setExpandedId(null)
      await load(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBaseline = async (readingId: string) => {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await deleteBaselineReading(readingId)
      setConfirmDeleteId(null)
      await load(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Enter pula para a leitura do próximo apartamento
  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-reading-input]:not(:disabled)'))
    inputs[inputs.indexOf(e.currentTarget) + 1]?.focus()
  }

  const baselineForm = (entry: any, isInitial: boolean) => {
    const form = baseline[entry.id] ?? { kwh: '', date: today }
    const update = (patch: Partial<typeof form>) =>
      setBaseline(b => ({ ...b, [entry.id]: { ...form, ...patch } }))
    return (
      <div>
        <p className="text-xs font-medium text-slate-300">
          {isInitial ? 'Leitura inicial' : 'Troca de relógio'}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {isInitial
            ? 'Valor do relógio quando o consumo começou a contar. Não gera cobrança — serve de base para a primeira leitura.'
            : 'Use só se o relógio foi substituído. Informe o valor que o relógio novo marcava ao ser instalado — a leitura do mês vai no campo "Atual" da linha.'}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-400">Valor (kWh)</label>
            <input type="number" step="0.01" min="0" value={form.kwh} onChange={e => update({ kwh: e.target.value })} className={inputClass} />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs text-slate-400">Data</label>
            <input type="date" value={form.date} max={today} onChange={e => update({ date: e.target.value })} className={inputClass} />
          </div>
          <button
            type="button"
            onClick={() => update({ kwh: '0' })}
            className="h-9 rounded-md border border-slate-700 px-3 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Relógio zerado
          </button>
          <button
            type="button"
            onClick={() => handleSaveBaseline(entry)}
            disabled={saving}
            className="h-9 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Registrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/finance?mes=${month}&ano=${year}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Mensalidades
      </Link>

      {/* Mês, tarifa e data */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Mês de referência</label>
          <div className="flex gap-2">
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
        </div>
        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-slate-400">Tarifa (R$/kWh)</label>
          <input type="number" step="0.0001" min="0" value={rate} onChange={e => setRate(e.target.value)} placeholder="0,95" className={`${inputClass} h-10`} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-400">Data da leitura</label>
          <input type="date" value={readingDate} max={today} onChange={e => setReadingDate(e.target.value)} className={`${inputClass} h-10`} />
        </div>
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 px-4 py-16 text-center">
          <p className="font-medium text-white">Nenhuma leitura a fazer em {MONTHS[month - 1]} {year}</p>
          <p className="mt-2 text-sm text-slate-400">
            {totalEntries === 0
              ? 'Gere as cobranças do mês em Mensalidades primeiro.'
              : 'Nenhum contrato deste mês cobra energia por consumo. Altere a cobrança de energia no contrato.'}
          </p>
        </div>
      ) : (
        <>
          {/* Progresso, filtro e busca */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex rounded-md border border-slate-800 bg-slate-900 p-0.5">
                {FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === f.value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-white">{billedCount}</span> de {rows.length} lidas
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar imóvel ou inquilino"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Como lançar:</span> informe a{' '}
            <span className="text-slate-300">tarifa</span> e a{' '}
            <span className="text-slate-300">data da leitura</span> acima, digite a{' '}
            <span className="text-slate-300">leitura atual</span> de cada relógio no campo &quot;Atual&quot; e clique em
            Salvar. O consumo é a diferença para a leitura anterior. Apartamentos sem leitura anterior começam em 0.
          </div>

          {/* Lista */}
          {visibleRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-400">
              {term
                ? 'Nenhum apartamento encontrado.'
                : filter === 'pending'
                ? 'Todas as leituras do mês foram lançadas.'
                : 'Nenhuma leitura lançada ainda.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
              {visibleRows.map(({ entry, prev, billed, charge, rowError, needsInitial, initialStr }) => {
                const expanded = expandedId === entry.id
                const history = ctx.history[entry.property_id] ?? []
                return (
                  <div key={entry.id}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-40">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${billed ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                          <p className="truncate text-sm font-medium text-white">{entry.property?.title ?? '—'}</p>
                        </div>
                        <p className="truncate pl-4 text-xs text-slate-400">
                          {entry.contract?.tenant?.full_name ?? '—'}
                          {entry.is_paid && <span className="ml-2 text-emerald-400">· Pago</span>}
                        </p>
                      </div>

                      <div className="w-20">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          {needsInitial ? 'Inicial' : 'Anterior'}
                        </p>
                        {needsInitial ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={initialStr}
                            disabled={entry.is_paid}
                            onChange={e => setInitialKwh(m => ({ ...m, [entry.id]: e.target.value }))}
                            aria-label={`Leitura inicial — ${entry.property?.title ?? ''}`}
                            className={inputClass}
                          />
                        ) : (
                          <p className="pt-1.5 text-sm text-slate-300">{fmtKwh(prev as number)}</p>
                        )}
                      </div>
                      <div className="w-28">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Atual</p>
                        <input
                          data-reading-input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={curr[entry.id] ?? ''}
                          disabled={entry.is_paid}
                          onChange={e => setCurr(c => ({ ...c, [entry.id]: e.target.value }))}
                          onKeyDown={handleEnter}
                          placeholder="leitura de hoje"
                          aria-label={`Leitura atual — ${entry.property?.title ?? ''}`}
                          className={`${inputClass} ${rowError ? 'border-rose-700' : ''}`}
                        />
                      </div>
                      <div className="w-28 text-right">
                        {charge && !rowError ? (
                          <>
                            <p className="text-sm font-semibold text-white">{fmt(charge.amount)}</p>
                            <p className="text-xs text-slate-500">{fmtKwh(charge.kwh)} kWh</p>
                          </>
                        ) : (
                          <p className="pt-2 text-sm text-slate-600">—</p>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedId(expanded ? null : entry.id)}
                        title={expanded ? 'Fechar' : 'Histórico e troca de relógio'}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    {rowError && <p className="px-4 pb-3 text-xs text-rose-400">{rowError}</p>}

                    {expanded && (
                      <div className="space-y-4 border-t border-slate-800 bg-slate-950/50 px-4 py-3">
                        <div>
                          <p className="text-xs font-medium text-slate-300">Últimas leituras</p>
                          {history.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-500">Nenhuma leitura registrada.</p>
                          ) : (
                            <div className="mt-1 space-y-0.5">
                              {history.slice(0, 6).map(r => (
                                <div key={r.id} className="flex items-center justify-between gap-2 text-xs text-slate-400">
                                  <span>{fmtDate(r.reading_date)} · {KIND_LABELS[r.kind]}</span>
                                  <span className="flex items-center gap-2">
                                    <span className="text-slate-300">{fmtKwh(Number(r.reading_kwh))} kWh</span>
                                    {r.kind !== 'regular' ? (
                                      confirmDeleteId === r.id ? (
                                        <span className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleDeleteBaseline(r.id)}
                                            disabled={saving}
                                            className="font-medium text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-50"
                                          >
                                            Excluir
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteId(null)}
                                            disabled={saving}
                                            className="text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
                                          >
                                            Cancelar
                                          </button>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteId(r.id)}
                                          disabled={saving}
                                          title="Excluir registro feito por engano"
                                          className="text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )
                                    ) : (
                                      <span className="w-3" />
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {!entry.is_paid && history.length > 0 && (
                          meterResetId === entry.id
                          ? (
                            <div className="space-y-2">
                              {baselineForm(entry, false)}
                              <button
                                type="button"
                                onClick={() => setMeterResetId(null)}
                                className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMeterResetId(entry.id)}
                              className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                            >
                              Trocou o relógio?
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Total + salvar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">
              Total do mês: {fmtKwh(totalKwh)} kWh ·{' '}
              <span className="font-semibold text-white">{fmt(totalAmount)}</span>
            </p>
            <div className="flex items-center gap-3">
              {!saving && !hasErrors && (
                <p className="text-xs text-slate-500">
                  {rateNum <= 0
                    ? 'Informe a tarifa para salvar.'
                    : dirtyRows.length === 0
                    ? 'Digite a leitura atual de cada apartamento.'
                    : `${dirtyRows.length} leitura(s) prontas.`}
                </p>
              )}
              <button
                onClick={handleSave}
                disabled={saving || hasErrors || dirtyRows.length === 0 || rateNum <= 0}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving
                  ? 'Salvando...'
                  : dirtyRows.length > 0
                  ? `Salvar ${dirtyRows.length} leitura(s)`
                  : 'Salvar leituras'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
