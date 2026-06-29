'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, updateExpense, unsettleExpense, EXPENSE_CATEGORIES } from '../services/expensesService'
import { getProperties } from '@/src/features/properties/services/propertiesService'
import { Expense, Property } from '@/src/shared/types/database'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'

const selectClass = "w-full h-10 px-3 py-2 rounded-md border border-slate-800 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

interface ExpenseFormProps {
  initial?: Expense
}

export function ExpenseForm({ initial }: ExpenseFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [isScheduled, setIsScheduled] = useState(initial ? !initial.is_settled : false)

  useEffect(() => {
    getProperties().then(setProperties).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const today = new Date().toISOString().split('T')[0]

    const payload = {
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      amount: Number(formData.get('amount')),
      date: isScheduled ? (initial?.date ?? today) : formData.get('date') as string,
      due_date: isScheduled ? formData.get('due_date') as string : undefined,
      is_settled: !isScheduled,
      property_id: (formData.get('property_id') as string) || undefined,
    }

    try {
      if (isEdit && initial) {
        await updateExpense(initial.id, payload)
      } else {
        await createExpense(payload)
      }
      router.push('/dashboard/finance/expenses')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar despesa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-800 bg-slate-900 p-6">
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="description" className={labelClass}>Descrição *</label>
        <Input
          id="description"
          name="description"
          required
          placeholder="Ex: Troca de encanamento"
          defaultValue={initial?.description}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="category" className={labelClass}>Categoria *</label>
          <select id="category" name="category" required className={selectClass} defaultValue={initial?.category ?? ''}>
            <option value="">Selecione...</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="property_id" className={labelClass}>Imóvel (opcional)</label>
          <select id="property_id" name="property_id" className={selectClass} defaultValue={initial?.property_id ?? ''}>
            <option value="">Geral (sem imóvel)</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="amount" className={labelClass}>Valor *</label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            required
            placeholder="0,00"
            defaultValue={initial?.amount}
            className={inputClass}
          />
        </div>
        <div>
          {isScheduled ? (
            <>
              <label htmlFor="due_date" className={labelClass}>Data de vencimento *</label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                required
                defaultValue={initial?.due_date}
                className={inputClass}
              />
            </>
          ) : (
            <>
              <label htmlFor="date" className={labelClass}>Data *</label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={initial?.date ?? new Date().toISOString().split('T')[0]}
                className={inputClass}
              />
            </>
          )}
        </div>
      </div>

      {/* Toggle agendar */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-300">Despesa agendada</p>
            <p className="text-xs text-slate-500">
              {isScheduled
                ? 'Ficará pendente até confirmar o pagamento.'
                : 'Ative para lançar uma despesa futura com lembrete.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsScheduled(v => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isScheduled ? 'bg-indigo-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isScheduled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </label>
      </div>

      {/* Desfazer pagamento — só aparece em despesas agendadas já pagas */}
      {isEdit && initial?.due_date && initial.is_settled && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-300">Desfazer pagamento</p>
            <p className="text-xs text-slate-500">Devolve a despesa para a lista de agendadas como pendente.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-amber-900/50 text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 shrink-0"
            onClick={async () => {
              await unsettleExpense(initial.id)
              router.push('/dashboard/finance/expenses')
              router.refresh()
            }}
          >
            Desfazer
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:text-white"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
          {loading
            ? 'Salvando...'
            : isEdit
            ? 'Salvar alterações'
            : isScheduled
            ? 'Agendar Despesa'
            : 'Registrar Despesa'}
        </Button>
      </div>
    </form>
  )
}
