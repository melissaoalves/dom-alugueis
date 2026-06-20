import { ExpenseList } from '@/src/features/finance/components/ExpenseList'

export const metadata = {
  title: 'Despesas | DOM Aluguéis',
}

export default function ExpensesPage() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Despesas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Registre e acompanhe todas as despesas dos seus imóveis.
        </p>
      </div>
      <ExpenseList />
    </div>
  )
}
