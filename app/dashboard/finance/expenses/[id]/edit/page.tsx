import { notFound } from 'next/navigation'
import { createClient } from '@/src/shared/utils/supabase/server'
import { ExpenseForm } from '@/src/features/finance/components/ExpenseForm'

export const metadata = {
  title: 'Editar Despesa | DOM Aluguéis',
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !expense) notFound()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Editar Despesa</h1>
        <p className="text-slate-400 text-sm mt-1">{expense.description}</p>
      </div>
      <ExpenseForm initial={expense} />
    </div>
  )
}
