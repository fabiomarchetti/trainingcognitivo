/**
 * API per aggiornare le credenziali degli utenti finali
 * Imposta email = nome@gmail.com e password = nome+pwd
 * Solo per utenti con ruolo "utente"
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Client admin con service_role key per modificare auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    // 1. Ottieni l'ID del ruolo "utente"
    const { data: ruoloUtente, error: ruoloError } = await supabaseAdmin
      .from('ruoli')
      .select('id')
      .eq('codice', 'utente')
      .single()

    if (ruoloError || !ruoloUtente) {
      return NextResponse.json({
        success: false,
        message: 'Ruolo "utente" non trovato'
      }, { status: 400 })
    }

    // 2. Ottieni tutti i profili con ruolo "utente"
    const { data: utenti, error: utentiError } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, cognome')
      .eq('id_ruolo', ruoloUtente.id)

    if (utentiError) {
      throw utentiError
    }

    if (!utenti || utenti.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun utente da aggiornare',
        data: { aggiornati: 0 }
      })
    }

    const risultati: { nome: string; email: string; password: string; status: string }[] = []

    // 3. Per ogni utente, aggiorna email e password
    for (const utente of utenti) {
      // Crea nome normalizzato (minuscolo, senza spazi, senza accenti)
      const nomeNormalizzato = normalizzaNome(utente.nome || 'utente')
      const cognomeNormalizzato = normalizzaNome(utente.cognome || '')

      // Se nome e cognome sono uguali o cognome vuoto, usa solo nome
      // Altrimenti usa nome.cognome per evitare duplicati
      let baseNome = nomeNormalizzato
      if (cognomeNormalizzato && cognomeNormalizzato !== nomeNormalizzato) {
        baseNome = `${nomeNormalizzato}.${cognomeNormalizzato}`
      }

      const nuovaEmail = `${baseNome}@gmail.com`
      const nuovaPassword = `${nomeNormalizzato}pwd`

      try {
        // Aggiorna credenziali tramite Admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          utente.id,
          {
            email: nuovaEmail,
            password: nuovaPassword,
            email_confirm: true // Conferma automaticamente l'email
          }
        )

        if (updateError) {
          risultati.push({
            nome: `${utente.nome} ${utente.cognome}`,
            email: nuovaEmail,
            password: nuovaPassword,
            status: `Errore: ${updateError.message}`
          })
        } else {
          risultati.push({
            nome: `${utente.nome} ${utente.cognome}`,
            email: nuovaEmail,
            password: nuovaPassword,
            status: 'OK'
          })
        }
      } catch (err: any) {
        risultati.push({
          nome: `${utente.nome} ${utente.cognome}`,
          email: nuovaEmail,
          password: nuovaPassword,
          status: `Errore: ${err.message}`
        })
      }
    }

    const aggiornatiOk = risultati.filter(r => r.status === 'OK').length

    return NextResponse.json({
      success: true,
      message: `Aggiornati ${aggiornatiOk} su ${utenti.length} utenti`,
      data: {
        totale: utenti.length,
        aggiornati: aggiornatiOk,
        dettagli: risultati
      }
    })

  } catch (error: any) {
    console.error('Errore aggiornamento credenziali:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Errore durante l\'aggiornamento'
    }, { status: 500 })
  }
}

// Normalizza il nome: minuscolo, senza accenti, senza spazi
function normalizzaNome(nome: string): string {
  return nome
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/\s+/g, '') // Rimuove spazi
    .replace(/[^a-z0-9]/g, '') // Rimuove caratteri speciali
}

// GET per verificare lo stato
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API Aggiorna Credenziali Utenti',
    info: 'Chiama POST per aggiornare email e password degli utenti con ruolo "utente"',
    formato: {
      email: 'nome.cognome@gmail.com',
      password: 'nomepwd'
    }
  })
}
