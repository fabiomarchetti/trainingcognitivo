/**
 * Pagina Statistiche Esercizio Scrivo Parole con le Lettere
 * Mostra grafici sull'andamento dell'utente
 */
'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, BarChart3, TrendingUp, Clock, Target,
  AlertTriangle, Loader2, Users, Printer, Type
} from 'lucide-react'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

interface Sessione {
  key: string
  progressivo: number
  data: string
  ora: string
  totale_prove: number
  corrette: number
  errate: number
  percentuale: number
  tempo_medio_ms: number
}

interface Riepilogo {
  totale_sessioni: number
  totale_prove: number
  percentuale_corrette: number
  tempo_medio_ms: number
}

interface ParolaDifficile {
  parola: string
  corrette: number
  errate: number
  totale: number
  percentuale_errore: number
}

interface Utente {
  id: string
  nome: string
  cognome: string
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

function StatisticheContent() {
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')
  const supabase = createClient()

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>(userIdParam || '')
  const [selectedUserName, setSelectedUserName] = useState<string>('')

  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [riepilogo, setRiepilogo] = useState<Riepilogo | null>(null)
  const [paroleDifficili, setParoleDifficili] = useState<ParolaDifficile[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs per catturare i grafici
  const chartAndamentoRef = useRef<HTMLDivElement>(null)
  const chartTempoRef = useRef<HTMLDivElement>(null)
  const chartPieRef = useRef<HTMLDivElement>(null)
  const chartParoleRef = useRef<HTMLDivElement>(null)

  // Carica utenti con risultati
  useEffect(() => {
    loadUtenti()
  }, [])

  // Carica statistiche quando cambia utente
  useEffect(() => {
    if (selectedUserId) {
      loadStatistiche()
    }
  }, [selectedUserId])

  const loadUtenti = async () => {
    try {
      // Utenti che hanno risultati
      const { data: risultati } = await supabase
        .from('scrivo_lettere_risultati')
        .select('id_utente')

      if (!risultati || risultati.length === 0) {
        setLoading(false)
        return
      }

      const userIds = [...new Set(risultati.map(r => r.id_utente))]

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, cognome')
        .in('id', userIds)
        .order('cognome')

      setUtenti(profiles || [])

      // Se c'è un userId nei parametri, selezionalo
      if (userIdParam && profiles?.find(p => p.id === userIdParam)) {
        setSelectedUserId(userIdParam)
        const user = profiles.find(p => p.id === userIdParam)
        if (user) {
          setSelectedUserName(`${user.nome} ${user.cognome}`)
        }
      }
    } catch (err) {
      console.error('Errore caricamento utenti:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistiche = async () => {
    if (!selectedUserId) return

    setLoadingStats(true)
    setError(null)

    try {
      const url = `/api/esercizi/scrivo-parole-lettere/statistiche?id_utente=${selectedUserId}`
      const response = await fetch(url)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message)
      }

      setSessioni(data.data.sessioni)
      setRiepilogo(data.data.riepilogo)
      setParoleDifficili(data.data.parole_difficili)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId)
    const user = utenti.find(u => u.id === userId)
    setSelectedUserName(user ? `${user.nome} ${user.cognome}` : '')
  }

  // Funzione helper per catturare un elemento come immagine
  const captureElement = async (element: HTMLElement): Promise<string | null> => {
    try {
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })
      return dataUrl
    } catch (err) {
      console.error('Errore cattura elemento:', err)
      return null
    }
  }

