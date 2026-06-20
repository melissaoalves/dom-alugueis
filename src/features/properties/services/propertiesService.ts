import { createClient } from '@/src/shared/utils/supabase/client'
import { Property } from '@/src/shared/types/database'

export async function getProperties() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching properties:', error)
    throw new Error(error.message)
  }

  return data as Property[]
}

export async function getProperty(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching property:', error)
    throw new Error(error.message)
  }

  return data as Property
}

export async function createProperty(property: Omit<Property, 'id' | 'created_at' | 'owner_id'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('properties')
    .insert([{ ...property, owner_id: user.id }])
    .select()
    .single()

  if (error) {
    console.error('Error creating property:', error)
    throw new Error(error.message)
  }

  return data as Property
}

export async function updateProperty(id: string, property: Partial<Omit<Property, 'id' | 'created_at' | 'owner_id'>>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('properties')
    .update(property)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating property:', error)
    throw new Error(error.message)
  }

  return data as Property
}

export async function deleteProperty(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting property:', error)
    throw new Error(error.message)
  }
}
