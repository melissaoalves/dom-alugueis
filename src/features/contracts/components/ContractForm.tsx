'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createContract, updateContract } from '../services/contractsService'
import { getProperties } from '@/src/features/properties/services/propertiesService'
import { getTenants } from '@/src/features/tenants/services/tenantsService'
import { Property, Tenant, Contract, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/src/shared/types/database'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'

const selectClass = "w-full h-10 px-3 py-2 rounded-md border border-slate-800 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const labelMutedClass = "block text-sm font-medium text-slate-500 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

const DURATION_OPTIONS = [
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
]

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setMonth(date.getMonth() + months)
  return date.toISOString().split('T')[0]
}

interface ContractFormProps {
  initialData?: Contract
}

export function ContractForm({ initialData }: ContractFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])

  const [propertyId, setPropertyId] = useState(initialData?.property_id ?? '')
  const [tenantId, setTenantId] = useState(initialData?.tenant_id ?? '')
  const [startDate, setStartDate] = useState(initialData?.start_date ?? '')
  const [durationMonths, setDurationMonths] = useState(12)
  const endDate = startDate ? addMonths(startDate, durationMonths) : ''
  const [waterBillingType, setWaterBillingType] = useState<string>(initialData?.water_billing_type ?? 'not_included')
  const [energyBillingType, setEnergyBillingType] = useState<string>(initialData?.energy_billing_type ?? 'not_included')
  const [isRenewal, setIsRenewal] = useState(initialData?.is_renewal ?? false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    initialData?.payment_methods ?? []
  )

  function togglePaymentMethod(method: PaymentMethod) {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    )
  }
  const [penaltyType, setPenaltyType] = useState<string>(initialData?.rescission_penalty_type ?? 'none')
  const [fixedMonths, setFixedMonths] = useState(initialData?.rescission_fixed_months ?? 3)

  useEffect(() => {
    async function loadData() {
      try {
        const [props, tens] = await Promise.all([getProperties(), getTenants()])
        setProperties(props)
        setTenants(tens)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        property_id: formData.get('property_id') as string,
        tenant_id: formData.get('tenant_id') as string,
        start_date: startDate,
        end_date: endDate || undefined,
        rent_value: Number(formData.get('rent_value')),
        water_billing_type: waterBillingType as 'fixed' | 'consumption' | 'not_included',
        water_value: waterBillingType !== 'not_included' && formData.get('water_value')
          ? Number(formData.get('water_value')) : undefined,
        energy_billing_type: energyBillingType as 'fixed' | 'consumption' | 'not_included',
        energy_value: energyBillingType !== 'not_included' && formData.get('energy_value')
          ? Number(formData.get('energy_value')) : undefined,
        guarantee_amount: formData.get('guarantee_amount') ? Number(formData.get('guarantee_amount')) : undefined,
        interest_rate: formData.get('interest_rate') ? Number(formData.get('interest_rate')) : undefined,
        penalty_fee: formData.get('penalty_fee') ? Number(formData.get('penalty_fee')) : undefined,
        due_day: formData.get('due_day') ? Number(formData.get('due_day')) : undefined,
        duration_months: durationMonths,
        payment_methods: paymentMethods.length > 0 ? paymentMethods : undefined,
        annual_adjustment_rate: formData.get('annual_adjustment_rate') ? Number(formData.get('annual_adjustment_rate')) : undefined,
        general_infraction_penalty: (formData.get('general_infraction_penalty') as string) || undefined,
        pix_key_guarantee: (formData.get('pix_key_guarantee') as string) || undefined,
        forum_city: (formData.get('forum_city') as string) || undefined,
        forum_state: (formData.get('forum_state') as string) || undefined,
        property_destination: ((formData.get('property_destination') as string) || 'residencial') as 'residencial' | 'comercial',
        status: (initialData?.status === 'rescindido' ? 'rescindido' : 'ativo') as 'ativo' | 'rescindido',
        is_active: initialData?.status !== 'rescindido',
        is_renewal: isRenewal,
        rescission_penalty_type: penaltyType as 'none' | 'fixed_months' | 'custom',
        rescission_fixed_months: penaltyType === 'fixed_months' ? fixedMonths : undefined,
      }

      if (initialData) {
        await updateContract(initialData.id, payload)
      } else {
        await createContract(payload)
      }

      router.push('/dashboard/contracts')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar contrato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Imóvel e Inquilino */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="property_id" className={labelClass}>Imóvel *</label>
            <select id="property_id" name="property_id" required value={propertyId} onChange={e => setPropertyId(e.target.value)} className={selectClass}>
              <option value="">Selecione o imóvel...</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tenant_id" className={labelClass}>Inquilino *</label>
            <select id="tenant_id" name="tenant_id" required value={tenantId} onChange={e => setTenantId(e.target.value)} className={selectClass}>
              <option value="">Selecione o inquilino...</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}{t.veaco ? ' (!)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="start_date" className={labelClass}>Data de Início *</label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Duração do Contrato *</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setDurationMonths(opt.months)}
                  className={`flex-1 h-10 rounded-md border text-sm font-medium transition-colors ${
                    durationMonths === opt.months
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Data de Fim (calculada)</label>
            <div className="flex h-10 items-center rounded-md border border-slate-800 bg-slate-950/50 px-3 text-sm text-slate-400">
              {endDate
                ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')
                : '—'}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="due_day" className={labelClass}>Dia de Vencimento *</label>
          <Input
            id="due_day"
            name="due_day"
            type="number"
            min="1"
            max="31"
            required
            defaultValue={initialData?.due_day}
            placeholder="Ex: 5"
            className={`${inputClass} max-w-30`}
          />
        </div>

        {/* Valores */}
        <div className="border-t border-slate-800 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="rent_value" className={labelClass}>Valor do Aluguel *</label>
              <Input id="rent_value" name="rent_value" type="number" step="0.01" required defaultValue={initialData?.rent_value} placeholder="0,00" className={inputClass} />
            </div>
            <div>
              <label htmlFor="guarantee_amount" className={labelMutedClass}>Caução / Garantia</label>
              <Input id="guarantee_amount" name="guarantee_amount" type="number" step="0.01" defaultValue={initialData?.guarantee_amount} placeholder="0,00" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Cobrança de Água */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="water_billing_type" className={labelClass}>Cobrança de Água</label>
            <select
              id="water_billing_type"
              name="water_billing_type"
              value={waterBillingType}
              onChange={e => setWaterBillingType(e.target.value)}
              className={selectClass}
            >
              <option value="not_included">Não incluso</option>
              <option value="fixed">Valor fixo</option>
              <option value="consumption">Por consumo</option>
            </select>
          </div>
          {waterBillingType !== 'not_included' && (
            <div>
              <label htmlFor="water_value" className={waterBillingType === 'fixed' ? labelClass : labelMutedClass}>
                Valor de Água {waterBillingType === 'fixed' ? '(R$) *' : '(R$, opcional)'}
              </label>
              <Input
                id="water_value"
                name="water_value"
                type="number"
                step="0.01"
                required={waterBillingType === 'fixed'}
                defaultValue={initialData?.water_value}
                placeholder="0,00"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Cobrança de Energia */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="energy_billing_type" className={labelClass}>Cobrança de Energia</label>
            <select
              id="energy_billing_type"
              name="energy_billing_type"
              value={energyBillingType}
              onChange={e => setEnergyBillingType(e.target.value)}
              className={selectClass}
            >
              <option value="not_included">Não incluso</option>
              <option value="fixed">Valor fixo</option>
              <option value="consumption">Por consumo</option>
            </select>
          </div>
          {energyBillingType !== 'not_included' && (
            <div>
              <label htmlFor="energy_value" className={energyBillingType === 'fixed' ? labelClass : labelMutedClass}>
                Valor de Energia {energyBillingType === 'fixed' ? '(R$) *' : '(R$, opcional)'}
              </label>
              <Input
                id="energy_value"
                name="energy_value"
                type="number"
                step="0.01"
                required={energyBillingType === 'fixed'}
                defaultValue={initialData?.energy_value}
                placeholder="0,00"
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="penalty_fee" className={labelMutedClass}>Multa por Atraso (%)</label>
            <Input id="penalty_fee" name="penalty_fee" type="number" step="0.01" defaultValue={initialData?.penalty_fee} placeholder="Ex: 10" className={inputClass} />
          </div>
          <div>
            <label htmlFor="interest_rate" className={labelMutedClass}>Juros ao Mês (%)</label>
            <Input id="interest_rate" name="interest_rate" type="number" step="0.01" defaultValue={initialData?.interest_rate} placeholder="Ex: 1" className={inputClass} />
          </div>
        </div>
      </div>

        {/* Condições e pagamento */}
        <div className="space-y-4 border-t border-slate-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-300">Condições e pagamento</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Formas de pagamento aceitas</label>
              <div className="mt-1 space-y-2">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={paymentMethods.includes(value)}
                      onChange={() => togglePaymentMethod(value)}
                      className="accent-indigo-600 h-4 w-4"
                    />
                    <span className="text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="annual_adjustment_rate" className={labelClass}>Reajuste anual (%)</label>
              <Input id="annual_adjustment_rate" name="annual_adjustment_rate" type="number" step="0.01" defaultValue={initialData?.annual_adjustment_rate} placeholder="Ex: 10" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pix_key_guarantee" className={labelClass}>Chave Pix (caução)</label>
              <Input id="pix_key_guarantee" name="pix_key_guarantee" defaultValue={initialData?.pix_key_guarantee} placeholder="Ex: email@email.com" className={inputClass} />
            </div>
            <div>
              <label htmlFor="general_infraction_penalty" className={labelClass}>Multa por infração geral</label>
              <Input id="general_infraction_penalty" name="general_infraction_penalty" defaultValue={initialData?.general_infraction_penalty} placeholder="Ex: 1 mês de aluguel" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label htmlFor="property_destination" className={labelClass}>Destinação do imóvel</label>
              <select id="property_destination" name="property_destination" defaultValue={initialData?.property_destination ?? 'residencial'} className={selectClass}>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div>
              <label htmlFor="forum_city" className={labelClass}>Foro — cidade</label>
              <Input id="forum_city" name="forum_city" defaultValue={initialData?.forum_city} placeholder="Ex: Tauá" className={inputClass} />
            </div>
            <div>
              <label htmlFor="forum_state" className={labelClass}>Foro — UF</label>
              <Input id="forum_state" name="forum_state" defaultValue={initialData?.forum_state} placeholder="Ex: CE" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Multa rescisória */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-300">Multa rescisória</h3>
          <p className="text-xs text-slate-500">Define como a multa é calculada caso o contrato seja rescindido antes do prazo.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rescission_penalty_type" className={labelClass}>Tipo de multa</label>
              <select
                id="rescission_penalty_type"
                value={penaltyType}
                onChange={e => setPenaltyType(e.target.value)}
                className={selectClass}
              >
                <option value="none">Sem multa</option>
                <option value="fixed_months">Meses fixos de aluguel</option>
                <option value="custom">Valor definido na rescisão</option>
              </select>
            </div>
            {penaltyType === 'fixed_months' && (
              <div>
                <label htmlFor="rescission_fixed_months" className={labelClass}>Quantidade de meses</label>
                <input
                  id="rescission_fixed_months"
                  type="number"
                  min={1}
                  max={12}
                  value={fixedMonths}
                  onChange={e => setFixedMonths(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Multa = {fixedMonths}× o valor do aluguel
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Renovação */}
        <div className="flex items-start gap-3 border-t border-slate-800 pt-4">
          <input
            type="checkbox"
            id="is_renewal"
            checked={isRenewal}
            onChange={e => setIsRenewal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-700 accent-indigo-600"
          />
          <div>
            <label htmlFor="is_renewal" className="text-sm font-medium text-slate-300 cursor-pointer">
              Este contrato é uma renovação
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              A caução não será contabilizada como receita caso marcado.
            </p>
          </div>
        </div>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar Contrato' : 'Firmar Contrato'}
        </Button>
      </div>
    </form>
  )
}
