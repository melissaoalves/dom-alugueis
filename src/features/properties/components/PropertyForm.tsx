'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProperty, updateProperty } from '../services/propertiesService'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'
import { Textarea } from '@/src/shared/components/ui/Textarea'
import { AddressFields } from '@/src/shared/components/ui/AddressFields'
import { BillingStrategy, Property } from '@/src/shared/types/database'

const selectClass = "w-full h-10 px-3 py-2 rounded-md border border-slate-800 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
const labelClass = "block text-sm font-medium text-slate-300 mb-1"

interface PropertyFormProps {
  initialData?: Property
}

export function PropertyForm({ initialData }: PropertyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        address: [
          formData.get('logradouro'),
          formData.get('numero'),
          formData.get('bairro'),
          formData.get('cidade'),
          formData.get('uf'),
        ].filter(Boolean).join(', '),
        logradouro: (formData.get('logradouro') as string) || undefined,
        numero: (formData.get('numero') as string) || undefined,
        complemento: (formData.get('complemento') as string) || undefined,
        bairro: (formData.get('bairro') as string) || undefined,
        cep: (formData.get('cep') as string) || undefined,
        cidade: (formData.get('cidade') as string) || undefined,
        uf: (formData.get('uf') as string) || undefined,
        rent_value: Number(formData.get('rent_value')),
        condo_fee: formData.get('condo_fee') ? Number(formData.get('condo_fee')) : undefined,
        water_billing_type: formData.get('water_billing_type') as BillingStrategy,
        water_value: formData.get('water_value') ? Number(formData.get('water_value')) : undefined,
        energy_billing_type: formData.get('energy_billing_type') as BillingStrategy,
        energy_value: formData.get('energy_value') ? Number(formData.get('energy_value')) : undefined,
      }

      if (initialData) {
        await updateProperty(initialData.id, payload)
      } else {
        await createProperty(payload)
      }

      router.push('/dashboard/properties')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar imóvel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className={labelClass}>Título do Imóvel *</label>
          <Input id="title" name="title" required defaultValue={initialData?.title} placeholder="Ex: Apartamento 202 — Edifício Sol" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500" />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>Descrição</label>
          <Textarea id="description" name="description" defaultValue={initialData?.description} placeholder="Detalhes do imóvel..." className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500" />
        </div>

        <div>
          <label className={labelClass}>Endereço do imóvel *</label>
          <AddressFields
            required
            defaultValues={{
              logradouro: initialData?.logradouro,
              numero: initialData?.numero,
              complemento: initialData?.complemento,
              bairro: initialData?.bairro,
              cep: initialData?.cep,
              cidade: initialData?.cidade,
              uf: initialData?.uf,
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="rent_value" className={labelClass}>Valor do Aluguel *</label>
            <Input id="rent_value" name="rent_value" type="number" step="0.01" required defaultValue={initialData?.rent_value} placeholder="0,00" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500" />
          </div>
          <div>
            <label htmlFor="condo_fee" className={labelClass}>Condomínio</label>
            <Input id="condo_fee" name="condo_fee" type="number" step="0.01" defaultValue={initialData?.condo_fee} placeholder="0,00" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-slate-800 pt-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">Cobrança de Água</h4>
            <select name="water_billing_type" required defaultValue={initialData?.water_billing_type} className={selectClass}>
              <option value="consumption">Por Consumo (Medição)</option>
              <option value="fixed">Valor Fixo</option>
              <option value="not_included">Não Incluso</option>
            </select>
            <div>
              <label htmlFor="water_value" className="block text-xs text-slate-500 mb-1">Valor fixo (se aplicável)</label>
              <Input id="water_value" name="water_value" type="number" step="0.01" defaultValue={initialData?.water_value} placeholder="0,00" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500" />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">Cobrança de Energia</h4>
            <select name="energy_billing_type" required defaultValue={initialData?.energy_billing_type} className={selectClass}>
              <option value="not_included">Não Incluso</option>
              <option value="consumption">Por Consumo (Relógio próprio)</option>
              <option value="fixed">Valor Fixo</option>
            </select>
            <div>
              <label htmlFor="energy_value" className="block text-xs text-slate-500 mb-1">Valor fixo (se aplicável)</label>
              <Input id="energy_value" name="energy_value" type="number" step="0.01" defaultValue={initialData?.energy_value} placeholder="0,00" className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar Imóvel' : 'Cadastrar Imóvel'}
        </Button>
      </div>
    </form>
  )
}
