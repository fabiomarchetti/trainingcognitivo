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
const ABORT_HANDLER_KEY = '__SUPABASE_ABORT_HANDLER__'

// Tipo per globalThis con il nostro client
declare global {
  var __SUPABASE_BROWSER_CLIENT__: SupabaseClient | undefined
  var __SUPABASE_ABORT_HANDLER__: boolean | undefined
}

// Installa handler globale per sopprimere AbortError (solo una volta)
function installAbortErrorHandler() {
  if (typeof window === 'undefined') return
  if ((globalThis as any)[ABORT_HANDLER_KEY]) return

  (globalThis as any)[ABORT_HANDLER_KEY] = true

  // Handler per unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    const isAbortError =
      error?.name === 'AbortError' ||
      error?.message?.includes('AbortError') ||
      error?.message?.includes('signal is aborted') ||
      (typeof error === 'string' && error.includes('AbortError'))

    if (isAbortError) {
      // Previeni che l'errore appaia in console
      event.preventDefault()
      // console.log('[SUPABASE] AbortError soppresso (normale durante navigazione)')
    }
  })
}

export function createClient(): SupabaseClient {
  // Installa handler AbortError
  installAbortErrorHandler()

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

  // Crea client con opzioni per ridurre AbortError
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Aumenta il timeout per dare più tempo alle operazioni
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      // Fetch custom che ignora AbortError
      fetch: async (url, options) => {
        try {
          return await fetch(url, options)
        } catch (error: any) {
          // Se è un AbortError, ritorna una response vuota invece di lanciare
          if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) {
            return new Response(JSON.stringify({ data: null, error: null }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          throw error
        }
      },
    },
  })

  // Salva nel global scope solo lato browser
  if (typeof window !== 'undefined') {
    (globalThis as any)[SUPABASE_CLIENT_KEY] = client
  }

  return client
}
