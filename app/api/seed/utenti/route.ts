/**
 * API per importare utenti da database Aruba
 * POST /api/seed/utenti
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Utenti da Aruba (estratti dal dump SQL)
const UTENTI_ARUBA = [
  { nome: 'Vincenzo', cognome: 'Giovane', id_sede: 1, id_settore: 1, id_classe: 1 },
  { nome: 'Cristian', cognome: 'Filippetti', id_sede: 1, id_settore: 5, id_classe: 22 },
  { nome: 'Beatrice', cognome: 'Scenna', id_sede: 1, id_settore: 3, id_classe: 13 },
  { nome: 'Aurora', cognome: 'Borgi', id_sede: 1, id_settore: 1, id_classe: 1 },
  { nome: 'Aida', cognome: 'Petrillo', id_sede: 1, id_settore: 2, id_classe: 3 },
  { nome: 'Vadym', cognome: 'Romanenko', id_sede: 1, id_settore: 3, id_classe: 14 },
  { nome: 'Tommaso', cognome: 'Corinaldesi', id_sede: 1, id_settore: 3, id_classe: 14 },
  { nome: 'Gabriele', cognome: 'Paganelli', id_sede: 1, id_settore: 2, id_classe: 5 },
  { nome: 'Melissa', cognome: 'Di Gregorio', id_sede: 1, id_settore: 2, id_classe: 5 },
  { nome: 'Fabio', cognome: 'Langella', id_sede: 1, id_settore: 2, id_classe: 3 },
]

// Mappatura settori Aruba -> Supabase (da verificare)
// In Aruba: 1=Infanzia, 2=Primaria, 3=Secondaria, 4=?, 5=?
const SETTORI_MAP: Record<number, string> = {
  1: 'Infanzia',
  2: 'Primaria',
  3: 'Secondaria di I grado',
  4: 'Secondaria di II grado',
  5: 'Adulti',
}

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

    // Ottieni ruolo 'utente'
    const { data: ruoloUtente } = await supabase
      .from('ruoli')
      .select('id')
      .eq('codice', 'utente')
      .single()

    if (!ruoloUtente) {
      return NextResponse.json(
        { success: false, error: 'Ruolo utente non trovato' },
        { status: 500 }
      )
    }

    // Ottieni sedi, settori, classi esistenti
    const [sediRes, settoriRes, classiRes] = await Promise.all([
      supabase.from('sedi').select('id, nome'),
      supabase.from('settori').select('id, nome'),
      supabase.from('classi').select('id, nome, id_settore'),
    ])

    const sedi = sediRes.data || []
    const settori = settoriRes.data || []
    const classi = classiRes.data || []

    // Trova la sede principale (o la prima disponibile)
    const sedePrincipale = sedi[0]

    if (!sedePrincipale) {
      return NextResponse.json(
        { success: false, error: 'Nessuna sede trovata. Crea prima una sede.' },
        { status: 400 }
      )
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const utente of UTENTI_ARUBA) {
      // Genera email univoca
      const email = `${utente.nome.toLowerCase()}.${utente.cognome.toLowerCase().replace(/ /g, '')}@demo.trainingcognitivo.it`

      // Trova settore corrispondente
      const settoreNome = SETTORI_MAP[utente.id_settore] || 'Infanzia'
      const settore = settori.find(s => s.nome.toLowerCase().includes(settoreNome.toLowerCase()))

      // Trova classe (approssimativa - usa la prima classe del settore se non trova match esatto)
      let classe = null
      if (settore) {
        const classiSettore = classi.filter(c => c.id_settore === settore.id)
        classe = classiSettore[0] || null
      }

      try {
        // Crea utente auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: 'Utente123!',
          email_confirm: true,
          user_metadata: {
            nome: utente.nome,
            cognome: utente.cognome,
            ruolo: 'utente'
          }
        })

        if (authError) {
          if (authError.message.includes('already been registered')) {
            skipped++
            continue
          }
          errors.push(`${utente.nome} ${utente.cognome}: ${authError.message}`)
          continue
        }

        if (!authData.user) {
          errors.push(`${utente.nome} ${utente.cognome}: utente non creato`)
          continue
        }

        // Aggiorna profilo con dati aggiuntivi
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            id_ruolo: ruoloUtente.id,
            id_sede: sedePrincipale.id,
            id_settore: settore?.id || null,
            id_classe: classe?.id || null,
            email_contatto: email,
            stato: 'attivo'
          })
          .eq('id', authData.user.id)

        if (updateError) {
          errors.push(`${utente.nome} ${utente.cognome}: errore update profilo`)
        }

        created++
      } catch (err: any) {
        errors.push(`${utente.nome} ${utente.cognome}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Creati ${created} utenti. Skippati ${skipped} (già esistenti). Password: Utente123!`
    })

  } catch (error: any) {
    console.error('Errore seed utenti:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
