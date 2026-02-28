/**
 * Statistiche - Cerca Categoria
 *
 * Mostra grafici e risultati aggregati per utente
 */
'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, BarChart3, TrendingUp, Target,
  Loader2, CheckCircle, XCircle, Printer
} from 'lucide-react'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

interface Utente { id: string; nome: string; cognome: string }

interface StatCategoria {
  categoria: string
  frase_tts: string
  corrette: number
  errate: number
  totale: number
  percentuale: number
}

interface StatGenerali {
  totale_click: number
  totale_corretti: number
  totale_errati: number
  totale_sessioni: number
  percentuale: number
}

const COLORS = ['#10b981', '#ef4444', '#6366f1', '#f59e0b', '#8b5cf6']

function StatisticheContent() {
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')
  const supabase = createClient()

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState(userIdParam || '')
  const [selectedUserName, setSelectedUserName] = useState('')

  const [statCategorie, setStatCategorie] = useState<StatCategoria[]>([])
  const [statGenerali, setStatGenerali] = useState<StatGenerali | null>(null)

  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const chartRef = useRef<HTMLDivElement>(null)
  const pieRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadUtenti() }, [])
  useEffect(() => { if (selectedUserId) loadStatistiche() }, [selectedUserId])

  const loadUtenti = async () => {
    try {
      const { data: risultati } = await supabase
        .from('cerca_categoria_risultati').select('id_utente')
      if (!risultati || risultati.length === 0) { setLoading(false); return }

      const ids = [...new Set(risultati.map((r: any) => r.id_utente))]
      const { data: profiles } = await supabase
        .from('profiles').select('id, nome, cognome').in('id', ids).order('cognome')
      setUtenti(profiles || [])

      if (userIdParam && profiles?.find((p: any) => p.id === userIdParam)) {
        setSelectedUserId(userIdParam)
        const u = profiles?.find((p: any) => p.id === userIdParam)
        if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
      }
    } catch (err) {
      console.error('Errore caricamento utenti:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistiche = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/esercizi/cerca-categoria?action=get_statistiche&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setStatCategorie(data.data.per_categoria || [])
        setStatGenerali(data.data.generali || null)
        const u = utenti.find(u => u.id === selectedUserId)
        if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
      }
    } catch (err) {
      console.error('Errore statistiche:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const generatePDF = async () => {
    if (!statGenerali) { alert('Nessun dato da esportare'); return }
    setGeneratingPdf(true)
    try {
      const doc = new jsPDF()
      const now = new Date()
      const dataStr = now.toLocaleDateString('it-IT')

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Statistiche - Cerca Categoria', 105, 20, { align: 'center' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Utente: ${selectedUserName}`, 20, 35)
      doc.text(`Data: ${dataStr}`, 20, 43)

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Riepilogo Generale', 20, 58)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Totale click: ${statGenerali.totale_click}`, 20, 68)
      doc.setTextColor(0, 128, 0)
      doc.text(`Corretti: ${statGenerali.totale_corretti} (${statGenerali.percentuale}%)`, 20, 76)
      doc.setTextColor(255, 0, 0)
      doc.text(`Errati: ${statGenerali.totale_errati}`, 20, 84)
      doc.setTextColor(0, 0, 0)
      doc.text(`Sessioni: ${statGenerali.totale_sessioni}`, 20, 92)

      // Cattura grafici
      if (chartRef.current) {
        try {
          const img = await toPng(chartRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' })
          doc.addPage()
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text('Grafico per Categoria', 20, 20)
          doc.addImage(img, 'PNG', 10, 30, 190, 100)
        } catch {}
      }

      // Per categoria
      if (statCategorie.length > 0) {
        doc.addPage()
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Dettaglio per Categoria', 20, 20)
        let yPos = 35
        statCategorie.forEach(s => {
          if (yPos > 270) { doc.addPage(); yPos = 20 }
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text(s.frase_tts, 20, yPos)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(0, 128, 0)
          doc.text(`✓ ${s.corrette} corretti (${s.percentuale}%)`, 30, yPos + 7)
          doc.setTextColor(255, 0, 0)
          doc.text(`✗ ${s.errate} errati`, 100, yPos + 7)
          doc.setTextColor(0, 0, 0)
          yPos += 18
        })
      }

      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text('TrainingCognitivo - Cerca Categoria', 105, 290, { align: 'center' })
      doc.save(`cerca_categoria_${selectedUserName.replace(/\s+/g, '_')}_${dataStr.replace(/\//g, '-')}.pdf`)
    } catch (err) {
      console.error('Errore PDF:', err)
      alert('Errore nella generazione del PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const pieData = statGenerali ? [
    { name: 'Corretti', value: statGenerali.totale_corretti },
    { name: 'Errati', value: statGenerali.totale_errati },
  ] : []

  const barData = statCategorie.map(s => ({
    name: s.frase_tts.length > 20 ? s.frase_tts.substring(0, 20) + '...' : s.frase_tts,
    fullName: s.frase_tts,
    Corretti: s.corrette,
    Errati: s.errate,
    '%': s.percentuale
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      <header className="bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/training_cognitivo/categorizzazione/cerca-categoria" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Statistiche
          </h1>
          <button
            onClick={generatePDF}
            disabled={!statGenerali || generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white text-violet-700 font-bold rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            PDF
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione Utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={selectedUserId}
              onChange={e => {
                setSelectedUserId(e.target.value)
                const u = utenti.find(u => u.id === e.target.value)
                if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
              }}
              className="flex-1 p-3 border-2 border-violet-200 rounded-lg focus:border-violet-500 focus:outline-none"
            >
              <option value="">-- Seleziona un utente --</option>
              {utenti.map(u => (
                <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
              ))}
            </select>
          </div>
        </section>

        {utenti.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-400">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Nessun dato disponibile. Esegui prima degli esercizi.</p>
          </div>
        )}

        {loadingStats && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
          </div>
        )}

        {!loadingStats && selectedUserId && statGenerali && (
          <>
            {/* Riepilogo Generale */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-violet-600">{statGenerali.totale_click}</div>
                <div className="text-sm text-gray-500 mt-1">Click Totali</div>
              </div>
              <div className="bg-green-50 rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{statGenerali.totale_corretti}</div>
                <div className="text-sm text-gray-500 mt-1">Corretti</div>
              </div>
              <div className="bg-red-50 rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{statGenerali.totale_errati}</div>
                <div className="text-sm text-gray-500 mt-1">Errati</div>
              </div>
              <div className="bg-indigo-50 rounded-2xl shadow-lg p-6 text-center">
                <div className="text-3xl font-bold text-indigo-600">{statGenerali.percentuale}%</div>
                <div className="text-sm text-gray-500 mt-1">Precisione</div>
              </div>
            </section>

            {/* Grafici */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafico torta */}
              <section className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-violet-700 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Distribuzione Risposte
                </h3>
                <div ref={pieRef}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Grafico per categoria */}
              <section className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-violet-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Per Categoria
                </h3>
                <div ref={chartRef}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip formatter={(val, name, props) => [val, name]} labelFormatter={(label) => {
                        const item = barData.find(d => d.name === label)
                        return item?.fullName || label
                      }} />
                      <Legend />
                      <Bar dataKey="Corretti" fill="#10b981" />
                      <Bar dataKey="Errati" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Tabella per categoria */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-violet-700 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Dettaglio per Categoria
              </h3>
              {statCategorie.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Nessun dato</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-violet-50">
                        <th className="p-3 text-left font-semibold text-violet-700">Esercizio</th>
                        <th className="p-3 text-center font-semibold text-green-700">Corretti</th>
                        <th className="p-3 text-center font-semibold text-red-700">Errati</th>
                        <th className="p-3 text-center font-semibold text-gray-700">Totale</th>
                        <th className="p-3 text-center font-semibold text-indigo-700">Precisione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {statCategorie.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-800">{s.frase_tts}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <CheckCircle className="h-3 w-3" /> {s.corrette}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              <XCircle className="h-3 w-3" /> {s.errate}
                            </span>
                          </td>
                          <td className="p-3 text-center text-gray-600">{s.totale}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-indigo-500"
                                  style={{ width: `${s.percentuale}%` }}
                                />
                              </div>
                              <span className="font-bold text-indigo-600">{s.percentuale}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {!loadingStats && selectedUserId && !statGenerali && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-400">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Nessun risultato trovato per questo utente.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function StatistichePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-violet-500 animate-spin" />
      </div>
    }>
      <StatisticheContent />
    </Suspense>
  )
}
