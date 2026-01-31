/**
 * Client Supabase per browser (Client Components)
 * Usare questo client nei componenti React client-side
 *
 * SINGLETON ESPLICITO per evitare problemi con AbortController
 * in React StrictMode / Vercel Edge Runtime
 */
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton globale per il client browser
let browserClient: SupabaseClient | null = null

export function createClient() {
  // Se abbiamo già un client, riutilizzalo
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables!', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
    })
    throw new Error('Missing Supabase environment variables')
  }

  // Crea client con opzioni per evitare problemi di AbortController
  browserClient = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Disabilita auto-refresh token per evitare race conditions
        autoRefreshToken: true,
        // Persisti sessione
        persistSession: true,
        // Detecta sessione in altre tab
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-client-info': 'trainingcognitivo-browser',
        },
      },
    }
  )

  return browserClient
}
