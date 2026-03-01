/**
 * API Richieste Esercizi
 * Gestione richieste di nuovi esercizi da educatori/insegnanti
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

// GET - Lista richieste
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(false, 'Non autenticato', null, 401)
    }

    const adminClient = await createAdminClient()

    const { data: richieste, error } = await adminClient
      .from('richieste_esercizi')
      .select(`
        *,
        richiedente:id_richiedente(id, nome, cognome)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return jsonResponse(true, 'Lista richieste', richieste || [])
  } catch (error: any) {
    console.error('[API richieste-esercizi] Errore GET:', error)
    return jsonResponse(false, error.message || 'Errore server', null, 500)
  }
}

// POST - Nuova richiesta
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(false, 'Non autenticato', null, 401)
    }

    const body = await request.json()
    const { id_richiedente, obiettivo, descrizione, contenuti, azione_utente, statistiche, allegati } = body

    if (!obiettivo || !descrizione) {
      return jsonResponse(false, 'Obiettivo e descrizione sono obbligatori', null, 400)
    }

    const adminClient = await createAdminClient()

    // Ottieni info del richiedente per l'email
    const { data: richiedente } = await adminClient
      .from('profiles')
      .select('nome, cognome')
      .eq('id', id_richiedente)
      .single()

    // Inserisci la richiesta
    const { data: richiesta, error: insertError } = await adminClient
      .from('richieste_esercizi')
      .insert({
        id_richiedente,
        obiettivo,
        descrizione,
        contenuti,
        azione_utente,
        statistiche,
        allegati: allegati || [],
        stato: 'in_attesa'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Invia email di notifica
    try {
      await sendEmailNotification({
        richiedente: richiedente ? `${richiedente.nome} ${richiedente.cognome}` : 'Non specificato',
        obiettivo,
        descrizione,
        contenuti,
        azione_utente,
        statistiche,
        allegati
      })
    } catch (emailError) {
      console.error('[API richieste-esercizi] Errore invio email:', emailError)
      // Non blocchiamo per errore email
    }

    return jsonResponse(true, 'Richiesta inviata con successo', richiesta)
  } catch (error: any) {
    console.error('[API richieste-esercizi] Errore POST:', error)
    return jsonResponse(false, error.message || 'Errore server', null, 500)
  }
}

// PATCH - Aggiorna stato richiesta
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(false, 'Non autenticato', null, 401)
    }

    const body = await request.json()
    const { id, stato, note_admin } = body

    if (!id) {
      return jsonResponse(false, 'ID richiesta obbligatorio', null, 400)
    }

    const adminClient = await createAdminClient()

    const updateData: any = { updated_at: new Date().toISOString() }
    if (stato) updateData.stato = stato
    if (note_admin !== undefined) updateData.note_admin = note_admin

    const { data: richiesta, error: updateError } = await adminClient
      .from('richieste_esercizi')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return jsonResponse(true, 'Richiesta aggiornata', richiesta)
  } catch (error: any) {
    console.error('[API richieste-esercizi] Errore PATCH:', error)
    return jsonResponse(false, error.message || 'Errore server', null, 500)
  }
}

// Funzione per inviare email di notifica
async function sendEmailNotification(data: {
  richiedente: string
  obiettivo: string
  descrizione: string
  contenuti?: string
  azione_utente?: string
  statistiche?: string
  allegati?: any[]
}) {
  const emailContent = `
NUOVA RICHIESTA ESERCIZIO

Richiedente: ${data.richiedente}
Data: ${new Date().toLocaleString('it-IT')}

=== OBIETTIVO ===
${data.obiettivo}

=== DESCRIZIONE ===
${data.descrizione}

=== CONTENUTI ===
${data.contenuti || 'Non specificato'}

=== AZIONE UTENTE ===
${data.azione_utente || 'Non specificato'}

=== STATISTICHE ===
${data.statistiche || 'Non specificato'}

=== ALLEGATI ===
${data.allegati && data.allegati.length > 0
  ? data.allegati.map((a: any) => `- ${a.nome}: ${a.url}`).join('\n')
  : 'Nessun allegato'}

---
Questa email è stata generata automaticamente dal sistema TrainingCognitivo
  `.trim()

  // Usa Resend o altro servizio email
  // Per ora usiamo un semplice fetch a un webhook o servizio esterno
  // In alternativa, configura Resend/SendGrid/etc.

  // Esempio con Resend (da configurare)
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TrainingCognitivo <noreply@trainingcognitivo.it>',
        to: ['marchettisoft@gmail.com'],
        subject: `Nuova Richiesta Esercizio da ${data.richiedente}`,
        text: emailContent
      })
    })

    if (!response.ok) {
      throw new Error('Errore invio email')
    }
  } else {
    console.log('[EMAIL] RESEND_API_KEY non configurata. Email non inviata.')
    console.log('[EMAIL] Contenuto:', emailContent)
  }
}
