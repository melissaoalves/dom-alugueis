import { createClient } from '@/src/shared/utils/supabase/client'
import { EnergyReading } from '@/src/shared/types/database'

const round2 = (v: number) => Math.round(v * 100) / 100

// Consumo e valor a cobrar a partir de duas leituras do relógio
export function calcEnergyCharge(prevReading: number, currReading: number, rate: number) {
  const kwh = round2(currReading - prevReading)
  return { kwh, amount: round2(kwh * rate) }
}

// Tarifa padrão (R$/kWh) salva no perfil do proprietário
export async function getEnergyRate(): Promise<number | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('energy_kwh_rate')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(error.message)
  return data?.energy_kwh_rate ?? null
}

export interface ReadingsContext {
  // leitura já lançada para a mensalidade (por entry id)
  own: Record<string, EnergyReading>
  // leitura que serve de base para a mensalidade (por entry id); ausente = imóvel sem leitura
  previous: Record<string, EnergyReading>
  // todas as leituras do imóvel, da mais recente para a mais antiga (por property id)
  history: Record<string, EnergyReading[]>
}

// Monta, para cada mensalidade, a leitura própria e a leitura anterior do relógio do imóvel.
export async function getReadingsContext(
  entries: { id: string; property_id: string }[]
): Promise<ReadingsContext> {
  const ctx: ReadingsContext = { own: {}, previous: {}, history: {} }
  const propertyIds = [...new Set(entries.map(e => e.property_id).filter(Boolean))]
  if (propertyIds.length === 0) return ctx

  const supabase = createClient()
  const { data, error } = await supabase
    .from('energy_readings')
    .select('*')
    .in('property_id', propertyIds)
    .order('reading_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  for (const r of (data ?? []) as EnergyReading[]) {
    ;(ctx.history[r.property_id] ??= []).push(r)
  }

  for (const e of entries) {
    const readings = ctx.history[e.property_id] ?? []
    const own = readings.find(r => r.monthly_entry_id === e.id)
    if (own) ctx.own[e.id] = own
    // Anterior = leitura mais recente do imóvel que não seja a própria e não seja posterior a ela
    const previous = readings.find(r => r !== own && (!own || r.reading_date <= own.reading_date))
    if (previous) ctx.previous[e.id] = previous
  }

  return ctx
}

// Leitura que não gera cobrança: primeira leitura do imóvel ('initial') ou troca de relógio ('meter_reset')
export async function saveBaselineReading(params: {
  propertyId: string
  readingKwh: number
  readingDate: string
  kind: 'initial' | 'meter_reset'
}) {
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Sessão expirada. Faça login novamente.')

  const { error } = await supabase.from('energy_readings').insert({
    owner_id: user.id,
    property_id: params.propertyId,
    reading_date: params.readingDate,
    reading_kwh: params.readingKwh,
    kind: params.kind,
  })
  if (error) throw new Error(`Erro ao salvar leitura: ${error.message}`)
}

// Exclui uma leitura inicial / troca de relógio registrada por engano.
// Leituras faturadas ('regular') ficam presas à mensalidade e não são excluídas por aqui.
export async function deleteBaselineReading(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('energy_readings')
    .delete()
    .eq('id', id)
    .neq('kind', 'regular')
  if (error) throw new Error(`Erro ao excluir leitura: ${error.message}`)
}

export interface EnergyReadingInput {
  entryId: string
  propertyId: string
  prevReading: number
  currReading: number
  readingDate: string
}

export async function saveEnergyReadings(params: {
  rate: number
  rows: EnergyReadingInput[]
}): Promise<{ billed: number }> {
  const { rate, rows } = params
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Sessão expirada. Faça login novamente.')

  const { error: rateError } = await supabase
    .from('profiles')
    .update({ energy_kwh_rate: rate })
    .eq('id', user.id)
  if (rateError) throw new Error(`Erro ao salvar tarifa: ${rateError.message}`)

  let billed = 0
  for (const row of rows) {
    const { kwh, amount } = calcEnergyCharge(row.prevReading, row.currReading, rate)
    if (kwh < 0) throw new Error('Leitura atual menor que a anterior.')

    // Uma leitura por mensalidade: salvar de novo corrige a leitura existente
    const { error: readingError } = await supabase
      .from('energy_readings')
      .upsert({
        owner_id: user.id,
        property_id: row.propertyId,
        monthly_entry_id: row.entryId,
        reading_date: row.readingDate,
        reading_kwh: row.currReading,
        kind: 'regular',
      }, { onConflict: 'monthly_entry_id' })
    if (readingError) throw new Error(`Erro ao salvar leitura: ${readingError.message}`)

    const { error: entryError } = await supabase
      .from('monthly_entries')
      .update({
        energy_prev_reading: row.prevReading,
        energy_curr_reading: row.currReading,
        energy_kwh: kwh,
        energy_kwh_rate: rate,
        energy_amount: amount,
      })
      .eq('id', row.entryId)
    if (entryError) throw new Error(`Erro ao atualizar mensalidade: ${entryError.message}`)

    billed++
  }

  return { billed }
}

export interface EnergyBillInfo {
  prevDate: string | null
  currDate: string | null
  // tipo da leitura anterior: 'initial' = primeira leitura do relógio (base 0)
  prevKind: EnergyReading['kind'] | null
  // consumo dos últimos meses do imóvel, do mais antigo para o mais recente
  history: { referenceMonth: string; kwh: number }[]
  issuer: { name: string; document: string } | null
}

// Dados extras para a conta enviada ao inquilino: período da leitura, histórico de consumo e emitente
export async function getEnergyBillInfo(entry: {
  id: string
  property_id: string
  reference_month: string
}): Promise<EnergyBillInfo> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [ctx, { data: past }, { data: profile }] = await Promise.all([
    getReadingsContext([entry]),
    supabase
      .from('monthly_entries')
      .select('reference_month, energy_kwh')
      .eq('property_id', entry.property_id)
      .not('energy_kwh', 'is', null)
      .lte('reference_month', entry.reference_month)
      .order('reference_month', { ascending: false })
      .limit(6),
    user
      ? supabase.from('profiles').select('first_name, last_name, document_id').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  return {
    prevDate: ctx.previous[entry.id]?.reading_date ?? null,
    currDate: ctx.own[entry.id]?.reading_date ?? null,
    prevKind: ctx.previous[entry.id]?.kind ?? null,
    history: (past ?? [])
      .map((p: any) => ({ referenceMonth: p.reference_month, kwh: Number(p.energy_kwh) }))
      .reverse(),
    issuer: profile
      ? { name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(), document: profile.document_id ?? '' }
      : null,
  }
}
