/**
 * Segui il Tracciato - Statistiche
 *
 * Visualizza totali, precisione media e storico sessioni
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, BarChart3, Loader2,
  TrendingUp, Clock, CheckCircle, XCircle, Target
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface Utente {
  id: string
  nome: string
  cognome: string
}

interface StatGenerali {
  totale_sessioni: number
  completati: number
  percentuale_completamento: number
  precisione_media: number
  tempo_medio_ms: number
  errori_medi: number
}

interface Sessione {
  id: number
  nome_esercizio: string | null
  tempo_impiegato_ms: number
  precisione_percentuale: number
  errori_fuori_traccia: number
  ha_raggiunto_target: boolean
  completato: boolean
  data_creazione: string
}

export default function StatisticheSeguiTracciatoPage() {
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [statGenerali, setStatGenerali] = useState<StatGenerali | null>(null)
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [loadingStat, setLoadingStat] = useState(false)

  useEffect(() => {
    if (isAuthLoading || !user || hasLoadedRef.current) return
    loadCurrentUser()
  }, [isAuthLoading, user])

  useEffect(() => {
    if (selectedUserId) loadStatistiche()
  }, [selectedUserId])

  const loadCurrentUser = async () => {
    if (isLoadingRef.current || !user) return
    isLoadingRef.current = true
    try {
      const res = await fetch('/api/utenti/lista')
      const data = await res.json()
      if (!data.success) return
      const utentiList = data.data || []
      setUtenti(utentiList.map((p: any) => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))
      if (utentiList.length === 1) {
        setSelectedUserId(utentiList[0].id)
        setCurrentUserRole('utente')
      } else {
        setCurrentUserRole('staff')
      }
      hasLoadedRef.current = true
    } catch (err) {
      console.error('Errore caricamento utente:', err)
    } finally {
      isLoadingRef.current = false
    }
  }

  const loadStatistiche = async () => {
    setLoadingStat(true)
    try {
      const res = await fetch(`/api/esercizi/segui-il-tracciato?action=get_statistiche&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) {
        setStatGenerali(data.data?.generali || null)
        setSessioni(data.data?.sessioni || [])
      }
    } catch (err) {
      console.error('Errore caricamento statistiche:', err)
    } finally {
      setLoadingStat(false)
    }
  }

  const formatData = (iso: string): string => {
    const d = new Date(iso)
    return d.toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training_cognitivo/pregrafismo/segui-il-tracciato"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors">
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Statistiche
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-emerald-700 mb-4">Seleziona Utente</h2>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full p-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            disabled={currentUserRole === 'utente'}
          >
            <option value="">-- Seleziona un utente --</option>
            {utenti.map(u => (
              <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
            ))}
          </select>
        </section>

        {selectedUserId && (
          <>
            {loadingStat ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
              </div>
            ) : !statGenerali ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-400">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="font-bold text-lg">Nessuna sessione registrata</p>
                <p className="text-sm mt-2">L'utente non ha ancora svolto esercizi.</p>
              </div>
            ) : (
              <>
                {/* Totali */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500 font-semibold">Sessioni</p>
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-700">{statGenerali.totale_sessioni}</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500 font-semibold">Completati</p>
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-blue-700">
                      {statGenerali.completati}
                      <span className="text-sm text-gray-400 font-normal">
                        {' '}({statGenerali.percentuale_completamento}%)
                      </span>
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-violet-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500 font-semibold">Precisione media</p>
                      <Target className="h-5 w-5 text-violet-500" />
                    </div>
                    <p className="text-3xl font-bold text-violet-700">{statGenerali.precisione_media}%</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-teal-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500 font-semibold">Tempo medio</p>
                      <Clock className="h-5 w-5 text-teal-500" />
                    </div>
                    <p className="text-3xl font-bold text-teal-700">
                      {(statGenerali.tempo_medio_ms / 1000).toFixed(1)}s
                    </p>
                  </div>
                </section>

                {/* Storico sessioni */}
                <section className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-lg font-bold text-emerald-700 mb-4">Ultime sessioni</h2>
                  {sessioni.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Nessuna sessione</p>
                  ) : (
                    <div className="space-y-2">
                      {sessioni.map(s => (
                        <div
                          key={s.id}
                          className="flex items-center gap-4 p-3 rounded-xl border-2 border-gray-100 hover:border-emerald-200 transition-colors"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                            s.completato
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {s.completato ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 truncate">
                              {s.nome_esercizio || 'Sessione'}
                            </p>
                            <p className="text-xs text-gray-500">{formatData(s.data_creazione)}</p>
                          </div>
                          <div className="flex gap-4 text-right shrink-0">
                            <div>
                              <p className="text-xs text-gray-500">Precisione</p>
                              <p className="text-sm font-bold text-violet-700">{s.precisione_percentuale}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tempo</p>
                              <p className="text-sm font-bold text-teal-700">
                                {(s.tempo_impiegato_ms / 1000).toFixed(1)}s
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Errori</p>
                              <p className="text-sm font-bold text-orange-700">{s.errori_fuori_traccia}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
