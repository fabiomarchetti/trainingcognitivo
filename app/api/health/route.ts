/**
 * Health Check Endpoint
 * Chiamato periodicamente da Vercel Cron per mantenere attivo il progetto Supabase
 * Esegue una query leggera per evitare la pausa automatica del piano free
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Query leggera per tenere attivo Supabase
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        { status: 'error', message: error.message, timestamp: new Date().toISOString() },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      profiles: count,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
