import { ContractForm } from '@/src/features/contracts/components/ContractForm'
import { createClient } from '@/src/shared/utils/supabase/server'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Editar Contrato | DOM Aluguéis',
}

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !contract) notFound()

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Contrato</h1>
        <p className="text-slate-400 text-sm mt-1">Atualize as informações do contrato.</p>
      </div>
      <ContractForm initialData={contract} />
    </div>
  )
}
