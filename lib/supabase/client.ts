/**
 * Client Supabase per browser (Client Components)
 * Usare questo client nei componenti React client-side
 *
 * NOTA: createBrowserClient di @supabase/ssr gestisce già il caching internamente,
 * quindi non serve implementare un singleton manuale
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables!', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
    })
    throw new Error('Missing Supabase environment variables')
  }

  // createBrowserClient gestisce il caching internamente
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
