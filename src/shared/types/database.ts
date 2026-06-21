/**
 * Tipos baseados no schema do Supabase (conforme ERD)
 */

export type BillingStrategy = 'fixed' | 'consumption' | 'not_included'
export type PaymentMethod = 'pix' | 'dinheiro' | 'transferencia' | 'boleto' | 'cheque'
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro / Espécie',
  transferencia: 'Transferência bancária',
  boleto: 'Boleto',
  cheque: 'Cheque',
}
export type PropertyDestination = 'residencial' | 'comercial'

// Campos de endereço separados — usados na geração de contratos PDF
export interface AddressFields {
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
}

export interface Procurador {
  id: string
  created_at: string
  owner_id: string
  nome: string
  nacionalidade?: string
  estado_civil?: string
  profissao?: string
  cpf?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
}

export interface Profile extends AddressFields {
  id: string
  created_at: string
  updated_at?: string
  first_name: string
  last_name: string
  document_id: string  // CPF
  phone: string
  nationality?: string
  marital_status?: string
  occupation?: string
  address?: string     // legado — mantido para exibição
}

export interface Property extends AddressFields {
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
  address: string      // legado — mantido para exibição
  owner_id: string
}

export interface Tenant extends AddressFields {
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
  address?: string     // legado — mantido para exibição
  veaco: boolean
}

export interface Contract {
  id: string
  created_at: string
  property_id: string
  tenant_id: string
  start_date: string
  end_date?: string
  duration_months?: number        // prazo em meses (6, 12, ...)
  rent_value: number
  water_billing_type: BillingStrategy
  water_value?: number
  energy_billing_type: BillingStrategy
  energy_value?: number
  guarantee_amount?: number
  pix_key_guarantee?: string      // chave pix do caução
  interest_rate?: number          // juros mora mês %
  penalty_fee?: number            // multa atraso %
  general_infraction_penalty?: string  // multa infração geral (ex: "1 mês de aluguel")
  due_day?: number
  payment_methods?: PaymentMethod[]
  annual_adjustment_rate?: number
  property_destination?: PropertyDestination
  forum_city?: string
  forum_state?: string
  procurador_id?: string
  // Controle
  is_active: boolean
  status: 'ativo' | 'rescindido'
  is_renewal: boolean
  rescission_penalty_type: 'none' | 'fixed_months' | 'custom'
  rescission_fixed_months?: number
}

export interface Expense {
  id: string
  created_at: string
  description: string
  amount: number
  date: string
  property_id?: string
  category: string
  owner_id: string
}

export interface MonthlyEntry {
  id: string
  created_at: string
  property_id: string
  contract_id: string
  reference_month: string
  due_date: string
  rent_value?: number
  water_amount?: number
  energy_amount?: number
  extra_amount?: number
  extra_description?: string
  is_paid: boolean
  payment_date?: string
  notes?: string
}
