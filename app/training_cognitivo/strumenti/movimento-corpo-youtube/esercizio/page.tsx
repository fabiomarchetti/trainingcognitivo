'use client'

/**
 * Movimento Corpo YouTube — Esercizio
 * Controlla la riproduzione YouTube con MediaPipe:
 *   Tab 1 (Bocca): apri la bocca → play per N secondi
 *   Tab 2 (Testa): testa SX/DX → seleziona video 1 o 2
 *   Tab 3 (Mano): qualsiasi mano nell'area ROI → play/mantieni
 *
 * MediaPipe e YouTube IFrame API caricati da CDN.
 * Tutto il game-state è in refs per evitare re-render durante il loop.
 */

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings,
  Loader2, AlertCircle, LogIn, Maximize2, Minimize2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Tipi globali CDN ─────────────────────────────────────────────────────────
declare global {
  interface Window {
    FaceMesh: any
    Hands: any
    Camera: any
    drawConnectors: any
    drawLandmarks: any
    FACEMESH_TESSELATION: any
    HAND_CONNECTIONS: any
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface Config {
  tab_attiva: number
  link_youtube_tab1: string; inizio_brano_tab1: number; fine_brano_tab1: number
  soglia_bocca: number; timer_durata_tab1: number
  link_youtube_tab2_1: string; link_youtube_tab2_2: string
  inizio_brano_tab2: number; fine_brano_tab2: number; tolleranza_testa: number
  timer_durata_tab2: number
  link_youtube_tab3: string; inizio_brano_tab3: number; fine_brano_tab3: number
  modalita_tab3: string; timer_durata_tab3: number
  roi_x_tab3: number; roi_y_tab3: number; roi_size_tab3: number
  link_youtube_tab4: string; inizio_brano_tab4: number; fine_brano_tab4: number
  modalita_tab4: string; timer_durata_tab4: number
  roi_x_tab4: number; roi_y_tab4: number; roi_size_tab4: number
}

interface Utente { id: string; nome: string; cognome: string }

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

export default function EsercizioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="h-12 w-12 text-blue-400 animate-spin" /></div>}>
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

  // UI state
  const [authError, setAuthError] = useState(false)
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [showUserSel, setShowUserSel] = useState(!utenteParam)
  const [loadingUtenti, setLoadingUtenti] = useState(false)
  const [currentTab, setCurrentTab] = useState(1)
  const [status, setStatus] = useState('In attesa...')
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [webcamSize, setWebcamSize] = useState<'small' | 'medium' | 'large'>('small')

  // Refs game
  const configRef = useRef<Config | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvas1Ref = useRef<HTMLCanvasElement>(null)
  const canvas2Ref = useRef<HTMLCanvasElement>(null)
  const canvas3Ref = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const faceMeshRef = useRef<any>(null)
  const handsRef = useRef<any>(null)
  const ytPlayersRef = useRef<Record<string, any>>({})
  const ytReadyRef = useRef(false)
  const tabsInitRef = useRef<Record<number, boolean>>({})
  const currentTabRef = useRef(1)
  // Tab state refs (avoiding re-renders)
  const tab1Ref = useRef({ mouthOpen: false, timerId: null as any })
  const tab2Ref = useRef({ headDir: 'center', timerId: null as any, activeVideo: 0 as 0 | 1 | 2 })
  const tab3Ref = useRef({ framesIn: 0, timerId: null as any, timerActive: false })
  const roiDragRef = useRef({ dragging: false })

  // Auth
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) { setAuthError(true); return }
    if (!hasLoadedRef.current) loadCurrentUser()
  }, [isAuthLoading, user])

  useEffect(() => { return () => { stopCamera() } }, [])

  const updateStatus = (text: string) => setStatus(text)

  const loadCurrentUser = async () => {
    if (isLoadingRef.current) return
    if (!user) return
    isLoadingRef.current = true
    try {
      if (utenteParam) {
        const { data: p } = await supabase.from('profiles').select('id, nome, cognome').eq('id', utenteParam).single()
        if (p) { setSelectedUserId(p.id); setSelectedUserName(`${p.nome} ${p.cognome}`) }
        hasLoadedRef.current = true; return
      }
      const { data: p } = await supabase.from('profiles').select('id, nome, cognome, id_ruolo, ruoli(codice)').eq('id', user.id).single()
      if (p) {
        const ruolo = (p.ruoli as any)?.codice || 'utente'
        if (ruolo === 'utente') {
          setSelectedUserId(p.id); setSelectedUserName(`${p.nome} ${p.cognome}`)
          setUtenti([{ id: p.id, nome: p.nome || '', cognome: p.cognome || '' }])
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
      const { data: configs } = await supabase.from('movimento_corpo_youtube_config').select('id_utente')
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
    try {
      const res = await fetch(`/api/esercizi/movimento-corpo-youtube?action=get_config&id_utente=${userId}`)
      const data = await res.json()
      if (data.success && data.data) {
        configRef.current = data.data
        const tab = parseInt(data.data.tab_attiva) || 1
        setCurrentTab(tab)
        currentTabRef.current = tab
      } else {
        updateStatus('Configurazione non trovata. Chiedi all\'educatore di configurare l\'esercizio.')
      }
    } catch (err) {
      console.error('Errore config:', err)
    }
  }

  // Avvio automatico quando userId + scriptsLoaded
  useEffect(() => {
    if (selectedUserId && scriptsLoaded && !showUserSel) {
      loadConfig(selectedUserId).then(() => {
        if (configRef.current) startCamera()
      })
    }
  }, [selectedUserId, scriptsLoaded, showUserSel])

  // ── SCRIPTS CARICATI ──────────────────────────────────────────────────────
  // Avvia il controllo periodico degli script all'avvio
  useEffect(() => {
    // YouTube IFrame API ready callback
    window.onYouTubeIframeAPIReady = () => { ytReadyRef.current = true }

    let attempts = 0
    const maxAttempts = 100 // max 10 secondi

    const checkMediaPipe = () => {
      attempts++

      // Verifica se YT è disponibile
      if (typeof window.YT !== 'undefined' && window.YT?.Player) {
        ytReadyRef.current = true
      }

      // Verifica MediaPipe - solo FaceMesh e Hands sono essenziali all'inizio
      const faceMeshReady = typeof window.FaceMesh === 'function'
      const handsReady = typeof window.Hands === 'function'
      const cameraReady = typeof window.Camera === 'function'
      const drawingReady = typeof window.drawConnectors === 'function'

      console.log(`[Esercizio] Check ${attempts}: FaceMesh=${faceMeshReady}, Hands=${handsReady}, Camera=${cameraReady}, Drawing=${drawingReady}`)

      // Basta che FaceMesh O Hands siano pronti per iniziare
      if ((faceMeshReady || handsReady) && cameraReady) {
        console.log('[Esercizio] MediaPipe pronto per l\'uso')
        setScriptsLoaded(true)
        updateStatus('Script caricati')
        return
      }

      if (attempts < maxAttempts) {
        setTimeout(checkMediaPipe, 100)
      } else {
        console.warn('[Esercizio] Timeout caricamento MediaPipe')
        // Avvia comunque
        setScriptsLoaded(true)
        updateStatus('Avvio con script parziali')
      }
    }

    // Inizia a controllare dopo un breve delay
    const timer = setTimeout(checkMediaPipe, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleScriptsReady = () => {
    // Questo viene chiamato quando l'ultimo script è caricato
    // Il controllo effettivo è nel useEffect sopra
    console.log('[Esercizio] handleScriptsReady chiamato')
  }

  // ── WEBCAM ─────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    if (videoRef.current) return // già avviata
    updateStatus('Avvio webcam...')
    const vid = document.createElement('video')
    vid.setAttribute('playsinline', '')
    vid.style.display = 'none'
    document.body.appendChild(vid)
    videoRef.current = vid

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      vid.srcObject = stream
      await vid.play()
    } catch (e) {
      updateStatus('Impossibile accedere alla webcam')
      return
    }

    // Init canvas
    ;[canvas1Ref, canvas2Ref, canvas3Ref].forEach(ref => {
      if (ref.current) { ref.current.width = 640; ref.current.height = 480 }
    })

    // Init FaceMesh
    if (window.FaceMesh) {
      faceMeshRef.current = new window.FaceMesh({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
      })
      faceMeshRef.current.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
      faceMeshRef.current.onResults((results: any) => {
        const tab = currentTabRef.current
        if (tab === 1 && canvas1Ref.current) processFaceTab1(results, canvas1Ref.current)
        else if (tab === 2 && canvas2Ref.current) processFaceTab2(results, canvas2Ref.current)
      })
    }

    // Init Hands
    if (window.Hands) {
      handsRef.current = new window.Hands({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
      })
      handsRef.current.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.3, minTrackingConfidence: 0.3 })
      handsRef.current.onResults((results: any) => {
        const tab = currentTabRef.current
        if (tab === 3 && canvas3Ref.current) processHandsTab(results, canvas3Ref.current)
      })
    }

    updateStatus('Webcam attiva')
    setupYouTubeAPI()
    switchTab(currentTabRef.current)
    processFrame()
  }

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    videoRef.current?.remove()
    videoRef.current = null
    streamRef.current = null
  }

  const processFrame = async () => {
    const vid = videoRef.current
    if (!vid || vid.readyState < 2) { animFrameRef.current = requestAnimationFrame(processFrame); return }
    try {
      const tab = currentTabRef.current
      if ((tab === 1 || tab === 2) && faceMeshRef.current) await faceMeshRef.current.send({ image: vid })
      else if (tab === 3 && handsRef.current) await handsRef.current.send({ image: vid })
    } catch { /* ignora errori di frame */ }
    animFrameRef.current = requestAnimationFrame(processFrame)
  }

  // ── YOUTUBE ────────────────────────────────────────────────────────────────
  const setupYouTubeAPI = () => {
    if (typeof window.YT !== 'undefined' && window.YT?.Player) { ytReadyRef.current = true; return }
    const check = setInterval(() => {
      if (typeof window.YT !== 'undefined' && window.YT?.Player) { ytReadyRef.current = true; clearInterval(check) }
    }, 100)
  }

  const createYTPlayer = (containerId: string, videoId: string, start = 0, end = 0) => {
    if (!ytReadyRef.current) { setTimeout(() => createYTPlayer(containerId, videoId, start, end), 200); return }
    const el = document.getElementById(containerId)
    if (!el) return
    el.innerHTML = ''
    const vars: any = { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, start, playsinline: 1 }
    if (end > 0) vars.end = end
    const player = new window.YT.Player(containerId, {
      height: '100%', width: '100%', videoId,
      playerVars: vars,
      events: {
        onReady: () => { /* pronto */ },
        onStateChange: (e: any) => {
          if (e.data === window.YT?.PlayerState?.ENDED) {
            player.seekTo(start || 0); player.pauseVideo()
          }
        }
      }
    })
    ytPlayersRef.current[containerId] = player
  }

  const switchTab = (tabNum: number) => {
    if (!configRef.current) return
    currentTabRef.current = tabNum
    setCurrentTab(tabNum)
    // Pausa tutti i player
    Object.values(ytPlayersRef.current).forEach(p => { try { p?.pauseVideo?.() } catch { } })
    // Crea player per questa tab (una volta sola)
    if (!tabsInitRef.current[tabNum]) {
      tabsInitRef.current[tabNum] = true
      const c = configRef.current
      if (tabNum === 1) {
        const vid = extractYouTubeId(c.link_youtube_tab1)
        if (vid) createYTPlayer('ytTab1', vid, c.inizio_brano_tab1, c.fine_brano_tab1)
      } else if (tabNum === 2) {
        const v1 = extractYouTubeId(c.link_youtube_tab2_1)
        const v2 = extractYouTubeId(c.link_youtube_tab2_2)
        if (v1) createYTPlayer('ytTab2_1', v1, c.inizio_brano_tab2, c.fine_brano_tab2)
        if (v2) createYTPlayer('ytTab2_2', v2, c.inizio_brano_tab2, c.fine_brano_tab2)
      } else if (tabNum === 3) {
        const vid = extractYouTubeId(c.link_youtube_tab3)
        if (vid) createYTPlayer('ytTab3', vid, c.inizio_brano_tab3, c.fine_brano_tab3)
      }
    }
  }

  // ── TAB 1: BOCCA ──────────────────────────────────────────────────────────
  const processFaceTab1 = (results: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    if (results.multiFaceLandmarks?.length > 0) {
      const lm = results.multiFaceLandmarks[0]
      const mirrored = lm.map((l: any) => ({ ...l, x: 1 - l.x }))
      if (window.drawConnectors && window.FACEMESH_TESSELATION)
        window.drawConnectors(ctx, mirrored, window.FACEMESH_TESSELATION, { color: '#C0C0C050', lineWidth: 1 })

      const mouthH = Math.abs(lm[14].y - lm[13].y)
      const faceH = Math.abs(lm[10].y - lm[152].y)
      const norm = (mouthH / faceH) * 100
      const threshold = parseFloat(String(configRef.current?.soglia_bocca ?? 10))
      const isOpen = norm > threshold

      // Barra indicatore
      ctx.fillStyle = isOpen ? '#10b981' : '#ef4444'
      ctx.fillRect(10, 10, Math.min(norm * 8, 240), 20)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 240, 20)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'
      ctx.fillText(`Bocca: ${isOpen ? 'APERTA' : 'CHIUSA'} (${norm.toFixed(1)})`, 10, 50)

      if (isOpen !== tab1Ref.current.mouthOpen) {
        tab1Ref.current.mouthOpen = isOpen
        if (isOpen) activateBocca()
      }
    }
    ctx.restore()
  }

  const activateBocca = () => {
    const player = ytPlayersRef.current['ytTab1']
    if (!player) {
      console.log('[Bocca] Player non pronto')
      return
    }
    const dur = parseInt(String(configRef.current?.timer_durata_tab1 ?? 10)) * 1000
    console.log(`[Bocca] Attivazione - timer: ${dur/1000}s`)

    // Cancella timer precedente se esiste
    if (tab1Ref.current.timerId) {
      clearTimeout(tab1Ref.current.timerId)
      console.log('[Bocca] Timer precedente cancellato')
    }

    try {
      player.playVideo()
      updateStatus(`▶ Play (${dur / 1000}s)`)
    } catch (e) {
      console.error('[Bocca] Errore playVideo:', e)
    }

    // Imposta nuovo timer
    tab1Ref.current.timerId = setTimeout(() => {
      tab1Ref.current.timerId = null
      console.log(`[Bocca] Timer scaduto - bocca ${tab1Ref.current.mouthOpen ? 'aperta' : 'chiusa'}`)

      if (tab1Ref.current.mouthOpen) {
        // Bocca ancora aperta, riparti
        console.log('[Bocca] Bocca ancora aperta, riavvio timer')
        activateBocca()
        return
      }
      // Bocca chiusa, metti in pausa
      try {
        player.pauseVideo()
        updateStatus('⏸ Pausa - apri bocca per riprendere')
      } catch (e) {
        console.error('[Bocca] Errore pauseVideo:', e)
      }
    }, dur)
  }

  // ── TAB 2: TESTA ─────────────────────────────────────────────────────────
  const processFaceTab2 = (results: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    const tol = (parseFloat(String(configRef.current?.tolleranza_testa ?? 15))) / 100
    const cx = canvas.width / 2
    const leftX = (0.5 - tol) * canvas.width
    const rightX = (0.5 + tol) * canvas.width

    // Zone colorate
    ctx.fillStyle = 'rgba(16,185,129,0.15)'; ctx.fillRect(0, 0, leftX, canvas.height)
    ctx.fillStyle = 'rgba(59,130,246,0.15)'; ctx.fillRect(rightX, 0, canvas.width - rightX, canvas.height)

    // Linee
    ;[[cx, 'rgba(255,255,255,0.8)', [8, 6]], [leftX, 'rgba(16,185,129,0.8)', [4, 4]], [rightX, 'rgba(59,130,246,0.8)', [4, 4]]].forEach(([x, color, dash]: any) => {
      ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
    })
    ctx.setLineDash([])

    ctx.font = 'bold 13px Arial'
    ctx.fillStyle = '#10b981'; ctx.fillText('← VIDEO 1', 8, canvas.height - 10)
    ctx.fillStyle = '#3b82f6'; ctx.fillText('VIDEO 2 →', canvas.width - 80, canvas.height - 10)

    if (results.multiFaceLandmarks?.length > 0) {
      const lm = results.multiFaceLandmarks[0]
      const mirrored = lm.map((l: any) => ({ ...l, x: 1 - l.x }))
      if (window.drawConnectors && window.FACEMESH_TESSELATION)
        window.drawConnectors(ctx, mirrored, window.FACEMESH_TESSELATION, { color: '#C0C0C040', lineWidth: 1 })

      const noseX = 1 - lm[4].x
      const nx = noseX * canvas.width; const ny = lm[4].y * canvas.height
      ctx.beginPath(); ctx.arc(nx, ny, 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(250,204,21,0.9)'; ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()

      let dir = 'center'
      if (noseX < 0.5 - tol) dir = 'left'
      else if (noseX > 0.5 + tol) dir = 'right'

      const label = dir === 'left' ? 'SINISTRA' : dir === 'right' ? 'DESTRA' : 'CENTRO'
      const labelColor = dir === 'left' ? '#10b981' : dir === 'right' ? '#3b82f6' : '#fff'
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, 6, 220, 30)
      ctx.fillStyle = labelColor; ctx.font = 'bold 20px Arial'; ctx.fillText(`Testa: ${label}`, 12, 28)

      if (dir !== tab2Ref.current.headDir) {
        tab2Ref.current.headDir = dir
        if (dir === 'left') {
          activateTesta(1)
        } else if (dir === 'right') {
          activateTesta(2)
        }
      }
    }
    ctx.restore()
  }

  const activateTesta = (videoNum: 1 | 2) => {
    const player1 = ytPlayersRef.current['ytTab2_1']
    const player2 = ytPlayersRef.current['ytTab2_2']
    const dur = parseInt(String(configRef.current?.timer_durata_tab2 ?? 10)) * 1000
    console.log(`[Testa] Attivazione video ${videoNum} - timer: ${dur/1000}s`)

    // Cancella timer precedente se esiste
    if (tab2Ref.current.timerId) {
      clearTimeout(tab2Ref.current.timerId)
    }

    // Avvia il video corretto, pausa l'altro
    try {
      if (videoNum === 1) {
        player1?.playVideo()
        player2?.pauseVideo()
        updateStatus(`▶ Video 1 (${dur / 1000}s)`)
      } else {
        player2?.playVideo()
        player1?.pauseVideo()
        updateStatus(`▶ Video 2 (${dur / 1000}s)`)
      }
      tab2Ref.current.activeVideo = videoNum
    } catch (e) {
      console.error('[Testa] Errore playVideo:', e)
    }

    // Imposta timer
    tab2Ref.current.timerId = setTimeout(() => {
      tab2Ref.current.timerId = null
      const currentDir = tab2Ref.current.headDir
      console.log(`[Testa] Timer scaduto - direzione attuale: ${currentDir}`)

      // Se la testa è ancora nella stessa direzione, riparti
      if ((currentDir === 'left' && videoNum === 1) || (currentDir === 'right' && videoNum === 2)) {
        console.log('[Testa] Testa ancora nella stessa direzione, riavvio timer')
        activateTesta(videoNum)
        return
      }

      // Altrimenti metti in pausa
      try {
        player1?.pauseVideo()
        player2?.pauseVideo()
        tab2Ref.current.activeVideo = 0
        updateStatus('⏸ Pausa - muovi la testa per riprendere')
      } catch (e) {
        console.error('[Testa] Errore pauseVideo:', e)
      }
    }, dur)
  }

  // ── TAB 3: MANO ─────────────────────────────────────────────────────────
  const processHandsTab = (results: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    const cfg = configRef.current
    if (!cfg) { ctx.restore(); return }

    const roiX = cfg.roi_x_tab3
    const roiY = cfg.roi_y_tab3
    const roiSize = cfg.roi_size_tab3
    const modalita = cfg.modalita_tab3
    const timer = cfg.timer_durata_tab3
    const tabState = tab3Ref.current

    // ROI circle
    const rx = roiX * canvas.width; const ry = roiY * canvas.height
    ctx.beginPath(); ctx.arc(rx, ry, roiSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(251,191,36,0.2)'; ctx.fill()
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke()
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'
    ctx.fillText('AREA', rx, ry - roiSize / 2 - 6); ctx.textAlign = 'left'

    let handInROI = false

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((lm: any, i: number) => {
        const mirroredLm = lm.map((l: any) => ({ ...l, x: 1 - l.x }))

        if (window.drawConnectors && window.HAND_CONNECTIONS)
          window.drawConnectors(ctx, mirroredLm, window.HAND_CONNECTIONS, { color: '#fbbf24', lineWidth: 2 })
        if (window.drawLandmarks)
          window.drawLandmarks(ctx, mirroredLm, { color: '#f59e0b', lineWidth: 1 })

        // Verifica se punta indice di qualsiasi mano è nell'area ROI
        const tip = mirroredLm[8]
        const dx = (tip.x * canvas.width) - rx; const dy = (tip.y * canvas.height) - ry
        if (Math.sqrt(dx * dx + dy * dy) < roiSize / 2) handInROI = true
      })
    }

    // Controllo player
    const player = ytPlayersRef.current['ytTab3']
    if (modalita === 'mantieni_attivo') {
      if (handInROI) {
        if (!tabState.timerActive) { tabState.timerActive = true; try { player?.playVideo(); updateStatus('Mano nell\'area — play') } catch { } }
      } else {
        if (tabState.timerActive) { tabState.timerActive = false; try { player?.pauseVideo(); updateStatus('Mano fuori — pausa') } catch { } }
      }
    } else {
      // attiva_con_area
      if (handInROI) tabState.framesIn++
      else tabState.framesIn = 0
      const FRAMES_NEEDED = 5
      if (tabState.framesIn >= FRAMES_NEEDED && !tabState.timerActive) {
        tabState.timerActive = true
        try { player?.playVideo(); updateStatus(`Mano rilevata — play (${timer}s)`) } catch { }
        tabState.timerId = setTimeout(() => {
          tabState.timerActive = false; tabState.framesIn = 0
          try { player?.pauseVideo(); updateStatus('Timer scaduto — pausa') } catch { }
        }, timer * 1000)
      }
    }

    ctx.restore()
  }

  // ── DRAG ROI (canvas click) ───────────────────────────────────────────────
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    roiDragRef.current.dragging = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!roiDragRef.current.dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    if (configRef.current) {
      configRef.current.roi_x_tab3 = x
      configRef.current.roi_y_tab3 = y
    }
  }

  const handleCanvasPointerUp = () => { roiDragRef.current.dragging = false }

  // ── FULLSCREEN ─────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true) }
    else { document.exitFullscreen(); setIsFullscreen(false) }
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage?')) return
    stopCamera()
    await supabase.auth.signOut()
    if ('caches' in window) { const cn = await caches.keys(); await Promise.all(cn.map(n => caches.delete(n))) }
    localStorage.clear(); sessionStorage.clear()
    window.location.href = '/'
  }

  const TAB_COLORS: Record<number, string> = {
    1: 'from-rose-500 to-pink-500', 2: 'from-emerald-500 to-teal-500',
    3: 'from-amber-500 to-orange-500'
  }
  const TAB_LABELS: Record<number, string> = { 1: '👄 Bocca', 2: '↔️ Testa', 3: '✋ Mano' }

  if (authError) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Sessione Scaduta</h2>
        <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700">
          <LogIn className="h-5 w-5" /> Vai al Login
        </a>
      </div>
    </div>
  )

  return (
    <>
      {/* Scripts CDN - ordine come nella vecchia app */}
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" strategy="afterInteractive" crossOrigin="anonymous"
        onLoad={handleScriptsReady} />
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <header className={`bg-gradient-to-r ${TAB_COLORS[currentTab]} shadow-lg p-3 z-20 flex-shrink-0`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link href="/training_cognitivo/strumenti/movimento-corpo-youtube" className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                <ArrowLeft className="h-5 w-5 text-white" />
              </Link>
              <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30"><Home className="h-5 w-5 text-white" /></a>
              <Link href={`/training_cognitivo/strumenti/movimento-corpo-youtube/gestione${selectedUserId ? `?utente=${selectedUserId}` : ''}`}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 text-white rounded-full hover:bg-blue-800 text-sm font-bold shadow">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Educatore</span>
              </Link>
            </div>

            {/* Tab selector */}
            <div className="flex items-center gap-1">
              {([1, 2, 3] as const).map(t => (
                <button key={t} onClick={() => switchTab(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${currentTab === t ? 'bg-white text-gray-800 shadow' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs hidden lg:block max-w-xs truncate">{status}</span>
              <button onClick={toggleFullscreen} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                {isFullscreen ? <Minimize2 className="h-4 w-4 text-white" /> : <Maximize2 className="h-4 w-4 text-white" />}
              </button>
              <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                <RotateCcw className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">

          {/* Selezione utente */}
          {showUserSel && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/80 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
                <h2 className="text-xl font-bold text-blue-700 mb-4">Seleziona profilo</h2>
                {loadingUtenti ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
                ) : (
                  <select onChange={e => handleUserChange(e.target.value)} className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none">
                    <option value="">-- Seleziona --</option>
                    {utenti.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Area video principale + canvas webcam */}
          <div ref={canvasRef} className="flex-1 relative">

            {/* Tab 1: singolo video */}
            <div className={`absolute inset-0 ${currentTab === 1 ? 'block' : 'hidden'}`}>
              <div id="ytTab1" className="w-full h-full" />
            </div>

            {/* Tab 2: due video affiancati */}
            <div className={`absolute inset-0 grid grid-cols-2 gap-1 bg-black ${currentTab === 2 ? 'grid' : 'hidden'}`}>
              <div className="relative">
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded z-10">← SINISTRA</div>
                <div id="ytTab2_1" className="w-full h-full" />
              </div>
              <div className="relative">
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded z-10">DESTRA →</div>
                <div id="ytTab2_2" className="w-full h-full" />
              </div>
            </div>

            {/* Tab 3 video */}
            <div className={`absolute inset-0 ${currentTab === 3 ? 'block' : 'hidden'}`}>
              <div id="ytTab3" className="w-full h-full" />
            </div>


            {/* Canvas webcam (sovrapposto, ridimensionabile) */}
            <div className={`absolute bottom-4 right-4 shadow-2xl rounded-xl overflow-hidden border-2 border-white/30 bg-black z-20 transition-all duration-300 ${
              webcamSize === 'small' ? 'w-48 md:w-64' :
              webcamSize === 'medium' ? 'w-72 md:w-96' : 'w-[480px] md:w-[640px]'
            }`}>
              {/* Header con controllo dimensione */}
              <div className="bg-gray-800/90 px-2 py-1 flex items-center justify-between">
                <span className="text-white/70 text-xs">Webcam</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWebcamSize(s => s === 'small' ? 'medium' : s === 'medium' ? 'large' : 'small')}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="Cambia dimensione"
                  >
                    {webcamSize === 'small' && <Maximize2 className="h-3.5 w-3.5 text-white/70" />}
                    {webcamSize === 'medium' && <Maximize2 className="h-3.5 w-3.5 text-white" />}
                    {webcamSize === 'large' && <Minimize2 className="h-3.5 w-3.5 text-white" />}
                  </button>
                </div>
              </div>
              <canvas ref={canvas1Ref} className={`w-full ${currentTab === 1 ? 'block' : 'hidden'}`} style={{ aspectRatio: '4/3' }} />
              <canvas ref={canvas2Ref} className={`w-full ${currentTab === 2 ? 'block' : 'hidden'}`} style={{ aspectRatio: '4/3' }} />
              <canvas ref={canvas3Ref}
                className={`w-full ${currentTab === 3 ? 'block' : 'hidden'} cursor-crosshair`}
                style={{ aspectRatio: '4/3' }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp} />
              <div className="bg-black/70 text-white text-xs px-2 py-1 text-center truncate">{status}</div>
              {currentTab === 3 && (
                <div className="bg-amber-900/70 text-amber-200 text-xs px-2 py-0.5 text-center">Trascina per spostare l'area</div>
              )}
            </div>

            {/* Messaggio nessun utente */}
            {!showUserSel && !selectedUserId && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <p className="text-white/60">Seleziona un utente per iniziare</p>
              </div>
            )}

            {/* Loading scripts */}
            {!scriptsLoaded && selectedUserId && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                <div className="text-center text-white">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-3 text-blue-400" />
                  <p>Caricamento MediaPipe...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
