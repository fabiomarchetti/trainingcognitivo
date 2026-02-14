/**
 * API per eliminare definitivamente un utente
 * POST /api/admin/delete-user
 * Body: { userId: string }
 *
 * Elimina l'utente da auth.users (e in cascata da profiles)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    // Usa service role per operazioni admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Configurazione Supabase mancante' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Elimina l'utente da auth.users (cascade elimina anche profiles)
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Errore eliminazione utente:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Errore API delete-user:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
