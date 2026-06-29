'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/src/features/auth/actions/auth'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/shared/components/ui/Card'
import Link from 'next/link'

const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const labelOptClass = "block text-sm font-medium text-slate-500 mb-1"
const inputClass = "bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
const selectClass = "w-full h-10 px-3 rounded-md border border-white/10 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

const MARITAL_STATUS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável']

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', documentId: '',
  password: '', confirmPassword: '',
  nationality: '', maritalStatus: '', occupation: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cep: '', cidade: '', uf: '',
}

export function SignUpForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { value } = e.target
    if (field === 'documentId') {
      value = value.replace(/\D/g, '')
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      }
    }
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 11)
      if (value.length > 0) {
        value = value.replace(/^(\d{0,2})/, '($1').replace(/(\(\d{2})(\d{0,5})/, '$1) $2').replace(/(\d{5})(\d{0,4})$/, '$1-$2')
      }
    }
    if (field === 'cep') {
      value = value.replace(/\D/g, '').slice(0, 8)
      if (value.length > 5) value = value.replace(/(\d{5})(\d)/, '$1-$2')
    }
    if (field === 'uf') value = value.toUpperCase().slice(0, 2)
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não correspondem.')
      setLoading(false)
      return
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }
    const docNumbers = formData.documentId.replace(/\D/g, '')
    if (docNumbers.length !== 11) {
      setError('CPF deve conter 11 dígitos.')
      setLoading(false)
      return
    }
    const phoneNumbers = formData.phone.replace(/\D/g, '')
    if (phoneNumbers.length < 10) {
      setError('Telefone inválido.')
      setLoading(false)
      return
    }

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: phoneNumbers,
        documentId: docNumbers,
        nationality: formData.nationality,
        maritalStatus: formData.maritalStatus,
        occupation: formData.occupation,
        logradouro: formData.logradouro,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cep: formData.cep.replace(/\D/g, ''),
        cidade: formData.cidade,
        uf: formData.uf,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login'), 2500)
      } else {
        setError(result.message)
      }
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full bg-slate-900/60 border-white/10 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-emerald-400 text-xl">Cadastro realizado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">Verifique seu e-mail para confirmar a conta. Você será redirecionado para o login em instantes.</p>
          <Link href="/auth/login" className="block text-center text-sm font-medium text-indigo-400 hover:text-indigo-300">
            Ir para login →
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full bg-slate-900/60 border-white/10 backdrop-blur-xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white text-2xl font-bold">Criar conta no Dom Aluguéis</CardTitle>
        <CardDescription className="text-slate-400">Preencha os dados abaixo. As informações pessoais são usadas na geração de contratos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-900/50 p-3 text-sm text-red-400">{error}</div>
          )}

          {/* Acesso */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Dados de acesso</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>E-mail *</label>
                <Input type="email" value={formData.email} onChange={set('email')} placeholder="seu@email.com" required disabled={loading} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Senha *</label>
                  <Input type="password" value={formData.password} onChange={set('password')} placeholder="••••••••" required disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Confirmar senha *</label>
                  <Input type="password" value={formData.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" required disabled={loading} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Dados pessoais */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Dados pessoais</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Primeiro nome *</label>
                  <Input value={formData.firstName} onChange={set('firstName')} placeholder="João" required disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sobrenome *</label>
                  <Input value={formData.lastName} onChange={set('lastName')} placeholder="Silva" required disabled={loading} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CPF *</label>
                  <Input value={formData.documentId} onChange={set('documentId')} placeholder="000.000.000-00" maxLength={14} required disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Celular *</label>
                  <Input value={formData.phone} onChange={set('phone')} placeholder="(11) 99999-9999" maxLength={15} required disabled={loading} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelOptClass}>Nacionalidade</label>
                  <Input value={formData.nationality} onChange={set('nationality')} placeholder="Brasileiro(a)" disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelOptClass}>Estado civil</label>
                  <select value={formData.maritalStatus} onChange={set('maritalStatus')} disabled={loading} className={selectClass}>
                    <option value="">Selecione...</option>
                    {MARITAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelOptClass}>Profissão</label>
                  <Input value={formData.occupation} onChange={set('occupation')} placeholder="Ex: Empresário" disabled={loading} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Endereço */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Endereço <span className="normal-case font-normal text-slate-600">(usado nos contratos)</span></p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelOptClass}>Logradouro</label>
                  <Input value={formData.logradouro} onChange={set('logradouro')} placeholder="Rua, Av., Travessa..." disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelOptClass}>Número</label>
                  <Input value={formData.numero} onChange={set('numero')} placeholder="123" disabled={loading} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelOptClass}>Complemento</label>
                  <Input value={formData.complemento} onChange={set('complemento')} placeholder="Apto, Bloco..." disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelOptClass}>Bairro</label>
                  <Input value={formData.bairro} onChange={set('bairro')} placeholder="Centro" disabled={loading} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={labelOptClass}>CEP</label>
                  <Input value={formData.cep} onChange={set('cep')} placeholder="00000-000" maxLength={9} disabled={loading} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelOptClass}>Cidade</label>
                  <Input value={formData.cidade} onChange={set('cidade')} placeholder="Ex: Tauá" disabled={loading} className={inputClass} />
                </div>
                <div>
                  <label className={labelOptClass}>UF</label>
                  <Input value={formData.uf} onChange={set('uf')} placeholder="CE" maxLength={2} disabled={loading} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)]" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>

          <div className="text-center text-sm text-slate-400">
            Já tem uma conta?{' '}
            <Link href="/auth/login" className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">Entre aqui</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
