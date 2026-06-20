import Link from 'next/link'
import { createClient } from '@/src/shared/utils/supabase/server'
import { Button } from '@/src/shared/components/ui/Button'
import { Pencil, FileText } from 'lucide-react'

export async function PropertyList() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (!properties || properties.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 py-16 text-center">
        <h3 className="font-medium text-white">Nenhum imóvel cadastrado</h3>
        <p className="mt-2 text-sm text-slate-400">Comece adicionando seu primeiro imóvel.</p>
        <div className="mt-6">
          <Link href="/dashboard/properties/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Cadastrar Imóvel</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <div key={property.id} className="rounded-lg border border-slate-800 bg-slate-900">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-5">
            <div className="min-w-0">
              <h3 className="font-semibold text-white line-clamp-1">{property.title}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-1">{property.address}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={`/dashboard/properties/${property.id}/edit`}
                title="Editar imóvel"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                <Pencil size={13} />
              </Link>
              <Link
                href={`/dashboard/contracts?imovel=${property.id}`}
                title="Ver contratos do imóvel"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                <FileText size={13} />
              </Link>
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-1 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Aluguel</span>
              <span className="font-medium text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.rent_value)}
              </span>
            </div>
            {property.condo_fee && (
              <div className="flex justify-between">
                <span className="text-slate-400">Condomínio</span>
                <span className="font-medium text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.condo_fee)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
