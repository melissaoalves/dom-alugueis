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

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
