/**
 * API Scrivo Parole con le Lettere
 * Gestione risultati esercizi
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper per response JSON
function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

// GET: Recupera statistiche e progressivo
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
      case 'get_next_progressivo': {
        // Ottieni il prossimo numero di sessione per l'utente
        const { data, error } = await supabase
          .from('scrivo_lettere_risultati')
          .select('progressivo_esercizio')
          .eq('id_utente', id_utente)
          .order('progressivo_esercizio', { ascending: false })
          .limit(1)

        if (error) throw error

        const nextProgressivo = (data && data.length > 0 && data[0].progressivo_esercizio)
          ? data[0].progressivo_esercizio + 1
          : 1

        return jsonResponse(true, 'Progressivo calcolato', { progressivo: nextProgressivo })
      }

      case 'get_statistiche': {
        // Statistiche per parola
        const { data: risultati, error } = await supabase
          .from('scrivo_lettere_risultati')
          .select('*')
          .eq('id_utente', id_utente)
          .order('data_creazione', { ascending: false })

        if (error) throw error

        // Calcola statistiche per parola
        const perParola: Record<string, { totale: number; corretti: number; errati: number }> = {}
        risultati?.forEach((r: any) => {
          if (!perParola[r.parola_target]) {
            perParola[r.parola_target] = { totale: 0, corretti: 0, errati: 0 }
          }
          perParola[r.parola_target].totale++
          if (r.esito === 'corretto') {
            perParola[r.parola_target].corretti++
          } else {
            perParola[r.parola_target].errati++
          }
        })

        // Statistiche generali
        const totale = risultati?.length || 0
        const corretti = risultati?.filter((r: any) => r.esito === 'corretto').length || 0
        const sessioni = new Set(risultati?.map((r: any) => r.progressivo_esercizio)).size

        return jsonResponse(true, 'Statistiche recuperate', {
          per_parola: perParola,
          generali: {
            totale_prove: totale,
            totale_corretti: corretti,
            totale_errati: totale - corretti,
            totale_sessioni: sessioni,
            percentuale: totale > 0 ? Math.round((corretti / totale) * 100) : 0
          }
        })
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API scrivo-parole-lettere GET:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}

// POST: Salva risultati
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'save_risultato': {
        const {
          id_utente,
          parola_target,
          risposta_utente,
          esito,
          tempo_risposta_ms,
          numero_prova,
          numero_prove_totali,
          progressivo_esercizio
        } = body

        const now = new Date()
        const data_esercizio = now.toISOString().split('T')[0]
        const ora_esercizio = now.toTimeString().split(' ')[0]

        const { error } = await supabase
          .from('scrivo_lettere_risultati')
          .insert({
            id_utente,
            parola_target,
            risposta_utente,
            esito,
            tempo_risposta_ms,
            numero_prova,
            numero_prove_totali,
            progressivo_esercizio,
            data_esercizio,
            ora_esercizio
          })

        if (error) throw error
        return jsonResponse(true, 'Risultato salvato')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API scrivo-parole-lettere POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
