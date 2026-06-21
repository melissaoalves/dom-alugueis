'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/src/shared/utils/supabase/client'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'
import { AddressFields } from '@/src/shared/components/ui/AddressFields'

const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const labelMutedClass = "block text-sm font-medium text-slate-500 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

interface Props {
  profile: {
    id: string
    first_name: string
    last_name: string
    phone: string
    document_id: string
    nationality?: string
    marital_status?: string
    occupation?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cep?: string
    cidade?: string
    uf?: string
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
  const [nationality, setNationality] = useState(profile.nationality ?? '')
  const [maritalStatus, setMaritalStatus] = useState(profile.marital_status ?? '')
  const [occupation, setOccupation] = useState(profile.occupation ?? '')

  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const fd = new FormData(e.currentTarget)
    const logradouro = fd.get('logradouro') as string | null
    const numero = fd.get('numero') as string | null
    const complemento = fd.get('complemento') as string | null
    const bairro = fd.get('bairro') as string | null
    const cep = fd.get('cep') as string | null
    const cidade = fd.get('cidade') as string | null
    const uf = fd.get('uf') as string | null

    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          nationality: nationality || null,
          marital_status: maritalStatus || null,
          occupation: occupation || null,
          logradouro: logradouro || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cep: cep || null,
          cidade: cidade || null,
          uf: uf || null,
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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-900/50 bg-emerald-900/20 p-3 text-sm text-emerald-400">
          Perfil atualizado com sucesso.
        </div>
      )}

      {/* Conta (somente leitura) */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Informações da conta</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>E-mail</label>
            <div className="flex h-10 items-center rounded-md border border-slate-800 bg-slate-950/50 px-3 text-sm text-slate-400">{email}</div>
          </div>
          <div>
            <label className={labelClass}>CPF</label>
            <div className="flex h-10 items-center rounded-md border border-slate-800 bg-slate-950/50 px-3 text-sm text-slate-400">{profile.document_id || '—'}</div>
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Dados pessoais</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Primeiro nome</label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="João" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sobrenome</label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Silva" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Telefone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
          </div>
          <div>
            <label className={labelMutedClass}>Nacionalidade</label>
            <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Brasileiro(a)" className={inputClass} />
          </div>
          <div>
            <label className={labelMutedClass}>Estado civil</label>
            <Input value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} placeholder="Solteiro(a)" className={inputClass} />
          </div>
        </div>

        <div className="max-w-xs">
          <label className={labelMutedClass}>Profissão</label>
          <Input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Ex: Empresário" className={inputClass} />
        </div>
      </div>

      {/* Endereço */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">Endereço</h2>
          <p className="mt-0.5 text-xs text-slate-500">Usado na geração de contratos em PDF.</p>
        </div>
        <AddressFields
          defaultValues={{
            logradouro: profile.logradouro,
            numero: profile.numero,
            complemento: profile.complemento,
            bairro: profile.bairro,
            cep: profile.cep,
            cidade: profile.cidade,
            uf: profile.uf,
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
