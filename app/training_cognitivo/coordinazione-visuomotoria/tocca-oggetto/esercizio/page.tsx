'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Play, Square,
  Target, AlertCircle, CheckCircle, XCircle, Loader2, LogIn, Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { GameConfig } from '../types'
import { DEFAULT_CONFIG, SPEED_MAP, SIZE_MAP } from '../types'

interface Utente { id: string; nome: string; cognome: string }

// ─── Oggetto di gioco (manipolazione DOM diretta) ─────────────────────────────
class GameObject {
  id: string
  type: 'target' | 'distractor'
  x: number; y: number; vx: number; vy: number
  size: number
  element: HTMLDivElement
  startTime: number

  constructor(
    type: 'target' | 'distractor',
    config: GameConfig,
    container: HTMLDivElement,
    onClickCb: (obj: GameObject) => void
  ) {
    this.id = `${type}_${Date.now()}_${Math.random()}`
    this.type = type
    this.size = SIZE_MAP[config.dimensione] ?? 100
    this.startTime = Date.now()

    const w = container.clientWidth
    const h = container.clientHeight
    this.x = Math.random() * Math.max(0, w - this.size)
    this.y = Math.random() * Math.max(0, h - this.size)

    const base = SPEED_MAP[config.velocita] ?? 1.5
    this.vx = (Math.random() < 0.5 ? 1 : -1) * (base + Math.random() * base * 0.5)
    this.vy = (Math.random() < 0.5 ? 1 : -1) * (base + Math.random() * base * 0.5)

    // Scegli immagine random dal pool
    const images = type === 'target' ? config.target_images : config.distractor_images
    const img = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null

    // Crea elemento DOM
    this.element = document.createElement('div')
    this.element.style.cssText = `
      position: absolute;
      left: ${this.x}px;
      top: ${this.y}px;
      width: ${this.size}px;
      height: ${this.size}px;
      cursor: pointer;
      user-select: none;
      touch-action: manipulation;
      will-change: transform;
      transition: transform 0.05s;
    `

    if (img) {
      const imgEl = document.createElement('img')
      imgEl.src = img.url
      imgEl.style.cssText = `
        width: 100%; height: 100%;
        object-fit: contain;
        pointer-events: none;
        border-radius: 12px;
        border: 4px solid ${type === 'target' ? '#10b981' : '#ef4444'};
        box-shadow: 0 0 12px ${type === 'target' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'};
        background: white;
      `
      this.element.appendChild(imgEl)
    } else {
      // Emoji fallback
      this.element.style.fontSize = `${this.size * 0.7}px`
      this.element.style.lineHeight = `${this.size}px`
      this.element.style.textAlign = 'center'
      this.element.textContent = type === 'target' ? '🎯' : '⚠️'
    }

    this.element.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      onClickCb(this)
    })

    container.appendChild(this.element)
  }

  update(w: number, h: number) {
    this.x += this.vx
    this.y += this.vy
    if (this.x <= 0) { this.vx = Math.abs(this.vx); this.x = 0 }
    if (this.x >= w - this.size) { this.vx = -Math.abs(this.vx); this.x = w - this.size }
    if (this.y <= 0) { this.vy = Math.abs(this.vy); this.y = 0 }
    if (this.y >= h - this.size) { this.vy = -Math.abs(this.vy); this.y = h - this.size }
    this.element.style.left = `${this.x}px`
    this.element.style.top = `${this.y}px`
  }

  flash(color: string) {
    this.element.style.transform = 'scale(1.3)'
    this.element.style.opacity = '0.5'
    setTimeout(() => {
      this.element.style.transform = 'scale(1)'
      this.element.style.opacity = '1'
    }, 200)
  }

  remove() { this.element.remove() }
}

export default function EsercizioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sky-100 flex items-center justify-center"><Loader2 className="h-12 w-12 text-sky-500 animate-spin" /></div>}>
      <GameContent />
    </Suspense>
  )
}

