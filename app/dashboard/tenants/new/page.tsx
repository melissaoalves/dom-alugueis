import { TenantForm } from '@/src/features/tenants/components/TenantForm'

export const metadata = {
  title: 'Novo Inquilino | DOM Aluguéis',
}

export default function NewTenantPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cadastrar Inquilino</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados pessoais do inquilino para futuros contratos.</p>
      </div>

      <TenantForm />
    </div>
  )
}
