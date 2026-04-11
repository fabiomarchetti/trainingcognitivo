/**
 * API Segui il Tracciato
 * Gestione esercizi di pregrafismo con tracciato e salvataggio risultati
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

// GET: list_esercizi, get_esercizio, get_statistiche
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'list_esercizi': {
        const id_utente = searchParams.get('id_utente')
        if (!id_utente) return jsonResponse(false, 'ID utente obbligatorio', null, 400)

        const { data, error } = await supabase
          .from('segui_il_tracciato_esercizi')
          .select('*')
          .eq('id_utente', id_utente)
          .eq('stato', 'attivo')
          .order('data_creazione', { ascending: false })

        if (error) throw error
        return jsonResponse(true, 'Esercizi recuperati', data)
      }

      case 'get_esercizio': {
        const id_esercizio = searchParams.get('id_esercizio')
        if (!id_esercizio) return jsonResponse(false, 'ID esercizio obbligatorio', null, 400)

        const { data, error } = await supabase
          .from('segui_il_tracciato_esercizi')
          .select('*')
          .eq('id', id_esercizio)
          .single()

        if (error) throw error
        return jsonResponse(true, 'Esercizio recuperato', data)
      }

      case 'get_statistiche': {
        const id_utente = searchParams.get('id_utente')
        if (!id_utente) return jsonResponse(false, 'ID utente obbligatorio', null, 400)

        const { data: risultati, error } = await supabase
          .from('segui_il_tracciato_risultati')
          .select('*')
          .eq('id_utente', id_utente)
          .order('data_creazione', { ascending: false })

        if (error) throw error

        if (!risultati || risultati.length === 0) {
          return jsonResponse(true, 'Nessun risultato', {
            generali: null,
            sessioni: []
          })
        }

        const totale = risultati.length
        const completati = risultati.filter((r: any) => r.completato).length
        const precisioneMedia = risultati.reduce(
          (sum: number, r: any) => sum + Number(r.precisione_percentuale || 0), 0
        ) / totale
        const tempoMedioMs = risultati.reduce(
          (sum: number, r: any) => sum + (r.tempo_impiegato_ms || 0), 0
        ) / totale
        const erroriMedi = risultati.reduce(
          (sum: number, r: any) => sum + (r.errori_fuori_traccia || 0), 0
        ) / totale

        return jsonResponse(true, 'Statistiche recuperate', {
          generali: {
            totale_sessioni: totale,
            completati,
            percentuale_completamento: Math.round((completati / totale) * 100),
            precisione_media: parseFloat(precisioneMedia.toFixed(2)),
            tempo_medio_ms: Math.round(tempoMedioMs),
            errori_medi: parseFloat(erroriMedi.toFixed(2))
          },
          sessioni: risultati.slice(0, 50)
        })
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API segui-il-tracciato GET:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}

// POST: create_esercizio, update_esercizio, delete_esercizio, save_risultato
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'create_esercizio': {
        const {
          id_utente, id_educatore,
          nome_esercizio, configurazione
        } = body

        if (!id_utente || !nome_esercizio || !configurazione) {
          return jsonResponse(false, 'Campi obbligatori mancanti', null, 400)
        }

        const oggetto_keyword = configurazione?.oggetto?.keywords?.[0] || null
        const target_keyword = configurazione?.target?.keywords?.[0] || null

        const { data, error } = await supabase
          .from('segui_il_tracciato_esercizi')
          .insert({
            id_utente,
            id_educatore: id_educatore || null,
            nome_esercizio,
            oggetto_keyword,
            target_keyword,
            configurazione
          })
          .select()
          .single()

        if (error) throw error
        return jsonResponse(true, 'Esercizio creato', data)
      }

      case 'update_esercizio': {
        const { id_esercizio, nome_esercizio, configurazione } = body
        if (!id_esercizio) return jsonResponse(false, 'ID esercizio obbligatorio', null, 400)

        const updates: any = { data_modifica: new Date().toISOString() }
        if (nome_esercizio !== undefined) updates.nome_esercizio = nome_esercizio
        if (configurazione !== undefined) {
          updates.configurazione = configurazione
          updates.oggetto_keyword = configurazione?.oggetto?.keywords?.[0] || null
          updates.target_keyword = configurazione?.target?.keywords?.[0] || null
        }

        const { data, error } = await supabase
          .from('segui_il_tracciato_esercizi')
          .update(updates)
          .eq('id', id_esercizio)
          .select()
          .single()

        if (error) throw error
        return jsonResponse(true, 'Esercizio aggiornato', data)
      }

      case 'delete_esercizio': {
        const { id_esercizio } = body
        if (!id_esercizio) return jsonResponse(false, 'ID esercizio obbligatorio', null, 400)

        const { error } = await supabase
          .from('segui_il_tracciato_esercizi')
          .update({ stato: 'archiviato', data_modifica: new Date().toISOString() })
          .eq('id', id_esercizio)

        if (error) throw error
        return jsonResponse(true, 'Esercizio eliminato')
      }

      case 'save_risultato': {
        const {
          id_utente, id_esercizio, nome_esercizio,
          tempo_impiegato_ms, precisione_percentuale,
          errori_fuori_traccia, distanza_media, lunghezza_percorso,
          ha_raggiunto_target, completato,
          configurazione, tracciato_utente, id_sessione
        } = body

        if (!id_utente) return jsonResponse(false, 'ID utente obbligatorio', null, 400)

        const { error } = await supabase
          .from('segui_il_tracciato_risultati')
          .insert({
            id_utente,
            id_esercizio: id_esercizio || null,
            nome_esercizio: nome_esercizio || null,
            tempo_impiegato_ms: tempo_impiegato_ms || 0,
            precisione_percentuale: precisione_percentuale || 0,
            errori_fuori_traccia: errori_fuori_traccia || 0,
            distanza_media: distanza_media || 0,
            lunghezza_percorso: lunghezza_percorso || 0,
            ha_raggiunto_target: ha_raggiunto_target || false,
            completato: completato || false,
            configurazione: configurazione || null,
            tracciato_utente: tracciato_utente || null,
            id_sessione: id_sessione || null
          })

        if (error) throw error
        return jsonResponse(true, 'Risultato salvato')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API segui-il-tracciato POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
