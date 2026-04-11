/**
 * API per lettura categorie esercizi
 * Usa createAdminClient per bypassare RLS
 * GET /api/admin/categorie
 */
import { NextResponse } from 'next/server'
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
      .from('categorie_esercizi')
      .select('*')
      .order('ordine', { ascending: true })

    if (error) return jsonResponse(false, error.message, null, 500)

    return jsonResponse(true, 'OK', data)
  } catch (err: any) {
    console.error('[API categorie GET]', err)
    return jsonResponse(false, err.message || 'Errore server', null, 500)
  }
}
