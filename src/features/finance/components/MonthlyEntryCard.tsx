'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { updateMonthlyEntry, calcLateFees } from '../services/monthlyEntriesService'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const inputClass = "h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"

interface Props {
  entry: any
  onUpdate: () => void
}

export function MonthlyEntryCard({ entry, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const contract = entry.contract
  const property = entry.property
  const rentValue = contract?.rent_value ?? 0
  const penaltyRate = contract?.penalty_fee ?? 0
  const interestRate = contract?.interest_rate ?? 0
  const waterBilling = contract?.water_billing_type ?? 'not_included'
  const energyBilling = contract?.energy_billing_type ?? 'not_included'

  const [water, setWater] = useState(
    waterBilling === 'consumption' ? (entry.water_amount ?? '') : ''
  )
  const [energy, setEnergy] = useState(
    energyBilling === 'consumption' ? (entry.energy_amount ?? '') : ''
  )
  const [extra, setExtra] = useState(entry.extra_amount ?? '')
  const [extraDesc, setExtraDesc] = useState(entry.extra_description ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [paymentDate, setPaymentDate] = useState(
    entry.payment_date ?? new Date().toISOString().split('T')[0]
  )

  const { penalty, interest, daysLate } = entry.is_paid
    ? { penalty: 0, interest: 0, daysLate: 0 }
    : calcLateFees(entry.due_date, rentValue, penaltyRate, interestRate, paymentDate)

  const isLate = !entry.is_paid && daysLate > 0

  const waterFixed = waterBilling === 'fixed' ? (entry.water_amount || contract?.water_value || 0) : 0
  const energyFixed = energyBilling === 'fixed' ? (entry.energy_amount || contract?.energy_value || 0) : 0
  const waterConsumption = waterBilling === 'consumption' ? (Number(water) || 0) : 0
  const energyConsumption = energyBilling === 'consumption' ? (Number(energy) || 0) : 0
  const totalValue = rentValue + waterFixed + energyFixed + waterConsumption + energyConsumption +
    (Number(extra) || 0) + (entry.is_paid ? 0 : penalty + interest)

  const handleSave = async (action: 'draft' | 'paid' | 'unpay') => {
    setSaving(true)
    try {
      if (action === 'unpay') {
        await updateMonthlyEntry(entry.id, { is_paid: false, payment_date: null })
      } else {
        await updateMonthlyEntry(entry.id, {
          water_amount: waterBilling === 'consumption' && water !== '' ? Number(water) : undefined,
          energy_amount: energyBilling === 'consumption' && energy !== '' ? Number(energy) : undefined,
          extra_amount: extra !== '' ? Number(extra) : undefined,
          extra_description: extraDesc || undefined,
          notes: notes || undefined,
          ...(action === 'paid' && { is_paid: true, payment_date: paymentDate }),
        })
      }
      onUpdate()
      setExpanded(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-lg border bg-slate-900 transition-colors ${
      entry.is_paid ? 'border-emerald-900/50' :
      isLate ? 'border-rose-900/50' : 'border-slate-800'
    }`}>
      {/* Cabeçalho */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${
              entry.is_paid ? 'bg-emerald-400' :
              isLate ? 'bg-rose-400' : 'bg-yellow-400'
            }`} />
            <div>
              <p className="font-medium text-white">{property?.title ?? '—'}</p>
              <p className="text-xs text-slate-400">{contract?.tenant?.full_name ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              entry.is_paid ? 'bg-emerald-900/40 text-emerald-400' :
              isLate ? 'bg-rose-900/40 text-rose-400' : 'bg-yellow-900/40 text-yellow-400'
            }`}>
              {entry.is_paid ? 'Pago' : isLate ? `${daysLate}d atraso` : 'Pendente'}
            </span>

            <button
              onClick={() => setExpanded(v => !v)}
              title={expanded ? 'Fechar' : 'Editar lançamento'}
              className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                expanded
                  ? 'border-slate-600 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {expanded ? <X size={13} /> : <Pencil size={13} />}
            </button>
          </div>
        </div>

        {/* Composição do valor */}
        <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Aluguel</span>
            <span className="text-white">{fmt(rentValue)}</span>
          </div>
          {waterBilling === 'fixed' && waterFixed > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Água (fixo)</span>
              <span className="text-white">{fmt(waterFixed)}</span>
            </div>
          )}
          {energyBilling === 'fixed' && energyFixed > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Energia (fixo)</span>
              <span className="text-white">{fmt(energyFixed)}</span>
            </div>
          )}
          {waterBilling === 'consumption' && waterConsumption > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Água (consumo)</span>
              <span className="text-white">{fmt(waterConsumption)}</span>
            </div>
          )}
          {energyBilling === 'consumption' && energyConsumption > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Energia (consumo)</span>
              <span className="text-white">{fmt(energyConsumption)}</span>
            </div>
          )}
          {(Number(extra) || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">{extraDesc || 'Extra'}</span>
              <span className="text-white">{fmt(Number(extra))}</span>
            </div>
          )}
          {isLate && (
            <div className="flex justify-between text-rose-400">
              <span>Multa + Juros</span>
              <span>{fmt(penalty + interest)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-800 pt-1 font-semibold">
            <span className="text-slate-300">Total</span>
            <span className="text-white">{fmt(totalValue)}</span>
          </div>
          <p className="text-xs text-slate-500 text-right">
            Vence {new Date(entry.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Painel de edição */}
      {expanded && (
        <div className="space-y-4 border-t border-slate-800 p-4">
          {isLate && (
            <div className="rounded-md border border-rose-900/50 bg-rose-900/20 p-3 text-sm">
              <p className="font-medium text-rose-400">Em atraso — {daysLate} dia(s) até a data selecionada</p>
              <div className="mt-1 flex gap-4 text-xs text-rose-300/70">
                <span>Multa: {fmt(penalty)}</span>
                <span>Juros: {fmt(interest)}</span>
              </div>
            </div>
          )}

          {(waterBilling === 'consumption' || energyBilling === 'consumption') && (
            <div className="grid grid-cols-2 gap-3">
              {waterBilling === 'consumption' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Água — consumo (R$)</label>
                  <input type="number" step="0.01" value={water} onChange={e => setWater(e.target.value)} placeholder="0,00" className={inputClass} />
                </div>
              )}
              {energyBilling === 'consumption' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Energia — consumo (R$)</label>
                  <input type="number" step="0.01" value={energy} onChange={e => setEnergy(e.target.value)} placeholder="0,00" className={inputClass} />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Extra (R$)</label>
              <input type="number" step="0.01" value={extra} onChange={e => setExtra(e.target.value)} placeholder="0,00" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Descrição do extra</label>
              <input type="text" value={extraDesc} onChange={e => setExtraDesc(e.target.value)} placeholder="Ex: limpeza" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Data do pagamento</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Observações</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações opcionais..." className={inputClass} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <p className="text-sm text-slate-400">
              Total: <span className="font-semibold text-white">{fmt(totalValue)}</span>
            </p>
            <div className="flex gap-2">
              {entry.is_paid ? (
                <>
                  <button onClick={() => handleSave('unpay')} disabled={saving}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-900/50 hover:text-rose-400 disabled:opacity-50">
                    Desfazer pagamento
                  </button>
                  <button onClick={() => handleSave('draft')} disabled={saving}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleSave('draft')} disabled={saving}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-50">
                    Salvar rascunho
                  </button>
                  <button onClick={() => handleSave('paid')} disabled={saving}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50">
                    {saving ? 'Salvando...' : 'Marcar como Pago'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {entry.is_paid && !expanded && (
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
          Pago em {entry.payment_date
            ? new Date(entry.payment_date + 'T00:00:00').toLocaleDateString('pt-BR')
            : '—'}
          {entry.notes && <span className="ml-2 text-slate-600">· {entry.notes}</span>}
        </div>
      )}
    </div>
  )
}
