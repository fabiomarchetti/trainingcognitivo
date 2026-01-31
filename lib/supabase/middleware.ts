/**
 * Helper per middleware Supabase
 * Gestisce il refresh dei token e la verifica delle sessioni
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: NON eseguire logica tra createServerClient e supabase.auth.getUser()
  // Un semplice errore potrebbe rendere l'utente disconnesso in modo random

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { user, supabaseResponse, supabase }
}

/**
 * Verifica se un ruolo ha accesso a un percorso
 */
export function hasRoleAccess(
  ruolo: string | undefined,
  pathname: string
): boolean {
  if (!ruolo) return false

  // Sviluppatore ha accesso a tutto
  if (ruolo === 'sviluppatore') return true

  // Admin routes - solo sviluppatore e responsabile_centro
  if (pathname.startsWith('/admin')) {
    return ['responsabile_centro'].includes(ruolo)
  }

  // Dashboard routes - responsabile_centro, educatore, insegnante
  if (pathname.startsWith('/dashboard')) {
    return ['responsabile_centro', 'educatore', 'insegnante'].includes(ruolo)
  }

  // Training routes - accessibili a utenti autenticati (utente, educatore, insegnante, responsabile_centro, visitatore)
  if (pathname.startsWith('/training') || pathname.startsWith('/strumenti')) {
    return ['utente', 'educatore', 'insegnante', 'responsabile_centro', 'visitatore'].includes(ruolo)
  }

  return true
}

/**
 * Restituisce il redirect path basato sul ruolo
 */
export function getRedirectPathForRole(ruolo: string): string {
  switch (ruolo) {
    case 'sviluppatore':
    case 'responsabile_centro':
      return '/admin'
    case 'educatore':
    case 'insegnante':
      return '/dashboard'
    case 'utente':
      return '/training'
    case 'visitatore':
      return '/training' // Visitatori vedono area training in modalità demo
    default:
      return '/login'
  }
}
