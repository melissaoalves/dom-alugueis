import { createClient } from '@/src/shared/utils/supabase/client'
import { Contract } from '@/src/shared/types/database'

export async function getContracts() {
  const supabase = createClient()
  
  // Usando um join para trazer os dados do imóvel e do inquilino
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      property:properties(id, title),
      tenant:tenants(id, full_name, veaco)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contracts:', error)
    throw new Error(error.message)
  }

  return data
}

export async function createContract(contract: Omit<Contract, 'id' | 'created_at'>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contracts')
    .insert([contract])
    .select()
    .single()

  if (error) {
    console.error('Error creating contract:', error)
    throw new Error(error.message)
  }

  return data as Contract
}

export async function updateContract(id: string, contract: Partial<Omit<Contract, 'id' | 'created_at'>>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('contracts')
    .update(contract)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating contract:', error)
    throw new Error(error.message)
  }

  return data as Contract
}