  // Genera PDF con i grafici
  const generatePDF = async () => {
    if (!selectedUserName || !riepilogo) return

    setGeneratingPdf(true)

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Data e ora corrente
      const now = new Date()
      const dataStr = now.toLocaleDateString('it-IT')
      const oraStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

      // Titolo
      pdf.setFontSize(20)
      pdf.setTextColor(219, 39, 119) // pink-600
      pdf.text('Statistiche Scrivo Parole con le Lettere', pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // Sottotitolo con nome utente
      pdf.setFontSize(14)
      pdf.setTextColor(107, 114, 128) // gray-500
      pdf.text(`Utente: ${selectedUserName}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 7
      pdf.setFontSize(10)
      pdf.text(`Generato il ${dataStr} alle ${oraStr}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 15

      // Box Riepilogo
      pdf.setFillColor(252, 231, 243) // pink-100
      pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 30, 3, 3, 'F')
      yPos += 8

      pdf.setFontSize(14)
      pdf.setTextColor(219, 39, 119)
      pdf.text('Riepilogo Generale', pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      pdf.setFontSize(12)
      pdf.setTextColor(60, 60, 60)
      const col1 = margin + 10
      const col2 = pageWidth / 2 + 10
      pdf.text(`Sessioni: ${riepilogo.totale_sessioni}`, col1, yPos)
      pdf.text(`Prove totali: ${riepilogo.totale_prove}`, col2, yPos)
      yPos += 7
      pdf.setTextColor(16, 185, 129) // green
      pdf.text(`Corrette: ${riepilogo.percentuale_corrette}%`, col1, yPos)
      pdf.setTextColor(249, 115, 22) // orange
      pdf.text(`Tempo medio: ${(riepilogo.tempo_medio_ms / 1000).toFixed(1)}s`, col2, yPos)
      yPos += 15

      // Cattura e inserisci i grafici
      const imgWidth = (pageWidth - (margin * 2) - 5) / 2
      const imgHeight = 55

      // Grafico 1: Andamento
      if (chartAndamentoRef.current) {
        const img1 = await captureElement(chartAndamentoRef.current)
        if (img1) {
          pdf.addImage(img1, 'PNG', margin, yPos, imgWidth, imgHeight)
        }
      }

      // Grafico 2: Tempo
      if (chartTempoRef.current) {
        const img2 = await captureElement(chartTempoRef.current)
        if (img2) {
          pdf.addImage(img2, 'PNG', margin + imgWidth + 5, yPos, imgWidth, imgHeight)
        }
      }

      yPos += imgHeight + 5

      // Grafico 3: Pie
      if (chartPieRef.current) {
        const img3 = await captureElement(chartPieRef.current)
        if (img3) {
          pdf.addImage(img3, 'PNG', margin, yPos, imgWidth, imgHeight)
        }
      }

      // Grafico 4: Parole difficili
      if (chartParoleRef.current) {
        const img4 = await captureElement(chartParoleRef.current)
        if (img4) {
          pdf.addImage(img4, 'PNG', margin + imgWidth + 5, yPos, imgWidth, imgHeight)
        }
      }

      yPos += imgHeight + 10

      // Nuova pagina per la tabella
      pdf.addPage()
      yPos = margin

      // Tabella dettaglio sessioni
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text('Dettaglio Sessioni', margin, yPos)
      yPos += 8

      // Header tabella
      pdf.setFontSize(9)
      pdf.setTextColor(255, 255, 255)
      pdf.setFillColor(219, 39, 119) // pink-600
      pdf.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F')
      pdf.text('#', margin + 5, yPos + 5)
      pdf.text('Data', margin + 20, yPos + 5)
      pdf.text('Prove', margin + 65, yPos + 5)
      pdf.text('OK', margin + 90, yPos + 5)
      pdf.text('Err', margin + 110, yPos + 5)
      pdf.text('%', margin + 130, yPos + 5)
      pdf.text('Tempo', margin + 150, yPos + 5)
      yPos += 7

      // Righe tabella
      pdf.setTextColor(60, 60, 60)
      sessioni.forEach((s, idx) => {
        if (yPos + 6 > pageHeight - margin) {
          pdf.addPage()
          yPos = margin
        }

        if (idx % 2 === 0) {
          pdf.setFillColor(243, 244, 246) // gray-100
          pdf.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F')
        }

        pdf.text(String(s.progressivo), margin + 5, yPos + 4)
        pdf.text(s.data || '-', margin + 20, yPos + 4)
        pdf.text(String(s.totale_prove), margin + 65, yPos + 4)
        pdf.text(String(s.corrette), margin + 90, yPos + 4)
        pdf.text(String(s.errate), margin + 110, yPos + 4)
        pdf.text(`${s.percentuale}%`, margin + 130, yPos + 4)
        pdf.text(`${(s.tempo_medio_ms / 1000).toFixed(1)}s`, margin + 150, yPos + 4)
        yPos += 6
      })

      // Parole difficili (se presenti)
      if (paroleDifficili.length > 0) {
        if (yPos + 30 > pageHeight - margin) {
          pdf.addPage()
          yPos = margin
        }

        yPos += 10
        pdf.setFontSize(14)
        pdf.setTextColor(239, 68, 68) // red
        pdf.text('Parole Difficili (più errori)', margin, yPos)
        yPos += 8

        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        paroleDifficili.slice(0, 10).forEach((p, idx) => {
          if (yPos + 6 > pageHeight - margin) {
            pdf.addPage()
            yPos = margin
          }
          pdf.text(`${idx + 1}. ${p.parola} - ${p.corrette} ok, ${p.errate} errori (${p.percentuale_errore}% errore)`, margin + 5, yPos)
          yPos += 6
        })
      }

      // Footer su tutte le pagine
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`TrainingCognitivo - Statistiche Scrivo Parole - Pagina ${i}/${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      }

      // Salva PDF
      const nomeUtente = selectedUserName.toLowerCase().replace(/\s+/g, '_')
      const dataFile = dataStr.replace(/\//g, '_')
      const nomeFile = `scrivo_parole_${nomeUtente}_${dataFile}.pdf`
      pdf.save(nomeFile)

    } catch (err) {
      console.error('Errore generazione PDF:', err)
      alert('Errore durante la generazione del PDF: ' + (err as Error).message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Dati per grafico andamento percentuale
  const dataAndamento = sessioni.map(s => ({
    nome: `#${s.progressivo}`,
    percentuale: s.percentuale
  }))

