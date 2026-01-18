/**
 * Client Supabase per browser (Client Components)
 * Usare questo client nei componenti React client-side
 */
import { createBrowserClient } from '@supabase/ssr'

// Nota: Usa `npx supabase gen types typescript` per generare tipi precisi
// Per ora usiamo un client non tipizzato per flessibilità durante lo sviluppo
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[SUPABASE CLIENT] Creating client', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 30) + '...'
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables!', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
    })
  }

  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  )
}
