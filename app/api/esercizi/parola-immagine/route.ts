/**
 * API Parola-Immagine
 * Gestione coppie target-distrattore e risultati esercizi
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper per response JSON
function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

// GET: Recupera coppie, impostazioni, risultati
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
      case 'get_coppie': {
        const { data, error } = await supabase
          .from('parola_immagine_coppie')
          .select('*')
          .eq('id_utente', id_utente)
          .eq('stato', 'attiva')
          .order('data_creazione', { ascending: false })

        if (error) throw error
        return jsonResponse(true, 'Coppie recuperate', data)
      }

      case 'get_impostazioni': {
        const { data, error } = await supabase
          .from('parola_immagine_impostazioni')
          .select('*')
          .eq('id_utente', id_utente)
          .single()

        // Se non esistono impostazioni, ritorna default
        if (error && error.code === 'PGRST116') {
          return jsonResponse(true, 'Impostazioni default', {
            id_utente: id_utente,
            numero_prove: 10
          })
        }
        if (error) throw error
        return jsonResponse(true, 'Impostazioni recuperate', data)
      }

      case 'get_statistiche': {
        // Statistiche per parola
        const { data: risultati, error } = await supabase
          .from('parola_immagine_risultati')
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
        const sessioni = new Set(risultati?.map((r: any) => r.id_sessione)).size

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
    console.error('Errore API parola-immagine GET:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}

// POST: Salva risultati, crea coppie, salva impostazioni
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'save_risultato': {
        const {
          id_utente, id_coppia, parola_target, esito,
          tempo_risposta_ms, posizione_target, immagine_cliccata,
          id_sessione, numero_prova, numero_prove_totali
        } = body

        const { error } = await supabase
          .from('parola_immagine_risultati')
          .insert({
            id_utente,
            id_coppia,
            parola_target,
            esito,
            tempo_risposta_ms,
            posizione_target,
            immagine_cliccata,
            id_sessione,
            numero_prova,
            numero_prove_totali
          })

        if (error) throw error
        return jsonResponse(true, 'Risultato salvato')
      }

      case 'create_coppia': {
        const {
          id_utente, id_educatore,
          parola_target, id_pittogramma_target, url_immagine_target,
          parola_distrattore, id_pittogramma_distrattore, url_immagine_distrattore
        } = body

        const { data, error } = await supabase
          .from('parola_immagine_coppie')
          .insert({
            id_utente,
            id_educatore,
            parola_target,
            id_pittogramma_target,
            url_immagine_target,
            parola_distrattore,
            id_pittogramma_distrattore,
            url_immagine_distrattore
          })
          .select()
          .single()

        if (error) throw error
        return jsonResponse(true, 'Coppia creata', data)
      }

      case 'delete_coppia': {
        const { id_coppia } = body

        const { error } = await supabase
          .from('parola_immagine_coppie')
          .update({ stato: 'archiviata' })
          .eq('id', id_coppia)

        if (error) throw error
        return jsonResponse(true, 'Coppia eliminata')
      }

      case 'save_impostazioni': {
        const { id_utente, numero_prove } = body

        const { error } = await supabase
          .from('parola_immagine_impostazioni')
          .upsert({
            id_utente,
            numero_prove: Math.max(1, Math.min(50, numero_prove)),
            data_modifica: new Date().toISOString()
          }, {
            onConflict: 'id_utente'
          })

        if (error) throw error
        return jsonResponse(true, 'Impostazioni salvate')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API parola-immagine POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
