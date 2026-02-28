/**
 * API Tocca Oggetto
 * Gestione configurazione per utente e risultati sessioni
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const id_utente = searchParams.get('id_utente')

  if (!id_utente) return jsonResponse(false, 'ID utente obbligatorio', null, 400)

  try {
    switch (action) {

      case 'get_config': {
        const { data, error } = await supabase
          .from('tocca_oggetto_config')
          .select('*')
          .eq('id_utente', id_utente)
          .single()

        if (error && error.code === 'PGRST116') {
          return jsonResponse(true, 'Config default', null)
        }
        if (error) throw error
        return jsonResponse(true, 'Config recuperata', data?.config || null)
      }

      case 'get_statistiche': {
        const { data: risultati, error } = await supabase
          .from('tocca_oggetto_risultati')
          .select('*')
          .eq('id_utente', id_utente)
          .order('data_creazione', { ascending: true })

        if (error) throw error
        if (!risultati || risultati.length === 0) {
          return jsonResponse(true, 'Nessun dato', { sessioni: [], generali: null })
        }

        // Aggrega per sessione
        const sessionMap: Record<number, { target: number; errori: number; tempi: number[]; data: string }> = {}
        risultati.forEach((r: any) => {
          const p = r.progressivo_esercizio || 1
          if (!sessionMap[p]) sessionMap[p] = { target: 0, errori: 0, tempi: [], data: r.data_creazione?.split('T')[0] || '' }
          if (r.esito === 'corretto') sessionMap[p].target++
          else sessionMap[p].errori++
          if (r.tempo_risposta_ms) sessionMap[p].tempi.push(r.tempo_risposta_ms)
        })

        const sessioni = Object.entries(sessionMap).map(([prog, s]) => ({
          progressivo: Number(prog),
          data: s.data,
          target: s.target,
          errori: s.errori,
          totale: s.target + s.errori,
          percentuale: s.target + s.errori > 0 ? Math.round((s.target / (s.target + s.errori)) * 100) : 0,
          tempo_medio_ms: s.tempi.length > 0 ? Math.round(s.tempi.reduce((a, b) => a + b, 0) / s.tempi.length) : 0
        })).sort((a, b) => a.progressivo - b.progressivo)

        const totTarget = risultati.filter((r: any) => r.esito === 'corretto').length
        const totErrori = risultati.filter((r: any) => r.esito === 'errore').length
        const allTempi = risultati.filter((r: any) => r.tempo_risposta_ms).map((r: any) => r.tempo_risposta_ms)

        return jsonResponse(true, 'Statistiche', {
          sessioni,
          generali: {
            totale_sessioni: sessioni.length,
            totale_target: totTarget,
            totale_errori: totErrori,
            percentuale: totTarget + totErrori > 0 ? Math.round((totTarget / (totTarget + totErrori)) * 100) : 0,
            tempo_medio_ms: allTempi.length > 0 ? Math.round(allTempi.reduce((a, b) => a + b, 0) / allTempi.length) : 0
          }
        })
      }

      case 'get_next_progressivo': {
        const { data, error } = await supabase
          .from('tocca_oggetto_risultati')
          .select('progressivo_esercizio')
          .eq('id_utente', id_utente)
          .order('progressivo_esercizio', { ascending: false })
          .limit(1)

        if (error) throw error
        const next = (data && data.length > 0 && data[0].progressivo_esercizio) ? data[0].progressivo_esercizio + 1 : 1
        return jsonResponse(true, 'Progressivo', { progressivo: next })
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API tocca-oggetto GET:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {

      case 'save_config': {
        const { id_utente, id_educatore, config } = body
        if (!id_utente || !config) return jsonResponse(false, 'Dati mancanti', null, 400)

        const { error } = await supabase
          .from('tocca_oggetto_config')
          .upsert({ id_utente, id_educatore: id_educatore || null, config }, { onConflict: 'id_utente' })

        if (error) throw error
        return jsonResponse(true, 'Config salvata')
      }

      case 'save_risultato': {
        const {
          id_utente, tipo_risposta, esito,
          tempo_risposta_ms, id_sessione, progressivo_esercizio
        } = body

        const { error } = await supabase
          .from('tocca_oggetto_risultati')
          .insert({
            id_utente,
            tipo_risposta: tipo_risposta || 'target',
            esito: esito || 'corretto',
            tempo_risposta_ms: tempo_risposta_ms || 0,
            id_sessione: id_sessione || null,
            progressivo_esercizio: progressivo_esercizio || 1,
            data_creazione: new Date().toISOString()
          })

        if (error) throw error
        return jsonResponse(true, 'Risultato salvato')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API tocca-oggetto POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
