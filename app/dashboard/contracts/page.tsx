import { ContractList } from '@/src/features/contracts/components/ContractList'
import { Button } from '@/src/shared/components/ui/Button'
import Link from 'next/link'

export const metadata = {
  title: 'Contratos | DOM Aluguéis',
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ inquilino?: string; imovel?: string }>
}) {
  const { inquilino, imovel } = await searchParams

  const subtitle = inquilino
    ? 'Contratos do inquilino selecionado'
    : imovel
    ? 'Contratos do imóvel selecionado'
    : 'Gerencie os vínculos entre inquilinos e imóveis'

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Contratos</h1>
          <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
          {(inquilino || imovel) && (
            <Link
              href="/dashboard/contracts"
              className="mt-1 inline-block text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              ← Ver todos os contratos
            </Link>
          )}
        </div>
        <Link href="/dashboard/contracts/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            + Firmar Contrato
          </Button>
        </Link>
      </div>

      <ContractList tenantId={inquilino} propertyId={imovel} />
    </div>
  )
}
