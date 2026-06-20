import { TenantForm } from '@/src/features/tenants/components/TenantForm'
import { createClient } from '@/src/shared/utils/supabase/server'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Editar Inquilino | DOM Aluguéis',
}

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tenant) notFound()

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Inquilino</h1>
        <p className="text-slate-400 text-sm mt-1">Atualize as informações do inquilino.</p>
      </div>
      <TenantForm initialData={tenant} />
    </div>
  )
}
