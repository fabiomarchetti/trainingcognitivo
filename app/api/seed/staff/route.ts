/**
 * API per seed staff - crea 40 utenti staff di test
 * Chiamare una sola volta: POST /api/seed/staff
 * Richiede essere loggati come sviluppatore
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Nomi e cognomi italiani per generazione casuale
const nomi = [
  'Marco', 'Luca', 'Alessandro', 'Andrea', 'Matteo', 'Lorenzo', 'Davide', 'Francesco', 'Simone', 'Federico',
  'Giulia', 'Chiara', 'Francesca', 'Sara', 'Valentina', 'Elena', 'Alessia', 'Martina', 'Giorgia', 'Elisa',
  'Paolo', 'Giovanni', 'Roberto', 'Giuseppe', 'Antonio', 'Massimo', 'Stefano', 'Claudio', 'Fabio', 'Daniele',
  'Anna', 'Maria', 'Laura', 'Silvia', 'Monica', 'Paola', 'Cristina', 'Barbara', 'Federica', 'Roberta'
]

const cognomi = [
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
  'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
  'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone',
  'Longo', 'Gentile', 'Martinelli', 'Vitale', 'Lombardo', 'Serra', 'Coppola', 'De Santis', 'Marchetti', 'Parisi'
]

export async function POST(request: NextRequest) {
  try {
    // Verifica variabili ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      )
    }

    // Crea client con service role (può creare utenti senza conferma email)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Ottieni i ruoli disponibili (solo gestori, escluso sviluppatore)
    const { data: ruoli, error: ruoliError } = await supabase
      .from('ruoli')
      .select('*')
      .eq('tipo_ruolo', 'gestore')
      .eq('is_attivo', true)
      .neq('codice', 'sviluppatore')
      .order('livello_accesso', { ascending: false })

    if (ruoliError || !ruoli || ruoli.length === 0) {
      return NextResponse.json(
        { error: 'Nessun ruolo gestore trovato', details: ruoliError },
        { status: 400 }
      )
    }

    console.log('Ruoli trovati:', ruoli.map(r => r.codice))

    const createdUsers: any[] = []
    const errors: any[] = []

    // Crea 10 utenti per ogni ruolo
    for (const ruolo of ruoli) {
      console.log(`Creazione 10 utenti per ruolo: ${ruolo.nome}`)

      for (let i = 1; i <= 10; i++) {
        // Genera nome e cognome casuali
        const nome = nomi[Math.floor(Math.random() * nomi.length)]
        const cognome = cognomi[Math.floor(Math.random() * cognomi.length)]

        // Genera email unica
        const emailPrefix = `${nome.toLowerCase()}.${cognome.toLowerCase().replace(' ', '')}`
        const emailSuffix = `${ruolo.codice}${i}`
        const email = `${emailPrefix}.${emailSuffix}@demo.trainingcognitivo.it`

        // Password di default per tutti gli utenti demo
        const password = 'Demo1234!'

        try {
          // Crea utente con admin API
          const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Conferma automatica
            user_metadata: {
              nome,
              cognome,
              ruolo: ruolo.codice
            }
          })

          if (userError) {
            console.error(`Errore creazione ${email}:`, userError.message)
            errors.push({ email, error: userError.message })
            continue
          }

          if (userData.user) {
            // Aggiorna profilo con id_ruolo corretto
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                id_ruolo: ruolo.id,
                email_contatto: email,
                stato: 'attivo'
              })
              .eq('id', userData.user.id)

            if (profileError) {
              console.error(`Errore update profilo ${email}:`, profileError.message)
            }

            createdUsers.push({
              id: userData.user.id,
              email,
              nome,
              cognome,
              ruolo: ruolo.codice
            })
            console.log(`Creato: ${nome} ${cognome} (${ruolo.codice})`)
          }
        } catch (err: any) {
          console.error(`Errore ${email}:`, err.message)
          errors.push({ email, error: err.message })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Creati ${createdUsers.length} utenti staff`,
      ruoliUsati: ruoli.map(r => r.codice),
      created: createdUsers.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Seed staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET per verificare lo stato
export async function GET() {
  return NextResponse.json({
    message: 'Seed Staff API',
    usage: 'POST /api/seed/staff per creare 40 utenti staff di test (10 per ogni ruolo gestore)',
    password: 'Demo1234!',
    note: 'Tutti gli utenti creati avranno la stessa password di default'
  })
}
