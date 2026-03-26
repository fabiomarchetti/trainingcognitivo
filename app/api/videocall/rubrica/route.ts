/**
 * API Rubrica Videocall
 * Restituisce la lista dei contatti chiamabili dall'utente autenticato
 * La visibilita dipende dal ruolo:
 * - utente: vede solo educatori/insegnanti assegnati
 * - educatore/insegnante: vede utenti assegnati + staff stessa sede
 * - responsabile_centro: tutti nella propria sede
 * - sviluppatore: tutti
 */
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const RUOLI_STAFF_TUTTI = [
  'sviluppatore',
  'amministratore',
  'direttore',
  'casemanager',
  'responsabile_centro',
]
const RUOLI_ASSEGNATI = ['educatore', 'insegnante']

interface ContattoRubrica {
  id: string
  nome: string
  cognome: string
  ruoloCodice: string
  ruoloNome: string
  idSede: number | null
}

function jsonResponse(success: boolean, message: string, data: unknown = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(false, 'Non autenticato', null, 401)
    }

    const adminClient = await createAdminClient()

    // Profilo e ruolo dell'utente corrente
    const { data: currentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, nome, cognome, id_ruolo, id_sede, ruoli(codice, nome)')
      .eq('id', user.id)
      .single()

    if (profileError || !currentProfile) {
      return jsonResponse(false, 'Profilo non trovato', null, 404)
    }

    const ruoloCorrente = (currentProfile.ruoli as any)?.codice || 'utente'
    const contatti: ContattoRubrica[] = []

    // --- UTENTE (paziente): vede solo educatori/insegnanti assegnati ---
    if (ruoloCorrente === 'utente') {
      // Educatori assegnati
      const { data: assEducatori } = await adminClient
        .from('educatori_utenti')
        .select('id_educatore')
        .eq('id_utente', user.id)
        .eq('is_attiva', true)

      const idsEducatori = (assEducatori || []).map((a) => a.id_educatore)

      // Insegnanti assegnati
      const { data: assInsegnanti } = await adminClient
        .from('insegnanti_utenti')
        .select('id_insegnante')
        .eq('id_utente', user.id)
        .eq('is_attiva', true)

      const idsInsegnanti = (assInsegnanti || []).map((a) => a.id_insegnante)

      const allIds = [...new Set([...idsEducatori, ...idsInsegnanti])]

      if (allIds.length > 0) {
        const { data: operatori } = await adminClient
          .from('profiles')
          .select('id, nome, cognome, id_sede, ruoli!id_ruolo(codice, nome)')
          .in('id', allIds)
          .eq('stato', 'attivo')
          .order('cognome', { ascending: true })

        ;(operatori || []).forEach((op: any) => {
          contatti.push({
            id: op.id,
            nome: op.nome,
            cognome: op.cognome,
            ruoloCodice: op.ruoli?.codice || '',
            ruoloNome: op.ruoli?.nome || '',
            idSede: op.id_sede,
          })
        })
      }

      // Fallback: aggiungi sviluppatori e responsabili come contatti di emergenza
      // Usa una query diretta con inner join per trovare i profili con ruolo specifico
      const ruoliFallback = ['sviluppatore', 'responsabile_centro']

      for (const codiceRuolo of ruoliFallback) {
        // Query con join: prendi profili il cui ruolo ha il codice cercato
        const { data: profiliFallback, error: fbErr } = await adminClient
          .from('profiles')
          .select('id, nome, cognome, id_sede, id_ruolo')
          .eq('stato', 'attivo')

        if (fbErr) {
          console.error('[RUBRICA API] Errore fallback:', fbErr.message)
          continue
        }

        // Filtra manualmente: prendi quelli con il ruolo giusto
        const { data: ruoloTarget } = await adminClient
          .from('ruoli')
          .select('id, codice, nome')
          .eq('codice', codiceRuolo)
          .single()

        if (!ruoloTarget) continue

        const profiliFiltrati = (profiliFallback || []).filter(
          (p) => p.id_ruolo === ruoloTarget.id && p.id !== user.id
        )

        profiliFiltrati.forEach((p: any) => {
          if (!contatti.find((c) => c.id === p.id)) {
            contatti.push({
              id: p.id,
              nome: p.nome,
              cognome: p.cognome,
              ruoloCodice: ruoloTarget.codice,
              ruoloNome: ruoloTarget.nome,
              idSede: p.id_sede,
            })
          }
        })

        // Per responsabile_centro, filtra per stessa sede
        if (codiceRuolo === 'responsabile_centro' && !currentProfile.id_sede) {
          // Se l'utente non ha sede, non cercare responsabili
          continue
        }
      }

      return jsonResponse(true, 'Rubrica contatti', contatti)
    }

    // --- SVILUPPATORE: vede tutti ---
    if (ruoloCorrente === 'sviluppatore') {
      const { data: tutti } = await adminClient
        .from('profiles')
        .select('id, nome, cognome, id_sede, ruoli!id_ruolo(codice, nome)')
        .eq('stato', 'attivo')
        .neq('id', user.id) // Escludi se stesso
        .order('cognome', { ascending: true })

      ;(tutti || []).forEach((p: any) => {
        contatti.push({
          id: p.id,
          nome: p.nome,
          cognome: p.cognome,
          ruoloCodice: p.ruoli?.codice || '',
          ruoloNome: p.ruoli?.nome || '',
          idSede: p.id_sede,
        })
      })

      return jsonResponse(true, 'Rubrica contatti', contatti)
    }

    // --- STAFF (responsabile_centro, ecc.): tutti nella propria sede ---
    if (RUOLI_STAFF_TUTTI.includes(ruoloCorrente)) {
      let query = adminClient
        .from('profiles')
        .select('id, nome, cognome, id_sede, ruoli!id_ruolo(codice, nome)')
        .eq('stato', 'attivo')
        .neq('id', user.id)
        .order('cognome', { ascending: true })

      // Filtra per sede se non e sviluppatore
      if (currentProfile.id_sede) {
        query = query.eq('id_sede', currentProfile.id_sede)
      }

      const { data: utentiSede } = await query

      ;(utentiSede || []).forEach((p: any) => {
        contatti.push({
          id: p.id,
          nome: p.nome,
          cognome: p.cognome,
          ruoloCodice: p.ruoli?.codice || '',
          ruoloNome: p.ruoli?.nome || '',
          idSede: p.id_sede,
        })
      })

      return jsonResponse(true, 'Rubrica contatti', contatti)
    }

    // --- EDUCATORE/INSEGNANTE: utenti assegnati + staff stessa sede ---
    if (RUOLI_ASSEGNATI.includes(ruoloCorrente)) {
      // 1. Utenti assegnati
      const { data: assEducatori } = await adminClient
        .from('educatori_utenti')
        .select('id_utente')
        .eq('id_educatore', user.id)
        .eq('is_attiva', true)

      const { data: assInsegnanti } = await adminClient
        .from('insegnanti_utenti')
        .select('id_utente')
        .eq('id_insegnante', user.id)
        .eq('is_attiva', true)

      const idsUtenti = [
        ...new Set([
          ...(assEducatori || []).map((a) => a.id_utente),
          ...(assInsegnanti || []).map((a) => a.id_utente),
        ]),
      ]

      if (idsUtenti.length > 0) {
        const { data: utenti } = await adminClient
          .from('profiles')
          .select('id, nome, cognome, id_sede, ruoli!id_ruolo(codice, nome)')
          .in('id', idsUtenti)
          .eq('stato', 'attivo')
          .order('cognome', { ascending: true })

        ;(utenti || []).forEach((p: any) => {
          contatti.push({
            id: p.id,
            nome: p.nome,
            cognome: p.cognome,
            ruoloCodice: p.ruoli?.codice || '',
            ruoloNome: p.ruoli?.nome || '',
            idSede: p.id_sede,
          })
        })
      }

      // 2. Staff della stessa sede (se ha una sede)
      if (currentProfile.id_sede) {
        const { data: staffSede } = await adminClient
          .from('profiles')
          .select('id, nome, cognome, id_sede, ruoli!id_ruolo(codice, nome)')
          .eq('id_sede', currentProfile.id_sede)
          .eq('stato', 'attivo')
          .neq('id', user.id)
          .order('cognome', { ascending: true })

        ;(staffSede || []).forEach((p: any) => {
          const ruoloCod = p.ruoli?.codice || ''
          // Aggiungi solo staff (non pazienti, gia aggiunti sopra)
          if (ruoloCod !== 'utente' && !contatti.find((c) => c.id === p.id)) {
            contatti.push({
              id: p.id,
              nome: p.nome,
              cognome: p.cognome,
              ruoloCodice: ruoloCod,
              ruoloNome: p.ruoli?.nome || '',
              idSede: p.id_sede,
            })
          }
        })
      }

      return jsonResponse(true, 'Rubrica contatti', contatti)
    }

    return jsonResponse(false, 'Ruolo non autorizzato', null, 403)
  } catch (error: any) {
    console.error('[API videocall/rubrica] Errore:', error)
    return jsonResponse(false, error.message || 'Errore server', null, 500)
  }
}
