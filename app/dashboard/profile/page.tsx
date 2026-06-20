import { createClient } from '@/src/shared/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/src/features/profile/components/ProfileForm'

export const metadata = {
  title: 'Meu Perfil | DOM Aluguéis',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, document_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie suas informações pessoais.</p>
      </div>
      <ProfileForm profile={profile} email={user.email ?? ''} />
    </div>
  )
}
