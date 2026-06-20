'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/src/features/auth/actions/auth'
import { Button } from '@/src/shared/components/ui/Button'
import { Input } from '@/src/shared/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/shared/components/ui/Card'
import Link from 'next/link'

export function SignUpForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentId: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name: fieldName } = e.target
    let { value } = e.target

    // Formatação automática de Document ID (CPF/CNPJ)
    if (fieldName === 'documentId') {
      value = value.replace(/\D/g, '')
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2')
        value = value.replace(/(\d{3})(\d)/, '$1.$2')
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      }
    }

    // Formatação automática de telefone
    if (fieldName === 'phone') {
      value = value.replace(/\D/g, '')
      if (value.length <= 11) {
        if (value.length > 0) {
          value = value.replace(/^(\d{0,2})/, '($1')
          value = value.replace(/(\(\d{2})(\d{0,5})/, '$1) $2')
          value = value.replace(/(\d{5})(\d{0,4})$/, '$1-$2')
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validações básicas
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

    // Validar CPF (apenas números, 11 dígitos)
    const documentIdNumbers = formData.documentId.replace(/\D/g, '')
    if (documentIdNumbers.length !== 11) {
      setError('Documento deve conter 11 dígitos.')
      setLoading(false)
      return
    }

    // Validar telefone (apenas números, 11 dígitos)
    const phoneNumbers = formData.phone.replace(/\D/g, '')
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      setError('Telefone deve conter entre 10 e 11 dígitos.')
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
        documentId: documentIdNumbers,
      })

      if (result.success) {
        setSuccess(true)
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          documentId: '',
          password: '',
          confirmPassword: '',
        })
        
        // Redirecionar para login após sucesso
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-green-600">Cadastro realizado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Verifique seu email para confirmar sua conta. Você será redirecionado para o login em breve.
          </p>
          <div className="text-center">
            <Link href="/auth/login" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
              Ir para login
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full bg-slate-900/60 border-white/10 backdrop-blur-xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white text-2xl font-bold">Criar conta no Dom Aluguéis</CardTitle>
        <CardDescription className="text-slate-400">Preencha os dados abaixo para se cadastrar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-slate-300">
                Primeiro nome
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="João"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-slate-300">
                Sobrenome
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Silva"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="documentId" className="text-sm font-medium text-slate-300">
                CPF/Documento
              </label>
              <Input
                id="documentId"
                name="documentId"
                type="text"
                placeholder="000.000.000-00"
                value={formData.documentId}
                onChange={handleChange}
                maxLength={14}
                required
                disabled={loading}
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500">Ex: 123.456.789-00</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-300">
                Telefone
              </label>
              <Input
                id="phone"
                name="phone"
                type="text"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={handleChange}
                maxLength={15}
                required
                disabled={loading}
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500">Ex: (11) 99999-9999</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
              Confirmar senha
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] transition-all" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>

          <div className="text-center text-sm text-slate-400">
            Já tem uma conta?{' '}
            <Link href="/auth/login" className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
              Entre aqui
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
