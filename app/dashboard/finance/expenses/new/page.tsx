import { ExpenseForm } from '@/src/features/finance/components/ExpenseForm'

export const metadata = {
  title: 'Nova Despesa | DOM Aluguéis',
}

export default function NewExpensePage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nova Despesa</h1>
        <p className="text-slate-400 text-sm mt-1">Registre um custo ou despesa do seu portfólio.</p>
      </div>
      <ExpenseForm />
    </div>
  )
}
