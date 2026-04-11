/**
 * Numeri e Lettere - Pagina Esercizio
 *
 * L'utente seleziona un esercizio dalla lista e lo esegue:
 * - Griglia con celle guida (numero/lettera tratteggiato)
 * - Celle vuote in cui tracciare con dito/mouse
 * - Pulisci, scarica PDF, cambia esercizio
 */
'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Home, ArrowLeft, Settings, Eraser, FileText,
  Play, Loader2, RefreshCw, List
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { drawSimpleDashedChar } from '../lib/draw-chars'
import type { EsercizioNumeriLettere } from '../types'

interface Cella {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  tracciata: boolean
}

function EsercizioContent() {
  const searchParams = useSearchParams()
  const { user, isLoading: isAuthLoading } = useAuth()

  // ID utente selezionato (da querystring, altrimenti user corrente)
  const idUtenteParam = searchParams.get('utente') || user?.id || ''
  const idEsercizioParam = searchParams.get('id')

  const [esercizi, setEsercizi] = useState<EsercizioNumeriLettere[]>([])
  const [esercizioCorrente, setEsercizioCorrente] = useState<EsercizioNumeriLettere | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSelector, setShowSelector] = useState(false)

  const grigliaRef = useRef<HTMLDivElement>(null)
  const celleRef = useRef<Cella[]>([])
  const headerRef = useRef<HTMLDivElement>(null)
  const sessionStartRef = useRef<number>(Date.now())
  const sessionIdRef = useRef<string>('')

  // Carica esercizi disponibili per l'utente
  const loadEsercizi = useCallback(async () => {
    if (!idUtenteParam) return
    setLoading(true)
    try {
      const res = await fetch(`/api/esercizi/numeri-e-lettere?action=list_esercizi&id_utente=${idUtenteParam}`)
      const data = await res.json()
      if (data.success) {
        const lista: EsercizioNumeriLettere[] = data.data || []
        setEsercizi(lista)

        if (idEsercizioParam) {
          const found = lista.find(e => e.id === parseInt(idEsercizioParam))
          if (found) {
            setEsercizioCorrente(found)
          } else if (lista.length > 0) {
            setEsercizioCorrente(lista[0])
          } else {
            setShowSelector(true)
          }
        } else if (lista.length === 1) {
          setEsercizioCorrente(lista[0])
        } else if (lista.length > 1) {
          setShowSelector(true)
        } else {
          setShowSelector(true)
        }
      }
    } catch (err) {
      console.error('Errore caricamento esercizi:', err)
    } finally {
      setLoading(false)
    }
  }, [idUtenteParam, idEsercizioParam])

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) return
    loadEsercizi()
  }, [isAuthLoading, user, loadEsercizi])

  // Avvia nuova sessione quando cambia esercizio
  useEffect(() => {
    if (esercizioCorrente) {
      sessionStartRef.current = Date.now()
      sessionIdRef.current = `nel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
  }, [esercizioCorrente?.id])

  // Setup drawing su una cella specifica
  const setupDrawing = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, cella: Cella) => {
    let isDrawing = false
    let lastX = 0
    let lastY = 0

    const getCoords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      let clientX: number
      let clientY: number
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX
        clientY = (e as MouseEvent).clientY
      } else {
        return { x: 0, y: 0 }
      }
      return {
        x: (clientX - rect.left) * scaleX / 2,
        y: (clientY - rect.top) * scaleY / 2
      }
    }

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawing = true
      const c = getCoords(e)
      lastX = c.x
      lastY = c.y
      cella.tracciata = true
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return
      e.preventDefault()
      const c = getCoords(e)
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(c.x, c.y)
      ctx.stroke()
      lastX = c.x
      lastY = c.y
    }

    const endDraw = (e?: MouseEvent | TouchEvent) => {
      if (e) e.preventDefault()
      isDrawing = false
    }

    canvas.addEventListener('mousedown', startDraw)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', endDraw)
    canvas.addEventListener('mouseleave', endDraw)
    canvas.addEventListener('touchstart', startDraw, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', endDraw, { passive: false })
  }, [])

  // Genera la griglia quando cambia esercizio o dimensioni viewport
  const generateGrid = useCallback(() => {
    if (!esercizioCorrente || !grigliaRef.current) return

    const config = esercizioCorrente
    const colonne = config.colonne || 5
    const righe = config.righe || 4
    const righeGuida = config.righe_guida ?? 2
    const carattere = config.carattere

    const griglia = grigliaRef.current
    const headerHeight = 60
    const footerHeight = 70
    const exerciseHeaderHeight = headerRef.current?.offsetHeight || 80

    const isMobile = window.innerWidth <= 768
    const containerPadding = isMobile ? 10 : 20
    const gridContainerPadding = isMobile ? 10 : 20

    const availableWidth = window.innerWidth - containerPadding * 2 - gridContainerPadding * 2
    const availableHeight = window.innerHeight - headerHeight - footerHeight - exerciseHeaderHeight - containerPadding * 2 - 10

    const gap = isMobile ? 6 : 10
    const totalGapWidth = (colonne - 1) * gap
    const totalGapHeight = (righe - 1) * gap

    const maxCellByWidth = Math.floor((availableWidth - totalGapWidth) / colonne)
    const maxCellByHeight = Math.floor((availableHeight - totalGapHeight) / righe)
    const cellSize = Math.max(50, Math.min(maxCellByWidth, maxCellByHeight))

    griglia.style.gridTemplateColumns = `repeat(${colonne}, ${cellSize}px)`
    griglia.style.gridTemplateRows = `repeat(${righe}, ${cellSize}px)`
    griglia.style.gap = `${gap}px`
    griglia.innerHTML = ''
    celleRef.current = []

    const lineWidth = Math.max(4, Math.floor(cellSize / 20))

    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < colonne; c++) {
        const cellaDiv = document.createElement('div')
        cellaDiv.style.width = `${cellSize}px`
        cellaDiv.style.height = `${cellSize}px`
        cellaDiv.style.borderRadius = '8px'
        cellaDiv.style.background = 'white'
        cellaDiv.style.border = '2px solid #e9d5ff'
        cellaDiv.style.overflow = 'hidden'

        const canvas = document.createElement('canvas')
        canvas.width = cellSize * 2
        canvas.height = cellSize * 2
        canvas.style.width = `${cellSize}px`
        canvas.style.height = `${cellSize}px`
        canvas.style.display = 'block'
        canvas.style.touchAction = 'none'

        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        ctx.scale(2, 2)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#9333ea'
        ctx.lineWidth = lineWidth

        const cella: Cella = { canvas, ctx, tracciata: false }

        if (r < righeGuida || c === 0) {
          cellaDiv.style.background = '#f5f3ff'
          drawSimpleDashedChar(ctx, carattere, cellSize)
          ctx.setLineDash([])
          ctx.strokeStyle = '#9333ea'
          ctx.lineWidth = lineWidth
        }

        cellaDiv.appendChild(canvas)
        setupDrawing(canvas, ctx, cella)
        celleRef.current.push(cella)
        griglia.appendChild(cellaDiv)
      }
    }
  }, [esercizioCorrente, setupDrawing])

  // Rigenera griglia quando cambia esercizio
  useEffect(() => {
    if (esercizioCorrente) {
      const timer = setTimeout(() => generateGrid(), 50)
      return () => clearTimeout(timer)
    }
  }, [esercizioCorrente, generateGrid])

  // Resize handler
  useEffect(() => {
    const handler = () => {
      if (esercizioCorrente) generateGrid()
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [esercizioCorrente, generateGrid])

  const pulisciTutto = () => {
    if (confirm('Vuoi cancellare tutti i tracciati?')) {
      generateGrid()
    }
  }

  const salvaRisultato = async (pdfScaricato: boolean) => {
    if (!esercizioCorrente || !idUtenteParam) return
    const durata = Math.round((Date.now() - sessionStartRef.current) / 1000)
    const celleTracciate = celleRef.current.filter(c => c.tracciata).length
    const celleTotali = celleRef.current.length

    try {
      await fetch('/api/esercizi/numeri-e-lettere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_risultato',
          id_utente: idUtenteParam,
          id_esercizio: esercizioCorrente.id,
          nome_esercizio: esercizioCorrente.nome_esercizio,
          tipo: esercizioCorrente.tipo,
          carattere: esercizioCorrente.carattere,
          celle_tracciate: celleTracciate,
          celle_totali: celleTotali,
          durata_secondi: durata,
          pdf_scaricato: pdfScaricato,
          id_sessione: sessionIdRef.current
        })
      })
    } catch (err) {
      console.error('Errore salvataggio risultato:', err)
    }
  }

  const scaricaPDF = async () => {
    if (!esercizioCorrente) return
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'mm', 'a4')

      const viola: [number, number, number] = [147, 51, 234]
      const grigio: [number, number, number] = [100, 100, 100]

      // Header
      doc.setFillColor(...viola)
      doc.rect(0, 0, 210, 30, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Numeri e Lettere', 105, 15, { align: 'center' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`${esercizioCorrente.tipo === 'numero' ? 'Numero' : 'Lettera'}: ${esercizioCorrente.carattere}`, 105, 24, { align: 'center' })

      // Data e nome esercizio
      const now = new Date()
      doc.setTextColor(...grigio)
      doc.setFontSize(10)
      const infoText = `${now.toLocaleDateString('it-IT')} - ${now.toLocaleTimeString('it-IT')} | ${esercizioCorrente.nome_esercizio}`
      doc.text(infoText, 105, 40, { align: 'center' })

      // Carattere grande
      let yPos = 55
      doc.setTextColor(...viola)
      doc.setFontSize(60)
      doc.setFont('helvetica', 'bold')
      doc.text(esercizioCorrente.carattere, 30, yPos)

      if (esercizioCorrente.nome_carattere) {
        doc.setFontSize(24)
        doc.text(esercizioCorrente.nome_carattere, 60, yPos - 10)
      }

      yPos += 20

      // Griglia celle
      const colonne = esercizioCorrente.colonne || 5
      const righe = esercizioCorrente.righe || 4
      const cellSizeMM = Math.min(30, 180 / colonne, (270 - yPos) / righe)
      const startX = (210 - colonne * cellSizeMM) / 2
      const gap = 2

      for (let r = 0; r < righe; r++) {
        for (let c = 0; c < colonne; c++) {
          const idx = r * colonne + c
          const x = startX + c * (cellSizeMM + gap)
          const y = yPos + r * (cellSizeMM + gap)

          doc.setDrawColor(...viola)
          doc.setLineWidth(0.5)
          doc.rect(x, y, cellSizeMM, cellSizeMM)

          const cella = celleRef.current[idx]
          if (cella?.canvas) {
            try {
              const canvasData = cella.canvas.toDataURL('image/png')
              doc.addImage(canvasData, 'PNG', x + 0.5, y + 0.5, cellSizeMM - 1, cellSizeMM - 1)
            } catch (e) {
              console.warn('Errore cattura canvas cella', idx, e)
            }
          }
        }
      }

      // Footer
      doc.setTextColor(...grigio)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('Generato da TrainingCognitivo - Numeri e Lettere', 105, 285, { align: 'center' })

      const nomeFile = `pregrafismo_${esercizioCorrente.carattere}_${now.toISOString().slice(0, 10)}.pdf`
      doc.save(nomeFile)

      // Salva risultato con PDF scaricato
      salvaRisultato(true)
    } catch (error: any) {
      console.error('Errore PDF:', error)
      alert('Errore nella generazione del PDF: ' + (error?.message || 'errore sconosciuto'))
    }
  }

  const contaPittogrammi = () => {
    if (!esercizioCorrente || !esercizioCorrente.mostra_pittogrammi || !esercizioCorrente.pittogramma_url) return 0
    if (esercizioCorrente.tipo === 'numero' && /^[1-9]$/.test(esercizioCorrente.carattere)) {
      return parseInt(esercizioCorrente.carattere)
    }
    return 1
  }

  // --- Loading
  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-purple-700 font-bold">Caricamento esercizi...</p>
        </div>
      </div>
    )
  }

  // --- Nessun esercizio disponibile
  if (esercizi.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <List className="h-10 w-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-purple-700 mb-2">Nessun esercizio</h2>
          <p className="text-gray-600 mb-6">Non ci sono esercizi disponibili. Chiedi all'educatore di crearne uno.</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere/gestione"
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-violet-600 transition-all"
            >
              Area Educatore
            </Link>
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere"
              className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Torna indietro
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- Selettore esercizi
  if (showSelector || !esercizioCorrente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere"
              className="p-2 bg-white rounded-full shadow hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-purple-700" />
            </Link>
            <h1 className="text-2xl font-bold text-purple-800">Scegli Esercizio</h1>
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere/gestione"
              className="p-2 bg-white rounded-full shadow hover:shadow-md transition-shadow"
              title="Crea nuovo"
            >
              <Settings className="h-5 w-5 text-purple-700" />
            </Link>
          </div>

          <div className="grid gap-3">
            {esercizi.map(es => (
              <button
                key={es.id}
                onClick={() => {
                  setEsercizioCorrente(es)
                  setShowSelector(false)
                }}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 flex items-center gap-4 text-left hover:-translate-y-1 border-2 border-transparent hover:border-purple-300"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center text-4xl font-bold text-purple-700 shrink-0">
                  {es.carattere}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg">{es.nome_esercizio}</p>
                  <p className="text-sm text-gray-500">
                    {es.tipo === 'numero' ? 'Numero' : 'Lettera'}
                    {es.nome_carattere && ` · ${es.nome_carattere}`}
                    {' · '}{es.colonne}×{es.righe}
                  </p>
                </div>
                {es.pittogramma_url && (
                  <img src={es.pittogramma_url} alt="" className="w-12 h-12 object-contain" />
                )}
                <Play className="h-8 w-8 text-indigo-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- Esercizio attivo
  const nPittogrammi = contaPittogrammi()

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden touch-none">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg px-4 py-3">
        <div className="max-w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Home"
            >
              <Home className="h-5 w-5" />
            </Link>
          </div>
          <h1 className="text-lg font-bold truncate">{esercizioCorrente.nome_esercizio}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSelector(true)}
              className="px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm font-bold flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Cambia</span>
            </button>
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere/gestione"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Gestione"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Container esercizio */}
      <div className="fixed top-[60px] left-0 right-0 bottom-[70px] overflow-auto bg-white p-3">
        {/* Exercise header con carattere + pittogrammi */}
        <div
          ref={headerRef}
          className="flex items-center gap-4 p-3 mb-3 bg-gradient-to-r from-purple-100 to-violet-100 rounded-xl"
        >
          <div className="text-6xl md:text-7xl font-bold text-purple-700 leading-none min-w-[80px] text-center">
            {esercizioCorrente.carattere}
          </div>
          <div className="flex-1">
            {esercizioCorrente.nome_carattere && (
              <div className="text-2xl md:text-3xl text-violet-700 font-bold">
                {esercizioCorrente.nome_carattere}
              </div>
            )}
            {nPittogrammi > 0 && esercizioCorrente.pittogramma_url && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {Array.from({ length: nPittogrammi }).map((_, i) => (
                  <img
                    key={i}
                    src={esercizioCorrente.pittogramma_url!}
                    alt=""
                    className="w-10 h-10 md:w-12 md:h-12 object-contain bg-white rounded"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Griglia tracciato */}
        <div className="flex items-center justify-center">
          <div ref={grigliaRef} className="grid" />
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-purple-200 shadow-lg px-3 py-3">
        <div className="max-w-full flex items-center justify-around gap-2">
          <Link
            href="/training_cognitivo/pregrafismo/numeri-e-lettere"
            onClick={() => salvaRisultato(false)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors font-bold"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <button
            onClick={pulisciTutto}
            className="flex flex-col items-center gap-1 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-bold"
          >
            <Eraser className="h-5 w-5" />
            <span className="text-xs">Pulisci</span>
          </button>
          <button
            onClick={scaricaPDF}
            className="flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-lg hover:from-indigo-600 hover:to-sky-600 transition-all font-bold shadow-md"
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">PDF</span>
          </button>
          <button
            onClick={() => setShowSelector(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-violet-700 hover:bg-violet-50 rounded-lg transition-colors font-bold"
          >
            <RefreshCw className="h-5 w-5" />
            <span className="text-xs">Cambia</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EsercizioNumeriLetterePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
      </div>
    }>
      <EsercizioContent />
    </Suspense>
  )
}
