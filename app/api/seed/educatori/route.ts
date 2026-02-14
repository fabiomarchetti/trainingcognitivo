/**
 * API per importare educatori da database Aruba
 * POST /api/seed/educatori
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Educatori da Aruba (estratti dal dump SQL)
const EDUCATORI_ARUBA = [
  { nome: 'Fabio', cognome: 'Marchetti', email: 'marchettisoft@gmail.com', telefono: '3398063701', note: '' },
  { nome: 'Serena', cognome: 'Granatelli', email: 'granatelli.s@legadelfilodoro.it', telefono: '3398063701', note: 'nessuna nota' },
  { nome: 'Alessia', cognome: 'Ciccottelli', email: 'ciccottelli.a@legadelfilodoro.it', telefono: '3398063701', note: '' },
  { nome: 'Sara', cognome: 'Fontanella', email: 'fontanella.s@legadelfilodoro.it', telefono: '123.4567890', note: 'nessuna nota' },
  { nome: 'Sabrina', cognome: 'Rubini', email: 'rubini.s@legadelfilodoro.it', telefono: '123456789', note: '' },
]

export async function POST() {
  try {
    // Usa service role per operazioni admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Chiavi Supabase mancanti' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ottieni ruolo 'educatore'
    const { data: ruoloEducatore } = await supabase
      .from('ruoli')
      .select('id')
      .eq('codice', 'educatore')
      .single()

    if (!ruoloEducatore) {
      return NextResponse.json(
        { success: false, error: 'Ruolo educatore non trovato' },
        { status: 500 }
      )
    }

    // Ottieni sedi esistenti
    const { data: sedi } = await supabase.from('sedi').select('id, nome')
    const sedePrincipale = sedi?.[0]

    if (!sedePrincipale) {
      return NextResponse.json(
        { success: false, error: 'Nessuna sede trovata. Crea prima una sede.' },
        { status: 400 }
      )
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const educatore of EDUCATORI_ARUBA) {
      try {
        // Crea utente auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: educatore.email,
          password: 'Educatore123!',
          email_confirm: true,
          user_metadata: {
            nome: educatore.nome,
            cognome: educatore.cognome,
            ruolo: 'educatore'
          }
        })

        if (authError) {
          if (authError.message.includes('already been registered')) {
            skipped++
            continue
          }
          errors.push(`${educatore.nome} ${educatore.cognome}: ${authError.message}`)
          continue
        }

        if (!authData.user) {
          errors.push(`${educatore.nome} ${educatore.cognome}: utente non creato`)
          continue
        }

        // Aggiorna profilo con dati aggiuntivi
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            id_ruolo: ruoloEducatore.id,
            id_sede: sedePrincipale.id,
            telefono: educatore.telefono || null,
            email_contatto: educatore.email,
            note: educatore.note || null,
            stato: 'attivo'
          })
          .eq('id', authData.user.id)

        if (updateError) {
          errors.push(`${educatore.nome} ${educatore.cognome}: errore update profilo`)
        }

        created++
      } catch (err: any) {
        errors.push(`${educatore.nome} ${educatore.cognome}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Creati ${created} educatori. Skippati ${skipped} (già esistenti). Password: Educatore123!`
    })

  } catch (error: any) {
    console.error('Errore seed educatori:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
