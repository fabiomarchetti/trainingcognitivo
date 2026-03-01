/**
 * API Lista Educatori e Insegnanti
 * Ritorna la lista di educatori e insegnanti per dropdown
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function jsonResponse(success: boolean, message: string, data: any = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse(false, 'Non autenticato', null, 401)
    }

    const adminClient = await createAdminClient()

    // Ottieni gli ID dei ruoli educatore e insegnante
    const { data: ruoli, error: ruoliError } = await adminClient
      .from('ruoli')
      .select('id, codice')
      .in('codice', ['educatore', 'insegnante'])

    if (ruoliError || !ruoli || ruoli.length === 0) {
      return jsonResponse(false, 'Ruoli non trovati', null, 500)
    }

    const ruoliIds = ruoli.map(r => r.id)

    // Ottieni i profili con questi ruoli
    const { data: profili, error: profiliError } = await adminClient
      .from('profiles')
      .select('id, nome, cognome, id_ruolo, ruoli(codice)')
      .in('id_ruolo', ruoliIds)
      .eq('stato', 'attivo')
      .order('cognome', { ascending: true })

    if (profiliError) throw profiliError

    // Formatta i risultati
    const lista = (profili || []).map((p: any) => ({
      id: p.id,
      nome: p.nome || '',
      cognome: p.cognome || '',
      ruolo: p.ruoli?.codice || ''
    }))

    return jsonResponse(true, 'Lista educatori e insegnanti', lista)
  } catch (error: any) {
    console.error('[API educatori-insegnanti] Errore:', error)
    return jsonResponse(false, error.message || 'Errore server', null, 500)
  }
}
