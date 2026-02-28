'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import {
  Home, ArrowLeft, RotateCcw, Settings, Save,
  CheckCircle, XCircle, Loader2, Play, Camera, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// Tipi globali MediaPipe CDN
declare global {
  interface Window {
    FaceMesh: any
    Hands: any
    Camera: any
    drawConnectors: any
    drawLandmarks: any
    FACEMESH_TESSELATION: any
    HAND_CONNECTIONS: any
  }
}

// Landmark punte dita MediaPipe con colori pastello
const FINGERTIP_LANDMARKS = [
  { index: 4,  name: 'Pollice',  color: '#FFB3BA' },
  { index: 8,  name: 'Indice',   color: '#BAFFC9' },
  { index: 12, name: 'Medio',    color: '#BAE1FF' },
  { index: 16, name: 'Anulare',  color: '#FFFFBA' },
  { index: 20, name: 'Mignolo',  color: '#E8BAFF' }
]

const RUOLI_STAFF = ['sviluppatore', 'amministratore', 'direttore', 'casemanager']

interface Utente { id: string; nome: string; cognome: string }

interface Config {
  tab_attiva: number
  // Tab 1: Bocca
  link_youtube_tab1: string
  inizio_brano_tab1: number
  fine_brano_tab1: number
  soglia_bocca: number
  timer_durata_tab1: number
  // Tab 2: Testa
  link_youtube_tab2_1: string
  link_youtube_tab2_2: string
  inizio_brano_tab2: number
  fine_brano_tab2: number
  tolleranza_testa: number
  tolleranza_testa_sx: number
  tolleranza_testa_dx: number
  timer_durata_tab2: number
  // Tab 3: Mano SX
  link_youtube_tab3: string
  inizio_brano_tab3: number
  fine_brano_tab3: number
  modalita_tab3: string
  timer_durata_tab3: number
  roi_x_tab3: number
  roi_y_tab3: number
  roi_size_tab3: number
  // Tab 4: Mano DX
  link_youtube_tab4: string
  inizio_brano_tab4: number
  fine_brano_tab4: number
  modalita_tab4: string
  timer_durata_tab4: number
  roi_x_tab4: number
  roi_y_tab4: number
  roi_size_tab4: number
}

const DEFAULT_CONFIG: Config = {
  tab_attiva: 1,
  link_youtube_tab1: '', inizio_brano_tab1: 0, fine_brano_tab1: 0,
  soglia_bocca: 8, timer_durata_tab1: 10,
  link_youtube_tab2_1: '', link_youtube_tab2_2: '',
  inizio_brano_tab2: 0, fine_brano_tab2: 0, tolleranza_testa: 15,
  tolleranza_testa_sx: 15, tolleranza_testa_dx: 15, timer_durata_tab2: 10,
  link_youtube_tab3: '', inizio_brano_tab3: 0, fine_brano_tab3: 0,
  modalita_tab3: 'mantieni_attivo', timer_durata_tab3: 10,
  roi_x_tab3: 0.5, roi_y_tab3: 0.5, roi_size_tab3: 150,
  link_youtube_tab4: '', inizio_brano_tab4: 0, fine_brano_tab4: 0,
  modalita_tab4: 'mantieni_attivo', timer_durata_tab4: 10,
  roi_x_tab4: 0.5, roi_y_tab4: 0.5, roi_size_tab4: 150,
}

export default function GestioneMovimentoCorpoPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [activeTab, setActiveTab] = useState<'bocca' | 'testa' | 'mano'>('bocca')
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const configRef = useRef<Config>(DEFAULT_CONFIG) // Ref per accesso in requestAnimationFrame
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)

  // Stato anteprima webcam
  const [previewType, setPreviewType] = useState<'bocca' | 'testa' | 'mano' | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const previewAnimRef = useRef<number | null>(null)
  const mediapipeCameraRef = useRef<any>(null)
  const faceMeshRef = useRef<any>(null)
  const handsRef = useRef<any>(null)
  const faceResultsRef = useRef<any>(null)
  const handResultsRef = useRef<any>(null)
  const roiDragRef = useRef({ dragging: false })
  const isInitializingRef = useRef(false) // Previene doppia inizializzazione

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Sincronizza configRef con config per accesso in requestAnimationFrame
  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) return
    if (!hasLoadedRef.current) loadCurrentUser()
  }, [isAuthLoading, user])

  useEffect(() => {
    if (selectedUserId) loadConfig()
  }, [selectedUserId])

  const loadCurrentUser = async () => {
    if (isLoadingRef.current) return
    if (!user) return
    isLoadingRef.current = true
    console.log('[MCYT GESTIONE] loadCurrentUser start, user.id:', user.id)
    try {
      const { data: profile, error } = await supabase
        .from('profiles').select('id, nome, cognome, id_ruolo, ruoli(codice)')
        .eq('id', user.id).single()
      if (error) {
        console.error('[MCYT GESTIONE] Errore query profilo:', error)
        throw error
      }
      if (!profile) {
        console.warn('[MCYT GESTIONE] Profilo non trovato per user.id:', user.id)
        return
      }
      const ruolo = (profile.ruoli as any)?.codice || 'utente'
      console.log('[MCYT GESTIONE] Ruolo:', ruolo)
      setCurrentUserRole(ruolo)
      if (ruolo === 'utente') {
        setSelectedUserId(profile.id)
        setSelectedUserName(`${profile.nome} ${profile.cognome}`)
        setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
      } else if (RUOLI_STAFF.includes(ruolo)) {
        await loadUtentiByRole()
      } else if (ruolo === 'educatore') {
        await loadUtentiAssegnati()
      }
      hasLoadedRef.current = true
      console.log('[MCYT GESTIONE] loadCurrentUser completato')
    } catch (err) { console.error('[MCYT GESTIONE] Errore loadCurrentUser:', err) }
    finally { isLoadingRef.current = false }
  }

  const loadUtentiByRole = async () => {
    console.log('[MCYT GESTIONE] loadUtentiByRole start')
    const { data: ruoloUtente, error: errRuolo } = await supabase.from('ruoli').select('id').eq('codice', 'utente').single()
    if (errRuolo) { console.error('[MCYT GESTIONE] Errore query ruoli:', errRuolo); throw errRuolo }
    if (!ruoloUtente) { console.warn('[MCYT GESTIONE] Ruolo utente non trovato'); return }
    console.log('[MCYT GESTIONE] Ruolo utente id:', ruoloUtente.id)

    const { data: profiles, error: errProf } = await supabase.from('profiles').select('id, nome, cognome').eq('id_ruolo', ruoloUtente.id).order('cognome')
    if (errProf) { console.error('[MCYT GESTIONE] Errore query profiles:', errProf); throw errProf }
    console.log('[MCYT GESTIONE] Profili caricati:', profiles?.length || 0)
    setUtenti((profiles || []).map(p => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))
  }

  const loadUtentiAssegnati = async () => {
    if (!user) return
    const { data: ass, error: errAss } = await supabase.from('educatori_utenti').select('id_utente').eq('id_educatore', user.id).eq('stato', 'attivo')
    if (errAss) { console.error('[MCYT GESTIONE] Errore assegnazioni:', errAss); throw errAss }
    if (ass && ass.length > 0) {
      const { data: profiles, error: errProf } = await supabase.from('profiles').select('id, nome, cognome').in('id', ass.map(a => a.id_utente)).order('cognome')
      if (errProf) { console.error('[MCYT GESTIONE] Errore profiles assegnati:', errProf); throw errProf }
      setUtenti((profiles || []).map(p => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))
    } else { setUtenti([]) }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch(`/api/esercizi/movimento-corpo-youtube?action=get_config&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setConfig({ ...DEFAULT_CONFIG, ...data.data })
      } else {
        setConfig(DEFAULT_CONFIG)
      }
    } catch { setConfig(DEFAULT_CONFIG) }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/esercizi/movimento-corpo-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', id_utente: selectedUserId, id_educatore: user?.id, config })
      })
      const data = await res.json()
      if (data.success) showToast('Configurazione salvata!', 'success')
      else showToast(data.message || 'Errore', 'error')
    } catch { showToast('Errore di connessione', 'error') }
    finally { setSaving(false) }
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage?')) return
    await supabase.auth.signOut()
    if ('caches' in window) { const cn = await caches.keys(); await Promise.all(cn.map(n => caches.delete(n))) }
    localStorage.clear(); sessionStorage.clear()
    window.location.href = '/'
  }

  const setField = (field: keyof Config, value: any) => setConfig(c => ({ ...c, [field]: value }))

  // ══════════════════════════════════════════════════════
  // ANTEPRIMA WEBCAM MEDIAPIPE
  // ══════════════════════════════════════════════════════

  const handleScriptsReady = useCallback(() => {
    // Verifica che tutti gli oggetti MediaPipe siano disponibili
    let attempts = 0
    const maxAttempts = 50 // max 5 secondi

    const checkMediaPipe = () => {
      attempts++
      const allLoaded = window.FaceMesh &&
                        window.Hands &&
                        window.Camera &&
                        window.drawConnectors &&
                        window.drawLandmarks &&
                        window.FACEMESH_TESSELATION

      if (allLoaded) {
        console.log('[MediaPipe] Tutti i moduli caricati correttamente')
        console.log('[MediaPipe] FaceMesh:', !!window.FaceMesh)
        console.log('[MediaPipe] Hands:', !!window.Hands)
        console.log('[MediaPipe] Camera:', !!window.Camera)
        console.log('[MediaPipe] FACEMESH_TESSELATION:', !!window.FACEMESH_TESSELATION)
        setScriptsLoaded(true)
      } else if (attempts < maxAttempts) {
        setTimeout(checkMediaPipe, 100)
      } else {
        console.warn('[MediaPipe] Timeout caricamento moduli')
        console.warn('[MediaPipe] FaceMesh:', !!window.FaceMesh)
        console.warn('[MediaPipe] Hands:', !!window.Hands)
        console.warn('[MediaPipe] Camera:', !!window.Camera)
        console.warn('[MediaPipe] FACEMESH_TESSELATION:', !!window.FACEMESH_TESSELATION)
      }
    }
    checkMediaPipe()
  }, [])

  const openPreview = (type: 'bocca' | 'testa' | 'mano') => {
    if (!scriptsLoaded) {
      showToast('Attendere caricamento MediaPipe...', 'error')
      return
    }
    setPreviewType(type)
    // La camera verrà avviata dal callback ref quando il canvas è montato
  }

  // Callback ref per il canvas - viene chiamato quando il canvas è montato nel DOM
  const canvasRefCallback = useCallback((canvas: HTMLCanvasElement | null) => {
    previewCanvasRef.current = canvas
    if (canvas && previewType) {
      // Avvia la camera solo se non è già stata avviata
      if (!previewStreamRef.current) {
        startPreviewCamera(previewType)
      }
    }
  }, [previewType])

  const startPreviewCamera = async (type: 'bocca' | 'testa' | 'mano') => {
    // Evita doppia inizializzazione
    if (isInitializingRef.current) {
      console.log('[Preview] Inizializzazione già in corso, skip')
      return
    }
    if (previewStreamRef.current) {
      console.log('[Preview] Camera già avviata')
      return
    }

    const canvas = previewCanvasRef.current
    if (!canvas) {
      console.error('[Preview] Canvas non trovato')
      return
    }

    isInitializingRef.current = true
    console.log('[Preview] Avvio camera per:', type)

    try {
      // Crea elemento video
      const video = document.createElement('video')
      video.setAttribute('playsinline', '')
      video.setAttribute('autoplay', '')
      previewVideoRef.current = video

      // Init FaceMesh per bocca/testa (senza await initialize!)
      if ((type === 'bocca' || type === 'testa') && window.FaceMesh) {
        if (!faceMeshRef.current) {
          console.log('[Preview] Inizializzazione FaceMesh...')
          const faceMesh = new window.FaceMesh({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
          })
          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          })
          faceMesh.onResults((results: any) => {
            faceResultsRef.current = results
          })
          faceMeshRef.current = faceMesh
          console.log('[Preview] FaceMesh configurato')
        }
      }

      // Init Hands per mano (senza await initialize!)
      if (type === 'mano' && window.Hands) {
        if (!handsRef.current) {
          console.log('[Preview] Inizializzazione Hands...')
          const hands = new window.Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          })
          hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
          })
          hands.onResults((results: any) => {
            handResultsRef.current = results
          })
          handsRef.current = hands
          console.log('[Preview] Hands configurato')
        }
      }

      // Ottieni stream webcam
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      previewStreamRef.current = stream
      video.srcObject = stream
      video.play()

      // Aspetta che il video sia pronto (come nella vecchia app)
      video.onloadedmetadata = () => {
        canvas.width = 640
        canvas.height = 480

        // Usa la classe Camera di MediaPipe per gestire i frame
        if (window.Camera) {
          const camera = new window.Camera(video, {
            onFrame: async () => {
              if ((type === 'bocca' || type === 'testa') && faceMeshRef.current && previewCanvasRef.current) {
                await faceMeshRef.current.send({ image: video })
              } else if (type === 'mano' && handsRef.current && previewCanvasRef.current) {
                await handsRef.current.send({ image: video })
              }
            },
            width: 640,
            height: 480
          })
          camera.start()
          mediapipeCameraRef.current = camera
          console.log('[Preview] Camera MediaPipe avviata')
        }

        // Avvia il rendering
        renderPreview(type)
      }
    } catch (err) {
      isInitializingRef.current = false
      console.error('Errore accesso webcam:', err)
      showToast('Impossibile accedere alla webcam', 'error')
      closePreview()
    }
  }

  const renderPreview = (type: 'bocca' | 'testa' | 'mano') => {
    const video = previewVideoRef.current
    const canvas = previewCanvasRef.current
    if (!video || !canvas || !previewType) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Controlla che il video sia pronto (come nella vecchia app)
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Disegna video (mirrored)
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()

      // Disegna overlay specifico
      if (type === 'bocca') renderBoccaPreview(canvas, ctx)
      else if (type === 'testa') renderTestaPreview(canvas, ctx)
      else if (type === 'mano') renderManoPreview(canvas, ctx)
    }

    previewAnimRef.current = requestAnimationFrame(() => renderPreview(type))
  }

  const renderBoccaPreview = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const results = faceResultsRef.current
    const currentConfig = configRef.current // Usa ref per valori aggiornati

    if (!results?.multiFaceLandmarks?.length) {
      ctx.fillStyle = '#fff'
      ctx.font = '18px Arial'
      ctx.fillText('Nessun volto rilevato...', 10, 30)
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    const mirrored = landmarks.map((lm: any) => ({ ...lm, x: 1 - lm.x }))

    // Disegna face mesh
    if (window.drawConnectors && window.FACEMESH_TESSELATION) {
      window.drawConnectors(ctx, mirrored, window.FACEMESH_TESSELATION, { color: '#C0C0C040', lineWidth: 1 })
    }

    // Calcola apertura bocca
    const upperLip = landmarks[13]
    const lowerLip = landmarks[14]
    const faceHeight = Math.abs(landmarks[10].y - landmarks[152].y)
    const mouthOpening = Math.abs(lowerLip.y - upperLip.y)
    const normalizedOpening = (mouthOpening / faceHeight) * 100

    const threshold = currentConfig.soglia_bocca
    const isMouthOpen = normalizedOpening > threshold

    // Barra apertura bocca
    const barY = canvas.height - 70
    const barHeight = 30
    const barMaxWidth = canvas.width - 40
    const barX = 20

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(barX, barY, barMaxWidth, barHeight)

    const fillWidth = Math.min((normalizedOpening / 20) * barMaxWidth, barMaxWidth)
    ctx.fillStyle = isMouthOpen ? '#4CAF50' : '#ff5722'
    ctx.fillRect(barX, barY, fillWidth, barHeight)

    // Linea soglia rossa
    const thresholdX = barX + (threshold / 20) * barMaxWidth
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(thresholdX, barY - 5)
    ctx.lineTo(thresholdX, barY + barHeight + 5)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#FF0000'
    ctx.font = 'bold 12px Arial'
    ctx.fillText(`Soglia: ${threshold}`, thresholdX - 25, barY - 10)

    // Stato
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(barX, barY - 50, 280, 32)
    ctx.fillStyle = isMouthOpen ? '#4CAF50' : '#ff5722'
    ctx.font = 'bold 22px Arial'
    ctx.fillText(`${isMouthOpen ? 'BOCCA APERTA' : 'BOCCA CHIUSA'}  (${normalizedOpening.toFixed(1)})`, barX + 8, barY - 28)

    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(barX, barY, barMaxWidth, barHeight)
  }

  const renderTestaPreview = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const results = faceResultsRef.current
    const currentConfig = configRef.current // Usa ref per valori aggiornati
    const toleranceSx = currentConfig.tolleranza_testa_sx / 100
    const toleranceDx = currentConfig.tolleranza_testa_dx / 100

    const centerX = canvas.width / 2

    // Linea mediana centrale
    ctx.setLineDash([8, 6])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, canvas.height)
    ctx.stroke()
    ctx.setLineDash([])

    // Zone di tolleranza (separate per sinistra e destra)
    const leftThreshX = (0.5 - toleranceSx) * canvas.width
    const rightThreshX = (0.5 + toleranceDx) * canvas.width

    ctx.fillStyle = 'rgba(76, 175, 80, 0.15)'
    ctx.fillRect(0, 0, leftThreshX, canvas.height)

    ctx.fillStyle = 'rgba(33, 150, 243, 0.15)'
    ctx.fillRect(rightThreshX, 0, canvas.width - rightThreshX, canvas.height)

    // Linee soglia
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1.5

    ctx.strokeStyle = 'rgba(76, 175, 80, 0.7)'
    ctx.beginPath()
    ctx.moveTo(leftThreshX, 0)
    ctx.lineTo(leftThreshX, canvas.height)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(33, 150, 243, 0.7)'
    ctx.beginPath()
    ctx.moveTo(rightThreshX, 0)
    ctx.lineTo(rightThreshX, canvas.height)
    ctx.stroke()
    ctx.setLineDash([])

    // Etichette
    ctx.font = 'bold 14px Arial'
    ctx.fillStyle = '#4CAF50'
    ctx.fillText('\u2190 SINISTRA', 10, canvas.height - 15)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('CENTRO', centerX - 28, canvas.height - 15)
    ctx.fillStyle = '#2196F3'
    ctx.fillText('DESTRA \u2192', canvas.width - 100, canvas.height - 15)

    if (!results?.multiFaceLandmarks?.length) {
      ctx.fillStyle = '#fff'
      ctx.font = '18px Arial'
      ctx.fillText('Nessun volto rilevato...', 10, 30)
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    const mirrored = landmarks.map((lm: any) => ({ ...lm, x: 1 - lm.x }))

    if (window.drawConnectors && window.FACEMESH_TESSELATION) {
      window.drawConnectors(ctx, mirrored, window.FACEMESH_TESSELATION, { color: '#C0C0C040', lineWidth: 1 })
    }

    // Posizione naso
    const mirroredNoseX = 1 - landmarks[4].x
    const nosePixelX = mirroredNoseX * canvas.width
    const nosePixelY = landmarks[4].y * canvas.height

    ctx.beginPath()
    ctx.arc(nosePixelX, nosePixelY, 12, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Linea dal naso
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(nosePixelX, 0)
    ctx.lineTo(nosePixelX, canvas.height)
    ctx.stroke()
    ctx.setLineDash([])

    // Direzione
    let direction = 'CENTRO'
    let dirColor = 'rgba(255,255,255,0.8)'
    if (mirroredNoseX < 0.5 - toleranceSx) {
      direction = 'SINISTRA'
      dirColor = '#4CAF50'
    } else if (mirroredNoseX > 0.5 + toleranceDx) {
      direction = 'DESTRA'
      dirColor = '#2196F3'
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(10, 8, 250, 35)
    ctx.fillStyle = dirColor
    ctx.font = 'bold 22px Arial'
    ctx.fillText(`Direzione: ${direction}`, 18, 33)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(10, 48, 280, 22)
    ctx.fillStyle = '#fff'
    ctx.font = '13px Arial'
    ctx.fillText(`Toll. SX: ${(toleranceSx * 100).toFixed(0)}%  |  Toll. DX: ${(toleranceDx * 100).toFixed(0)}%`, 18, 64)
  }

  const renderManoPreview = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const results = handResultsRef.current
    const currentConfig = configRef.current // Usa ref per valori aggiornati
    const roiX = currentConfig.roi_x_tab3
    const roiY = currentConfig.roi_y_tab3
    const roiSize = currentConfig.roi_size_tab3

    // Disegna ROI (mirrored)
    const roiDisplayX = (1 - roiX) * canvas.width - roiSize / 2
    const roiDisplayY = roiY * canvas.height - roiSize / 2

    ctx.strokeStyle = '#4CAF50'
    ctx.lineWidth = 4
    ctx.strokeRect(roiDisplayX, roiDisplayY, roiSize, roiSize)
    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)'
    ctx.fillRect(roiDisplayX, roiDisplayY, roiSize, roiSize)

    // Etichetta ROI
    ctx.fillStyle = '#4CAF50'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('AREA ROI', roiDisplayX + roiSize / 2, roiDisplayY - 8)
    ctx.textAlign = 'left'

    // Istruzioni
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(10, 8, 320, 30)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px Arial'
    ctx.fillText('Trascina per spostare l\'area ROI', 18, 28)

    if (!results?.multiHandLandmarks?.length) {
      ctx.fillStyle = '#fff'
      ctx.font = '18px Arial'
      ctx.fillText('Nessuna mano rilevata...', 10, canvas.height - 20)
      return
    }

    // Disegna punte dita
    results.multiHandLandmarks.forEach((landmarks: any) => {
      FINGERTIP_LANDMARKS.forEach((tip) => {
        const lm = landmarks[tip.index]
        const x = (1 - lm.x) * canvas.width
        const y = lm.y * canvas.height

        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.fillStyle = tip.color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    })
  }

  const handlePreviewCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (previewType !== 'mano') return
    roiDragRef.current.dragging = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePreviewCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!roiDragRef.current.dragging) return
    if (previewType !== 'mano') return

    const rect = e.currentTarget.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) * (640 / rect.width)
    const canvasY = (e.clientY - rect.top) * (480 / rect.height)

    // Converti in coordinate normalizzate (non mirrored)
    const normalizedX = 1 - (canvasX / 640)
    const normalizedY = canvasY / 480

    // Clamp
    const clampedX = Math.max(0.1, Math.min(0.9, normalizedX))
    const clampedY = Math.max(0.1, Math.min(0.9, normalizedY))

    setConfig(c => ({ ...c, roi_x_tab3: clampedX, roi_y_tab3: clampedY }))
  }

  const handlePreviewCanvasPointerUp = () => {
    roiDragRef.current.dragging = false
  }

  const closePreview = () => {
    setPreviewType(null)
    isInitializingRef.current = false

    // Ferma la Camera di MediaPipe
    if (mediapipeCameraRef.current) {
      mediapipeCameraRef.current.stop()
      mediapipeCameraRef.current = null
    }

    if (previewAnimRef.current) {
      cancelAnimationFrame(previewAnimRef.current)
      previewAnimRef.current = null
    }

    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(track => track.stop())
      previewStreamRef.current = null
    }

    if (previewVideoRef.current) {
      previewVideoRef.current.remove()
      previewVideoRef.current = null
    }

    faceResultsRef.current = null
    handResultsRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePreview()
    }
  }, [])

  const TAB_LABELS = [
    { id: 'bocca', label: '👄 Bocca', color: 'rose' },
    { id: 'testa', label: '↔️ Testa', color: 'emerald' },
    { id: 'mano', label: '✋ Mano', color: 'amber' },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-blue-700 to-indigo-700 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/training_cognitivo/strumenti/movimento-corpo-youtube" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors">
              <Home className="h-5 w-5 text-white" />
            </a>
            <Link href={`/training_cognitivo/strumenti/movimento-corpo-youtube/esercizio${selectedUserId ? `?utente=${selectedUserId}` : ''}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 text-sm font-bold shadow">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Utente</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6" /> Area Educatore
          </h1>
          <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <RotateCcw className="h-5 w-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione Utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" /> Seleziona Utente
          </h2>
          <select value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); const u = utenti.find(u => u.id === e.target.value); if (u) setSelectedUserName(`${u.nome} ${u.cognome}`) }}
            className="w-full p-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
            disabled={currentUserRole === 'utente'}>
            <option value="">-- Seleziona un utente --</option>
            {utenti.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
          </select>
        </section>

        {selectedUserId && (
          <>
            {/* Tab di configurazione */}
            <section className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Tab buttons */}
              <div className="grid grid-cols-4 border-b">
                {TAB_LABELS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`py-3 px-2 text-sm font-bold transition-all ${activeTab === t.id ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {/* TAB BOCCA */}
                {activeTab === 'bocca' && (
                  <div className="space-y-5">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                      <h3 className="font-bold text-rose-700 mb-1">👄 Controllo con la Bocca</h3>
                      <p className="text-rose-600 text-sm">L'utente apre la bocca per avviare il video. Il video si ferma dopo il timer.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Link YouTube</label>
                      <input type="text" value={config.link_youtube_tab1} onChange={e => setField('link_youtube_tab1', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..." className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Inizio brano (secondi)</label>
                        <input type="number" value={config.inizio_brano_tab1} onChange={e => setField('inizio_brano_tab1', parseInt(e.target.value) || 0)}
                          min="0" className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Fine brano (secondi, 0=fino alla fine)</label>
                        <input type="number" value={config.fine_brano_tab1} onChange={e => setField('fine_brano_tab1', parseInt(e.target.value) || 0)}
                          min="0" className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Soglia apertura bocca: <span className="text-rose-600 font-bold">{config.soglia_bocca}</span>
                        <span className="text-gray-400 text-xs ml-2">(più basso = più sensibile)</span>
                      </label>
                      <input type="range" min="1" max="15" step="1" value={config.soglia_bocca} onChange={e => setField('soglia_bocca', parseInt(e.target.value))}
                        className="w-full accent-rose-500" />
                      <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Molto sensibile (1)</span><span>Poco sensibile (15)</span></div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                      <label className="block text-sm font-semibold text-rose-700 mb-2">
                        Timer riproduzione: <span className="font-bold text-lg">{config.timer_durata_tab1} secondi</span>
                      </label>
                      <input type="range" min="3" max="60" step="1" value={config.timer_durata_tab1} onChange={e => setField('timer_durata_tab1', parseInt(e.target.value))}
                        className="w-full accent-rose-500" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1"><span>3s</span><span>30s</span><span>60s</span></div>
                      <p className="text-xs text-rose-600 mt-2">Il video suona per questo tempo dopo l'apertura della bocca</p>
                    </div>
                    {/* Bottone Anteprima Webcam */}
                    <button onClick={() => openPreview('bocca')} disabled={!scriptsLoaded}
                      className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      <Camera className="h-5 w-5" />
                      {scriptsLoaded ? 'Anteprima Webcam - Calibra Soglia' : 'Caricamento MediaPipe...'}
                    </button>
                  </div>
                )}

                {/* TAB TESTA */}
                {activeTab === 'testa' && (
                  <div className="space-y-5">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <h3 className="font-bold text-emerald-700 mb-1">↔️ Controllo con la Testa</h3>
                      <p className="text-emerald-600 text-sm">Testa a <strong>sinistra</strong> → Video 1 &nbsp;|&nbsp; Testa a <strong>destra</strong> → Video 2</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-700">🎬 Video 1 — Testa a Sinistra</h4>
                        <input type="text" value={config.link_youtube_tab2_1} onChange={e => setField('link_youtube_tab2_1', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..." className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-700">🎬 Video 2 — Testa a Destra</h4>
                        <input type="text" value={config.link_youtube_tab2_2} onChange={e => setField('link_youtube_tab2_2', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..." className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Inizio brano (s)</label>
                        <input type="number" value={config.inizio_brano_tab2} onChange={e => setField('inizio_brano_tab2', parseInt(e.target.value) || 0)}
                          min="0" className="w-full p-3 border-2 border-gray-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Fine brano (s)</label>
                        <input type="number" value={config.fine_brano_tab2} onChange={e => setField('fine_brano_tab2', parseInt(e.target.value) || 0)}
                          min="0" className="w-full p-3 border-2 border-gray-200 rounded-lg" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <label className="block text-sm font-semibold text-green-700 mb-2">
                          ← Tolleranza SINISTRA: <span className="font-bold">{config.tolleranza_testa_sx}%</span>
                        </label>
                        <input type="range" min="5" max="40" value={config.tolleranza_testa_sx} onChange={e => setField('tolleranza_testa_sx', parseInt(e.target.value))}
                          className="w-full accent-green-500" />
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Preciso (5%)</span><span>Permissivo (40%)</span></div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <label className="block text-sm font-semibold text-blue-700 mb-2">
                          Tolleranza DESTRA →: <span className="font-bold">{config.tolleranza_testa_dx}%</span>
                        </label>
                        <input type="range" min="5" max="40" value={config.tolleranza_testa_dx} onChange={e => setField('tolleranza_testa_dx', parseInt(e.target.value))}
                          className="w-full accent-blue-500" />
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Preciso (5%)</span><span>Permissivo (40%)</span></div>
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <label className="block text-sm font-semibold text-emerald-700 mb-2">
                        Timer riproduzione: <span className="font-bold text-lg">{config.timer_durata_tab2} secondi</span>
                      </label>
                      <input type="range" min="3" max="60" step="1" value={config.timer_durata_tab2} onChange={e => setField('timer_durata_tab2', parseInt(e.target.value))}
                        className="w-full accent-emerald-500" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1"><span>3s</span><span>30s</span><span>60s</span></div>
                      <p className="text-xs text-emerald-600 mt-2">Il video suona per questo tempo dopo il movimento della testa</p>
                    </div>
                    {/* Bottone Anteprima Webcam */}
                    <button onClick={() => openPreview('testa')} disabled={!scriptsLoaded}
                      className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      <Camera className="h-5 w-5" />
                      {scriptsLoaded ? 'Anteprima Webcam - Calibra Zone' : 'Caricamento MediaPipe...'}
                    </button>
                  </div>
                )}

                {/* TAB MANO */}
                {activeTab === 'mano' && (
                  <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h3 className="font-bold text-amber-700 mb-1">✋ Controllo con Mano</h3>
                      <p className="text-amber-600 text-sm">L'utente porta una mano (sinistra o destra) nell'area ROI configurata per attivare il video.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Link YouTube</label>
                      <input type="text" value={config.link_youtube_tab3} onChange={e => setField('link_youtube_tab3', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..." className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Inizio brano (s)</label>
                        <input type="number" value={config.inizio_brano_tab3} onChange={e => setField('inizio_brano_tab3', parseInt(e.target.value) || 0)} min="0" className="w-full p-3 border-2 border-gray-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Fine brano (s)</label>
                        <input type="number" value={config.fine_brano_tab3} onChange={e => setField('fine_brano_tab3', parseInt(e.target.value) || 0)} min="0" className="w-full p-3 border-2 border-gray-200 rounded-lg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Modalità attivazione</label>
                      <select value={config.modalita_tab3} onChange={e => setField('modalita_tab3', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg">
                        <option value="mantieni_attivo">Mantieni attivo (finché mano è nell'area)</option>
                        <option value="attiva_con_area">Attiva con timer (mano entra → play per X secondi)</option>
                      </select>
                    </div>
                    {config.modalita_tab3 === 'attiva_con_area' && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <label className="block text-sm font-semibold text-amber-700 mb-2">
                          Timer riproduzione: <span className="font-bold text-lg">{config.timer_durata_tab3} secondi</span>
                        </label>
                        <input type="range" min="3" max="60" step="1" value={config.timer_durata_tab3} onChange={e => setField('timer_durata_tab3', parseInt(e.target.value))}
                          className="w-full accent-amber-500" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1"><span>3s</span><span>30s</span><span>60s</span></div>
                      </div>
                    )}
                    {/* Bottone Anteprima Webcam */}
                    <button onClick={() => openPreview('mano')} disabled={!scriptsLoaded}
                      className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      <Camera className="h-5 w-5" />
                      {scriptsLoaded ? 'Configura Area ROI con Webcam' : 'Caricamento MediaPipe...'}
                    </button>
                  </div>
                )}

              </div>
            </section>

            {/* Tab attiva di default */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-blue-700 mb-4">Tab attiva all'avvio</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: 1, label: '👄 Bocca' },
                  { v: 2, label: '↔️ Testa' },
                  { v: 3, label: '✋ Mano' },
                ].map(t => (
                  <button key={t.v} onClick={() => setField('tab_attiva', t.v)}
                    className={`py-3 rounded-xl font-bold transition-all ${config.tab_attiva === t.v ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Salva */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={saveConfig} disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Salva Configurazione
              </button>
              <Link href={`/training_cognitivo/strumenti/movimento-corpo-youtube/esercizio?utente=${selectedUserId}`}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-full hover:from-emerald-600 hover:to-teal-600 flex items-center gap-2 shadow-lg">
                <Play className="h-5 w-5" /> Vai all'Esercizio
              </Link>
            </div>
          </>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 z-50 ${toast.type === 'success' ? 'bg-blue-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* Modale Anteprima Webcam */}
      {previewType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden max-h-[95vh] overflow-y-auto">
            {/* Header modale */}
            <div className={`p-4 flex items-center justify-between ${
              previewType === 'bocca' ? 'bg-rose-500' :
              previewType === 'testa' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {previewType === 'bocca' && 'Anteprima Bocca'}
                {previewType === 'testa' && 'Anteprima Testa'}
                {previewType === 'mano' && 'Anteprima Mano'}
              </h3>
              <button onClick={closePreview} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Istruzioni */}
            <div className={`px-4 py-2 text-sm ${
              previewType === 'bocca' ? 'bg-rose-50 text-rose-700' :
              previewType === 'testa' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {previewType === 'bocca' && (
                <p>La barra verde indica l'apertura della bocca. La linea rossa è la soglia impostata. Regola lo slider "Soglia Apertura Bocca" per calibrare.</p>
              )}
              {previewType === 'testa' && (
                <p>La linea bianca tratteggiata è il centro. Le zone colorate indicano le aree destra (blu) e sinistra (verde). Regola la tolleranza per calibrare.</p>
              )}
              {previewType === 'mano' && (
                <p>Trascina l'area verde ROI per posizionarla dove preferisci. Le punte delle dita sono evidenziate con colori diversi.</p>
              )}
            </div>

            {/* Canvas webcam */}
            <div className="p-4 bg-gray-900">
              <canvas
                ref={canvasRefCallback}
                className={`w-full rounded-lg ${previewType === 'mano' ? 'cursor-crosshair' : ''}`}
                style={{ aspectRatio: '4/3' }}
                onPointerDown={handlePreviewCanvasPointerDown}
                onPointerMove={handlePreviewCanvasPointerMove}
                onPointerUp={handlePreviewCanvasPointerUp}
                onPointerLeave={handlePreviewCanvasPointerUp}
              />
            </div>

            {/* Controlli live */}
            <div className="p-4 bg-gray-50 space-y-3">
              {previewType === 'bocca' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Soglia apertura bocca: <span className="text-rose-600 font-bold">{config.soglia_bocca}</span>
                  </label>
                  <input type="range" min="1" max="15" step="1" value={config.soglia_bocca}
                    onChange={e => setField('soglia_bocca', parseInt(e.target.value))}
                    className="w-full accent-rose-500" />
                </div>
              )}
              {previewType === 'testa' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-700 mb-1">
                      ← Sinistra: <span className="font-bold">{config.tolleranza_testa_sx}%</span>
                    </label>
                    <input type="range" min="5" max="40" value={config.tolleranza_testa_sx}
                      onChange={e => setField('tolleranza_testa_sx', parseInt(e.target.value))}
                      className="w-full accent-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-blue-700 mb-1">
                      Destra →: <span className="font-bold">{config.tolleranza_testa_dx}%</span>
                    </label>
                    <input type="range" min="5" max="40" value={config.tolleranza_testa_dx}
                      onChange={e => setField('tolleranza_testa_dx', parseInt(e.target.value))}
                      className="w-full accent-blue-500" />
                  </div>
                </div>
              )}
              {previewType === 'mano' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">
                        ← Sinistra / Destra → <span className="font-bold">{(config.roi_x_tab3 * 100).toFixed(0)}%</span>
                      </label>
                      <input type="range" min="0.1" max="0.9" step="0.02" value={config.roi_x_tab3}
                        onChange={e => setField('roi_x_tab3', parseFloat(e.target.value))}
                        className="w-full accent-amber-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">
                        ↑ Alto / Basso ↓ <span className="font-bold">{(config.roi_y_tab3 * 100).toFixed(0)}%</span>
                      </label>
                      <input type="range" min="0.1" max="0.9" step="0.02" value={config.roi_y_tab3}
                        onChange={e => setField('roi_y_tab3', parseFloat(e.target.value))}
                        className="w-full accent-amber-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">
                        Dimensione <span className="font-bold">{config.roi_size_tab3}px</span>
                      </label>
                      <input type="range" min="60" max="300" step="10" value={config.roi_size_tab3}
                        onChange={e => setField('roi_size_tab3', parseFloat(e.target.value))}
                        className="w-full accent-amber-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Puoi anche trascinare direttamente l'area ROI nel video</p>
                </div>
              )}

              <button onClick={closePreview}
                className={`w-full py-3 text-white font-bold rounded-xl transition-colors ${
                  previewType === 'bocca' ? 'bg-rose-500 hover:bg-rose-600' :
                  previewType === 'testa' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
                }`}>
                Chiudi Anteprima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script MediaPipe da CDN ufficiale */}
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" strategy="afterInteractive" crossOrigin="anonymous" onLoad={handleScriptsReady} />
    </div>
  )
}
