/**
 * Ascolto la Musica - Area Utente
 *
 * Riproduzione brani YouTube per utenti:
 * - Lista brani raggruppati per categoria
 * - Player YouTube integrato
 * - Selezione utente per staff
 */
'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Play, Pause, Music, ChevronDown, ChevronUp,
  Volume2, Clock, RefreshCw, Users, Sliders, Shuffle, Trash2, Settings, ExternalLink, AlertTriangle, Timer, Lock, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface Brano {
  id_brano: number
  id_utente: string
  nome_brano: string
  categoria: string
  link_youtube: string
  inizio_brano: number
  fine_brano: number
  domanda?: string
}

interface CategoriaGroup {
  categoria: string
  brani: Brano[]
  expanded: boolean
}

interface Utente {
  id: string
  nome: string
  cognome: string
}

// Ruoli staff che possono vedere tutti gli utenti
const RUOLI_STAFF = ['sviluppatore', 'amministratore', 'direttore', 'casemanager']

// Loading fallback per Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Caricamento...</p>
      </div>
    </div>
  )
}

// Componente principale wrappato con Suspense per useSearchParams
export default function AscoltaMusicaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AscoltaMusicaContent />
    </Suspense>
  )
}

function AscoltaMusicaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()
  const playerRef = useRef<any>(null)
  const sessionIdRef = useRef<string>('')
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const utenteIdFromUrl = searchParams.get('utente')

  // Stati utenti
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUtente, setSelectedUtente] = useState<Utente | null>(null)
  const [isRegularUser, setIsRegularUser] = useState(false)

  // Stati brani
  const [brani, setBrani] = useState<Brano[]>([])
  const [categorieGroups, setCategorieGroups] = useState<CategoriaGroup[]>([])
  const [selectedBrano, setSelectedBrano] = useState<Brano | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<number | null>(null)

  // Opzioni ascolto
  const [showOptions, setShowOptions] = useState(false)
  const [playMode, setPlayMode] = useState<'direct' | 'random' | 'timed' | 'persistent'>('direct')
  const [timerDuration, setTimerDuration] = useState(30) // secondi
  const [timerActive, setTimerActive] = useState(false)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Refs
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const isPlayerInitializing = useRef(false)
  const pausedAtTimeRef = useRef<number | null>(null) // Posizione video quando timer scade

  // Genera session ID
  useEffect(() => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    sessionIdRef.current = `session_${timestamp}_${random}`
  }, [])

  // Carica YouTube IFrame API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      // Callback quando l'API è pronta
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube IFrame API pronta')
      }
    }
  }, [])

  // Estrai ID video YouTube
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Carica brani di un utente
  const loadBrani = useCallback(async (idUtente: string) => {
    try {
      const { data, error } = await supabaseRef.current
        .from('ascolto_musica_brani')
        .select('*')
        .eq('id_utente', idUtente)
        .eq('stato', 'attivo')
        .order('categoria')
        .order('nome_brano')

      if (error) throw error

      setBrani(data || [])

      // Raggruppa per categoria
      const groups: { [key: string]: Brano[] } = {}
      ;(data || []).forEach((brano) => {
        if (!groups[brano.categoria]) {
          groups[brano.categoria] = []
        }
        groups[brano.categoria].push(brano)
      })

      const categorieArray: CategoriaGroup[] = Object.entries(groups).map(([cat, braniCat]) => ({
        categoria: cat,
        brani: braniCat,
        expanded: true
      }))

      setCategorieGroups(categorieArray)
    } catch (err: any) {
      console.error('Errore caricamento brani:', err)
    }
  }, [])

  // Carica utenti in base al ruolo
  const loadUtenti = useCallback(async () => {
    if (!user || isLoadingRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const { data: profileData, error: profileError } = await supabaseRef.current
        .from('profiles')
        .select('id, nome, cognome, id_ruolo, ruoli(codice)')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const ruolo = (profileData?.ruoli as any)?.codice || 'utente'

      if (ruolo === 'utente') {
        setIsRegularUser(true)
        const currentUser: Utente = {
          id: user.id,
          nome: profileData?.nome || '',
          cognome: profileData?.cognome || ''
        }
        setUtenti([currentUser])
        setSelectedUtente(currentUser)
        await loadBrani(user.id)
        hasLoadedRef.current = true
        return
      }

      if (RUOLI_STAFF.includes(ruolo)) {
        const { data: ruoloUtente } = await supabaseRef.current
          .from('ruoli')
          .select('id')
          .eq('codice', 'utente')
          .single()

        if (ruoloUtente) {
          const { data: profili, error: profError } = await supabaseRef.current
            .from('profiles')
            .select('id, nome, cognome')
            .eq('id_ruolo', ruoloUtente.id)
            .order('cognome')

          if (profError) throw profError
          setUtenti(profili || [])
        }
      } else if (ruolo === 'educatore') {
        const { data: assegnazioni, error: assError } = await supabaseRef.current
          .from('educatori_utenti')
          .select('id_utente')
          .eq('id_educatore', user.id)
          .eq('stato', 'attivo')

        if (assError) throw assError

        if (assegnazioni && assegnazioni.length > 0) {
          const utentiIds = assegnazioni.map(a => a.id_utente)

          const { data: profili, error: profError } = await supabaseRef.current
            .from('profiles')
            .select('id, nome, cognome')
            .in('id', utentiIds)
            .order('cognome')

          if (profError) throw profError
          setUtenti(profili || [])
        } else {
          setUtenti([])
        }
      }

      hasLoadedRef.current = true
    } catch (err: any) {
      console.error('Errore caricamento utenti:', err)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [user, loadBrani])

  // Effetto iniziale
  useEffect(() => {
    if (!isAuthLoading && user) {
      loadUtenti()
    }
  }, [isAuthLoading, user, loadUtenti])

  // Auto-seleziona utente da URL
  useEffect(() => {
    if (utenteIdFromUrl && utenti.length > 0 && !selectedUtente) {
      const utente = utenti.find(u => u.id === utenteIdFromUrl)
      if (utente) {
        selectUtente(utente)
      }
    }
  }, [utenteIdFromUrl, utenti, selectedUtente])

  // Cleanup timer quando il componente si smonta
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  // Seleziona utente
  const selectUtente = async (utente: Utente) => {
    setSelectedUtente(utente)
    setSelectedBrano(null)
    // Distruggi player esistente
    if (playerRef.current) {
      try {
        playerRef.current.destroy()
      } catch (e) {}
      playerRef.current = null
      setPlayerReady(false)
    }
    await loadBrani(utente.id)
  }

  // Toggle categoria
  const toggleCategoria = (index: number) => {
    setCategorieGroups(prev => prev.map((cat, i) =>
      i === index ? { ...cat, expanded: !cat.expanded } : cat
    ))
  }

  // Inizializza player YouTube - distrugge e ricrea ogni volta (come nella versione PHP)
  const initOrUpdatePlayer = useCallback((brano: Brano) => {
    const videoId = extractYouTubeId(brano.link_youtube)
    if (!videoId) return

    // Aspetta che l'API YouTube sia caricata
    if (typeof window === 'undefined' || typeof window.YT === 'undefined' || typeof window.YT.Player === 'undefined') {
      console.log('API YouTube non ancora caricata, attendo...')
      setTimeout(() => initOrUpdatePlayer(brano), 500)
      return
    }

    const container = document.getElementById('youtube-player')
    if (!container) {
      setTimeout(() => initOrUpdatePlayer(brano), 100)
      return
    }

    // Distruggi player esistente (come nella versione PHP)
    if (playerRef.current) {
      try {
        playerRef.current.destroy()
        console.log('Player precedente distrutto')
      } catch (e) {
        console.log('Errore distruzione player:', e)
      }
      playerRef.current = null
      setPlayerReady(false)
    }

    console.log('Creazione player YouTube per video:', videoId)

    try {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: (event: any) => {
            console.log('Player YouTube pronto')
            setPlayerReady(true)
            // Seek al tempo di inizio se specificato
            if (brano.inizio_brano > 0) {
              event.target.seekTo(brano.inizio_brano, true)
            }
            event.target.playVideo()
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false)
              // In modalità random, riproduci un altro brano
              if (playMode === 'random' && brani.length > 1) {
                setTimeout(() => {
                  const randomIndex = Math.floor(Math.random() * brani.length)
                  const randomBrano = brani[randomIndex]
                  if (randomBrano.id_brano !== brano.id_brano) {
                    playBrano(randomBrano)
                  } else if (brani.length > 1) {
                    const nextIndex = (randomIndex + 1) % brani.length
                    playBrano(brani[nextIndex])
                  }
                }, 1000)
              }
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true)
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false)
            }
          },
          onError: (event: any) => {
            console.error('Errore YouTube player:', event.data)
            setPlayerError(event.data)
            setIsPlaying(false)
          }
        }
      })
    } catch (e) {
      console.error('Errore creazione player:', e)
    }
  }, [playMode, brani])

  // Apri video su YouTube
  const openOnYouTube = (brano: Brano) => {
    const videoId = extractYouTubeId(brano.link_youtube)
    if (videoId) {
      let url = `https://www.youtube.com/watch?v=${videoId}`
      if (brano.inizio_brano > 0) {
        url += `&t=${brano.inizio_brano}`
      }
      window.open(url, '_blank')
    }
  }

  // Avvia timer per modalità timed/persistent
  const startTimer = useCallback(() => {
    // Pulisci timer precedente
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    setTimerActive(true)
    setTimerRemaining(timerDuration)

    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          // Timer scaduto: salva posizione e metti in pausa
          clearInterval(timerIntervalRef.current!)
          timerIntervalRef.current = null
          setTimerActive(false)
          if (playerRef.current) {
            // Salva la posizione corrente prima di mettere in pausa
            try {
              pausedAtTimeRef.current = playerRef.current.getCurrentTime()
            } catch (e) {
              pausedAtTimeRef.current = null
            }
            playerRef.current.pauseVideo()
          }
          setIsPlaying(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [timerDuration])

  // Riproduci brano
  const playBrano = useCallback(async (brano: Brano) => {
    const videoId = extractYouTubeId(brano.link_youtube)
    if (!videoId) return

    // In modalità persistent con timer attivo, ignora i click
    if (playMode === 'persistent' && timerActive) {
      return
    }

    // Se è lo stesso brano e il player esiste, riprendi dalla posizione salvata
    if (selectedBrano?.id_brano === brano.id_brano && playerRef.current && pausedAtTimeRef.current !== null) {
      try {
        playerRef.current.seekTo(pausedAtTimeRef.current, true)
        playerRef.current.playVideo()
        setIsPlaying(true)
        pausedAtTimeRef.current = null // Reset posizione salvata
        // Avvia timer se in modalità timed o persistent
        if (playMode === 'timed' || playMode === 'persistent') {
          startTimer()
        }
        return
      } catch (e) {
        // Se fallisce, continua con la logica normale
        console.log('Errore ripresa video, ricreo player')
      }
    }

    // Reset posizione salvata quando si cambia brano
    pausedAtTimeRef.current = null

    setSelectedBrano(brano)
    setIsPlaying(true)
    setPlayerError(null)

    // Log ascolto (ignora errori)
    try {
      await supabaseRef.current
        .from('ascolto_musica_log')
        .insert({
          id_brano: brano.id_brano,
          id_utente: selectedUtente?.id,
          sessione: sessionIdRef.current,
          durata_ascolto: 0,
          completato: false
        })
    } catch (err) {
      // Ignora errori di log
    }

    // Piccolo delay per assicurarsi che il div sia nel DOM
    setTimeout(() => {
      initOrUpdatePlayer(brano)
      // Avvia timer se in modalità timed o persistent
      if (playMode === 'timed' || playMode === 'persistent') {
        startTimer()
      }
    }, 100)
  }, [selectedUtente, selectedBrano, initOrUpdatePlayer, playMode, timerActive, startTimer])

  // Riproduci brano casuale
  const playRandomBrano = useCallback(() => {
    if (brani.length === 0) return
    const randomIndex = Math.floor(Math.random() * brani.length)
    playBrano(brani[randomIndex])
  }, [brani, playBrano])

  // Elimina brano
  const deleteBrano = async (brano: Brano, e: React.MouseEvent) => {
    e.stopPropagation() // Evita di avviare la riproduzione

    if (!confirm(`Vuoi eliminare il brano "${brano.nome_brano}"?`)) return

    try {
      const { error } = await supabaseRef.current
        .from('ascolto_musica_brani')
        .delete()
        .eq('id_brano', brano.id_brano)

      if (error) throw error

      // Se stavo riproducendo questo brano, fermati
      if (selectedBrano?.id_brano === brano.id_brano) {
        if (playerRef.current) {
          try {
            playerRef.current.destroy()
          } catch (e) {}
          playerRef.current = null
        }
        setSelectedBrano(null)
        setIsPlaying(false)
        setPlayerReady(false)
      }

      // Ricarica i brani
      if (selectedUtente) {
        await loadBrani(selectedUtente.id)
      }
    } catch (err: any) {
      console.error('Errore eliminazione brano:', err)
      alert('Errore durante l\'eliminazione del brano')
    }
  }

  // Formatta tempo in mm:ss
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // Loading
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800">
      {/* Header */}
      <header className="bg-blue-700 shadow-lg p-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/training_cognitivo/strumenti/ascolto-la-musica')}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            {selectedUtente && (
              <button
                onClick={() => setShowOptions(!showOptions)}
                className={`p-2 rounded-full transition-colors ${showOptions ? 'bg-white text-blue-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
                title="Opzioni ascolto"
              >
                <Sliders className="h-5 w-5" />
              </button>
            )}
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="h-6 w-6" />
            {isRegularUser ? 'I Miei Brani' : 'Ascolta Brani'}
          </h1>

          <div className="flex items-center gap-2">
            {/* Bottone Area Educatore - solo per staff */}
            {!isRegularUser && selectedUtente && (
              <button
                onClick={() => {
                  // Distruggi player prima di navigare
                  if (playerRef.current) {
                    try {
                      playerRef.current.destroy()
                    } catch (e) {}
                    playerRef.current = null
                  }
                  router.push(`/training_cognitivo/strumenti/ascolto-la-musica/educatore?utente=${selectedUtente.id}`)
                }}
                className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Vai all'Area Educatore"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Area Educatore</span>
              </button>
            )}
            <button
              onClick={() => {
                hasLoadedRef.current = false
                if (selectedUtente) {
                  loadBrani(selectedUtente.id)
                }
              }}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Aggiorna"
            >
              <RefreshCw className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Dropdown selezione utente - visibile solo per staff */}
        {!isRegularUser && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">Seleziona Utente:</span>
                </div>
                <select
                  value={selectedUtente?.id || ''}
                  onChange={(e) => {
                    const utente = utenti.find(u => u.id === e.target.value)
                    if (utente) selectUtente(utente)
                  }}
                  className="flex-1 max-w-md px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Seleziona un utente --</option>
                  {utenti.map((utente) => (
                    <option key={utente.id} value={utente.id}>
                      {utente.cognome} {utente.nome}
                    </option>
                  ))}
                </select>
                {utenti.length === 0 && (
                  <span className="text-gray-500 text-sm">Nessun utente trovato</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drawer Opzioni - Menu laterale a scomparsa */}
        {showOptions && (
          <>
            {/* Overlay scuro */}
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setShowOptions(false)}
            />
            {/* Drawer */}
            <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform">
              {/* Header drawer */}
              <div className="bg-blue-600 text-white p-4 flex items-center justify-between sticky top-0">
                <h3 className="font-bold flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  Opzioni Ascolto
                </h3>
                <button
                  onClick={() => setShowOptions(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                {/* Modi di ascolto */}
                <div className="space-y-2 mb-6">
                  <label className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${playMode === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="playMode"
                      checked={playMode === 'direct'}
                      onChange={() => setPlayMode('direct')}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <span className="font-medium">Ascolto Diretto</span>
                  </label>
                  <label className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${playMode === 'random' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="playMode"
                      checked={playMode === 'random'}
                      onChange={() => setPlayMode('random')}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <Shuffle className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Ascolto Casuale</span>
                  </label>
                  <label className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${playMode === 'timed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="playMode"
                      checked={playMode === 'timed'}
                      onChange={() => setPlayMode('timed')}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <Timer className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Ascolto Temporizzato</span>
                  </label>
                  <label className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${playMode === 'persistent' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="playMode"
                      checked={playMode === 'persistent'}
                      onChange={() => setPlayMode('persistent')}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <Lock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Timer Persistente</span>
                  </label>
                </div>

                {/* Slider durata timer */}
                {(playMode === 'timed' || playMode === 'persistent') && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <label className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-700">Durata ascolto</span>
                      <span className="text-2xl font-bold text-blue-600">{timerDuration}s</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(Number(e.target.value))}
                      className="w-full accent-blue-500 h-3"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>5s</span>
                      <span>60s</span>
                      <span>120s</span>
                    </div>
                  </div>
                )}

                {/* Descrizioni modi */}
                <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-4">
                  {playMode === 'direct' && (
                    <p>Seleziona un brano dalla lista. Ogni brano continua fino alla fine.</p>
                  )}
                  {playMode === 'random' && (
                    <p>Alla fine di ogni brano, ne partirà uno nuovo casualmente dalla lista.</p>
                  )}
                  {playMode === 'timed' && (
                    <p>Dopo <strong>{timerDuration} secondi</strong>, il brano andrà in pausa. Premi PLAY per riprendere.</p>
                  )}
                  {playMode === 'persistent' && (
                    <p>Durante il timer i controlli sono <strong>bloccati</strong>. Ideale per deficit motori con cloni involontari.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {selectedUtente ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Lista Brani - larghezza fissa */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
              {categorieGroups.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <Music className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun Brano</h3>
                  <p className="text-gray-500">
                    {isRegularUser
                      ? 'Non hai ancora brani salvati. Chiedi al tuo educatore di aggiungerne.'
                      : 'Nessun brano trovato per questo utente.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Pulsante ascolto casuale */}
                  {playMode === 'random' && brani.length > 0 && (
                    <button
                      onClick={playRandomBrano}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg p-4 flex items-center justify-center gap-3 hover:from-blue-600 hover:to-indigo-700 transition-all"
                    >
                      <Shuffle className="h-6 w-6" />
                      <span className="font-bold text-lg">Avvia Ascolto Casuale</span>
                    </button>
                  )}

                  {categorieGroups.map((group, index) => (
                    <div key={group.categoria} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                      {/* Header Categoria */}
                      <button
                        onClick={() => toggleCategoria(index)}
                        className="w-full bg-blue-100 p-4 flex justify-between items-center hover:bg-blue-200 transition-colors"
                      >
                        <h2 className="font-bold text-blue-800">{group.categoria}</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-600">{group.brani.length} brani</span>
                          {group.expanded ? (
                            <ChevronUp className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </button>

                      {/* Lista brani categoria */}
                      {group.expanded && (
                        <div className="divide-y">
                          {group.brani.map((brano) => {
                            const videoId = extractYouTubeId(brano.link_youtube)
                            const isSelected = selectedBrano?.id_brano === brano.id_brano

                            return (
                              <div
                                key={brano.id_brano}
                                className={`p-4 flex items-center gap-4 hover:bg-blue-50 transition-colors ${
                                  isSelected ? 'bg-blue-100' : ''
                                }`}
                              >
                                {/* Bottone play con thumbnail */}
                                <button
                                  onClick={() => playBrano(brano)}
                                  className="flex items-center gap-4 flex-1 min-w-0"
                                >
                                  {/* Thumbnail */}
                                  {videoId && (
                                    <div className="relative flex-shrink-0">
                                      <img
                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                        alt={brano.nome_brano}
                                        className="w-20 h-14 object-cover rounded-lg"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                          isSelected && isPlaying
                                            ? 'bg-blue-600'
                                            : 'bg-white/90'
                                        }`}>
                                          {isSelected && isPlaying ? (
                                            <Volume2 className="h-5 w-5 text-white animate-pulse" />
                                          ) : (
                                            <Play className="h-5 w-5 text-blue-600 ml-0.5" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Info */}
                                  <div className="flex-1 text-left min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate">{brano.nome_brano}</h3>
                                    {(brano.inizio_brano > 0 || brano.fine_brano > 0) && (
                                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(brano.inizio_brano)} - {brano.fine_brano > 0 ? formatTime(brano.fine_brano) : 'fine'}
                                      </p>
                                    )}
                                  </div>
                                </button>

                                {/* Bottone elimina */}
                                <button
                                  onClick={(e) => deleteBrano(brano, e)}
                                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                  title="Elimina brano"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Player - occupa tutto lo spazio restante */}
            <div className="flex-1 lg:sticky lg:top-6">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-blue-100 p-4">
                  <h2 className="font-bold text-blue-800">
                    {selectedBrano ? selectedBrano.nome_brano : 'Seleziona un brano'}
                  </h2>
                  {selectedBrano && (
                    <p className="text-sm text-blue-600">{selectedBrano.categoria}</p>
                  )}
                </div>

                {/* YouTube Player Container */}
                <div className="aspect-video bg-black relative" ref={playerContainerRef}>
                  {selectedBrano ? (
                    playerError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white p-6">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                          <p className="mb-2 font-medium">
                            {playerError === 150
                              ? 'Questo video non permette la riproduzione embedded'
                              : playerError === 101
                              ? 'Video non disponibile'
                              : `Errore riproduzione (${playerError})`}
                          </p>
                          <p className="text-sm text-gray-400 mb-4">
                            Puoi aprirlo direttamente su YouTube
                          </p>
                          <button
                            onClick={() => openOnYouTube(selectedBrano)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
                          >
                            <ExternalLink className="h-5 w-5" />
                            Apri su YouTube
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div id="youtube-player" className="absolute inset-0 w-full h-full" />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Music className="h-16 w-16 mx-auto mb-4" />
                        <p>Clicca su un brano per ascoltarlo</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timer display */}
                {timerActive && (playMode === 'timed' || playMode === 'persistent') && (
                  <div className={`p-3 text-center ${playMode === 'persistent' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    <div className="flex items-center justify-center gap-2">
                      {playMode === 'persistent' && <Lock className="h-5 w-5 text-amber-600" />}
                      <Timer className="h-5 w-5 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-800">{timerRemaining}s</span>
                    </div>
                    {playMode === 'persistent' && (
                      <p className="text-xs text-amber-700 mt-1">Controlli bloccati</p>
                    )}
                  </div>
                )}

                {/* Controlli */}
                {selectedBrano && playerReady && !playerError && (
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          // In modalità persistent con timer attivo, ignora i click
                          if (playMode === 'persistent' && timerActive) return

                          if (playerRef.current) {
                            if (isPlaying) {
                              playerRef.current.pauseVideo()
                              // Ferma anche il timer
                              if (timerIntervalRef.current) {
                                clearInterval(timerIntervalRef.current)
                                timerIntervalRef.current = null
                              }
                              setTimerActive(false)
                            } else {
                              playerRef.current.playVideo()
                              // Riavvia timer se in modalità timed/persistent
                              if (playMode === 'timed' || playMode === 'persistent') {
                                startTimer()
                              }
                            }
                          }
                        }}
                        disabled={playMode === 'persistent' && timerActive}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                          playMode === 'persistent' && timerActive
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="h-7 w-7" />
                        ) : (
                          <Play className="h-7 w-7 ml-1" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pulsante apri su YouTube sempre visibile quando c'è un brano */}
                {selectedBrano && !playerError && (
                  <div className="p-3 bg-gray-100 border-t flex justify-center">
                    <button
                      onClick={() => openOnYouTube(selectedBrano)}
                      className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Apri su YouTube
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Music className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Seleziona un Utente</h3>
            <p className="text-gray-500">
              Seleziona un utente dalla lista per vedere i suoi brani
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Dichiara tipo globale per YouTube API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}
