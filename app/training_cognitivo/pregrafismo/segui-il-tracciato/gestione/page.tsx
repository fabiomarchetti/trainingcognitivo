/**
 * Area Educatore - Gestione esercizi Segui il Tracciato
 *
 * Flusso:
 * 1. Seleziona utente
 * 2. Cerca oggetto e target ARASAAC
 * 3. Posizionali sul canvas (drag)
 * 4. Disegna il tracciato personalizzato (opzionale)
 * 5. Configura tolleranza e nome
 * 6. Salva
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings, Search,
  Plus, Trash2, CheckCircle, Save, Image as ImageIcon, Loader2,
  Play, Target, Move, Pencil
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type {
  EsercizioSeguiTracciato, ConfigSeguiTracciato,
  OggettoPercent, PuntoPercent
} from '../types'

const ARASAAC_API = 'https://api.arasaac.org/api'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'

interface Utente {
  id: string
  nome: string
  cognome: string
}

interface PittogrammaRicerca {
  id: number
  url: string
  keyword: string
}

interface ItemCanvas {
  arasaac_id: number
  imageUrl: string
  keyword: string
  x: number
  y: number
  size: number
  isTarget: boolean
  image?: HTMLImageElement
}

const COLORI_TRACCIATO = ['#9ca3af', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const CANVAS_HEIGHT = 500

export default function GestioneSeguiTracciatoPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // Utente
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  // Form
  const [nomeEsercizio, setNomeEsercizio] = useState('')
  const [oggetto, setOggetto] = useState<ItemCanvas | null>(null)
  const [target, setTarget] = useState<ItemCanvas | null>(null)
  const [oggettoSize, setOggettoSize] = useState(120)
  const [targetSize, setTargetSize] = useState(120)
  const [tracciato, setTracciato] = useState<{ x: number; y: number }[]>([])
  const [tracciatoColor, setTracciatoColor] = useState('#9ca3af')
  const [tracciatoWidth, setTracciatoWidth] = useState(8)
  const [tolleranza, setTolleranza] = useState(30)

  // Ricerca ARASAAC
  const [searchOggetto, setSearchOggetto] = useState('')
  const [searchTarget, setSearchTarget] = useState('')
  const [resultsOggetto, setResultsOggetto] = useState<PittogrammaRicerca[]>([])
  const [resultsTarget, setResultsTarget] = useState<PittogrammaRicerca[]>([])
  const [loadingOggetto, setLoadingOggetto] = useState(false)
  const [loadingTarget, setLoadingTarget] = useState(false)

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: CANVAS_HEIGHT })
  const [modalita, setModalita] = useState<'posiziona' | 'tracciato'>('posiziona')

  // Drag state
  const draggingRef = useRef<'oggetto' | 'target' | null>(null)
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Disegno tracciato
  const isDrawingRef = useRef(false)

  // Esercizi esistenti
  const [esercizi, setEsercizi] = useState<EsercizioSeguiTracciato[]>([])
  const [loadingEsercizi, setLoadingEsercizi] = useState(false)

  // Salvataggio
  const [salvando, setSalvando] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Image cache
  const imageCache = useRef<Record<string, HTMLImageElement>>({})

  // -------- Inizializzazione utenti --------
  useEffect(() => {
    if (isAuthLoading || !user || hasLoadedRef.current) return
    loadCurrentUser()
  }, [isAuthLoading, user])

  useEffect(() => {
    if (selectedUserId) loadEsercizi()
  }, [selectedUserId])

  // -------- Debounce ricerche --------
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchOggetto.length >= 2) searchArasaac('oggetto', searchOggetto)
      else setResultsOggetto([])
    }, 400)
    return () => clearTimeout(t)
  }, [searchOggetto])

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTarget.length >= 2) searchArasaac('target', searchTarget)
      else setResultsTarget([])
    }, 400)
    return () => clearTimeout(t)
  }, [searchTarget])

  // -------- Resize canvas --------
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      const width = parent.clientWidth
      setCanvasSize({ width, height: CANVAS_HEIGHT })
      canvas.width = width
      canvas.height = CANVAS_HEIGHT
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // -------- Redraw canvas --------
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Sfondo leggero
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Tracciato di riferimento
    if (tracciato.length > 1) {
      ctx.save()
      ctx.setLineDash([15, 10])
      ctx.strokeStyle = tracciatoColor
      ctx.lineWidth = tracciatoWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(tracciato[0].x, tracciato[0].y)
      for (let i = 1; i < tracciato.length; i++) {
        ctx.lineTo(tracciato[i].x, tracciato[i].y)
      }
      ctx.stroke()
      ctx.restore()
    } else if (oggetto && target) {
      // Linea retta di default tra centri
      ctx.save()
      ctx.setLineDash([10, 5])
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(oggetto.x + oggetto.size / 2, oggetto.y + oggetto.size / 2)
      ctx.lineTo(target.x + target.size / 2, target.y + target.size / 2)
      ctx.stroke()
      ctx.restore()
    }

    // Disegna oggetto e target
    const drawItem = (item: ItemCanvas | null) => {
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
  }, [oggetto, target, tracciato, tracciatoColor, tracciatoWidth])

  // Precarica immagini quando cambiano oggetto/target
  useEffect(() => {
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
    if (oggetto?.imageUrl) precarica(oggetto.imageUrl)
    if (target?.imageUrl) precarica(target.imageUrl)
    drawCanvas()
  }, [oggetto, target, drawCanvas])

  useEffect(() => {
    drawCanvas()
  }, [tracciato, tracciatoColor, tracciatoWidth, canvasSize, drawCanvas])

  // -------- Aggiorna size oggetti quando cambia lo slider --------
  useEffect(() => {
    if (oggetto) {
      setOggetto(prev => prev ? { ...prev, size: oggettoSize } : null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oggettoSize])

  useEffect(() => {
    if (target) {
      setTarget(prev => prev ? { ...prev, size: targetSize } : null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSize])

  // -------- Helpers --------
  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

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
        setSelectedUserName(`${utentiList[0].nome} ${utentiList[0].cognome}`)
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

  const loadEsercizi = async () => {
    setLoadingEsercizi(true)
    try {
      const res = await fetch(`/api/esercizi/segui-il-tracciato?action=list_esercizi&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) setEsercizi(data.data || [])
    } catch (err) {
      console.error('Errore caricamento esercizi:', err)
    } finally {
      setLoadingEsercizi(false)
    }
  }

  const searchArasaac = async (tipo: 'oggetto' | 'target', query: string) => {
    const setLoading = tipo === 'oggetto' ? setLoadingOggetto : setLoadingTarget
    const setResults = tipo === 'oggetto' ? setResultsOggetto : setResultsTarget
    setLoading(true)
    try {
      const res = await fetch(`${ARASAAC_API}/pictograms/it/search/${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) { setResults([]); return }
      setResults(data.slice(0, 20).map((item: any) => ({
        id: item._id,
        url: `${ARASAAC_STATIC}/${item._id}/${item._id}_500.png`,
        keyword: item.keywords?.[0]?.keyword || query
      })))
    } catch (err) {
      console.error('Errore ARASAAC:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const selezionaOggetto = (pitto: PittogrammaRicerca, tipo: 'oggetto' | 'target') => {
    const item: ItemCanvas = {
      arasaac_id: pitto.id,
      imageUrl: pitto.url,
      keyword: pitto.keyword,
      size: tipo === 'oggetto' ? oggettoSize : targetSize,
      x: tipo === 'oggetto' ? 80 : Math.max(300, canvasSize.width - 200),
      y: tipo === 'oggetto' ? 180 : 180,
      isTarget: tipo === 'target'
    }
    if (tipo === 'oggetto') setOggetto(item)
    else setTarget(item)
  }

  // -------- Canvas Events --------
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
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

  const isInsideItem = (item: ItemCanvas, x: number, y: number) => {
    return x >= item.x && x <= item.x + item.size && y >= item.y && y <= item.y + item.size
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getCanvasCoords(e)

    if (modalita === 'posiziona') {
      if (target && isInsideItem(target, x, y)) {
        draggingRef.current = 'target'
        dragOffsetRef.current = { x: x - target.x, y: y - target.y }
      } else if (oggetto && isInsideItem(oggetto, x, y)) {
        draggingRef.current = 'oggetto'
        dragOffsetRef.current = { x: x - oggetto.x, y: y - oggetto.y }
      }
    } else if (modalita === 'tracciato') {
      isDrawingRef.current = true
      setTracciato([{ x, y }])
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoords(e)

    if (modalita === 'posiziona' && draggingRef.current) {
      e.preventDefault()
      const which = draggingRef.current
      const setter = which === 'oggetto' ? setOggetto : setTarget
      const current = which === 'oggetto' ? oggetto : target
      if (!current) return
      const newX = Math.max(0, Math.min(canvasSize.width - current.size, x - dragOffsetRef.current.x))
      const newY = Math.max(0, Math.min(canvasSize.height - current.size, y - dragOffsetRef.current.y))
      setter({ ...current, x: newX, y: newY })
    } else if (modalita === 'tracciato' && isDrawingRef.current) {
      e.preventDefault()
      setTracciato(prev => [...prev, { x, y }])
    }
  }

  const handlePointerUp = () => {
    draggingRef.current = null
    isDrawingRef.current = false
  }

  const pulisciTracciato = () => {
    setTracciato([])
  }

  // -------- Salvataggio --------
  const salvaEsercizio = async () => {
    if (!selectedUserId) { showToast('Seleziona un utente', 'warning'); return }
    if (!nomeEsercizio.trim()) { showToast('Inserisci un nome', 'warning'); return }
    if (!oggetto || !target) { showToast('Seleziona oggetto e target', 'warning'); return }
    if (salvando) return

    setSalvando(true)
    try {
      const w = canvasSize.width
      const h = canvasSize.height

      const oggettoPercent: OggettoPercent = {
        arasaac_id: oggetto.arasaac_id,
        imageUrl: oggetto.imageUrl,
        keywords: [oggetto.keyword],
        xPercent: (oggetto.x / w) * 100,
        yPercent: (oggetto.y / h) * 100,
        sizePercent: (oggetto.size / w) * 100,
        isTarget: false
      }

      const targetPercent: OggettoPercent = {
        arasaac_id: target.arasaac_id,
        imageUrl: target.imageUrl,
        keywords: [target.keyword],
        xPercent: (target.x / w) * 100,
        yPercent: (target.y / h) * 100,
        sizePercent: (target.size / w) * 100,
        isTarget: true
      }

      const tracciatoPercent: PuntoPercent[] = tracciato.map(p => ({
        xPercent: (p.x / w) * 100,
        yPercent: (p.y / h) * 100
      }))

      const configurazione: ConfigSeguiTracciato = {
        oggetto: oggettoPercent,
        target: targetPercent,
        tracciato: tracciatoPercent,
        tracciato_color: tracciatoColor,
        tracciato_width: tracciatoWidth,
        tolleranza,
        canvas_reference: { width: w, height: h },
        version: '1.0'
      }

      const res = await fetch('/api/esercizi/segui-il-tracciato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_esercizio',
          id_utente: selectedUserId,
          id_educatore: user?.id,
          nome_esercizio: nomeEsercizio.trim(),
          configurazione
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Esercizio creato!', 'success')
        // Reset parziale
        setNomeEsercizio('')
        setOggetto(null)
        setTarget(null)
        setTracciato([])
        setSearchOggetto('')
        setSearchTarget('')
        setResultsOggetto([])
        setResultsTarget([])
        loadEsercizi()
      } else {
        showToast(data.message || 'Errore salvataggio', 'error')
      }
    } catch (err) {
      showToast('Errore di connessione', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const deleteEsercizio = async (id: number) => {
    if (!confirm('Eliminare questo esercizio?')) return
    try {
      const res = await fetch('/api/esercizi/segui-il-tracciato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_esercizio', id_esercizio: id })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Esercizio eliminato', 'success')
        loadEsercizi()
      } else {
        showToast(data.message || 'Errore eliminazione', 'error')
      }
    } catch (err) {
      showToast('Errore di connessione', 'error')
    }
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage locale?')) return
    await supabase.auth.signOut()
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-sky-600 shadow-lg p-4">
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
            <Settings className="h-6 w-6" />
            Area Educatore
          </h1>
          <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title="Reset">
            <RotateCcw className="h-5 w-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Seleziona Utente
          </h2>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value)
              const u = utenti.find(u => u.id === e.target.value)
              if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
            }}
            className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
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
            {/* Crea esercizio */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-blue-700 mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crea Nuovo Esercizio
              </h2>

              {/* Nome */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Esercizio *</label>
                <input
                  type="text"
                  value={nomeEsercizio}
                  onChange={e => setNomeEsercizio(e.target.value)}
                  placeholder="Es: Dal gatto al topo"
                  className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  maxLength={150}
                />
              </div>

              {/* Ricerca oggetto e target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Oggetto */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <Move className="h-5 w-5" />
                    OGGETTO (partenza)
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchOggetto}
                      onChange={e => setSearchOggetto(e.target.value)}
                      placeholder="Cerca oggetto di partenza..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="h-32 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                    {loadingOggetto ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                      </div>
                    ) : resultsOggetto.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Inserisci almeno 2 caratteri...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {resultsOggetto.map(p => (
                          <div
                            key={p.id}
                            onClick={() => selezionaOggetto(p, 'oggetto')}
                            className={`cursor-pointer p-1 rounded-lg border-2 ${
                              oggetto?.arasaac_id === p.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-transparent hover:border-blue-300'
                            }`}
                          >
                            <img src={p.url} alt={p.keyword} className="w-full aspect-square object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Dimensione: {oggettoSize}px</label>
                    <input
                      type="range"
                      min={60}
                      max={200}
                      value={oggettoSize}
                      onChange={e => setOggettoSize(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>

                {/* Target */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <Target className="h-5 w-5" />
                    TARGET (arrivo)
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTarget}
                      onChange={e => setSearchTarget(e.target.value)}
                      placeholder="Cerca target di arrivo..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="h-32 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                    {loadingTarget ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                      </div>
                    ) : resultsTarget.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Inserisci almeno 2 caratteri...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {resultsTarget.map(p => (
                          <div
                            key={p.id}
                            onClick={() => selezionaOggetto(p, 'target')}
                            className={`cursor-pointer p-1 rounded-lg border-2 ${
                              target?.arasaac_id === p.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-transparent hover:border-emerald-300'
                            }`}
                          >
                            <img src={p.url} alt={p.keyword} className="w-full aspect-square object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Dimensione: {targetSize}px</label>
                    <input
                      type="range"
                      min={60}
                      max={200}
                      value={targetSize}
                      onChange={e => setTargetSize(parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Canvas + modalità */}
              {(oggetto || target) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setModalita('posiziona')}
                      className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                        modalita === 'posiziona'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Move className="h-4 w-4" />
                      Posiziona
                    </button>
                    <button
                      onClick={() => setModalita('tracciato')}
                      className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                        modalita === 'tracciato'
                          ? 'bg-violet-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Pencil className="h-4 w-4" />
                      Disegna Tracciato
                    </button>
                    {tracciato.length > 0 && (
                      <button
                        onClick={pulisciTracciato}
                        className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        Pulisci tracciato
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-2 border-2 border-gray-200">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handlePointerDown}
                      onMouseMove={handlePointerMove}
                      onMouseUp={handlePointerUp}
                      onMouseLeave={handlePointerUp}
                      onTouchStart={handlePointerDown}
                      onTouchMove={handlePointerMove}
                      onTouchEnd={handlePointerUp}
                      className="w-full rounded-lg cursor-crosshair"
                      style={{ touchAction: 'none', height: `${CANVAS_HEIGHT}px` }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {modalita === 'posiziona'
                      ? 'Trascina oggetto e target per posizionarli'
                      : 'Disegna il percorso che l\'utente dovrà seguire'}
                  </p>
                </div>
              )}

              {/* Colori e spessore tracciato */}
              {(oggetto || target) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Colore tracciato</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORI_TRACCIATO.map(col => (
                        <button
                          key={col}
                          onClick={() => setTracciatoColor(col)}
                          className={`w-8 h-8 rounded-full border-4 transition-all ${
                            tracciatoColor === col ? 'border-gray-800 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Spessore linea: {tracciatoWidth}px
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={tracciatoWidth}
                      onChange={e => setTracciatoWidth(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Tolleranza: {tolleranza}px
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      value={tolleranza}
                      onChange={e => setTolleranza(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Salva */}
              <div className="flex justify-center">
                <button
                  onClick={salvaEsercizio}
                  disabled={salvando || !nomeEsercizio.trim() || !oggetto || !target}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white font-bold rounded-full hover:from-blue-600 hover:to-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Salva Esercizio
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Vai all'Esercizio */}
            {esercizi.length > 0 && (
              <section className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl shadow-lg p-6 border-2 border-dashed border-indigo-200">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5 text-indigo-600" />
                  Avvia Esercizio per {selectedUserName}
                </h2>
                <Link
                  href={`/training_cognitivo/pregrafismo/segui-il-tracciato/esercizio?utente=${selectedUserId}`}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <Play className="h-6 w-6" />
                  Vai all'Esercizio
                </Link>
              </section>
            )}

            {/* Lista esercizi */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Esercizi Creati
                </h2>
                <span className="text-gray-500">{esercizi.length} esercizi</span>
              </div>

              {loadingEsercizi ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : esercizi.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nessun esercizio creato per questo utente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {esercizi.map(es => (
                    <div key={es.id} className="border-2 border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 flex items-center gap-4">
                          {es.configurazione?.oggetto?.imageUrl && (
                            <img
                              src={es.configurazione.oggetto.imageUrl}
                              alt=""
                              className="w-14 h-14 object-contain border-2 border-blue-200 rounded-lg bg-white"
                            />
                          )}
                          <MoveRightArrow />
                          {es.configurazione?.target?.imageUrl && (
                            <img
                              src={es.configurazione.target.imageUrl}
                              alt=""
                              className="w-14 h-14 object-contain border-2 border-emerald-200 rounded-lg bg-white"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{es.nome_esercizio}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {es.oggetto_keyword} → {es.target_keyword}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Link
                            href={`/training_cognitivo/pregrafismo/segui-il-tracciato/esercizio?utente=${selectedUserId}&id=${es.id}`}
                            className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
                            title="Avvia"
                          >
                            <Play className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteEsercizio(es.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-blue-600' :
          toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
        }`}>
          {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

function MoveRightArrow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-gray-400 shrink-0">
      <path fill="currentColor" d="M4 11h12.17l-5.59-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4z" />
    </svg>
  )
}
