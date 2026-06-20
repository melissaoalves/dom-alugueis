import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proteção de rotas: redireciona para /auth/login se não houver sessão
  if (!user) {
    // Se não está na rota de auth e não é a página inicial ('/'), redireciona para login
    if (!request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/') {
      const loginUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  } else {
    // Se tem usuário e tenta acessar /auth, redireciona para dashboard
    if (request.nextUrl.pathname.startsWith('/auth')) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return supabaseResponse
}

