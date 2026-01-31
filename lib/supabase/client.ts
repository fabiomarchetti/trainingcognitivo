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
  // Verifica se esiste già un client globale (solo lato browser)
  if (typeof window !== 'undefined' && (globalThis as any)[SUPABASE_CLIENT_KEY]) {
    return (globalThis as any)[SUPABASE_CLIENT_KEY]
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables!')
    throw new Error('Missing Supabase environment variables')
  }

  // Crea client - usa configurazione default di @supabase/ssr
  // che gestisce correttamente cookies e sessione
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  // Salva nel global scope solo lato browser
  if (typeof window !== 'undefined') {
    (globalThis as any)[SUPABASE_CLIENT_KEY] = client
  }

  return client
}
