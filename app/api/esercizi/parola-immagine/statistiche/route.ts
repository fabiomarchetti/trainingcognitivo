/**
 * API Statistiche Esercizio Parola-Immagine
 * Recupera dati aggregati per i grafici
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idUtente = searchParams.get('id_utente')
    const tipoEsercizio = searchParams.get('tipo_esercizio') // parola-immagine o immagine-parola

    if (!idUtente) {
      return NextResponse.json({
        success: false,
        message: 'id_utente obbligatorio'
      }, { status: 400 })
    }

    // Query base
    let query = supabaseAdmin
      .from('parola_immagine_risultati')
      .select('*')
      .eq('id_utente', idUtente)
      .order('progressivo_esercizio', { ascending: true })
      .order('numero_prova', { ascending: true })

    if (tipoEsercizio) {
      query = query.eq('tipo_esercizio', tipoEsercizio)
    }

    const { data: risultati, error } = await query

    if (error) {
      throw error
    }

    if (!risultati || risultati.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          sessioni: [],
          riepilogo: {
            totale_sessioni: 0,
            totale_prove: 0,
            percentuale_corrette: 0,
            tempo_medio_ms: 0
          },
          parole_difficili: []
        }
      })
    }

    // Raggruppa per sessione (progressivo_esercizio + tipo_esercizio)
    const sessioniMap = new Map<string, any[]>()

    risultati.forEach(r => {
      const key = `${r.tipo_esercizio}_${r.progressivo_esercizio}`
      if (!sessioniMap.has(key)) {
        sessioniMap.set(key, [])
      }
      sessioniMap.get(key)!.push(r)
    })

    // Calcola statistiche per ogni sessione
    const sessioni = Array.from(sessioniMap.entries()).map(([key, prove]) => {
      const corrette = prove.filter(p => p.esito === 'corretto').length
      const totale = prove.length
      const percentuale = Math.round((corrette / totale) * 100)

      const tempiValidi = prove.filter(p => p.tempo_risposta_ms).map(p => p.tempo_risposta_ms)
      const tempoMedio = tempiValidi.length > 0
        ? Math.round(tempiValidi.reduce((a, b) => a + b, 0) / tempiValidi.length)
        : 0

      const prima = prove[0]

      return {
        key,
        tipo_esercizio: prima.tipo_esercizio,
        progressivo: prima.progressivo_esercizio,
        data: prima.data_esercizio,
        ora: prima.ora_esercizio,
        totale_prove: totale,
        corrette,
        errate: totale - corrette,
        percentuale,
        tempo_medio_ms: tempoMedio
      }
    })

    // Ordina per data e progressivo
    sessioni.sort((a, b) => {
      if (a.tipo_esercizio !== b.tipo_esercizio) {
        return a.tipo_esercizio.localeCompare(b.tipo_esercizio)
      }
      return a.progressivo - b.progressivo
    })

    // Riepilogo generale
    const totaleCorrette = risultati.filter(r => r.esito === 'corretto').length
    const tempiTotali = risultati.filter(r => r.tempo_risposta_ms).map(r => r.tempo_risposta_ms)

    const riepilogo = {
      totale_sessioni: sessioni.length,
      totale_prove: risultati.length,
      percentuale_corrette: Math.round((totaleCorrette / risultati.length) * 100),
      tempo_medio_ms: tempiTotali.length > 0
        ? Math.round(tempiTotali.reduce((a, b) => a + b, 0) / tempiTotali.length)
        : 0
    }

    // Parole più difficili (con più errori)
    const paroleMap = new Map<string, { corrette: number; errate: number }>()

    risultati.forEach(r => {
      const parola = r.parola_target
      if (!paroleMap.has(parola)) {
        paroleMap.set(parola, { corrette: 0, errate: 0 })
      }
      const stats = paroleMap.get(parola)!
      if (r.esito === 'corretto') {
        stats.corrette++
      } else {
        stats.errate++
      }
    })

    const parole_difficili = Array.from(paroleMap.entries())
      .map(([parola, stats]) => ({
        parola,
        corrette: stats.corrette,
        errate: stats.errate,
        totale: stats.corrette + stats.errate,
        percentuale_errore: Math.round((stats.errate / (stats.corrette + stats.errate)) * 100)
      }))
      .filter(p => p.errate > 0) // Solo parole con almeno un errore
      .sort((a, b) => b.percentuale_errore - a.percentuale_errore)
      .slice(0, 10) // Top 10 più difficili

    return NextResponse.json({
      success: true,
      data: {
        sessioni,
        riepilogo,
        parole_difficili
      }
    })

  } catch (error: any) {
    console.error('Errore API statistiche:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Errore durante il recupero statistiche'
    }, { status: 500 })
  }
}
