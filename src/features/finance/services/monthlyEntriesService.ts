import { createClient } from '@/src/shared/utils/supabase/client'
import { MonthlyEntry } from '@/src/shared/types/database'

// Retorna todas as entradas de um mês de referência
// reference_month: mês a que se refere o aluguel (ex: junho → '2026-06-01')
export async function getMonthlyEntries(referenceMonth: string) {
  const supabase = createClient()

  const { data: entries, error } = await supabase
    .from('monthly_entries')
    .select('*')
    .eq('reference_month', referenceMonth)
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)
  if (!entries || entries.length === 0) return []

  // Busca contratos e seus dados relacionados
  const contractIds = [...new Set(entries.map((e: any) => e.contract_id).filter(Boolean))]
  const propertyIds = [...new Set(entries.map((e: any) => e.property_id).filter(Boolean))]

  const [{ data: contracts }, { data: properties }] = await Promise.all([
    contractIds.length > 0
      ? supabase
          .from('contracts')
          .select('id, rent_value, penalty_fee, interest_rate, tenant_id, water_billing_type, water_value, energy_billing_type, energy_value')
          .in('id', contractIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length > 0
      ? supabase.from('properties').select('id, title').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
  ])

  const tenantIds = [...new Set((contracts ?? []).map((c: any) => c.tenant_id).filter(Boolean))]
  const { data: tenants } = tenantIds.length > 0
    ? await supabase.from('tenants').select('id, full_name').in('id', tenantIds)
    : { data: [] }

  const contractMap = Object.fromEntries(
    (contracts ?? []).map((c: any) => [c.id, {
      ...c,
      tenant: (tenants ?? []).find((t: any) => t.id === c.tenant_id) ?? null,
    }])
  )
  const propertyMap = Object.fromEntries((properties ?? []).map((p: any) => [p.id, p]))

  return entries.map((e: any) => ({
    ...e,
    contract: contractMap[e.contract_id] ?? null,
    property: propertyMap[e.property_id] ?? null,
  }))
}

// Gera lançamentos para o referenceMonth a partir dos contratos ativos.
// referenceMonth: mês que foi morado (ex: '2026-06-01')
// O vencimento (due_date) cai no mês seguinte ao referenceMonth.
export async function generateMonthEntries(referenceMonth: string): Promise<{ total: number; created: number }> {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Sessão expirada. Faça login novamente.')

  // Busca imóveis do usuário com billing types (RLS garantido via property ownership)
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, water_billing_type, water_value, energy_billing_type, energy_value')

  if (propError) throw new Error(`Erro ao buscar imóveis: ${propError.message}`)
  if (!properties || properties.length === 0) throw new Error('Nenhum imóvel cadastrado.')

  const propertyIds = properties.map((p: any) => p.id)

  // Último dia do mês de referência (sem conversão UTC)
  const [refYear, refMonthNum] = referenceMonth.split('-').map(Number)
  const lastDayNum = new Date(refYear, refMonthNum, 0).getDate()
  const lastDayOfRef = `${refYear}-${String(refMonthNum).padStart(2, '0')}-${lastDayNum}`

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, property_id, due_day, water_value, energy_value')
    .eq('is_active', true)
    .in('property_id', propertyIds)
    .lte('start_date', lastDayOfRef)

  if (error) throw new Error(`Erro ao buscar contratos: ${error.message}`)
  if (!contracts || contracts.length === 0) throw new Error('Nenhum contrato ativo encontrado para o período.')

  // due_date = mês seguinte ao referenceMonth, no dia due_day do contrato
  const dueMonthNum = refMonthNum === 12 ? 1 : refMonthNum + 1
  const dueYearNum = refMonthNum === 12 ? refYear + 1 : refYear

  const entries = contracts.map((c: any) => {
    const lastDayDue = new Date(dueYearNum, dueMonthNum, 0).getDate()
    const dueDay = Math.min(c.due_day ?? 10, lastDayDue)
    const dueDateStr = `${dueYearNum}-${String(dueMonthNum).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

    // Pré-preenche valores fixos do contrato; consumo fica null (proprietário preenche depois)
    const waterAmount = c.water_billing_type === 'fixed' ? (c.water_value ?? null) : null
    const energyAmount = c.energy_billing_type === 'fixed' ? (c.energy_value ?? null) : null

    return {
      contract_id: c.id,
      property_id: c.property_id,
      owner_id: user.id,
      reference_month: referenceMonth,
      due_date: dueDateStr,
      water_amount: waterAmount,
      energy_amount: energyAmount,
      is_paid: false,
    }
  })

  const { data, error: insertError } = await supabase
    .from('monthly_entries')
    .upsert(entries, { onConflict: 'contract_id,reference_month', ignoreDuplicates: true })
    .select()

  if (insertError) throw new Error(insertError.message)
  return { total: contracts.length, created: data?.length ?? 0 }
}

export async function updateMonthlyEntry(
  id: string,
  payload: Partial<Pick<MonthlyEntry, 'is_paid' | 'water_amount' | 'energy_amount' | 'extra_amount' | 'extra_description' | 'notes'>> & { payment_date?: string | null }
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('monthly_entries')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export function calcLateFees(
  dueDate: string,
  rentValue: number,
  penaltyRate = 0,
  interestRate = 0,
  compareDate?: string  // data do pagamento; se não fornecida usa hoje
) {
  const due = new Date(dueDate + 'T00:00:00')
  const ref = compareDate
    ? new Date(compareDate + 'T00:00:00')
    : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()

  if (ref <= due) return { penalty: 0, interest: 0, daysLate: 0 }

  const daysLate = Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  const monthsLate = daysLate / 30
  const penalty = rentValue * (penaltyRate / 100)
  const interest = rentValue * (interestRate / 100) * monthsLate

  return { penalty, interest, daysLate }
}
