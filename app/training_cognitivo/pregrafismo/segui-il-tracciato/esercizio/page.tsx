/**
 * Segui il Tracciato - Pagina Esercizio
 *
 * L'utente:
 * - Seleziona un esercizio (se piu' di uno)
 * - Vede oggetto, target e tracciato guida
 * - Disegna con dito/mouse seguendo il percorso
 * - Verifica: precisione, errori, completamento
 */
'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Home, ArrowLeft, Settings, Eraser, CheckCircle, XCircle,
  Play, Loader2, RefreshCw, Target as TargetIcon, Clock, TrendingUp
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import type { EsercizioSeguiTracciato, RisultatoSeguiTracciato } from '../types'
import {
  percentToPixelOggetto,
  percentToPixelTracciato,
  verificaTracciato,
  type OggettoPx,
  type Punto
} from '../lib/tracciato-math'

function EsercizioContent() {
  const searchParams = useSearchParams()
  const { user, isLoading: isAuthLoading } = useAuth()

  const idUtenteParam = searchParams.get('utente') || user?.id || ''
  const idEsercizioParam = searchParams.get('id')

  const [esercizi, setEsercizi] = useState<EsercizioSeguiTracciato[]>([])
  const [esercizioCorrente, setEsercizioCorrente] = useState<EsercizioSeguiTracciato | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSelector, setShowSelector] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 })

  // Dati esercizio in pixel
  const oggettoRef = useRef<OggettoPx | null>(null)
  const targetRef = useRef<OggettoPx | null>(null)
  const tracciatoRef = useRef<Punto[]>([])
  const tolleranzaRef = useRef(30)
  const tracciatoColorRef = useRef('#9ca3af')
  const tracciatoWidthRef = useRef(8)

  // Stato disegno utente
  const puntiUtenteRef = useRef<Punto[]>([])
  const isDrawingRef = useRef(false)
  const startTimeRef = useRef<number>(0)
  const endTimeRef = useRef<number>(0)
  const sessionIdRef = useRef('')

  // Cache immagini
  const imageCache = useRef<Record<string, HTMLImageElement>>({})

  // Risultato
  const [risultato, setRisultato] = useState<RisultatoSeguiTracciato | null>(null)

  // -------- Caricamento esercizi --------
  const loadEsercizi = useCallback(async () => {
    if (!idUtenteParam) return
    setLoading(true)
    try {
      const res = await fetch(`/api/esercizi/segui-il-tracciato?action=list_esercizi&id_utente=${idUtenteParam}`)
      const data = await res.json()
      if (data.success) {
        const lista: EsercizioSeguiTracciato[] = data.data || []
        setEsercizi(lista)

        if (idEsercizioParam) {
          const found = lista.find(e => e.id === parseInt(idEsercizioParam))
          if (found) setEsercizioCorrente(found)
          else if (lista.length > 0) setEsercizioCorrente(lista[0])
          else setShowSelector(true)
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
    if (isAuthLoading || !user) return
    loadEsercizi()
  }, [isAuthLoading, user, loadEsercizi])

  // -------- Redraw canvas --------
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Sfondo
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const oggetto = oggettoRef.current
    const target = targetRef.current
    const tracciato = tracciatoRef.current

    // Tracciato guida
    if (oggetto && target) {
      ctx.save()
      ctx.setLineDash([15, 10])
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (tracciato.length > 1) {
        ctx.strokeStyle = tracciatoColorRef.current
        ctx.lineWidth = tracciatoWidthRef.current
        ctx.beginPath()
        ctx.moveTo(tracciato[0].x, tracciato[0].y)
        for (let i = 1; i < tracciato.length; i++) {
          ctx.lineTo(tracciato[i].x, tracciato[i].y)
        }
        ctx.stroke()
      } else {
        // Fallback linea retta
        ctx.strokeStyle = '#9ca3af'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(oggetto.x + oggetto.size / 2, oggetto.y + oggetto.size / 2)
        ctx.lineTo(target.x + target.size / 2, target.y + target.size / 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Disegna oggetto e target
    const drawItem = (item: OggettoPx | null) => {
      if (!item) return
      const img = imageCache.current[item.imageUrl]
      if (img) {
        ctx.drawImage(img, item.x, item.y, item.size, item.size)
      }
      ctx.strokeStyle = item.isTarget ? '#10b981' : '#3b82f6'
      ctx.lineWidth = 3
      ctx.strokeRect(item.x, item.y, item.size, item.size)
      ctx.font = 'bold 14px sans-serif'
      ctx.fillStyle = item.isTarget ? '#10b981' : '#3b82f6'
      ctx.textAlign = 'center'
      ctx.fillText(
        item.isTarget ? 'TARGET' : 'OGGETTO',
        item.x + item.size / 2,
        item.y - 6
      )
    }

    drawItem(oggetto)
    drawItem(target)

    // Tracciato utente
    const punti = puntiUtenteRef.current
    if (punti.length > 1) {
      ctx.save()
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(punti[0].x, punti[0].y)
      for (let i = 1; i < punti.length; i++) {
        ctx.lineTo(punti[i].x, punti[i].y)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  // -------- Setup esercizio quando cambia --------
  const setupEsercizio = useCallback(() => {
    if (!esercizioCorrente) return
    const config = esercizioCorrente.configurazione
    if (!config) return

    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const width = container.clientWidth
    const height = Math.min(window.innerHeight - 220, 600)
    canvas.width = width
    canvas.height = height
    setCanvasSize({ width, height })

    // Converte percentuali in pixel
    oggettoRef.current = percentToPixelOggetto(config.oggetto, width, height)
    targetRef.current = percentToPixelOggetto(config.target, width, height)
    tracciatoRef.current = percentToPixelTracciato(config.tracciato || [], width, height)
    tolleranzaRef.current = config.tolleranza || 30
    tracciatoColorRef.current = config.tracciato_color || '#9ca3af'
    tracciatoWidthRef.current = config.tracciato_width || 8

    puntiUtenteRef.current = []
    setRisultato(null)
    startTimeRef.current = 0
    endTimeRef.current = 0
    sessionIdRef.current = `sit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Precarica immagini
    const precarica = (url: string) => {
      if (imageCache.current[url]) {
        drawCanvas()
        return
      }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        imageCache.current[url] = img
        drawCanvas()
      }
      img.src = url
    }
    precarica(config.oggetto.imageUrl)
    precarica(config.target.imageUrl)

    drawCanvas()
  }, [esercizioCorrente, drawCanvas])

  useEffect(() => {
    if (esercizioCorrente) {
      const timer = setTimeout(() => setupEsercizio(), 50)
      return () => clearTimeout(timer)
    }
  }, [esercizioCorrente, setupEsercizio])

  // Resize
  useEffect(() => {
    const handler = () => {
      if (esercizioCorrente) setupEsercizio()
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [esercizioCorrente, setupEsercizio])

  // -------- Gestione disegno utente --------
  const getCoords = (e: React.MouseEvent | React.TouchEvent): Punto => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    let clientX: number, clientY: number
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = e.clientX
      clientY = e.clientY
    } else {
      return { x: 0, y: 0 }
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (risultato) return
    isDrawingRef.current = true
    const p = getCoords(e)
    if (puntiUtenteRef.current.length === 0) {
      startTimeRef.current = Date.now()
    }
    puntiUtenteRef.current.push(p)
    drawCanvas()
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || risultato) return
    e.preventDefault()
    const p = getCoords(e)
    puntiUtenteRef.current.push(p)
    drawCanvas()
  }

  const handlePointerUp = () => {
    if (isDrawingRef.current && endTimeRef.current === 0) {
      endTimeRef.current = Date.now()
    }
    isDrawingRef.current = false
  }

  // -------- Pulisci --------
  const pulisci = () => {
    puntiUtenteRef.current = []
    startTimeRef.current = 0
    endTimeRef.current = 0
    setRisultato(null)
    drawCanvas()
  }

  // -------- Verifica e salva --------
  const verifica = async () => {
    if (!oggettoRef.current || !targetRef.current) return
    if (puntiUtenteRef.current.length < 10) {
      alert('Traccia una linea dall\'oggetto al target!')
      return
    }

    const end = endTimeRef.current || Date.now()
    const res = verificaTracciato(
      puntiUtenteRef.current,
      oggettoRef.current,
      targetRef.current,
      tracciatoRef.current,
      tolleranzaRef.current,
      startTimeRef.current,
      end
    )
    setRisultato(res)

    // Salva su DB
    if (esercizioCorrente && idUtenteParam) {
      try {
        await fetch('/api/esercizi/segui-il-tracciato', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_risultato',
            id_utente: idUtenteParam,
            id_esercizio: esercizioCorrente.id,
            nome_esercizio: esercizioCorrente.nome_esercizio,
            tempo_impiegato_ms: res.tempo_impiegato_ms,
            precisione_percentuale: res.precisione_percentuale,
            errori_fuori_traccia: res.errori_fuori_traccia,
            distanza_media: res.distanza_media,
            lunghezza_percorso: res.lunghezza_percorso,
            ha_raggiunto_target: res.ha_raggiunto_target,
            completato: res.completato,
            configurazione: esercizioCorrente.configurazione,
            tracciato_utente: puntiUtenteRef.current.map(p => ({
              x: p.x / canvasSize.width * 100,
              y: p.y / canvasSize.height * 100
            })),
            id_sessione: sessionIdRef.current
          })
        })
      } catch (err) {
        console.error('Errore salvataggio risultato:', err)
      }
    }
  }

  const ricomincia = () => {
    pulisci()
  }

  // -------- Render --------
  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-blue-700 font-bold">Caricamento esercizi...</p>
        </div>
      </div>
    )
  }

  if (esercizi.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TargetIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-blue-700 mb-2">Nessun esercizio</h2>
          <p className="text-gray-600 mb-6">Non ci sono esercizi disponibili. Chiedi all'educatore di crearne uno.</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/training_cognitivo/pregrafismo/segui-il-tracciato/gestione"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-sky-600 transition-all"
            >
              Area Educatore
            </Link>
            <Link
              href="/training_cognitivo/pregrafismo/segui-il-tracciato"
              className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Torna indietro
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (showSelector || !esercizioCorrente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/training_cognitivo/pregrafismo/segui-il-tracciato"
              className="p-2 bg-white rounded-full shadow hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-blue-700" />
            </Link>
            <h1 className="text-2xl font-bold text-blue-800">Scegli Esercizio</h1>
            <Link
              href="/training_cognitivo/pregrafismo/segui-il-tracciato/gestione"
              className="p-2 bg-white rounded-full shadow hover:shadow-md transition-shadow"
              title="Crea nuovo"
            >
              <Settings className="h-5 w-5 text-blue-700" />
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
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 flex items-center gap-4 text-left hover:-translate-y-1 border-2 border-transparent hover:border-blue-300"
              >
                {es.configurazione?.oggetto?.imageUrl && (
                  <img
                    src={es.configurazione.oggetto.imageUrl}
                    alt=""
                    className="w-16 h-16 object-contain border-2 border-blue-200 rounded-lg bg-white shrink-0"
                  />
                )}
                {es.configurazione?.target?.imageUrl && (
                  <img
                    src={es.configurazione.target.imageUrl}
                    alt=""
                    className="w-16 h-16 object-contain border-2 border-emerald-200 rounded-lg bg-white shrink-0"
                  />
                )}
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg">{es.nome_esercizio}</p>
                  <p className="text-sm text-gray-500">
                    {es.oggetto_keyword} → {es.target_keyword}
                  </p>
                </div>
                <Play className="h-8 w-8 text-indigo-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Esercizio attivo
  return (
    <div className="fixed inset-0 bg-white overflow-hidden touch-none">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-lg px-4 py-3">
        <div className="max-w-full flex items-center justify-between gap-3">
          <Link
            href="/training_cognitivo/pregrafismo/segui-il-tracciato"
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Home"
          >
            <Home className="h-5 w-5" />
          </Link>
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
              href="/training_cognitivo/pregrafismo/segui-il-tracciato/gestione"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Gestione"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="fixed top-[60px] left-0 right-0 bottom-[70px] overflow-hidden bg-white p-2"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full rounded-xl border-2 border-blue-100 cursor-crosshair"
          style={{ touchAction: 'none', height: '100%' }}
        />
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-blue-200 shadow-lg px-3 py-3">
        <div className="max-w-full flex items-center justify-around gap-2">
          <Link
            href="/training_cognitivo/pregrafismo/segui-il-tracciato"
            className="flex flex-col items-center gap-1 px-4 py-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-bold"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <button
            onClick={pulisci}
            className="flex flex-col items-center gap-1 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-bold"
          >
            <Eraser className="h-5 w-5" />
            <span className="text-xs">Pulisci</span>
          </button>
          <button
            onClick={verifica}
            disabled={!!risultato}
            className="flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all font-bold shadow-md disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-xs">Verifica</span>
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

      {/* Overlay risultato */}
      {risultato && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              {risultato.completato ? (
                <>
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-12 w-12 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-700 mb-1">Ottimo lavoro!</h2>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-12 w-12 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-orange-700 mb-1">Prova ancora!</h2>
                </>
              )}
              <p className="text-gray-600 text-sm">
                {risultato.completato
                  ? `Precisione: ${risultato.precisione_percentuale}%`
                  : !risultato.ha_raggiunto_target
                    ? 'Non hai raggiunto il target'
                    : 'Segui meglio la linea'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Precisione</p>
                <p className="text-lg font-bold text-blue-700">{risultato.precisione_percentuale}%</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <Clock className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Tempo</p>
                <p className="text-lg font-bold text-emerald-700">
                  {(risultato.tempo_impiegato_ms / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <XCircle className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Errori</p>
                <p className="text-lg font-bold text-orange-700">{risultato.errori_fuori_traccia}</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-3 text-center">
                <TargetIcon className="h-5 w-5 text-violet-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Target</p>
                <p className="text-lg font-bold text-violet-700">
                  {risultato.ha_raggiunto_target ? 'Sì' : 'No'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={ricomincia}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-sky-600 transition-all"
              >
                Ricomincia
              </button>
              <button
                onClick={() => setShowSelector(true)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                Cambia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EsercizioSeguiTracciatoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    }>
      <EsercizioContent />
    </Suspense>
  )
}
