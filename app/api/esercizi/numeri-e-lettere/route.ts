/**
 * API Numeri e Lettere
 * Gestione esercizi di pregrafismo e salvataggio risultati
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
          .from('numeri_e_lettere_esercizi')
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
          .from('numeri_e_lettere_esercizi')
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
          .from('numeri_e_lettere_risultati')
          .select('*')
          .eq('id_utente', id_utente)
          .order('data_creazione', { ascending: false })

        if (error) throw error

        if (!risultati || risultati.length === 0) {
          return jsonResponse(true, 'Nessun risultato', {
            per_carattere: [],
            generali: null,
            sessioni: []
          })
        }

        // Statistiche per carattere
        const perCarattere: Record<string, {
          carattere: string
          tipo: string
          sessioni: number
          durata_totale: number
          pdf_scaricati: number
        }> = {}

        risultati.forEach((r: any) => {
          const key = `${r.tipo}-${r.carattere}`
          if (!perCarattere[key]) {
            perCarattere[key] = {
              carattere: r.carattere,
              tipo: r.tipo,
              sessioni: 0,
              durata_totale: 0,
              pdf_scaricati: 0
            }
          }
          perCarattere[key].sessioni++
          perCarattere[key].durata_totale += r.durata_secondi || 0
          if (r.pdf_scaricato) perCarattere[key].pdf_scaricati++
        })

        const statCaratteri = Object.values(perCarattere)

        // Statistiche generali
        const totaleSessioni = risultati.length
        const durataTotale = risultati.reduce((sum: number, r: any) => sum + (r.durata_secondi || 0), 0)
        const pdfTotali = risultati.filter((r: any) => r.pdf_scaricato).length

        return jsonResponse(true, 'Statistiche recuperate', {
          per_carattere: statCaratteri,
          generali: {
            totale_sessioni: totaleSessioni,
            durata_totale_secondi: durataTotale,
            pdf_scaricati: pdfTotali
          },
          sessioni: risultati.slice(0, 50)
        })
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API numeri-e-lettere GET:', error)
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
          nome_esercizio, tipo, carattere, nome_carattere,
          pittogramma_id, pittogramma_url, pittogramma_keyword,
          colonne, righe, righe_guida, mostra_pittogrammi,
          configurazione
        } = body

        if (!id_utente || !nome_esercizio || !tipo || !carattere) {
          return jsonResponse(false, 'Campi obbligatori mancanti', null, 400)
        }

        const { data, error } = await supabase
          .from('numeri_e_lettere_esercizi')
          .insert({
            id_utente,
            id_educatore: id_educatore || null,
            nome_esercizio,
            tipo,
            carattere: carattere.toUpperCase(),
            nome_carattere: nome_carattere || null,
            pittogramma_id: pittogramma_id || null,
            pittogramma_url: pittogramma_url || null,
            pittogramma_keyword: pittogramma_keyword || null,
            colonne: colonne || 5,
            righe: righe || 4,
            righe_guida: righe_guida ?? 2,
            mostra_pittogrammi: mostra_pittogrammi !== false,
            configurazione: configurazione || null
          })
          .select()
          .single()

        if (error) throw error
        return jsonResponse(true, 'Esercizio creato', data)
      }

      case 'update_esercizio': {
        const {
          id_esercizio,
          nome_esercizio, tipo, carattere, nome_carattere,
          pittogramma_id, pittogramma_url, pittogramma_keyword,
          colonne, righe, righe_guida, mostra_pittogrammi,
          configurazione
        } = body

        if (!id_esercizio) return jsonResponse(false, 'ID esercizio obbligatorio', null, 400)

        const updates: any = { data_modifica: new Date().toISOString() }
        if (nome_esercizio !== undefined) updates.nome_esercizio = nome_esercizio
        if (tipo !== undefined) updates.tipo = tipo
        if (carattere !== undefined) updates.carattere = carattere.toUpperCase()
        if (nome_carattere !== undefined) updates.nome_carattere = nome_carattere
        if (pittogramma_id !== undefined) updates.pittogramma_id = pittogramma_id
        if (pittogramma_url !== undefined) updates.pittogramma_url = pittogramma_url
        if (pittogramma_keyword !== undefined) updates.pittogramma_keyword = pittogramma_keyword
        if (colonne !== undefined) updates.colonne = colonne
        if (righe !== undefined) updates.righe = righe
        if (righe_guida !== undefined) updates.righe_guida = righe_guida
        if (mostra_pittogrammi !== undefined) updates.mostra_pittogrammi = mostra_pittogrammi
        if (configurazione !== undefined) updates.configurazione = configurazione

        const { data, error } = await supabase
          .from('numeri_e_lettere_esercizi')
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
          .from('numeri_e_lettere_esercizi')
          .update({ stato: 'archiviato', data_modifica: new Date().toISOString() })
          .eq('id', id_esercizio)

        if (error) throw error
        return jsonResponse(true, 'Esercizio eliminato')
      }

      case 'save_risultato': {
        const {
          id_utente, id_esercizio, nome_esercizio,
          tipo, carattere,
          celle_tracciate, celle_totali,
          durata_secondi, pdf_scaricato, id_sessione
        } = body

        if (!id_utente || !tipo || !carattere) {
          return jsonResponse(false, 'Campi obbligatori mancanti', null, 400)
        }

        const { error } = await supabase
          .from('numeri_e_lettere_risultati')
          .insert({
            id_utente,
            id_esercizio: id_esercizio || null,
            nome_esercizio: nome_esercizio || null,
            tipo,
            carattere: carattere.toUpperCase(),
            celle_tracciate: celle_tracciate || 0,
            celle_totali: celle_totali || 0,
            durata_secondi: durata_secondi || 0,
            pdf_scaricato: pdf_scaricato || false,
            id_sessione: id_sessione || null
          })

        if (error) throw error
        return jsonResponse(true, 'Risultato salvato')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API numeri-e-lettere POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
