/**
 * API Route Login
 * Endpoint alternativo per login server-side
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/utils/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Valida input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const supabase = await createClient()

    // Effettua login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Log tentativo fallito
      await supabase.from('log_accessi').insert({
        email,
        esito: 'fallimento',
      })

      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    // Log accesso riuscito
    if (data.user) {
      await supabase.from('log_accessi').insert({
        id_utente: data.user.id,
        email,
        esito: 'successo',
      })
    }

    // Recupera profilo per redirect
    const { data: profileData } = await supabase
      .from('profiles')
      .select('nome, cognome, ruoli!id_ruolo(codice)')
      .eq('id', data.user?.id)
      .single()

    // Estrae ruolo dal join
    const ruoloCodice = (profileData as any)?.ruoli?.codice

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        nome: (profileData as any)?.nome,
        cognome: (profileData as any)?.cognome,
        ruolo: ruoloCodice,
      },
      session: data.session,
    })
  } catch (err) {
    console.error('Login API error:', err)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
