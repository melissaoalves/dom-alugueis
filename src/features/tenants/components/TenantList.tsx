import Link from 'next/link'
import { createClient } from '@/src/shared/utils/supabase/server'
import { Button } from '@/src/shared/components/ui/Button'
import { Pencil, FileText } from 'lucide-react'

export async function TenantList() {
  const supabase = await createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (!tenants || tenants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 py-16 text-center">
        <h3 className="font-medium text-white">Nenhum inquilino cadastrado</h3>
        <p className="mt-2 text-sm text-slate-400">Cadastre os inquilinos para poder criar contratos.</p>
        <div className="mt-6">
          <Link href="/dashboard/tenants/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Cadastrar Inquilino</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => (
        <div key={tenant.id} className="rounded-lg border border-slate-800 bg-slate-900">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-300">
                {tenant.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white line-clamp-1">{tenant.full_name}</h3>
                <p className="text-xs text-slate-500">{tenant.cpf}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {tenant.veaco && (
                <span className="rounded-full bg-rose-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                  Atenção
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/dashboard/tenants/${tenant.id}/edit`}
                  title="Editar inquilino"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
                >
                  <Pencil size={13} />
                </Link>
                <Link
                  href={`/dashboard/contracts?inquilino=${tenant.id}`}
                  title="Ver contratos do inquilino"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
                >
                  <FileText size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Dados */}
          <div className="space-y-1 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Telefone</span>
              <span className="text-slate-300">{tenant.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={tenant.is_active ? 'text-emerald-400' : 'text-slate-500'}>
                {tenant.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
