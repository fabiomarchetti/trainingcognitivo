/**
 * API Cerca Categoria
 * Gestione esercizi di categorizzazione e salvataggio risultati
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

// GET: list_esercizi, get_statistiche, get_next_progressivo
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const id_utente = searchParams.get('id_utente')

  if (!id_utente) {
    return jsonResponse(false, 'ID utente obbligatorio', null, 400)
  }

  try {
    switch (action) {

      case 'list_esercizi': {
        const { data, error } = await supabase
          .from('cerca_categoria_esercizi')
          .select('*')
          .eq('id_utente', id_utente)
          .eq('stato', 'attiva')
          .order('data_creazione', { ascending: false })

        if (error) throw error
        return jsonResponse(true, 'Esercizi recuperati', data)
      }

      case 'get_statistiche': {
        const { data: risultati, error } = await supabase
          .from('cerca_categoria_risultati')
          .select('*')
          .eq('id_utente', id_utente)
          .order('data_creazione', { ascending: false })

        if (error) throw error

        if (!risultati || risultati.length === 0) {
          return jsonResponse(true, 'Nessun risultato', {
            per_categoria: [],
            generali: null
          })
        }

        // Statistiche per categoria (frase_tts)
        const perCategoria: Record<string, {
          frase_tts: string
          categoria_target: string
          corrette: number
          errate: number
          totale: number
        }> = {}

        risultati.forEach((r: any) => {
          const key = r.frase_tts || r.categoria_target
          if (!perCategoria[key]) {
            perCategoria[key] = {
              frase_tts: r.frase_tts || key,
              categoria_target: r.categoria_target || key,
              corrette: 0,
              errate: 0,
              totale: 0
            }
          }
          perCategoria[key].totale++
          if (r.risultato === 'positivo') perCategoria[key].corrette++
          else perCategoria[key].errate++
        })

        const statCategorie = Object.values(perCategoria).map(s => ({
          ...s,
          percentuale: s.totale > 0 ? Math.round((s.corrette / s.totale) * 100) : 0
        }))

        // Statistiche generali
        const totale = risultati.length
        const corretti = risultati.filter((r: any) => r.risultato === 'positivo').length
        const sessioni = new Set(risultati.map((r: any) => r.id_sessione || r.progressivo_esercizio)).size

        return jsonResponse(true, 'Statistiche recuperate', {
          per_categoria: statCategorie,
          generali: {
            totale_click: totale,
            totale_corretti: corretti,
            totale_errati: totale - corretti,
            totale_sessioni: sessioni,
            percentuale: totale > 0 ? Math.round((corretti / totale) * 100) : 0
          }
        })
      }

      case 'get_next_progressivo': {
        const { data, error } = await supabase
          .from('cerca_categoria_risultati')
          .select('progressivo_esercizio')
          .eq('id_utente', id_utente)
          .order('progressivo_esercizio', { ascending: false })
          .limit(1)

        if (error) throw error

        const next = (data && data.length > 0 && data[0].progressivo_esercizio)
          ? data[0].progressivo_esercizio + 1
          : 1

        return jsonResponse(true, 'Progressivo calcolato', { progressivo: next })
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API cerca-categoria GET:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}

// POST: create_esercizio, delete_esercizio, save_risultato
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {

      case 'create_esercizio': {
        const {
          id_utente, id_educatore,
          frase_tts, categoria_target,
          immagini_target, immagini_distrattori
        } = body

        if (!id_utente || !frase_tts || !immagini_target?.length || !immagini_distrattori?.length) {
          return jsonResponse(false, 'Campi obbligatori mancanti', null, 400)
        }

        const { data, error } = await supabase
          .from('cerca_categoria_esercizi')
          .insert({
            id_utente,
            id_educatore: id_educatore || null,
            frase_tts,
            categoria_target: categoria_target || frase_tts,
            immagini_target,
            immagini_distrattori
          })
          .select()
          .single()

        if (error) throw error
        return jsonResponse(true, 'Esercizio creato', data)
      }

      case 'delete_esercizio': {
        const { id_esercizio } = body

        const { error } = await supabase
          .from('cerca_categoria_esercizi')
          .update({ stato: 'archiviata' })
          .eq('id', id_esercizio)

        if (error) throw error
        return jsonResponse(true, 'Esercizio eliminato')
      }

      case 'save_risultato': {
        const {
          id_utente, id_esercizio,
          frase_tts, categoria_target,
          id_pittogramma_cliccato, url_pittogramma,
          tipo_risposta, risultato,
          tempo_risposta_ms, id_sessione,
          progressivo_esercizio
        } = body

        const now = new Date()

        const { error } = await supabase
          .from('cerca_categoria_risultati')
          .insert({
            id_utente,
            id_esercizio: id_esercizio || null,
            frase_tts: frase_tts || '',
            categoria_target: categoria_target || '',
            id_pittogramma_cliccato: id_pittogramma_cliccato || null,
            url_pittogramma: url_pittogramma || '',
            tipo_risposta: tipo_risposta || 'distrattore',
            risultato: risultato || 'negativo',
            tempo_risposta_ms: tempo_risposta_ms || 0,
            id_sessione: id_sessione || null,
            progressivo_esercizio: progressivo_esercizio || 1,
            data_creazione: now.toISOString()
          })

        if (error) throw error
        return jsonResponse(true, 'Risultato salvato')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API cerca-categoria POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
