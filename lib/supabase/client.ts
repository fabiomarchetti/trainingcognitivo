/**
 * Client Supabase per browser (Client Components)
 * Usare questo client nei componenti React client-side
 */
import { createBrowserClient } from '@supabase/ssr'

// Nota: Usa `npx supabase gen types typescript` per generare tipi precisi
// Per ora usiamo un client non tipizzato per flessibilità durante lo sviluppo
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
