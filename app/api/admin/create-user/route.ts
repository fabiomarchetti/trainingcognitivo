/**
 * API per creare un nuovo utente con credenziali semplificate
 * Usa Admin API per bypassare la verifica email
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Client admin con service_role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      nome,
      cognome,
      id_ruolo,
      id_sede,
      id_settore,
      id_classe,
      telefono,
      note,
      stato
    } = body

    // Validazione base
    if (!email || !password || !nome || !cognome) {
      return NextResponse.json({
        success: false,
        message: 'Email, password, nome e cognome sono obbligatori'
      }, { status: 400 })
    }

    // Crea utente con Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Conferma email automaticamente
      user_metadata: {
        nome,
        cognome,
        ruolo: 'utente'
      }
    })

    if (authError) {
      console.error('Errore creazione auth:', authError)
      return NextResponse.json({
        success: false,
        message: authError.message
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        message: 'Errore durante la creazione dell\'utente'
      }, { status: 500 })
    }

    // Aggiorna il profilo con i dati aggiuntivi
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome,
        cognome,
        id_ruolo,
        id_sede: id_sede || null,
        id_settore: id_settore || null,
        id_classe: id_classe || null,
        telefono: telefono || null,
        email_contatto: email,
        note: note || null,
        stato: stato || 'attivo'
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('Errore update profilo:', updateError)
      // Utente creato ma profilo non completamente aggiornato
    }

    return NextResponse.json({
      success: true,
      message: 'Utente creato con successo',
      data: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error: any) {
    console.error('Errore API create-user:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Errore durante la creazione'
    }, { status: 500 })
  }
}
