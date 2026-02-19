/**
 * Ascolto la Musica - Statistiche
 *
 * Visualizzazione statistiche di ascolto:
 * - Brani piu ascoltati
 * - Sessioni di ascolto
 * - Andamento temporale
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, BarChart3, TrendingUp, Clock, RefreshCw,
  Music, Calendar, Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface BranoStat {
  id_brano: number
  nome_brano: string
  categoria: string
  ascolti: number
}

interface SessioneStat {
  sessione: string
  data: string
  totale_ascolti: number
}

export default function StatisticheAscoltoMusicaPage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [topBrani, setTopBrani] = useState<BranoStat[]>([])
  const [sessioni, setSessioni] = useState<SessioneStat[]>([])
  const [totaleAscolti, setTotaleAscolti] = useState(0)
  const [periodoFiltro, setPeriodoFiltro] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const isLoadingRef = useRef(false)

  const loadStatistiche = useCallback(async () => {
    if (!user || isLoadingRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      // Calcola data inizio filtro
      let dataInizio: Date | null = null
      const now = new Date()

      switch (periodoFiltro) {
        case '7d':
          dataInizio = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          dataInizio = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          dataInizio = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          dataInizio = null
      }

      // Query log con join ai brani
      let query = supabaseRef.current
        .from('ascolto_musica_log')
        .select(`
          id_brano,
          sessione,
          created_at,
          ascolto_musica_brani!inner (
            id_brano,
            nome_brano,
            categoria,
            id_utente
          )
        `)
        .eq('ascolto_musica_brani.id_utente', user.id)

      if (dataInizio) {
        query = query.gte('created_at', dataInizio.toISOString())
      }

      const { data: logData, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Calcola statistiche
      const braniCounts: { [key: number]: BranoStat } = {}
      const sessionCounts: { [key: string]: { data: string; count: number } } = {}

      logData?.forEach((log: any) => {
        const brano = log.ascolto_musica_brani

        // Conta ascolti per brano
        if (!braniCounts[brano.id_brano]) {
          braniCounts[brano.id_brano] = {
            id_brano: brano.id_brano,
            nome_brano: brano.nome_brano,
            categoria: brano.categoria,
            ascolti: 0
          }
        }
        braniCounts[brano.id_brano].ascolti++

        // Conta per sessione
        if (!sessionCounts[log.sessione]) {
          sessionCounts[log.sessione] = {
            data: new Date(log.created_at).toLocaleDateString('it-IT'),
            count: 0
          }
        }
        sessionCounts[log.sessione].count++
      })

      // Ordina top brani
      const sortedBrani = Object.values(braniCounts)
        .sort((a, b) => b.ascolti - a.ascolti)
        .slice(0, 10)

      // Converti sessioni in array
      const sessioniArray: SessioneStat[] = Object.entries(sessionCounts)
        .map(([sessione, data]) => ({
          sessione: sessione.substring(0, 8),
          data: data.data,
          totale_ascolti: data.count
        }))
        .slice(0, 20)

      setTopBrani(sortedBrani)
      setSessioni(sessioniArray)
      setTotaleAscolti(logData?.length || 0)

    } catch (err) {
      console.error('Errore caricamento statistiche:', err)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [user, periodoFiltro])

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadStatistiche()
    }
  }, [isAuthLoading, user, loadStatistiche])

  // Esporta CSV
  const exportCSV = () => {
    const headers = ['Brano', 'Categoria', 'Ascolti']
    const rows = topBrani.map(brano => [brano.nome_brano, brano.categoria, brano.ascolti.toString()])

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statistiche_ascolto_musica_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Caricamento statistiche...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-700">
      {/* Header */}
      <header className="bg-emerald-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/training_cognitivo/strumenti/ascolto-la-musica')}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Statistiche Ascolto
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStatistiche}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Aggiorna"
            >
              <RefreshCw className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Esporta CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Filtro periodo */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Periodo:</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: '7d', label: '7 giorni' },
              { value: '30d', label: '30 giorni' },
              { value: '90d', label: '90 giorni' },
              { value: 'all', label: 'Tutto' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setPeriodoFiltro(option.value as any)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${periodoFiltro === option.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Totale ascolti */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Totale Ascolti</p>
                <p className="text-3xl font-bold text-emerald-700">{totaleAscolti}</p>
              </div>
            </div>
          </div>

          {/* Brani ascoltati */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center">
                <Music className="h-7 w-7 text-violet-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Brani Diversi</p>
                <p className="text-3xl font-bold text-violet-700">{topBrani.length}</p>
              </div>
            </div>
          </div>

          {/* Sessioni */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Sessioni</p>
                <p className="text-3xl font-bold text-amber-700">{sessioni.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top brani */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-emerald-100 p-4">
              <h2 className="font-bold text-emerald-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Brani Piu Ascoltati
              </h2>
            </div>
            <div className="divide-y">
              {topBrani.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nessun dato disponibile per il periodo selezionato
                </div>
              ) : (
                topBrani.map((brano, index) => {
                  const maxAscolti = topBrani[0]?.ascolti || 1
                  const percentage = (brano.ascolti / maxAscolti) * 100

                  return (
                    <div key={brano.id_brano} className="p-4 flex items-center gap-4">
                      <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{brano.nome_brano}</p>
                        <p className="text-sm text-gray-500">{brano.categoria}</p>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-bold text-emerald-700">{brano.ascolti}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Sessioni recenti */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-violet-100 p-4">
              <h2 className="font-bold text-violet-800 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sessioni Recenti
              </h2>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {sessioni.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nessuna sessione registrata
                </div>
              ) : (
                sessioni.map((sessione, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Sessione {sessione.sessione}</p>
                        <p className="text-sm text-gray-500">{sessione.data}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full font-bold">
                      {sessione.totale_ascolti} ascolti
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
