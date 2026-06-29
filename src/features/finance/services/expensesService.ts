import { createClient } from '@/src/shared/utils/supabase/client'
import { Expense } from '@/src/shared/types/database'

export const EXPENSE_CATEGORIES = [
  'Manutenção elétrica',
  'Manutenção hidráulica',
  'Reformas e pintura',
  'Estrutura e telhado',
  'Limpeza e jardinagem',
  'IPTU',
  'Condomínio',
  'Seguro imobiliário',
  'Taxas cartorárias',
  'Água e esgoto',
  'Energia elétrica',
  'Internet e TV',
  'Gás',
  'Marketing e anúncios',
  'Softwares e assinaturas',
  'Material de escritório',
  'Serviços profissionais',
  'Outros',
] as const

export async function getExpenses(month?: number, year?: number): Promise<Expense[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  let query = supabase
    .from('expenses')
    .select('*, property:properties(title)')
    .eq('owner_id', user.id)
    .eq('is_settled', true)
    .order('date', { ascending: false })

  if (month && year) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]
    query = query.gte('date', from).lte('date', to)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Expense[]
}

export async function getPendingScheduled(): Promise<Expense[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('expenses')
    .select('*, property:properties(title)')
    .eq('owner_id', user.id)
    .eq('is_settled', false)
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data as Expense[]
}

export async function createExpense(
  expense: Omit<Expense, 'id' | 'created_at' | 'owner_id'>
): Promise<Expense> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('expenses')
    .insert([{ ...expense, owner_id: user.id }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Expense
}

export async function updateExpense(
  id: string,
  expense: Partial<Omit<Expense, 'id' | 'created_at' | 'owner_id'>>
): Promise<Expense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Expense
}

export async function getExpenseById(id: string): Promise<Expense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*, property:properties(title)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Expense
}

export async function settleExpense(id: string): Promise<void> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('expenses')
    .update({ is_settled: true, date: today })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function unsettleExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ is_settled: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
