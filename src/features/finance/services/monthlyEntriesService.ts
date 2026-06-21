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

  // 1. Contratos ATIVOS que cobrem o mês inteiro de referência
  //    Só gera entrada se o contrato ainda estará ativo no último dia do mês
  //    (end_date nulo = sem fim definido; end_date >= último dia = cobre o mês todo)
  const { data: activeRaw, error } = await supabase
    .from('contracts')
    .select('id, property_id, due_day, rent_value, water_value, energy_value, water_billing_type, energy_billing_type, start_date, end_date, status, is_renewal')
    .eq('is_active', true)
    .eq('status', 'ativo')
    .in('property_id', propertyIds)
    .lte('start_date', lastDayOfRef)

  if (error) throw new Error(`Erro ao buscar contratos: ${error.message}`)

  const activeContracts = (activeRaw ?? []).filter(
    (c: any) => !c.end_date || c.end_date >= lastDayOfRef
  )

  // 2. Contratos RESCINDIDOS cujo end_date (data de rescisão) cai neste mês
  //    e que ainda não têm entrada gerada para este mês
  const { data: rescindedRaw } = await supabase
    .from('contracts')
    .select('id, property_id, due_day, rent_value, water_value, energy_value, water_billing_type, energy_billing_type, start_date, end_date, status, is_renewal')
    .eq('status', 'rescindido')
    .in('property_id', propertyIds)
    .gte('end_date', referenceMonth)   // end_date >= primeiro dia do mês
    .lte('end_date', lastDayOfRef)     // end_date <= último dia do mês

  const rescindedIds = (rescindedRaw ?? []).map((c: any) => c.id)

  // Filtra os que já têm lançamento neste mês para não duplicar
  const existingEntryIds = new Set<string>()
  if (rescindedIds.length > 0) {
    const { data: existing } = await supabase
      .from('monthly_entries')
      .select('contract_id')
      .eq('reference_month', referenceMonth)
      .in('contract_id', rescindedIds)
    ;(existing ?? []).forEach((e: any) => existingEntryIds.add(e.contract_id))
  }

  const rescindedContracts = (rescindedRaw ?? []).filter(
    (c: any) => !existingEntryIds.has(c.id)
  )

  const allContracts = [...activeContracts, ...rescindedContracts]

  if (allContracts.length === 0) throw new Error('Nenhum contrato encontrado para o período.')

  // helper para parsear datas sem problemas de fuso horário/UTC
  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  // due_date = mês seguinte ao referenceMonth, no dia due_day do contrato
  const dueMonthNum = refMonthNum === 12 ? 1 : refMonthNum + 1
  const dueYearNum = refMonthNum === 12 ? refYear + 1 : refYear

  const entries: any[] = allContracts.map((c: any) => {
    const isRescinded = c.status === 'rescindido'

    // Rescindidos: vence na data de encerramento; ativos: dia de vencimento do mês seguinte
    let dueDateStr: string
    if (isRescinded && c.end_date) {
      dueDateStr = c.end_date
    } else {
      const lastDayDue = new Date(dueYearNum, dueMonthNum, 0).getDate()
      const dueDay = Math.min(c.due_day ?? 10, lastDayDue)
      dueDateStr = `${dueYearNum}-${String(dueMonthNum).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
    }

    // Pré-preenche valores fixos do contrato; consumo fica null (proprietário preenche depois)
    let waterAmount = c.water_billing_type === 'fixed' ? (c.water_value ?? null) : null
    let energyAmount = c.energy_billing_type === 'fixed' ? (c.energy_value ?? null) : null

    let rentValue = Number(c.rent_value)
    if (isNaN(rentValue)) rentValue = 0

    // Define o início e fim do ciclo de faturamento deste mês
    const cycleStart = new Date(refYear, refMonthNum - 1, c.due_day ?? 10)
    const cycleEnd = new Date(dueYearNum, dueMonthNum - 1, c.due_day ?? 10)
    const cycleDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24))

    const contractStart = parseLocalDate(c.start_date)
    const contractEnd = c.end_date ? parseLocalDate(c.end_date) : null

    // Calcula a sobreposição entre a vigência do contrato e este ciclo de faturamento
    // Se for uma renovação, assume que o inquilino já estava no imóvel (sem pro-rata de início)
    const actualStart = !c.is_renewal && contractStart.getTime() > cycleStart.getTime() ? contractStart : cycleStart
    const actualEnd = contractEnd && contractEnd.getTime() < cycleEnd.getTime() ? contractEnd : cycleEnd

    const diffTime = actualEnd.getTime() - actualStart.getTime()
    const daysOccupied = Math.round(diffTime / (1000 * 60 * 60 * 24))

    // Se o inquilino não ocupou nenhum dia nesse ciclo de faturamento, descarta a cobrança
    if (daysOccupied <= 0) {
      return null
    }

    // Se o inquilino ocupou menos dias que o ciclo de faturamento inteiro, cobra proporcional
    if (daysOccupied < cycleDays) {
      rentValue = Number(((rentValue / 30) * daysOccupied).toFixed(2))
      if (waterAmount !== null) {
        waterAmount = Number(((waterAmount / 30) * daysOccupied).toFixed(2))
      }
      if (energyAmount !== null) {
        energyAmount = Number(((energyAmount / 30) * daysOccupied).toFixed(2))
      }
    }

    return {
      contract_id: c.id,
      property_id: c.property_id,
      owner_id: user.id,
      reference_month: referenceMonth,
      due_date: dueDateStr,
      rent_value: rentValue,
      water_amount: waterAmount,
      energy_amount: energyAmount,
      is_paid: false,
      notes: isRescinded ? `Rescisão — cobrança proporcional até ${dueDateStr} (${daysOccupied} dias)` : null,
    }
  }).filter(Boolean)

  const { data, error: insertError } = await supabase
    .from('monthly_entries')
    .upsert(entries, { onConflict: 'contract_id,reference_month', ignoreDuplicates: true })
    .select()

  if (insertError) throw new Error(insertError.message)
  return { total: activeContracts.length, created: data?.length ?? 0 }
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
