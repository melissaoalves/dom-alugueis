import { createClient } from '@/src/shared/utils/supabase/client'
import { Tenant } from '@/src/shared/types/database'

export async function getTenants() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tenants:', error)
    throw new Error(error.message)
  }

  return data as Tenant[]
}

export async function getTenant(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    throw new Error(error.message)
  }

  return data as Tenant
}

export async function createTenant(tenant: Omit<Tenant, 'id' | 'created_at' | 'owner_id'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('tenants')
    .insert([{ ...tenant, owner_id: user.id }])
    .select()
    .single()

  if (error) {
    console.error('Error creating tenant:', error)
    throw new Error(error.message)
  }

  return data as Tenant
}

export async function updateTenant(id: string, tenant: Partial<Omit<Tenant, 'id' | 'created_at' | 'owner_id'>>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .update(tenant)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating tenant:', error)
    throw new Error(error.message)
  }

  return data as Tenant
}

export async function deleteTenant(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting tenant:', error)
    throw new Error(error.message)
  }
}
