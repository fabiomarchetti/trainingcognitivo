'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, BarChart3, TrendingUp, Target,
  Loader2, CheckCircle, XCircle, Printer
} from 'lucide-react'
import jsPDF from 'jspdf'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

interface Utente { id: string; nome: string; cognome: string }

interface StatSessione {
  progressivo: number
  data: string
  target: number
  errori: number
  totale: number
  percentuale: number
  tempo_medio_ms: number
}

interface StatGenerali {
  totale_sessioni: number
  totale_target: number
  totale_errori: number
  percentuale: number
  tempo_medio_ms: number
}

function StatisticheContent() {
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')
  const supabase = createClient()

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState(userIdParam || '')
  const [selectedUserName, setSelectedUserName] = useState('')

  const [sessioni, setSessioni] = useState<StatSessione[]>([])
  const [generali, setGenerali] = useState<StatGenerali | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadUtenti() }, [])
  useEffect(() => { if (selectedUserId) loadStatistiche() }, [selectedUserId])

  const loadUtenti = async () => {
    try {
      const { data: risultati } = await supabase.from('tocca_oggetto_risultati').select('id_utente')
      if (!risultati || risultati.length === 0) { setLoading(false); return }
      const ids = [...new Set(risultati.map((r: any) => r.id_utente))]
      const { data: profiles } = await supabase.from('profiles').select('id, nome, cognome').in('id', ids).order('cognome')
      setUtenti(profiles || [])
      if (userIdParam && profiles?.find((p: any) => p.id === userIdParam)) {
        const u = profiles?.find((p: any) => p.id === userIdParam)
        if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadStatistiche = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/esercizi/tocca-oggetto?action=get_statistiche&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setSessioni(data.data.sessioni || [])
        setGenerali(data.data.generali || null)
        const u = utenti.find(u => u.id === selectedUserId)
        if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
      }
    } catch (err) { console.error(err) }
    finally { setLoadingStats(false) }
  }

  const generatePDF = async () => {
    if (!generali) { alert('Nessun dato da esportare'); return }
    setGeneratingPdf(true)
    try {
      const doc = new jsPDF()
      const dataStr = new Date().toLocaleDateString('it-IT')
      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text('Statistiche - Tocca Oggetto', 105, 20, { align: 'center' })
      doc.setFontSize(12); doc.setFont('helvetica', 'normal')
      doc.text(`Utente: ${selectedUserName}`, 20, 35)
      doc.text(`Data: ${dataStr}`, 20, 43)
      doc.setFontSize(14); doc.setFont('helvetica', 'bold')
      doc.text('Riepilogo', 20, 58)
      doc.setFontSize(12); doc.setFont('helvetica', 'normal')
      doc.text(`Sessioni totali: ${generali.totale_sessioni}`, 20, 68)
      doc.setTextColor(0, 128, 0)
      doc.text(`Target colpiti: ${generali.totale_target} (${generali.percentuale}%)`, 20, 76)
      doc.setTextColor(255, 0, 0)
      doc.text(`Errori: ${generali.totale_errori}`, 20, 84)
      doc.setTextColor(0, 0, 0)
      doc.text(`Tempo medio risposta: ${Math.round(generali.tempo_medio_ms)}ms`, 20, 92)
      doc.setFontSize(8); doc.setTextColor(128, 128, 128)
      doc.text('TrainingCognitivo - Tocca Oggetto', 105, 290, { align: 'center' })
      doc.save(`tocca_oggetto_${selectedUserName.replace(/\s+/g, '_')}_${dataStr.replace(/\//g, '-')}.pdf`)
    } catch (err) { alert('Errore PDF') }
    finally { setGeneratingPdf(false) }
  }

  const pieData = generali ? [
    { name: 'Target', value: generali.totale_target },
    { name: 'Errori', value: generali.totale_errori },
  ] : []

  const barData = sessioni.slice(-10).map(s => ({
    name: `S${s.progressivo}`,
    Target: s.target,
    Errori: s.errori,
    '%': s.percentuale
  }))

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
      <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Statistiche
          </h1>
          <button
            onClick={generatePDF}
            disabled={!generali || generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 disabled:opacity-50"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            PDF
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione Utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <select
            value={selectedUserId}
            onChange={e => {
              setSelectedUserId(e.target.value)
              const u = utenti.find(u => u.id === e.target.value)
              if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
            }}
            className="w-full p-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none"
          >
            <option value="">-- Seleziona un utente --</option>
            {utenti.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
          </select>
        </section>

        {utenti.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-400">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Nessun dato. Esegui prima degli esercizi.</p>
          </div>
        )}

        {loadingStats && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          </div>
        )}

        {!loadingStats && selectedUserId && generali && (
          <>
            {/* Riepilogo */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-emerald-600">{generali.totale_sessioni}</div>
                <div className="text-sm text-gray-500 mt-1">Sessioni</div>
              </div>
              <div className="bg-emerald-50 rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-emerald-600">{generali.totale_target}</div>
                <div className="text-sm text-gray-500 mt-1">Target colpiti</div>
              </div>
              <div className="bg-red-50 rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{generali.totale_errori}</div>
                <div className="text-sm text-gray-500 mt-1">Errori</div>
              </div>
              <div className="bg-violet-50 rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-violet-600">{generali.percentuale}%</div>
                <div className="text-sm text-gray-500 mt-1">Precisione</div>
              </div>
            </section>

            {/* Grafici */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" /> Distribuzione
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </section>

              <section className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Ultime 10 sessioni
                </h3>
                <div ref={chartRef}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Target" fill="#10b981" />
                      <Bar dataKey="Errori" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Tabella sessioni */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Dettaglio Sessioni
              </h3>
              {sessioni.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Nessun dato</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50">
                        <th className="p-3 text-left text-emerald-700">Sessione</th>
                        <th className="p-3 text-left text-gray-600">Data</th>
                        <th className="p-3 text-center text-emerald-700">Target</th>
                        <th className="p-3 text-center text-red-700">Errori</th>
                        <th className="p-3 text-center text-violet-700">Precisione</th>
                        <th className="p-3 text-center text-gray-600">T.medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sessioni.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-700">#{s.progressivo}</td>
                          <td className="p-3 text-gray-500">{s.data}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                              <CheckCircle className="h-3 w-3" /> {s.target}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              <XCircle className="h-3 w-3" /> {s.errori}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${s.percentuale}%` }} />
                              </div>
                              <span className="font-bold text-emerald-600">{s.percentuale}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-gray-500">{Math.round(s.tempo_medio_ms)}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {!loadingStats && selectedUserId && !generali && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-400">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Nessun risultato per questo utente.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function StatistichePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50 flex items-center justify-center"><Loader2 className="h-12 w-12 text-emerald-500 animate-spin" /></div>}>
      <StatisticheContent />
    </Suspense>
  )
}
