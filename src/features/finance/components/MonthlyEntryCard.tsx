'use client'

import { useState } from 'react'
import { Pencil, X, QrCode, Zap, FileText } from 'lucide-react'
import { updateMonthlyEntry, calcLateFees } from '../services/monthlyEntriesService'
import { BillingSlipModal } from './BillingSlipModal'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtKwh = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)

const fmtRate = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 }).format(v)

const inputClass = "h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"

interface Props {
  entry: any
  onUpdate: () => void
}

export function MonthlyEntryCard({ entry, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSlip, setShowSlip] = useState(false)
  const [showEnergySlip, setShowEnergySlip] = useState(false)
  const [showFullSlip, setShowFullSlip] = useState(false)

  const contract = entry.contract
  const property = entry.property
  const rentValue = entry.rent_value !== undefined && entry.rent_value !== null ? entry.rent_value : (contract?.rent_value ?? 0)
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
  const today = new Date().toISOString().split('T')[0]
  const [paymentDate, setPaymentDate] = useState(entry.payment_date ?? today)
  const [energyPaymentDate, setEnergyPaymentDate] = useState(entry.energy_payment_date ?? today)
  const [waiveLateFees, setWaiveLateFees] = useState(entry.waive_late_fees ?? false)

  const { penalty, interest, daysLate } = entry.is_paid
    ? { penalty: 0, interest: 0, daysLate: 0 }
    : calcLateFees(entry.due_date, rentValue, waiveLateFees ? 0 : penaltyRate, waiveLateFees ? 0 : interestRate, paymentDate)

  const isLate = !entry.is_paid && daysLate > 0

  const waterFixed = waterBilling === 'fixed' ? (entry.water_amount || contract?.water_value || 0) : 0
  const energyFixed = energyBilling === 'fixed' ? (entry.energy_amount || contract?.energy_value || 0) : 0
  const waterConsumption = waterBilling === 'consumption' ? (Number(water) || 0) : 0
  const energyConsumption = energyBilling === 'consumption' ? (Number(energy) || 0) : 0
  // Detalhamento da leitura (relógio) — só vale enquanto o valor não for alterado à mão
  const energyFromReading = entry.energy_kwh != null && energyConsumption === Number(entry.energy_amount)
  const energyDetail = energyFromReading
    ? `Leitura ${fmtKwh(entry.energy_prev_reading)} → ${fmtKwh(entry.energy_curr_reading)} · ${fmtKwh(entry.energy_kwh)} kWh × ${fmtRate(entry.energy_kwh_rate)}`
    : undefined
  const totalValue = rentValue + waterFixed + energyFixed + waterConsumption + energyConsumption +
    (Number(extra) || 0) + (entry.is_paid ? 0 : penalty + interest)
  // Energia é cobrada à parte (PIX próprio); o boleto de aluguel+água não a inclui
  const energyTotal = energyFixed + energyConsumption
  const nonEnergyTotal = totalValue - energyTotal
  const hasEnergyBill = energyTotal > 0

  // Pagamento separado: is_paid = aluguel+água; energy_paid = energia
  const aluguelPaid: boolean = entry.is_paid
  const settledByCaucao: boolean = !!entry.settled_by_caucao  // aluguel+água quitado com caução (não é "recebido")
  const energyPaid: boolean = !!entry.energy_paid
  const fullyPaid = aluguelPaid && (!hasEnergyBill || energyPaid)
  const partiallyPaid = !fullyPaid && (aluguelPaid || (hasEnergyBill && energyPaid))

  // Quitado com caução não é "a receber": sai do total exibido como valor a cobrar
  const caucaoAmount = settledByCaucao ? nonEnergyTotal : 0
  const displayTotal = totalValue - caucaoAmount

  const status = fullyPaid
    ? { text: 'Pago', badge: 'bg-emerald-900/40 text-emerald-400', dot: 'bg-emerald-400', border: 'border-emerald-900/50' }
    : partiallyPaid
    ? { text: 'Parcial', badge: 'bg-indigo-900/40 text-indigo-300', dot: 'bg-indigo-400', border: 'border-indigo-900/50' }
    : isLate
    ? { text: `${daysLate}d atraso`, badge: 'bg-rose-900/40 text-rose-400', dot: 'bg-rose-400', border: 'border-rose-900/50' }
    : { text: 'Pendente', badge: 'bg-yellow-900/40 text-yellow-400', dot: 'bg-yellow-400', border: 'border-slate-800' }

  const fmtDate = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

  type SaveAction = 'draft' | 'pay-aluguel' | 'settle-aluguel' | 'unpay-aluguel' | 'pay-energy' | 'unpay-energy'

  const handleSave = async (action: SaveAction, collapse = true) => {
    setSaving(true)
    try {
      if (action === 'unpay-aluguel') {
        await updateMonthlyEntry(entry.id, { is_paid: false, settled_by_caucao: false, payment_date: null })
      } else if (action === 'unpay-energy') {
        await updateMonthlyEntry(entry.id, { energy_paid: false, energy_payment_date: null })
      } else {
        await updateMonthlyEntry(entry.id, {
          water_amount: waterBilling === 'consumption' && water !== '' ? Number(water) : undefined,
          energy_amount: energyBilling === 'consumption' && energy !== '' ? Number(energy) : undefined,
          extra_amount: extra !== '' ? Number(extra) : undefined,
          extra_description: extraDesc || undefined,
          notes: notes || undefined,
          waive_late_fees: waiveLateFees,
          // Valor de energia alterado à mão: o detalhamento da leitura deixa de valer
          ...(entry.energy_kwh != null && !energyFromReading && {
            energy_prev_reading: null, energy_curr_reading: null, energy_kwh: null, energy_kwh_rate: null,
          }),
          ...(action === 'pay-aluguel' && { is_paid: true, settled_by_caucao: false, payment_date: paymentDate }),
          ...(action === 'settle-aluguel' && { is_paid: true, settled_by_caucao: true, payment_date: paymentDate }),
          ...(action === 'pay-energy' && { energy_paid: true, energy_payment_date: energyPaymentDate }),
        })
      }
      onUpdate()
      if (collapse) setExpanded(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-lg border bg-slate-900 transition-colors ${status.border}`}>
      {/* Cabeçalho */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
            <div>
              <p className="font-medium text-white">{property?.title ?? '—'}</p>
              <p className="text-xs text-slate-400">{contract?.tenant?.full_name ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.badge}`}>
              {status.text}
            </span>

            {hasEnergyBill && (
              <button
                onClick={() => setShowFullSlip(true)}
                title="Boleto completo (aluguel + água + energia)"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
              >
                <FileText size={13} />
              </button>
            )}

            <button
              onClick={() => setShowSlip(true)}
              title={hasEnergyBill ? 'Boleto do aluguel (aluguel + água)' : 'Boleto do aluguel'}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
            >
              <QrCode size={13} />
            </button>

            {hasEnergyBill && (
              <button
                onClick={() => setShowEnergySlip(true)}
                title="Conta de energia (PIX separado)"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-900/50 text-amber-400 transition-colors hover:border-amber-700 hover:text-amber-300"
              >
                <Zap size={13} />
              </button>
            )}

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
            <div>
              <div className="flex justify-between">
                <span className="text-slate-400">Energia (consumo)</span>
                <span className="text-white">{fmt(energyConsumption)}</span>
              </div>
              {energyDetail && <p className="text-xs text-slate-500">{energyDetail}</p>}
            </div>
          )}
          {(Number(extra) || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">{extraDesc || 'Extra'}</span>
              <span className="text-white">{fmt(Number(extra))}</span>
            </div>
          )}
          {isLate && (penalty + interest) > 0 && (
            <div className="flex justify-between text-rose-400">
              <span>Multa + Juros</span>
              <span>{fmt(penalty + interest)}</span>
            </div>
          )}
          {settledByCaucao && caucaoAmount > 0 && (
            <div className="flex justify-between text-indigo-300/80">
              <span>Quitado c/ caução</span>
              <span>−{fmt(caucaoAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-800 pt-1 font-semibold">
            <span className="text-slate-300">{settledByCaucao ? 'A receber' : 'Total'}</span>
            <span className="text-white">{fmt(displayTotal)}</span>
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
              {!waiveLateFees && (
                <div className="mt-1 flex gap-4 text-xs text-rose-300/70">
                  <span>Multa: {fmt(penalty)}</span>
                  <span>Juros: {fmt(interest)}</span>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={waiveLateFees}
              onChange={e => setWaiveLateFees(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 accent-indigo-600"
            />
            Não cobrar multa/juros neste lançamento
          </label>

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
                  <p className="mt-1 text-xs text-slate-600">Calculado na página Leituras de energia. Ajuste aqui só se precisar.</p>
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

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Observações</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações opcionais..." className={inputClass} />
          </div>

          <div className="flex justify-end border-t border-slate-800 pt-3">
            <button onClick={() => handleSave('draft')} disabled={saving}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>

          {/* Pagamentos — aluguel+água e energia marcados separadamente */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {hasEnergyBill ? 'Pagamentos' : 'Pagamento'}
            </p>

            {/* Aluguel + Água */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950 p-3">
              <div>
                <p className="text-sm text-white">{hasEnergyBill ? 'Aluguel + Água' : 'Mensalidade'}</p>
                <p className="text-xs text-slate-500">{fmt(nonEnergyTotal)}</p>
              </div>
              {aluguelPaid ? (
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${settledByCaucao ? 'text-indigo-300' : 'text-emerald-400'}`}>
                    {settledByCaucao ? 'Quitado c/ caução' : 'Pago'} em {fmtDate(entry.payment_date)}
                  </span>
                  <button onClick={() => handleSave('unpay-aluguel')} disabled={saving}
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-rose-900/50 hover:text-rose-400 disabled:opacity-50">
                    Desfazer
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                    className="h-8 rounded-md border border-slate-800 bg-slate-900 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-600" />
                  <button onClick={() => handleSave('settle-aluguel')} disabled={saving} title="Quitar com o caução (não conta como recebido)"
                    className="rounded-md border border-indigo-800 px-2.5 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-900/30 disabled:opacity-50">
                    Caução
                  </button>
                  <button onClick={() => handleSave('pay-aluguel')} disabled={saving}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50">
                    Marcar pago
                  </button>
                </div>
              )}
            </div>

            {/* Energia */}
            {hasEnergyBill && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950 p-3">
                <div>
                  <p className="text-sm text-white">Energia</p>
                  <p className="text-xs text-slate-500">{fmt(energyTotal)}</p>
                </div>
                {energyPaid ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-400">Pago em {fmtDate(entry.energy_payment_date)}</span>
                    <button onClick={() => handleSave('unpay-energy')} disabled={saving}
                      className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-rose-900/50 hover:text-rose-400 disabled:opacity-50">
                      Desfazer
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="date" value={energyPaymentDate} onChange={e => setEnergyPaymentDate(e.target.value)}
                      className="h-8 rounded-md border border-slate-800 bg-slate-900 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-600" />
                    <button onClick={() => handleSave('pay-energy')} disabled={saving}
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50">
                      Marcar pago
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!expanded && (aluguelPaid || energyPaid || entry.notes) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
          {aluguelPaid && (
            <span className={settledByCaucao ? 'text-indigo-300/80' : undefined}>
              {hasEnergyBill ? 'Aluguel' : 'Mensalidade'} {settledByCaucao ? 'quitado c/ caução' : 'pago'} em {fmtDate(entry.payment_date)}
            </span>
          )}
          {hasEnergyBill && energyPaid && <span>Energia paga em {fmtDate(entry.energy_payment_date)}</span>}
          {hasEnergyBill && aluguelPaid && !energyPaid && <span className="text-amber-500/80">Energia pendente</span>}
          {hasEnergyBill && !aluguelPaid && energyPaid && <span className="text-amber-500/80">Aluguel pendente</span>}
          {entry.notes && <span className="text-slate-600">· {entry.notes}</span>}
        </div>
      )}

      {/* Boleto do aluguel — aluguel + água + extras (energia vai à parte) */}
      {showSlip && (
        <BillingSlipModal
          entry={entry}
          totalValue={nonEnergyTotal}
          lines={[
            { label: 'Aluguel', value: rentValue },
            ...(waterFixed > 0 ? [{ label: 'Água (fixo)', value: waterFixed }] : []),
            ...(waterConsumption > 0 ? [{ label: 'Água (consumo)', value: waterConsumption }] : []),
            ...((Number(extra) || 0) > 0 ? [{ label: extraDesc || 'Extra', value: Number(extra) }] : []),
            ...(isLate && (penalty + interest) > 0 ? [{ label: 'Multa + Juros', value: penalty + interest }] : []),
            { label: 'Total', value: nonEnergyTotal, highlight: true },
          ]}
          onClose={() => setShowSlip(false)}
        />
      )}

      {/* Boleto completo — aluguel + água + energia detalhados, PIX do total */}
      {showFullSlip && (
        <BillingSlipModal
          entry={entry}
          title="Cobrança Mensal"
          docType="cobranca-completa"
          totalValue={totalValue}
          lines={[
            { label: 'Aluguel', value: rentValue },
            ...(waterFixed > 0 ? [{ label: 'Água (fixo)', value: waterFixed }] : []),
            ...(waterConsumption > 0 ? [{ label: 'Água (consumo)', value: waterConsumption }] : []),
            ...(energyFixed > 0 ? [{ label: 'Energia (fixo)', value: energyFixed }] : []),
            ...(energyConsumption > 0 ? [{ label: 'Energia (consumo)', value: energyConsumption }] : []),
            ...((Number(extra) || 0) > 0 ? [{ label: extraDesc || 'Extra', value: Number(extra) }] : []),
            ...(isLate && (penalty + interest) > 0 ? [{ label: 'Multa + Juros', value: penalty + interest }] : []),
            { label: 'Total', value: totalValue, highlight: true },
          ]}
          energy={energyFromReading ? {
            prevReading: Number(entry.energy_prev_reading),
            currReading: Number(entry.energy_curr_reading),
            kwh: Number(entry.energy_kwh),
            rate: Number(entry.energy_kwh_rate),
          } : undefined}
          onClose={() => setShowFullSlip(false)}
        />
      )}

      {/* Conta de energia — PIX e valor próprios */}
      {showEnergySlip && (
        <BillingSlipModal
          entry={entry}
          title="Conta de Energia"
          docType="energia"
          totalValue={energyTotal}
          lines={[
            { label: 'Energia', value: energyTotal },
            { label: 'Total', value: energyTotal, highlight: true },
          ]}
          energy={energyFromReading ? {
            prevReading: Number(entry.energy_prev_reading),
            currReading: Number(entry.energy_curr_reading),
            kwh: Number(entry.energy_kwh),
            rate: Number(entry.energy_kwh_rate),
          } : undefined}
          onClose={() => setShowEnergySlip(false)}
        />
      )}
    </div>
  )
}
