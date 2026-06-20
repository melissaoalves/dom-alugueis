import { MonthlyEntryList } from '@/src/features/finance/components/MonthlyEntryList'

export const metadata = {
  title: 'Mensalidades | DOM Aluguéis',
}

export default function FinancePage() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mensalidades</h1>
        <p className="text-slate-400 text-sm mt-1">
          Gere as cobranças do mês, registre consumos e marque pagamentos.
        </p>
      </div>
      <MonthlyEntryList />
    </div>
  )
}
