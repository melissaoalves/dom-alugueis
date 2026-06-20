import { PropertyList } from '@/src/features/properties/components/PropertyList'
import { Button } from '@/src/shared/components/ui/Button'
import Link from 'next/link'

export const metadata = {
  title: 'Imóveis | DOM Aluguéis',
}

export default function PropertiesPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Meus Imóveis</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie seu portfólio de propriedades</p>
        </div>
        <Link href="/dashboard/properties/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            + Novo Imóvel
          </Button>
        </Link>
      </div>

      <PropertyList />
    </div>
  )
}
