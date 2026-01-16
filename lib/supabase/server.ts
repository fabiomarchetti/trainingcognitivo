/**
 * Client Supabase per server (Server Components, API Routes, Server Actions)
 * Usare questo client nei componenti React server-side e nelle API routes
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Nota: Usa `npx supabase gen types typescript` per generare tipi precisi
// Per ora usiamo un client non tipizzato per flessibilità durante lo sviluppo
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Il metodo `setAll` viene chiamato dal middleware Server Component
            // Questo può essere ignorato se hai middleware che aggiorna le sessioni utente
          }
        },
      },
    }
  )
}

/**
 * Client con Service Role per operazioni admin
 * ATTENZIONE: Bypassa RLS - usare solo per migrazioni e operazioni admin
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorato per Server Components
          }
        },
      },
    }
  )
}
