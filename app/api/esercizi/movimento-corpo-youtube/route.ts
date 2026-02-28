/**
 * API Movimento Corpo YouTube
 * GET: get_config → carica configurazione per utente
 * POST: save_config → salva configurazione
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
          .from('movimento_corpo_youtube_config')
          .select('*')
          .eq('id_utente', id_utente)
          .single()

        if (error && error.code === 'PGRST116') {
          return jsonResponse(true, 'Nessuna configurazione', null)
        }
        if (error) throw error
        return jsonResponse(true, 'Config recuperata', data)
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API movimento-corpo-youtube GET:', error)
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
          .from('movimento_corpo_youtube_config')
          .upsert(
            {
              id_utente,
              id_educatore: id_educatore || null,
              // Tab 1: Bocca
              tab_attiva: config.tab_attiva ?? 1,
              link_youtube_tab1: config.link_youtube_tab1 ?? '',
              inizio_brano_tab1: config.inizio_brano_tab1 ?? 0,
              fine_brano_tab1: config.fine_brano_tab1 ?? 0,
              soglia_bocca: config.soglia_bocca ?? 10,
              timer_durata_tab1: config.timer_durata_tab1 ?? 10,
              // Tab 2: Testa
              link_youtube_tab2_1: config.link_youtube_tab2_1 ?? '',
              link_youtube_tab2_2: config.link_youtube_tab2_2 ?? '',
              inizio_brano_tab2: config.inizio_brano_tab2 ?? 0,
              fine_brano_tab2: config.fine_brano_tab2 ?? 0,
              tolleranza_testa: config.tolleranza_testa ?? 15,
              // Tab 3: Mano SX
              link_youtube_tab3: config.link_youtube_tab3 ?? '',
              inizio_brano_tab3: config.inizio_brano_tab3 ?? 0,
              fine_brano_tab3: config.fine_brano_tab3 ?? 0,
              modalita_tab3: config.modalita_tab3 ?? 'mantieni_attivo',
              timer_durata_tab3: config.timer_durata_tab3 ?? 10,
              roi_x_tab3: config.roi_x_tab3 ?? 0.5,
              roi_y_tab3: config.roi_y_tab3 ?? 0.5,
              roi_size_tab3: config.roi_size_tab3 ?? 150,
              // Tab 4: Mano DX
              link_youtube_tab4: config.link_youtube_tab4 ?? '',
              inizio_brano_tab4: config.inizio_brano_tab4 ?? 0,
              fine_brano_tab4: config.fine_brano_tab4 ?? 0,
              modalita_tab4: config.modalita_tab4 ?? 'mantieni_attivo',
              timer_durata_tab4: config.timer_durata_tab4 ?? 10,
              roi_x_tab4: config.roi_x_tab4 ?? 0.5,
              roi_y_tab4: config.roi_y_tab4 ?? 0.5,
              roi_size_tab4: config.roi_size_tab4 ?? 150,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id_utente' }
          )

        if (error) throw error
        return jsonResponse(true, 'Configurazione salvata')
      }

      default:
        return jsonResponse(false, 'Azione non riconosciuta', null, 400)
    }
  } catch (error: any) {
    console.error('Errore API movimento-corpo-youtube POST:', error)
    return jsonResponse(false, error.message, null, 500)
  }
}
