import { PropertyForm } from '@/src/features/properties/components/PropertyForm'

export const metadata = {
  title: 'Novo Imóvel | DOM Aluguéis',
}

export default function NewPropertyPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cadastrar Novo Imóvel</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados básicos e as configurações de cobrança.</p>
      </div>

      <PropertyForm />
    </div>
  )
}
