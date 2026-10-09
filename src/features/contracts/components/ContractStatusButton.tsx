'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban } from 'lucide-react'
import { createClient } from '@/src/shared/utils/supabase/client'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function pad(n: number) { return String(n).padStart(2, '0') }

function calcPenalty(type: string, fixedMonths: number, rentValue: number, customAmount: number): number {
  if (type === 'fixed_months') return fixedMonths * rentValue
  if (type === 'custom') return customAmount
  return 0
}

// Proporcional da rescisão = apenas os DIAS EXTRAS entre o vencimento (due_day) e o dia da
// rescisão, no mês da rescisão. Se a rescisão cai em dia <= due_day, não há dias extras:
// aquele período já é cobrado como mensalidade (evita contar o mês duas vezes com o "em aberto").
function calcProRata(
  rescissionDate: string,
  dueDay: number,
  contractStartDate: string,
  rentValue: number
): { amount: number; periodStart: string; periodLabel: string } {
  const [ry, rm, rd] = rescissionDate.split('-').map(Number)
  const [cy, cmo, cd] = contractStartDate.split('-').map(Number)

  // Início do período extra: o vencimento no mês da rescisão.
  // Se o contrato começou neste mesmo mês, depois do vencimento, começa no início do contrato.
  let startDay = dueDay
  if (cy === ry && cmo === rm && cd > dueDay) startDay = cd

  const extraDays = rd - startDay
  if (extraDays <= 0) {
    return { amount: 0, periodStart: rescissionDate, periodLabel: 'Sem dias extras a cobrar' }
  }

  // Divisor padrão de 30 dias para cálculo comercial pro-rata
  const amount = Math.round((extraDays / 30) * rentValue * 100) / 100
  const label = `${pad(startDay)}/${pad(rm)}/${ry} a ${pad(rd)}/${pad(rm)}/${ry} (${extraDays} dias)`

  return {
    amount,
    periodStart: `${ry}-${pad(rm)}-${pad(startDay)}`,
    periodLabel: label,
  }
}

interface Contract {
  id: string
  status: string
  property_id: string
  rent_value: number
  guarantee_amount?: number
  due_day?: number
  start_date: string
  end_date?: string
  water_billing_type?: string
  water_value?: number
  energy_billing_type?: string
  energy_value?: number
  rescission_penalty_type?: string
  rescission_fixed_months?: number
  property?: { title: string } | null
  tenant?: { full_name: string } | null
}

interface Props {
  contract: Contract
}

