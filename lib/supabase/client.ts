/**
 * Client Supabase per browser (Client Components)
 * Usare questo client nei componenti React client-side
 * SINGLETON: viene creata una sola istanza che viene riutilizzata
 */
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton: memorizza l'istanza del client
let client: SupabaseClient | null = null

export function createClient() {
  // Se il client esiste già, riutilizzalo (SINGLETON)
  if (client) {
    console.log('[SUPABASE CLIENT] Reusing existing client')
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[SUPABASE CLIENT] Creating NEW client', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 30) + '...'
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE CLIENT] Missing environment variables!', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
    })
    throw new Error('Missing Supabase environment variables')
  }

  // Crea il client e salvalo nel singleton
  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )

  return client
}
