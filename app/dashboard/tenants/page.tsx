import { TenantList } from '@/src/features/tenants/components/TenantList'
import { Button } from '@/src/shared/components/ui/Button'
import Link from 'next/link'

export const metadata = {
  title: 'Inquilinos | DOM Aluguéis',
}

export default function TenantsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Inquilinos</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie as pessoas que alugam seus imóveis</p>
        </div>
        <Link href="/dashboard/tenants/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            + Novo Inquilino
          </Button>
        </Link>
      </div>

      <TenantList />
    </div>
  )
}
