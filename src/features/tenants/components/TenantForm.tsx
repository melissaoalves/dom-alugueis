'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTenant, updateTenant } from '../services/tenantsService'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'
import { Textarea } from '@/src/shared/components/ui/Textarea'
import { Tenant } from '@/src/shared/types/database'

const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

interface TenantFormProps {
  initialData?: Tenant
}

export function TenantForm({ initialData }: TenantFormProps) {
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
        full_name: formData.get('full_name') as string,
        cpf: formData.get('cpf') as string,
        phone: formData.get('phone') as string,
        nationality: formData.get('nationality') as string,
        marital_status: formData.get('marital_status') as string,
        occupation: formData.get('occupation') as string,
        address: formData.get('address') as string,
        is_active: initialData ? initialData.is_active : true,
        veaco: initialData ? initialData.veaco : false,
      }

      if (initialData) {
        await updateTenant(initialData.id, payload)
      } else {
        await createTenant(payload)
      }

      router.push('/dashboard/tenants')
      router.refresh()
    } catch (err: any) {
      if (err.message?.includes('tenants_cpf_key')) {
        setError('Já existe um inquilino cadastrado com esse CPF.')
      } else {
        setError(err.message || 'Erro ao cadastrar inquilino')
      }
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
          <label htmlFor="full_name" className={labelClass}>Nome Completo *</label>
          <Input id="full_name" name="full_name" required defaultValue={initialData?.full_name} placeholder="Nome do inquilino" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cpf" className={labelClass}>CPF *</label>
            <Input id="cpf" name="cpf" required defaultValue={initialData?.cpf} placeholder="000.000.000-00" className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Telefone</label>
            <Input id="phone" name="phone" defaultValue={initialData?.phone} placeholder="(00) 00000-0000" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="nationality" className={labelClass}>Nacionalidade</label>
            <Input id="nationality" name="nationality" defaultValue={initialData?.nationality} placeholder="Ex: Brasileiro" className={inputClass} />
          </div>
          <div>
            <label htmlFor="marital_status" className={labelClass}>Estado Civil</label>
            <Input id="marital_status" name="marital_status" defaultValue={initialData?.marital_status} placeholder="Ex: Solteiro" className={inputClass} />
          </div>
          <div>
            <label htmlFor="occupation" className={labelClass}>Profissão</label>
            <Input id="occupation" name="occupation" defaultValue={initialData?.occupation} placeholder="Ex: Engenheiro" className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>Endereço Atual</label>
          <Textarea id="address" name="address" defaultValue={initialData?.address} placeholder="Onde reside atualmente..." className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-6">
        <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
          {loading ? 'Salvando...' : initialData ? 'Atualizar Inquilino' : 'Cadastrar Inquilino'}
        </Button>
      </div>
    </form>
  )
}