function GameContent() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const searchParams = useSearchParams()
  const utenteParam = searchParams.get('utente')

  // Utente
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [showUserSel, setShowUserSel] = useState(!utenteParam)
  const [authError, setAuthError] = useState(false)
  const [loadingUtenti, setLoadingUtenti] = useState(false)

  // Config
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const configRef = useRef<GameConfig>(DEFAULT_CONFIG)

  // Game state
  const [gameState, setGameState] = useState<'idle' | 'running' | 'ended'>('idle')
  const [scoreTarget, setScoreTarget] = useState(0)
  const [scoreErrori, setScoreErrori] = useState(0)
  // Feedback immediato — DOM diretto (bypassa React batching in produzione)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Refs game loop
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameObjectsRef = useRef<GameObject[]>([])
  const animFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const scoreTargetRef = useRef(0)
  const scoreErroriRef = useRef(0)
  const remainingRef = useRef(0)
  const sessionResultsRef = useRef<any[]>([])
  const sessionIdRef = useRef(`session_${Date.now()}`)
  const progressivoRef = useRef(1)

  // Auth
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) { setAuthError(true); return }
    if (!hasLoadedRef.current) loadCurrentUser()
  }, [isAuthLoading, user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      gameObjectsRef.current.forEach(o => o.remove())
    }
  }, [])

  const loadCurrentUser = async () => {
    if (isLoadingRef.current) return
    if (!user) return
    isLoadingRef.current = true
    try {
      if (utenteParam) {
        const { data: profile } = await supabase.from('profiles').select('id, nome, cognome').eq('id', utenteParam).single()
        if (profile) {
          setSelectedUserId(profile.id)
          setSelectedUserName(`${profile.nome} ${profile.cognome}`)
          await loadConfig(profile.id)
        }
        hasLoadedRef.current = true
        return
      }
      const { data: profile } = await supabase.from('profiles').select('id, nome, cognome, id_ruolo, ruoli(codice)').eq('id', user.id).single()
      if (profile) {
        const ruolo = (profile.ruoli as any)?.codice || 'utente'
        if (ruolo === 'utente') {
          setSelectedUserId(profile.id)
          setSelectedUserName(`${profile.nome} ${profile.cognome}`)
          setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
          await loadConfig(profile.id)
        } else {
          await loadUtentiConConfig()
        }
      }
      hasLoadedRef.current = true
    } catch (err) { console.error(err) }
    finally { isLoadingRef.current = false }
  }

  const loadUtentiConConfig = async () => {
    setLoadingUtenti(true)
    try {
      const { data: configs } = await supabase.from('tocca_oggetto_config').select('id_utente')
      if (!configs || configs.length === 0) { setUtenti([]); return }
      const ids = [...new Set(configs.map((c: any) => c.id_utente))]
      const { data: profiles } = await supabase.from('profiles').select('id, nome, cognome').in('id', ids).order('cognome')
      setUtenti((profiles || []).map((p: any) => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))
    } finally { setLoadingUtenti(false) }
  }

  const handleUserChange = async (userId: string) => {
    if (!userId) return
    setSelectedUserId(userId)
    const u = utenti.find(u => u.id === userId)
    if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
    setShowUserSel(false)
    await loadConfig(userId)
  }

  const loadConfig = async (userId: string) => {
    setLoadingConfig(true)
    try {
      const res = await fetch(`/api/esercizi/tocca-oggetto?action=get_config&id_utente=${userId}`)
      const data = await res.json()
      const cfg = data.success && data.data ? data.data : DEFAULT_CONFIG
      setConfig(cfg)
      configRef.current = cfg
    } catch {
      setConfig(DEFAULT_CONFIG)
      configRef.current = DEFAULT_CONFIG
    } finally { setLoadingConfig(false) }
  }

  // ─── Game Logic ────────────────────────────────────────────────────────────

  const showFeedback = (type: 'target' | 'distractor') => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    const el = feedbackRef.current
    if (!el) return
    // Manipolazione DOM diretta — nessun re-render React necessario
    el.textContent = type === 'target' ? '✓  BRAVO!' : '✗  NO!'
    el.style.background = type === 'target' ? '#10b981' : '#ef4444'
    el.style.display = 'flex'
    el.style.opacity = '1'
    el.style.transform = 'scale(1.1)'
    setTimeout(() => { if (feedbackRef.current) el.style.transform = 'scale(1)' }, 100)
    feedbackTimerRef.current = setTimeout(() => {
      if (feedbackRef.current) {
        el.style.opacity = '0'
        el.style.transform = 'scale(0.8)'
        setTimeout(() => { if (feedbackRef.current) el.style.display = 'none' }, 200)
      }
    }, 700)
  }

  const handleObjectClick = async (obj: GameObject) => {
    if (!isRunningRef.current) return

    const tempo = Date.now() - obj.startTime
    obj.startTime = Date.now() // reset per prossimo utilizzo

    if (obj.type === 'target') {
      obj.flash('#10b981')
      showFeedback('target')
      scoreTargetRef.current++
      setScoreTarget(scoreTargetRef.current)
      remainingRef.current--

      const result = {
        tipo_risposta: 'target', esito: 'corretto',
        tempo_risposta_ms: tempo,
        id_utente: selectedUserId, id_sessione: sessionIdRef.current,
        progressivo_esercizio: progressivoRef.current
      }
      sessionResultsRef.current.push(result)
      saveRisultato(result)

      // Rimuovi e (se ci sono ancora target da colpire) aggiungi nuovo
      obj.remove()
      const idx = gameObjectsRef.current.indexOf(obj)
      if (idx > -1) gameObjectsRef.current.splice(idx, 1)

      if (remainingRef.current <= 0) {
        endGame()
      } else if (gameContainerRef.current) {
        const newObj = new GameObject('target', configRef.current, gameContainerRef.current, handleObjectClick)
        gameObjectsRef.current.push(newObj)
      }
    } else {
      // Distrattore
      obj.flash('#ef4444')
      showFeedback('distractor')
      scoreErroriRef.current++
      setScoreErrori(scoreErroriRef.current)

      const result = {
        tipo_risposta: 'distrattore', esito: 'errore',
        tempo_risposta_ms: tempo,
        id_utente: selectedUserId, id_sessione: sessionIdRef.current,
        progressivo_esercizio: progressivoRef.current
      }
      sessionResultsRef.current.push(result)
      saveRisultato(result)

      // Rimuovi e ricrea distrattore
      obj.remove()
      const idx = gameObjectsRef.current.indexOf(obj)
      if (idx > -1) gameObjectsRef.current.splice(idx, 1)

      if (configRef.current.num_distrattori > 0 && gameContainerRef.current) {
        const newObj = new GameObject('distractor', configRef.current, gameContainerRef.current, handleObjectClick)
        gameObjectsRef.current.push(newObj)
      }
    }
  }

  const saveRisultato = async (result: any) => {
    try {
      await fetch('/api/esercizi/tocca-oggetto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_risultato', ...result })
      })
    } catch {}
  }

  const gameLoop = () => {
    if (!gameContainerRef.current || !isRunningRef.current) return
    const w = gameContainerRef.current.clientWidth
    const h = gameContainerRef.current.clientHeight
    gameObjectsRef.current.forEach(o => o.update(w, h))
    animFrameRef.current = requestAnimationFrame(gameLoop)
  }

  const startGame = async () => {
    if (!gameContainerRef.current) return

    // Ottieni progressivo
    try {
      const res = await fetch(`/api/esercizi/tocca-oggetto?action=get_next_progressivo&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) progressivoRef.current = data.data.progressivo
    } catch {}

    // Reset
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    if (feedbackRef.current) { feedbackRef.current.style.display = 'none'; feedbackRef.current.style.opacity = '0' }
    gameObjectsRef.current.forEach(o => o.remove())
    gameObjectsRef.current = []
    scoreTargetRef.current = 0
    scoreErroriRef.current = 0
    remainingRef.current = configRef.current.num_target
    sessionResultsRef.current = []
    sessionIdRef.current = `session_${Date.now()}`
    setScoreTarget(0)
    setScoreErrori(0)
    setGameState('running')
    isRunningRef.current = true

    const container = gameContainerRef.current

    // Crea target
    for (let i = 0; i < configRef.current.num_target; i++) {
      gameObjectsRef.current.push(new GameObject('target', configRef.current, container, handleObjectClick))
    }
    // Crea distrattori
    for (let i = 0; i < configRef.current.num_distrattori; i++) {
      gameObjectsRef.current.push(new GameObject('distractor', configRef.current, container, handleObjectClick))
    }

    animFrameRef.current = requestAnimationFrame(gameLoop)
  }

  const stopGame = () => {
    isRunningRef.current = false
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    setGameState('idle')
  }

  const endGame = () => {
    isRunningRef.current = false
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    // Rimuovi oggetti rimasti
    gameObjectsRef.current.forEach(o => o.remove())
    gameObjectsRef.current = []
    setGameState('ended')
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage locale?')) return
    stopGame()
    await supabase.auth.signOut()
    if ('caches' in window) { const cn = await caches.keys(); await Promise.all(cn.map(n => caches.delete(n))) }
    localStorage.clear(); sessionStorage.clear()
    window.location.href = '/'
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-sky-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sessione Scaduta</h2>
          <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-full font-semibold hover:bg-sky-600">
            <LogIn className="h-5 w-5" /> Vai al Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: gameState === 'running' ? config.background_color : '#f0f9ff' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-500 to-cyan-500 shadow-lg p-3 z-20 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto" className="p-2 bg-white/20 rounded-full hover:bg-white/30">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30"><Home className="h-5 w-5 text-white" /></a>
            <Link
              href={`/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/gestione${selectedUserId ? `?utente=${selectedUserId}` : ''}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-colors text-sm font-bold shadow"
              title="Area Educatore"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Educatore</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Score */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/20 rounded-lg px-3 py-1">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
                <span className="text-xl font-bold text-white">{scoreTarget}</span>
              </div>
              <div className="flex items-center gap-1 bg-white/20 rounded-lg px-3 py-1">
                <XCircle className="h-5 w-5 text-red-300" />
                <span className="text-xl font-bold text-white">{scoreErrori}</span>
              </div>
            </div>

            {/* Feedback immediato — DOM diretto, stabile in produzione */}
            <div className="w-32 flex items-center justify-center">
              <div
                ref={feedbackRef}
                style={{
                  display: 'none',
                  opacity: 0,
                  alignItems: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.2s ease, transform 0.15s ease',
                  letterSpacing: '0.02em',
                }}
              />
            </div>

            {/* Start/Stop */}
            {gameState === 'idle' || gameState === 'ended' ? (
              <button
                onClick={startGame}
                disabled={loadingConfig || !selectedUserId}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white font-bold rounded-full hover:bg-emerald-600 disabled:opacity-50 shadow-lg"
              >
                <Play className="h-5 w-5" /> START
              </button>
            ) : (
              <button
                onClick={stopGame}
                className="flex items-center gap-2 px-5 py-2 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 shadow-lg"
              >
                <Square className="h-5 w-5" /> STOP
              </button>
            )}
          </div>

          <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
            <RotateCcw className="h-5 w-5 text-white" />
          </button>
        </div>
      </header>

      {/* Game Area */}
      <div
        ref={gameContainerRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: config.background_color }}
      >

        {/* Selezione Utente */}
        {showUserSel && gameState === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
              <h2 className="text-xl font-bold text-sky-700 mb-4">Seleziona profilo</h2>
              {loadingUtenti ? (
                <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 text-sky-500 animate-spin" /></div>
              ) : (
                <select onChange={e => handleUserChange(e.target.value)} className="w-full p-3 border-2 border-sky-200 rounded-lg focus:border-sky-500 focus:outline-none">
                  <option value="">-- Seleziona --</option>
                  {utenti.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Messaggio iniziale */}
        {!showUserSel && gameState === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-white/90 rounded-3xl shadow-2xl p-10 max-w-md text-center mx-4">
              <Target className="h-20 w-20 text-sky-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pronto a giocare!</h2>
              <p className="text-gray-600 mb-2">
                Tocca i <strong className="text-emerald-600">target</strong> (bordo verde)
              </p>
              <p className="text-gray-600 mb-6">
                Evita i <strong className="text-red-600">distrattori</strong> (bordo rosso)
              </p>
              <div className="text-sm text-gray-500">
                <p>Target: {config.num_target} | Distrattori: {config.num_distrattori}</p>
                {config.target_images.length === 0 && (
                  <p className="mt-2 text-orange-500 font-semibold">⚠ Nessuna immagine configurata. Vai all'Area Educatore.</p>
                )}
              </div>
              <button
                onClick={startGame}
                disabled={loadingConfig}
                className="mt-6 px-8 py-3 bg-emerald-500 text-white font-bold rounded-full hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 mx-auto shadow-lg"
              >
                <Play className="h-6 w-6" /> START
              </button>
            </div>
          </div>
        )}

        {/* Fine esercizio */}
        {gameState === 'ended' && (() => {
          const totale = scoreTarget + scoreErrori
          const perc = totale > 0 ? Math.round((scoreTarget / totale) * 100) : 0
          return (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-3xl font-bold text-emerald-600 mb-1">Completato!</h2>
                <p className="text-gray-500 mb-6 text-sm">Hai completato tutti i target</p>

                {/* Percentuale grande */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 mb-5">
                  <div className="text-6xl font-black text-emerald-600 mb-1">{perc}%</div>
                  <div className="text-sm text-gray-500">precisione</div>
                  {/* Barra progresso */}
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000"
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                </div>

                {/* Dettaglio */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-emerald-600">{scoreTarget}</div>
                    <div className="text-xs text-gray-500">Target</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-red-600">{scoreErrori}</div>
                    <div className="text-xs text-gray-500">Errori</div>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-sky-600">{totale}</div>
                    <div className="text-xs text-gray-500">Totale</div>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-3 bg-emerald-500 text-white font-bold rounded-full hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play className="h-5 w-5" /> Rigioca
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
