/**
 * Comunicatore CAA - Statistiche
 *
 * Visualizzazione statistiche di utilizzo del comunicatore:
 * - Pittogrammi più usati
 * - Frequenza utilizzo per sessione
 * - Andamento temporale
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, BarChart3, TrendingUp, Clock, RefreshCw,
  Calendar, Download, Filter
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface StatItem {
  id_item: number
  titolo: string
  id_arasaac?: number
  utilizzi: number
}

interface SessioneStat {
  sessione: string
  data: string
  totale_utilizzi: number
}

export default function StatisticheComunicatorePage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [topItems, setTopItems] = useState<StatItem[]>([])
  const [sessioni, setSessioni] = useState<SessioneStat[]>([])
  const [totaleUtilizzi, setTotaleUtilizzi] = useState(0)
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

      // Query log con join agli items
      let query = supabaseRef.current
        .from('comunicatore_log')
        .select(`
          id_item,
          sessione,
          created_at,
          comunicatore_items!inner (
            id_item,
            titolo,
            id_arasaac,
            comunicatore_pagine!inner (
              id_utente
            )
          )
        `)
        .eq('comunicatore_items.comunicatore_pagine.id_utente', user.id)

      if (dataInizio) {
        query = query.gte('created_at', dataInizio.toISOString())
      }

      const { data: logData, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Calcola statistiche
      const itemCounts: { [key: number]: StatItem } = {}
      const sessionCounts: { [key: string]: { data: string; count: number } } = {}

      logData?.forEach((log: any) => {
        const item = log.comunicatore_items

        // Conta utilizzi per item
        if (!itemCounts[item.id_item]) {
          itemCounts[item.id_item] = {
            id_item: item.id_item,
            titolo: item.titolo,
            id_arasaac: item.id_arasaac,
            utilizzi: 0
          }
        }
        itemCounts[item.id_item].utilizzi++

        // Conta utilizzi per sessione
        if (!sessionCounts[log.sessione]) {
          sessionCounts[log.sessione] = {
            data: new Date(log.created_at).toLocaleDateString('it-IT'),
            count: 0
          }
        }
        sessionCounts[log.sessione].count++
      })

      // Ordina top items
      const sortedItems = Object.values(itemCounts)
        .sort((a, b) => b.utilizzi - a.utilizzi)
        .slice(0, 10)

      // Converti sessioni in array
      const sessioniArray: SessioneStat[] = Object.entries(sessionCounts)
        .map(([sessione, data]) => ({
          sessione: sessione.substring(0, 8),
          data: data.data,
          totale_utilizzi: data.count
        }))
        .slice(0, 20)

      setTopItems(sortedItems)
      setSessioni(sessioniArray)
      setTotaleUtilizzi(logData?.length || 0)

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
    const headers = ['Pittogramma', 'Utilizzi']
    const rows = topItems.map(item => [item.titolo, item.utilizzi.toString()])

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statistiche_comunicatore_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-700 font-medium">Caricamento statistiche...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/training_cognitivo/strumenti/comunicatore')}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Statistiche Comunicatore
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
              className="px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
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
            <Filter className="h-5 w-5 text-gray-500" />
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
                    ? 'bg-indigo-600 text-white'
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
          {/* Totale utilizzi */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Totale Utilizzi</p>
                <p className="text-3xl font-bold text-indigo-700">{totaleUtilizzi}</p>
              </div>
            </div>
          </div>

          {/* Pittogrammi usati */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Pittogrammi Usati</p>
                <p className="text-3xl font-bold text-emerald-700">{topItems.length}</p>
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
          {/* Top pittogrammi */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-indigo-100 p-4">
              <h2 className="font-bold text-indigo-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Pittogrammi Piu Usati
              </h2>
            </div>
            <div className="divide-y">
              {topItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nessun dato disponibile per il periodo selezionato
                </div>
              ) : (
                topItems.map((item, index) => {
                  const maxUtilizzi = topItems[0]?.utilizzi || 1
                  const percentage = (item.utilizzi / maxUtilizzi) * 100

                  return (
                    <div key={item.id_item} className="p-4 flex items-center gap-4">
                      <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      {item.id_arasaac && (
                        <img
                          src={`https://static.arasaac.org/pictograms/${item.id_arasaac}/${item.id_arasaac}_300.png`}
                          alt={item.titolo}
                          className="w-12 h-12 object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.titolo}</p>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-bold text-indigo-700">{item.utilizzi}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Sessioni recenti */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-emerald-100 p-4">
              <h2 className="font-bold text-emerald-800 flex items-center gap-2">
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
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Sessione {sessione.sessione}</p>
                        <p className="text-sm text-gray-500">{sessione.data}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                      {sessione.totale_utilizzi} click
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
