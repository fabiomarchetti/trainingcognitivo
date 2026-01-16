/**
 * Auth Callback Route
 * Gestisce il callback dopo conferma email o OAuth
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect alla pagina richiesta o dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect a pagina di errore se qualcosa è andato storto
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
