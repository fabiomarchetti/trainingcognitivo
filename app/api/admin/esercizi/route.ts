/**
 * API per lettura, creazione e modifica esercizi
 * Usa createAdminClient per bypassare RLS
 * GET  /api/admin/esercizi     - lista esercizi
 * POST /api/admin/esercizi     - crea nuovo esercizio
 * PUT  /api/admin/esercizi     - modifica esercizio esistente
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function jsonResponse(success: boolean, message: string, data: unknown = null, status = 200) {
  return NextResponse.json({ success, message, data }, { status })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return jsonResponse(false, 'Non autenticato', null, 401)

    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('esercizi')
      .select('*, categoria:id_categoria(*)')
      .order('id', { ascending: false })

    if (error) return jsonResponse(false, error.message, null, 500)

    return jsonResponse(true, 'OK', data)
  } catch (err: any) {
    console.error('[API esercizi GET]', err)
    return jsonResponse(false, err.message || 'Errore server', null, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return jsonResponse(false, 'Non autenticato', null, 401)

    const body = await request.json()
    const { nome, id_categoria, descrizione, slug, stato } = body

    if (!nome?.trim() || !id_categoria || !descrizione?.trim() || !slug?.trim()) {
      return jsonResponse(false, 'Parametri mancanti', null, 400)
    }

    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('esercizi')
      .insert({
        nome: nome.trim(),
        id_categoria,
        descrizione: descrizione.trim(),
        slug: slug.trim(),
        stato: stato || 'attivo',
        config: {}
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return jsonResponse(false, 'Esiste già un esercizio con questo slug', null, 409)
      }
      return jsonResponse(false, error.message, null, 500)
    }

    return jsonResponse(true, 'Esercizio creato', data)
  } catch (err: any) {
    console.error('[API esercizi POST]', err)
    return jsonResponse(false, err.message || 'Errore server', null, 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return jsonResponse(false, 'Non autenticato', null, 401)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return jsonResponse(false, 'ID mancante', null, 400)

    const adminClient = await createAdminClient()
    const { error } = await adminClient.from('esercizi').delete().eq('id', id)
    if (error) return jsonResponse(false, error.message, null, 500)

    return jsonResponse(true, 'Esercizio eliminato')
  } catch (err: any) {
    console.error('[API esercizi DELETE]', err)
    return jsonResponse(false, err.message || 'Errore server', null, 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return jsonResponse(false, 'Non autenticato', null, 401)

    const body = await request.json()
    const { id, nome, id_categoria, descrizione, slug, stato } = body

    if (!id || !nome?.trim() || !id_categoria || !descrizione?.trim()) {
      return jsonResponse(false, 'Parametri mancanti', null, 400)
    }

    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('esercizi')
      .update({
        nome: nome.trim(),
        id_categoria,
        descrizione: descrizione.trim(),
        slug: slug?.trim(),
        stato: stato || 'attivo'
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return jsonResponse(false, 'Esiste già un esercizio con questo slug', null, 409)
      }
      return jsonResponse(false, error.message, null, 500)
    }

    return jsonResponse(true, 'Esercizio aggiornato', data)
  } catch (err: any) {
    console.error('[API esercizi PUT]', err)
    return jsonResponse(false, err.message || 'Errore server', null, 500)
  }
}
