import Link from 'next/link'
import { createClient } from '@/src/shared/utils/supabase/server'
import { Pencil } from 'lucide-react'
import { ContractStatusButton } from './ContractStatusButton'
import { Button } from '@/src/shared/components/ui/Button'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type ContractStatus = 'ativo' | 'vencido' | 'rescindido'

function getStatus(contract: any): ContractStatus {
  if (contract.status === 'rescindido') return 'rescindido'
  if (contract.end_date) {
    const end = new Date(contract.end_date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (end < today) return 'vencido'
  }
  return 'ativo'
}

const STATUS_STYLE: Record<ContractStatus, string> = {
  ativo:      'bg-emerald-900/40 text-emerald-400',
  vencido:    'bg-amber-900/40 text-amber-400',
  rescindido: 'bg-rose-900/40 text-rose-400',
}

const STATUS_LABEL: Record<ContractStatus, string> = {
  ativo:      'Ativo',
  vencido:    'Vencido',
  rescindido: 'Rescindido',
}

interface ContractListProps {
  tenantId?: string
  propertyId?: string
}

export async function ContractList({ tenantId, propertyId }: ContractListProps = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('contracts')
    .select(`*, property:properties(id, title), tenant:tenants(id, full_name, veaco)`)
    .order('start_date', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (propertyId) query = query.eq('property_id', propertyId)

  const { data: contracts } = await query

  if (!contracts || contracts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 py-16 text-center">
        <p className="font-medium text-white">Nenhum contrato cadastrado</p>
        <p className="mt-2 text-sm text-slate-400">Vincule um inquilino a um imóvel para começar.</p>
        <div className="mt-6">
          <Link href="/dashboard/contracts/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Firmar Contrato</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract: any) => {
        const status = getStatus(contract)
        return (
          <div key={contract.id} className="rounded-lg border border-slate-800 bg-slate-900">
            {/* Cabeçalho: título + status + ações juntos */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
              <div className="min-w-0">
                <h3 className="font-semibold text-white leading-tight truncate">{contract.property?.title}</h3>
                <p className="mt-1 text-sm text-indigo-400 truncate">{contract.tenant?.full_name}</p>
              </div>

              {/* Status badge + ícones empilhados à direita */}
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/dashboard/contracts/${contract.id}/edit`}
                    title="Editar contrato"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
                  >
                    <Pencil size={13} />
                  </Link>
                  {status === 'ativo' && (
                    <ContractStatusButton contract={{
                      ...contract,
                      property: contract.property as { title: string } | null,
                      tenant: contract.tenant as { full_name: string } | null,
                    }} />
                  )}
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div className="space-y-2 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Aluguel</span>
                <span className="font-semibold text-white">{fmt(contract.rent_value)}</span>
              </div>
              {(contract.water_value || contract.energy_value) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Adicionais</span>
                  <span className="text-slate-300">
                    {fmt((contract.water_value || 0) + (contract.energy_value || 0))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Vencimento</span>
                <span className="text-slate-300">Dia {contract.due_day}</span>
              </div>
              {contract.end_date && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Término</span>
                  <span className={status === 'vencido' ? 'text-amber-400' : 'text-slate-300'}>
                    {new Date(contract.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {contract.tenant?.veaco && (
                <div className="mt-2 rounded-md border border-rose-900/50 bg-rose-900/20 p-2 text-center text-xs text-rose-400">
                  Inquilino com histórico na plataforma
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