  // Dati per grafico tempo di risposta
  const dataTempo = sessioni.map(s => ({
    nome: `#${s.progressivo}`,
    tempo: Math.round(s.tempo_medio_ms / 1000 * 10) / 10
  }))

  // Dati per pie chart riepilogo
  const dataPie = riepilogo ? [
    { name: 'Corrette', value: riepilogo.percentuale_corrette },
    { name: 'Errate', value: 100 - riepilogo.percentuale_corrette }
  ] : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a
              href="/"
              className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors"
            >
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Statistiche Scrivo Parole
          </h1>

          {/* Bottone Stampa PDF */}
          {selectedUserId && sessioni.length > 0 && (
            <button
              onClick={generatePDF}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-white text-pink-700 font-bold rounded-lg hover:bg-pink-50 transition-colors shadow-md disabled:opacity-50"
              title="Stampa PDF"
            >
              {generatingPdf ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Printer className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">Stampa PDF</span>
            </button>
          )}
          {!selectedUserId && <div className="w-20" />}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtri */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Selezione utente */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                <Users className="inline h-4 w-4 mr-1" />
                Utente
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full p-3 border-2 border-pink-200 rounded-xl focus:border-pink-500 focus:outline-none"
                disabled={loading}
              >
                <option value="">-- Seleziona utente --</option>
                {utenti.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.cognome} {u.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 text-pink-500 animate-spin" />
          </div>
        ) : !selectedUserId ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BarChart3 className="h-16 w-16 text-pink-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Seleziona un utente per visualizzare le statistiche</p>
          </div>
        ) : loadingStats ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 text-pink-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-100 rounded-2xl p-6 text-red-700 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            {error}
          </div>
        ) : sessioni.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nessun risultato trovato per questo utente</p>
          </div>
        ) : (
          <>
            {/* Riepilogo Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                <Target className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-pink-700">{riepilogo?.totale_sessioni}</p>
                <p className="text-sm text-gray-500">Sessioni</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                <BarChart3 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-700">{riepilogo?.totale_prove}</p>
                <p className="text-sm text-gray-500">Prove totali</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-700">{riepilogo?.percentuale_corrette}%</p>
                <p className="text-sm text-gray-500">Corrette</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-orange-700">
                  {riepilogo ? (riepilogo.tempo_medio_ms / 1000).toFixed(1) : 0}s
                </p>
                <p className="text-sm text-gray-500">Tempo medio</p>
              </div>
            </div>

            {/* Grafici */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafico Andamento */}
              <div ref={chartAndamentoRef} className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Andamento % Corrette
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dataAndamento}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" fontSize={12} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="percentuale"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                      name="% Corrette"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Grafico Tempo */}
              <div ref={chartTempoRef} className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Tempo Medio Risposta (secondi)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dataTempo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}s`} />
                    <Legend />
                    <Bar dataKey="tempo" fill="#f59e0b" name="Tempo (s)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart Riepilogo */}
              <div ref={chartPieRef} className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-pink-500" />
                  Distribuzione Risposte
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dataPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {dataPie.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Parole Difficili */}
              <div ref={chartParoleRef} className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Parole Difficili (più errori)
                </h3>
                {paroleDifficili.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nessun errore registrato</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {paroleDifficili.map((p, idx) => (
                      <div key={p.parola} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm font-bold text-gray-400 w-6">{idx + 1}.</span>
                        <span className="flex-1 font-medium uppercase">{p.parola}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 text-sm">{p.corrette} ok</span>
                          <span className="text-red-600 text-sm">{p.errate} err</span>
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                            {p.percentuale_errore}% errore
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabella dettaglio sessioni */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Dettaglio Sessioni</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-pink-50">
                    <tr>
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Data</th>
                      <th className="text-center p-3">Prove</th>
                      <th className="text-center p-3">Corrette</th>
                      <th className="text-center p-3">Errate</th>
                      <th className="text-center p-3">%</th>
                      <th className="text-center p-3">Tempo Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessioni.map((s, idx) => (
                      <tr key={s.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-3 font-bold">{s.progressivo}</td>
                        <td className="p-3">{s.data} {s.ora?.substring(0, 5)}</td>
                        <td className="p-3 text-center">{s.totale_prove}</td>
                        <td className="p-3 text-center text-green-600 font-bold">{s.corrette}</td>
                        <td className="p-3 text-center text-red-600 font-bold">{s.errate}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded font-bold ${
                            s.percentuale >= 80 ? 'bg-green-100 text-green-700' :
                            s.percentuale >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.percentuale}%
                          </span>
                        </td>
                        <td className="p-3 text-center">{(s.tempo_medio_ms / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function StatistichePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-pink-500 animate-spin" />
      </div>
    }>
      <StatisticheContent />
    </Suspense>
  )
}
