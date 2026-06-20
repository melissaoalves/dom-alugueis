'use client'

import { type ReactNode } from 'react'
import { createClient } from '@/src/shared/utils/supabase/client'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize Supabase client at the app level
  // This ensures the auth state is properly set up for all components
  createClient()

  return <>{children}</>
}
