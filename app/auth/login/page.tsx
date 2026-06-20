import { LoginForm } from '@/src/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Dom Aluguéis</h1>
          <p className="mt-2 text-slate-400">Gestão de imóveis simplificada</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
