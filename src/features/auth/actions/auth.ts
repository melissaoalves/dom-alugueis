'use server'

import { createClient } from '@/src/shared/utils/supabase/server'

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  documentId: string
  nationality?: string
  maritalStatus?: string
  occupation?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
}

interface SignInData {
  email: string
  password: string
}

export async function signUp(data: SignUpData) {
  const supabase = await createClient()

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          document_id: data.documentId,
          nationality: data.nationality,
          marital_status: data.maritalStatus,
          occupation: data.occupation,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cep: data.cep,
          cidade: data.cidade,
          uf: data.uf,
        },
      },
    })

    if (error) return { success: false, message: error.message }

    // Salva campos extras no perfil se o usuário foi criado
    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        document_id: data.documentId,
        nationality: data.nationality || null,
        marital_status: data.maritalStatus || null,
        occupation: data.occupation || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cep: data.cep || null,
        cidade: data.cidade || null,
        uf: data.uf || null,
      })
    }

    return {
      success: true,
      message: 'Cadastro realizado! Verifique seu email para confirmar.',
    }
  } catch {
    return {
      success: false,
      message: 'Erro ao criar conta. Tente novamente.',
    }
  }
}

export async function signIn(data: SignInData) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        success: false,
        message: error.message,
      }
    }

    return {
      success: true,
      message: 'Login realizado com sucesso!',
    }
  } catch {
    return {
      success: false,
      message: 'Erro ao fazer login. Tente novamente.',
    }
  }
}

export async function signOut() {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  } catch {
    // Log error but don't fail
  }
}
