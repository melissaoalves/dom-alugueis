import { PropertyForm } from '@/src/features/properties/components/PropertyForm'
import { createClient } from '@/src/shared/utils/supabase/server'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Editar Imóvel | DOM Aluguéis',
}

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !property) notFound()

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Imóvel</h1>
        <p className="text-slate-400 text-sm mt-1">Atualize as informações da propriedade.</p>
      </div>
      <PropertyForm initialData={property} />
    </div>
  )
}
