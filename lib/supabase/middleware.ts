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

  // Admin routes
  if (pathname.startsWith('/admin')) {
    return ['amministratore', 'direttore', 'casemanager'].includes(ruolo)
  }

  // Dashboard routes
  if (pathname.startsWith('/dashboard')) {
    return ['amministratore', 'direttore', 'casemanager', 'educatore'].includes(ruolo)
  }

  // Training routes - accessibili a tutti gli utenti autenticati
  if (pathname.startsWith('/training') || pathname.startsWith('/strumenti')) {
    return true
  }

  return true
}

/**
 * Restituisce il redirect path basato sul ruolo
 */
export function getRedirectPathForRole(ruolo: string): string {
  switch (ruolo) {
    case 'sviluppatore':
    case 'amministratore':
    case 'direttore':
    case 'casemanager':
      return '/admin'
    case 'educatore':
      return '/dashboard'
    case 'utente':
      return '/training'
    default:
      return '/login'
  }
}
