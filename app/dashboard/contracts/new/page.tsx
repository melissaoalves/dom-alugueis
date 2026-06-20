import { ContractForm } from '@/src/features/contracts/components/ContractForm'

export const metadata = {
  title: 'Novo Contrato | DOM Aluguéis',
}

export default function NewContractPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Firmar Novo Contrato</h1>
        <p className="text-slate-400 text-sm mt-2">Vincule um inquilino existente a um imóvel e defina os valores.</p>
      </div>

      <ContractForm />
    </div>
  )
}
