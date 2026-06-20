'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, EXPENSE_CATEGORIES } from '../services/expensesService'
import { getProperties } from '@/src/features/properties/services/propertiesService'
import { Property } from '@/src/shared/types/database'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'

const selectClass = "w-full h-10 px-3 py-2 rounded-md border border-slate-800 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

export function ExpenseForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    getProperties().then(setProperties).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      await createExpense({
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        amount: Number(formData.get('amount')),
        date: formData.get('date') as string,
        property_id: formData.get('property_id') as string || undefined,
      })
      router.push('/dashboard/finance/expenses')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar despesa')
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
        <Input id="description" name="description" required placeholder="Ex: Troca de encanamento" className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="category" className={labelClass}>Categoria *</label>
          <select id="category" name="category" required className={selectClass}>
            <option value="">Selecione...</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="property_id" className={labelClass}>Imóvel (opcional)</label>
          <select id="property_id" name="property_id" className={selectClass}>
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
          <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0,00" className={inputClass} />
        </div>
        <div>
          <label htmlFor="date" className={labelClass}>Data *</label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
          {loading ? 'Salvando...' : 'Registrar Despesa'}
        </Button>
      </div>
    </form>
  )
}