export function ContractStatusButton({ contract }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingLastPayment, setLoadingLastPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPaidRefMonth, setLastPaidRefMonth] = useState<string | null>(null)
  // Aluguel + água em aberto (energia fica à parte) das mensalidades já lançadas deste contrato.
  const [outstanding, setOutstanding] = useState<{ total: number; ids: string[] }>({ total: 0, ids: [] })

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })()

  const [rescissionDate, setRescissionDate] = useState(today)
  const [customPenalty, setCustomPenalty] = useState(0)
  const [damages, setDamages] = useState(0)
  const [applyPenaltyToCaucao, setApplyPenaltyToCaucao] = useState(true)
  const [generateProRata, setGenerateProRata] = useState(true)
  // Abater o aluguel proporcional do caução: o inquilino não paga, a cobrança já fica quitada
  const [payRentWithCaucao, setPayRentWithCaucao] = useState(false)

  if (contract.status === 'rescindido') return null

  const penaltyType = contract.rescission_penalty_type ?? 'none'
  const fixedMonths = contract.rescission_fixed_months ?? 3
  const rentValue = contract.rent_value ?? 0
  const guaranteeAmount = contract.guarantee_amount ?? 0

  const waterFixed = contract.water_billing_type === 'fixed' ? (contract.water_value ?? 0) : 0
  const energyFixed = contract.energy_billing_type === 'fixed' ? (contract.energy_value ?? 0) : 0
  const hasConsumption = contract.water_billing_type === 'consumption' || contract.energy_billing_type === 'consumption'

  const penalty = calcPenalty(penaltyType, fixedMonths, rentValue, customPenalty)
  const proRataResult = calcProRata(
    rescissionDate,
    contract.due_day ?? 1,
    contract.start_date,
    rentValue,
  )
  const proRataWaterResult = waterFixed > 0 ? calcProRata(rescissionDate, contract.due_day ?? 1, contract.start_date, waterFixed) : null
  const proRataEnergyResult = energyFixed > 0 ? calcProRata(rescissionDate, contract.due_day ?? 1, contract.start_date, energyFixed) : null

  const proRataRent = proRataResult.amount
  const proRataWater = proRataWaterResult?.amount ?? 0
  const proRataEnergy = proRataEnergyResult?.amount ?? 0
  const proRata = proRataRent + proRataWater + proRataEnergy

  // Aluguel + água que o caução pode cobrir (energia à parte): em aberto + proporcional da rescisão
  const rentToCover = Math.round((outstanding.total + proRataRent + proRataWater) * 100) / 100

  const caucaoDeductions = (applyPenaltyToCaucao ? penalty : 0) + damages + (payRentWithCaucao ? rentToCover : 0)
  const caucaoBalance = guaranteeAmount - caucaoDeductions

  const openModal = async () => {
    setShowModal(true)
    setLoadingLastPayment(true)
    setPayRentWithCaucao(false)
    try {
      const supabase = createClient()
      const [{ data: lastPaid }, { data: entries }] = await Promise.all([
        supabase
          .from('monthly_entries')
          .select('reference_month')
          .eq('contract_id', contract.id)
          .eq('is_paid', true)
          .order('reference_month', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('monthly_entries')
          .select('id, is_paid, energy_paid, rent_value, water_amount, energy_amount, extra_amount')
          .eq('contract_id', contract.id),
      ])
      setLastPaidRefMonth(lastPaid?.reference_month ?? null)

      // Aluguel + água em aberto (energia à parte, via energy_paid).
      // is_paid cobre aluguel+água; se false, esse pacote está em aberto.
      const wb = contract.water_billing_type ?? 'not_included'
      let total = 0
      const ids: string[] = []
      for (const e of entries ?? []) {
        if (e.is_paid) continue
        const rent = e.rent_value ?? contract.rent_value ?? 0
        const water = wb === 'fixed' ? (e.water_amount || contract.water_value || 0) : wb === 'consumption' ? (e.water_amount || 0) : 0
        const owed = rent + water + (e.extra_amount || 0)
        if (owed <= 0) continue
        total += owed
        ids.push(e.id)
      }
      setOutstanding({ total: Math.round(total * 100) / 100, ids })
    } catch {
      setLastPaidRefMonth(null)
      setOutstanding({ total: 0, ids: [] })
    } finally {
      setLoadingLastPayment(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      const { error: contractErr } = await supabase
        .from('contracts')
        .update({ status: 'rescindido', is_active: false, end_date: rescissionDate })
        .eq('id', contract.id)

      if (contractErr) throw new Error(contractErr.message)

      if ((generateProRata || payRentWithCaucao) && proRata > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const [y, m] = rescissionDate.split('-').map(Number)
          const refMonth = `${y}-${pad(m)}-01`

          // Ao abater do caução, a multa não é cobrada do inquilino neste lançamento
          const chargePenaltyToTenant = penalty > 0 && !applyPenaltyToCaucao && !payRentWithCaucao
          const hasEnergy = proRataEnergy > 0

          const { error: entryErr } = await supabase
            .from('monthly_entries')
            .upsert({
              contract_id: contract.id,
              property_id: contract.property_id,
              owner_id: user.id,
              reference_month: refMonth,
              due_date: rescissionDate,
              rent_value: proRataRent,
              water_amount: proRataWater > 0 ? proRataWater : null,
              energy_amount: hasEnergy ? proRataEnergy : null,
              extra_amount: chargePenaltyToTenant ? penalty : null,
              extra_description: chargePenaltyToTenant ? 'Multa rescisória' : null,
              // Caução cobre aluguel + água; energia fica à parte (energy_paid)
              is_paid: payRentWithCaucao,
              payment_date: payRentWithCaucao ? rescissionDate : null,
              energy_paid: false,
              energy_payment_date: null,
              notes: `Rescisão — ${proRataResult.periodLabel}${payRentWithCaucao ? ' · Aluguel/água quitado com o caução' : ''}`,
            }, { onConflict: 'contract_id,reference_month', ignoreDuplicates: false })

          if (entryErr) throw new Error(`Erro ao gerar lançamento: ${entryErr.message}`)
        }
      }

      // Abate do caução o aluguel + água das mensalidades em aberto (energia segue a cobrar)
      if (payRentWithCaucao && outstanding.ids.length > 0) {
        const { error: settleErr } = await supabase
          .from('monthly_entries')
          .update({ is_paid: true, payment_date: rescissionDate, notes: 'Aluguel/água quitado com o caução' })
          .in('id', outstanding.ids)
        if (settleErr) throw new Error(`Erro ao quitar aluguel em aberto: ${settleErr.message}`)
      }

      setShowModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        title="Rescindir contrato"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-900/50 text-rose-400 transition hover:bg-rose-900/20 hover:border-rose-700"
      >
        <Ban size={13} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="border-b border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white">Rescindir contrato</h2>
              <p className="mt-1 text-sm text-slate-400">
                {contract.property?.title} · {contract.tenant?.full_name}
              </p>
            </div>

            <div className="space-y-6 p-6">
              {error && (
                <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>
              )}

              {/* Data de rescisão */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data da rescisão</label>
                <input
                  type="date"
                  value={rescissionDate}
                  onChange={e => setRescissionDate(e.target.value)}
                  max={today}
                  className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Multa rescisória */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Multa rescisória</p>
                {penaltyType === 'none' && (
                  <p className="text-sm text-slate-500">Sem multa configurada.</p>
                )}
                {penaltyType === 'fixed_months' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{fixedMonths}× aluguel ({fmt(rentValue)})</span>
                    <span className="font-semibold text-white">{fmt(penalty)}</span>
                  </div>
                )}
                {penaltyType === 'custom' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valor da multa (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customPenalty}
                      onChange={e => setCustomPenalty(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                )}
                {penalty > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={applyPenaltyToCaucao} onChange={e => setApplyPenaltyToCaucao(e.target.checked)} className="accent-indigo-600" />
                    <span className="text-slate-300">Descontar multa do caução</span>
                  </label>
                )}
              </div>

              {/* Aluguel proporcional */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Aluguel proporcional</p>
                {loadingLastPayment ? (
                  <p className="text-sm text-slate-500">Verificando último pagamento...</p>
                ) : (
                  <>
                    <div className="text-xs text-slate-500 mb-2">
                      {lastPaidRefMonth
                        ? `Último pago: ${new Date(lastPaidRefMonth + 'T00:00:00').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`
                        : 'Nenhum lançamento pago — usando início do contrato'}
                    </div>
                    {proRata > 0 ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">{proRataResult.periodLabel}</span>
                          <span className="font-semibold text-white">{fmt(proRata)}</span>
                        </div>
                        {/* Breakdown do valor base */}
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500 pl-1">
                          <div className="flex justify-between">
                            <span>Aluguel</span><span>{fmt(proRataRent)}</span>
                          </div>
                          {waterFixed > 0 && (
                            <div className="flex justify-between">
                              <span>Água (fixo)</span><span>{fmt(proRataWater)}</span>
                            </div>
                          )}
                          {energyFixed > 0 && (
                            <div className="flex justify-between">
                              <span>Energia (fixo)</span><span>{fmt(proRataEnergy)}</span>
                            </div>
                          )}
                          {hasConsumption && (
                            <p className="mt-1 text-slate-600 italic">
                              Consumo variável será lançado na tela de Mensalidades.
                            </p>
                          )}
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                          <input
                            type="checkbox"
                            checked={generateProRata || payRentWithCaucao}
                            disabled={payRentWithCaucao}
                            onChange={e => setGenerateProRata(e.target.checked)}
                            className="accent-indigo-600 disabled:opacity-50"
                          />
                          <span className="text-slate-300">Gerar cobrança proporcional</span>
                        </label>
                      </>
                    ) : (
                      <p className="text-sm text-emerald-400">Período já coberto — sem valor proporcional a cobrar.</p>
                    )}

                    {/* Aluguel + água em aberto + opção de abater do caução */}
                    {outstanding.total > 0 && (
                      <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                        <span className="text-slate-400">Aluguel + água em aberto</span>
                        <span className="font-semibold text-white">{fmt(outstanding.total)}</span>
                      </div>
                    )}
                    {guaranteeAmount > 0 && rentToCover > 0 && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={payRentWithCaucao} onChange={e => setPayRentWithCaucao(e.target.checked)} className="accent-indigo-600" />
                        <span className="text-slate-300">Abater aluguel + água do caução ({fmt(rentToCover)})</span>
                      </label>
                    )}
                    {payRentWithCaucao && (
                      <p className="text-xs text-slate-500">
                        Aluguel e água ({fmt(rentToCover)}) são descontados do caução. A energia o inquilino continua pagando.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Acerto da caução */}
              {guaranteeAmount > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Acerto do caução</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Caução original</span>
                      <span className="text-white">{fmt(guaranteeAmount)}</span>
                    </div>
                    {applyPenaltyToCaucao && penalty > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">− Multa rescisória</span>
                        <span className="text-rose-400">−{fmt(penalty)}</span>
                      </div>
                    )}
                    {payRentWithCaucao && rentToCover > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">− Aluguel + água</span>
                        <span className="text-rose-400">−{fmt(rentToCover)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">− Avarias / reparos</span>
                      <input
                        type="number"
                        step="0.01"
                        value={damages}
                        onChange={e => setDamages(Number(e.target.value))}
                        placeholder="0,00"
                        className="h-7 w-28 rounded-md border border-slate-800 bg-slate-900 px-2 text-right text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div className={`flex justify-between border-t border-slate-800 pt-2 font-semibold ${caucaoBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span>{caucaoBalance >= 0 ? 'A devolver ao inquilino' : 'Saldo devedor do inquilino'}</span>
                      <span>{fmt(Math.abs(caucaoBalance))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 p-6">
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                disabled={loading}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || loadingLastPayment}
                className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {loading ? 'Rescindindo...' : 'Confirmar Rescisão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
