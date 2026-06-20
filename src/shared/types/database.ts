/**
 * Tipos baseados no schema do Supabase (conforme ERD)
 */

export type BillingStrategy = 'fixed' | 'consumption' | 'not_included'

export interface Profile {
  id: string
  created_at: string
  updated_at?: string
  first_name: string
  last_name: string
  document_id: string
  phone: string
}

export interface Property {
  id: string
  created_at: string
  title: string
  description?: string
  rent_value: number
  condo_fee?: number
  water_billing_type: BillingStrategy
  water_value?: number
  energy_billing_type: BillingStrategy
  energy_value?: number
  address: string
  owner_id: string
}

export interface Tenant {
  id: string
  created_at: string
  owner_id: string
  full_name: string
  nationality?: string
  marital_status?: string
  occupation?: string
  cpf: string
  phone?: string
  is_active: boolean
  address?: string
  veaco: boolean
}

export interface Contract {
  id: string
  created_at: string
  property_id: string
  tenant_id: string
  start_date: string // date
  end_date?: string // date
  rent_value: number
  water_billing_type: BillingStrategy
  water_value?: number
  energy_billing_type: BillingStrategy
  energy_value?: number
  guarantee_amount?: number
  interest_rate?: number
  penalty_fee?: number
  due_day?: number
  is_active: boolean
  status: 'ativo' | 'rescindido'
  is_renewal: boolean
}

export interface Expense {
  id: string
  created_at: string
  description: string
  amount: number
  date: string // date
  property_id?: string
  category: string
  owner_id: string
}

export interface MonthlyEntry {
  id: string
  created_at: string
  property_id: string
  contract_id: string
  reference_month: string  // primeiro dia do mês referência ex: 2026-06-01
  due_date: string
  water_amount?: number
  energy_amount?: number
  extra_amount?: number
  extra_description?: string
  is_paid: boolean
  payment_date?: string
  notes?: string
}
