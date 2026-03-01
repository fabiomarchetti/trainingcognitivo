/**
 * API Lista Utenti
 * Ritorna la lista degli utenti (pazienti) in base al ruolo di chi chiama
 * Bypassa RLS usando il service role per evitare problemi di policy
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const RUOLI_STAFF_TUTTI = ['sviluppatore', 'amministratore', 'direttore', 'casemanager', 'responsabile_centro']
const RUOLI_ASSEGNATI = ['educatore', 'insegnante']

function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

export async function GET(request: NextRequest) {
  try {
    // Client normale per verificare autenticazione
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(false, 'Non autenticato', null, 401)
    }

    // Client admin per bypassare RLS
    const adminClient = await createAdminClient()

    // Ottieni il profilo e ruolo dell'utente corrente
    const { data: currentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, nome, cognome, id_ruolo, ruoli(codice)')
      .eq('id', user.id)
      .single()

    if (profileError || !currentProfile) {
      return jsonResponse(false, 'Profilo non trovato', null, 404)
    }

    const ruoloCorrente = (currentProfile.ruoli as any)?.codice || 'utente'

    // Se è un utente normale, può vedere solo se stesso
    if (ruoloCorrente === 'utente') {
      return jsonResponse(true, 'Lista utenti', [{
        id: currentProfile.id,
        nome: currentProfile.nome,
        cognome: currentProfile.cognome
      }])
    }

    // Ottieni l'id del ruolo "utente"
    const { data: ruoloUtente, error: ruoloError } = await adminClient
      .from('ruoli')
      .select('id')
      .eq('codice', 'utente')
      .single()

    if (ruoloError || !ruoloUtente) {
      return jsonResponse(false, 'Ruolo utente non trovato', null, 500)
    }

    // Staff che vede tutti gli utenti
    if (RUOLI_STAFF_TUTTI.includes(ruoloCorrente)) {
      const { data: utenti, error } = await adminClient
        .from('profiles')
        .select('id, nome, cognome')
        .eq('id_ruolo', ruoloUtente.id)
        .eq('stato', 'attivo')
        .order('cognome', { ascending: true })

      if (error) throw error
      return jsonResponse(true, 'Lista utenti', utenti || [])
    }

    // Educatori e insegnanti vedono solo utenti assegnati
    if (RUOLI_ASSEGNATI.includes(ruoloCorrente)) {
      // Prova prima educatori_utenti
      const { data: assEducatori } = await adminClient
        .from('educatori_utenti')
        .select('id_utente')
        .eq('id_educatore', user.id)
        .eq('is_attiva', true)

      // Poi insegnanti_utenti
      const { data: assInsegnanti } = await adminClient
        .from('insegnanti_utenti')
        .select('id_utente')
        .eq('id_insegnante', user.id)
        .eq('is_attiva', true)

      const idsEducatori = (assEducatori || []).map(a => a.id_utente)
      const idsInsegnanti = (assInsegnanti || []).map(a => a.id_utente)
      const allIds = [...new Set([...idsEducatori, ...idsInsegnanti])]

      if (allIds.length === 0) {
        return jsonResponse(true, 'Lista utenti', [])
      }

      const { data: utenti, error } = await adminClient
        .from('profiles')
        .select('id, nome, cognome')
        .in('id', allIds)
        .eq('stato', 'attivo')
        .order('cognome', { ascending: true })

      if (error) throw error
      return jsonResponse(true, 'Lista utenti', utenti || [])
    }

    // Ruolo non riconosciuto
    return jsonResponse(false, 'Ruolo non autorizzato', null, 403)

  } catch (error: any) {
    console.error('[API utenti/lista] Errore:', error)
    return jsonResponse(false, error.message || 'Errore server', null, 500)
  }
}
