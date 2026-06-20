'use server'

import { createClient } from '@/src/shared/utils/supabase/server'

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  documentId: string
}

interface SignInData {
  email: string
  password: string
}

export async function signUp(data: SignUpData) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          document_id: data.documentId,
        },
      },
    })

    if (error) {
      return {
        success: false,
        message: error.message,
      }
    }

    // Redirecionar para login após cadastro bem-sucedido
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
