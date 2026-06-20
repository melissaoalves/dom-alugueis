'use client'

import { useState } from 'react'
import { createClient } from '@/src/shared/utils/supabase/client'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'

const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

interface Props {
  profile: {
    id: string
    first_name: string
    last_name: string
    phone: string
    document_id: string
  }
  email: string
}

export function ProfileForm({ profile, email }: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState(profile.first_name ?? '')
  const [lastName, setLastName] = useState(profile.last_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (err) throw new Error(err.message)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-900/50 bg-emerald-900/20 p-3 text-sm text-emerald-400">
          Perfil atualizado com sucesso.
        </div>
      )}

      {/* Informações da conta (somente leitura) */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Informações da conta</h2>
        <div>
          <label className={labelClass}>E-mail</label>
          <div className="flex h-10 items-center rounded-md border border-slate-800 bg-slate-950/50 px-3 text-sm text-slate-400">
            {email}
          </div>
          <p className="mt-1 text-xs text-slate-600">O e-mail não pode ser alterado aqui.</p>
        </div>
        <div>
          <label className={labelClass}>CPF / Documento</label>
          <div className="flex h-10 items-center rounded-md border border-slate-800 bg-slate-950/50 px-3 text-sm text-slate-400">
            {profile.document_id || '—'}
          </div>
          <p className="mt-1 text-xs text-slate-600">Documento registrado no cadastro.</p>
        </div>
      </div>

      {/* Dados editáveis */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Dados pessoais</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="first_name" className={labelClass}>Primeiro nome</label>
            <Input
              id="first_name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="João"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="last_name" className={labelClass}>Sobrenome</label>
            <Input
              id="last_name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Silva"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>Telefone</label>
          <Input
            id="phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className={`${inputClass} max-w-xs`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
