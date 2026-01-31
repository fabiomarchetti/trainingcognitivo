/**
 * Middleware Next.js per autenticazione e autorizzazione
 * Gestisce:
 * - Refresh automatico dei token Supabase
 * - Protezione route basata su ruoli
 * - Redirect utenti non autenticati
 */
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession, hasRoleAccess, getRedirectPathForRole } from '@/lib/supabase/middleware'

// Route pubbliche che non richiedono autenticazione
const publicRoutes = ['/', '/login', '/register']

// Route che richiedono autenticazione
const protectedRoutes = ['/admin', '/dashboard', '/training', '/strumenti']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora asset statici e API auth callback
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Aggiorna sessione Supabase
  const { user, supabaseResponse, supabase } = await updateSession(request)

  // Cache del profilo utente per evitare query duplicate
  let cachedProfile: { ruolo: string } | null = null

  // Funzione helper per ottenere il profilo (con cache)
  const getProfile = async () => {
    if (cachedProfile) return cachedProfile

    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    if (profile) {
      cachedProfile = profile
    }

    return profile
  }

  // Route pubbliche - consenti accesso
  if (publicRoutes.includes(pathname)) {
    // Se utente autenticato accede a login, redirect a dashboard appropriata
    if (user && (pathname === '/login' || pathname === '/register')) {
      const profile = await getProfile()

      if (profile?.ruolo) {
        const redirectPath = getRedirectPathForRole(profile.ruolo)
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }
    return supabaseResponse
  }

  // Route protette - verifica autenticazione
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtected) {
    // Utente non autenticato - redirect a login
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Verifica ruolo per accesso alla route (usa cache)
    const profile = await getProfile()

    if (!profile) {
      // Profilo non trovato - logout e redirect
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verifica permessi per la route
    if (!hasRoleAccess(profile.ruolo, pathname)) {
      // Redirect a dashboard appropriata per il ruolo
      const redirectPath = getRedirectPathForRole(profile.ruolo)
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match tutte le route eccetto:
     * - _next/static (file statici)
     * - _next/image (ottimizzazione immagini)
     * - favicon.ico (favicon)
     * - Immagini (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
