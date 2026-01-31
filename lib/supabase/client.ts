/**
 * Client Supabase per browser (Client Components)
 * Usare questo client nei componenti React client-side
 *
 * SINGLETON GLOBALE usando globalThis per persistere tra le navigazioni
 * Risolve AbortError in Vercel Edge Runtime / React StrictMode
 */
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Chiave per il singleton globale
const SUPABASE_CLIENT_KEY = '__SUPABASE_BROWSER_CLIENT__'

// Tipo per globalThis con il nostro client
declare global {
  var __SUPABASE_BROWSER_CLIENT__: SupabaseClient | undefined
}

export function createClient(): SupabaseClient {
  // Verifica se esiste già un client globale
  if (typeof globalThis !== 'undefined' && globalThis[SUPABASE_CLIENT_KEY]) {
    return globalThis[SUPABASE_CLIENT_KEY]
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables!')
    throw new Error('Missing Supabase environment variables')
  }

  // Crea client con lock storage disabilitato per evitare AbortError
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Mantieni auto-refresh ma con flow più semplice
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Usa storage semplice senza lock
        flowType: 'pkce',
        // Disabilita lock per evitare AbortError
        storageKey: 'sb-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-client-info': 'trainingcognitivo-browser',
        },
      },
    }
  )

  // Salva nel global scope
  if (typeof globalThis !== 'undefined') {
    globalThis[SUPABASE_CLIENT_KEY] = client
  }

  return client
}
