import { MonthlyEntryList } from '@/src/features/finance/components/MonthlyEntryList'

export const metadata = {
  title: 'Mensalidades | DOM Aluguéis',
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const mes = Number(params.mes)
  const ano = Number(params.ano)

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mensalidades</h1>
        <p className="text-slate-400 text-sm mt-1">
          Gere as cobranças do mês, registre consumos e marque pagamentos.
        </p>
      </div>
      <MonthlyEntryList
        initialMonth={mes >= 1 && mes <= 12 ? mes : undefined}
        initialYear={ano > 2000 ? ano : undefined}
      />
    </div>
  )
}
