/**
 * Scrivo Parole con le Lettere - Area Utente (Esercizio)
 *
 * L'utente compone parole cliccando sulle lettere disponibili
 * Supporta: TTS, drag&drop, menu impostazioni, feedback visivo
 */
'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Play, Menu, X,
  Volume2, Delete, SkipForward, Trophy, XCircle,
  Settings, Type, Loader2, Download, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ConfigurazioneParola, RisultatoProva } from '../types'

// Utility per shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// Wrapper con Suspense per useSearchParams
export default function EsercizioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-pink-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    }>
      <EsercizioContent />
    </Suspense>
  )
}

interface Utente {
  id: string
  nome: string
  cognome: string
}

function EsercizioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const utenteParam = searchParams.get('utente')

  // Refs
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const hasInitializedRef = useRef(false)

  // Stato utente e selezione
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [showUserSelection, setShowUserSelection] = useState(!utenteParam)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(false)

  // Configurazione
  const [parole, setParole] = useState<ConfigurazioneParola[]>([])
  const [numeroProve, setNumeroProve] = useState(10)
  const [tastoCancellaVisibile, setTastoCancellaVisibile] = useState(false)

  // Sessione
  const [isStarted, setIsStarted] = useState(false)
  const [currentTrial, setCurrentTrial] = useState(0)
  const [totalTrials, setTotalTrials] = useState(10)
  const [risultati, setRisultati] = useState<RisultatoProva[]>([])
  const [usedIndices, setUsedIndices] = useState<number[]>([])
  const [progressivoEsercizio, setProgressivoEsercizio] = useState(1)

  // Esercizio corrente
  const [currentParola, setCurrentParola] = useState<ConfigurazioneParola | null>(null)
  const [lettereDisponibili, setLettereDisponibili] = useState<string[]>([])
  const [risposta, setRisposta] = useState<string[]>([])
  const [trialStartTime, setTrialStartTime] = useState<number>(0)

  // Feedback
  const [showCelebration, setShowCelebration] = useState(false)
  const [showError, setShowError] = useState(false)
  const [canProceed, setCanProceed] = useState(false)

  // Riepilogo
  const [showSummary, setShowSummary] = useState(false)

  // Menu impostazioni
  const [menuOpen, setMenuOpen] = useState(false)

  // Preferenze visualizzazione
  const [fontScale, setFontScale] = useState(1)
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [textColor, setTextColor] = useState('#000000')
  const [hintEnabled, setHintEnabled] = useState(false)
  const [hintIntensity, setHintIntensity] = useState(50)
  const [cursorEnabled, setCursorEnabled] = useState(true)

  // PWA
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Inizializzazione
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    initTTS()
    loadPreferences()
    loadUser()

    // PWA
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // TTS
  const initTTS = () => {
    if (typeof window === 'undefined') return
    synthRef.current = window.speechSynthesis

    const loadVoices = () => {
      const voices = synthRef.current?.getVoices() || []
      voiceRef.current = voices.find(v => v.lang.startsWith('it')) || voices[0] || null
    }

    if (synthRef.current?.getVoices().length) {
      loadVoices()
    } else {
      synthRef.current?.addEventListener('voiceschanged', loadVoices)
    }
  }

  const speak = (text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 0.9
    if (voiceRef.current) utterance.voice = voiceRef.current
    synthRef.current.speak(utterance)
  }

  // Carica preferenze
  const loadPreferences = () => {
    if (typeof window === 'undefined') return

    const scale = localStorage.getItem('scrivo_font_scale')
    if (scale) setFontScale(parseFloat(scale))

    const bg = localStorage.getItem('scrivo_bg_color')
    if (bg) setBgColor(bg)

    const text = localStorage.getItem('scrivo_text_color')
    if (text) setTextColor(text)

    const hint = localStorage.getItem('scrivo_hint_enabled')
    setHintEnabled(hint === '1')

    const intensity = localStorage.getItem('scrivo_hint_intensity')
    if (intensity) setHintIntensity(parseInt(intensity))

    const cursor = localStorage.getItem('scrivo_cursor_enabled')
    setCursorEnabled(cursor !== '0')
  }

  // Salva preferenza
  const savePreference = (key: string, value: string) => {
    localStorage.setItem(key, value)
  }

  // Carica utente e configurazione
  const loadUser = async () => {
    setIsLoading(true)

    const utenteParam = searchParams.get('utente')
    let uid = utenteParam

    if (!uid) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        setAuthError(true)
        setIsLoading(false)
        return
      }
      uid = user.id
    }

    setUserId(uid)
    await loadConfigurazione(uid)
    setIsLoading(false)
  }

  // Carica configurazione
  const loadConfigurazione = async (uid: string) => {
    try {
      // Cerca esercizio
      const { data: esercizio } = await supabase
        .from('esercizi')
        .select('id')
        .eq('slug', 'scrivo-parole-con-le-lettere')
        .single()

      if (!esercizio) {
        // Fallback localStorage
        loadFromLocalStorage(uid)
        return
      }

      // Carica assegnazione
      const { data: assegnazione } = await supabase
        .from('utenti_esercizi')
        .select('config')
        .eq('id_utente', uid)
        .eq('id_esercizio', esercizio.id)
        .eq('stato', 'attivo')
        .single()

      if (assegnazione?.config) {
        const config = assegnazione.config as any
        setNumeroProve(config.impostazioni?.numero_prove || 10)
        setTotalTrials(config.impostazioni?.numero_prove || 10)
        setTastoCancellaVisibile(config.impostazioni?.tasto_cancella_visibile || false)
        setParole(config.parole || [])
      } else {
        loadFromLocalStorage(uid)
      }
    } catch (error) {
      console.error('[Esercizio] Errore caricamento:', error)
      loadFromLocalStorage(uid)
    }
  }

  const loadFromLocalStorage = (uid: string) => {
    const localConfig = localStorage.getItem(`scrivo_lettere_config_${uid}`)
    if (localConfig) {
      const config = JSON.parse(localConfig)
      setNumeroProve(config.impostazioni?.numero_prove || 10)
      setTotalTrials(config.impostazioni?.numero_prove || 10)
      setTastoCancellaVisibile(config.impostazioni?.tasto_cancella_visibile || false)
      setParole(config.parole || [])
    }
  }

  // Inizia esercizio
  const startExercise = async () => {
    if (parole.length === 0 || !userId) return

    // Ottieni progressivo esercizio
    try {
      const response = await fetch(`/api/esercizi/scrivo-parole-lettere?action=get_next_progressivo&id_utente=${userId}`)
      const data = await response.json()
      if (data.success) {
        setProgressivoEsercizio(data.data.progressivo)
      }
    } catch (error) {
      console.error('Errore caricamento progressivo:', error)
    }

    setIsStarted(true)
    setCurrentTrial(0)
    setRisultati([])
    setUsedIndices([])
    nextTrial()
  }

  // Prossima prova
  const nextTrial = useCallback(() => {
    setShowCelebration(false)
    setShowError(false)
    setCanProceed(false)

    const trial = currentTrial + 1
    if (trial > totalTrials) {
      endSession()
      return
    }

    setCurrentTrial(trial)

    // Seleziona parola random non usata
    let availableIndices = parole.map((_, i) => i).filter(i => !usedIndices.includes(i))
    if (availableIndices.length === 0) {
      // Reset se tutte usate
      availableIndices = parole.map((_, i) => i)
      setUsedIndices([])
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    setUsedIndices(prev => [...prev, randomIndex])

    const parola = parole[randomIndex]
    setCurrentParola(parola)
    setLettereDisponibili(shuffleArray([...parola.lettere_disponibili]))
    setRisposta([])
    setTrialStartTime(Date.now())

    // TTS
    setTimeout(() => speak(parola.parola_target), 500)
  }, [currentTrial, totalTrials, parole, usedIndices])

  // Seleziona lettera
  const selectLetter = (letter: string) => {
    if (!currentParola || canProceed) return
    if (risposta.length >= currentParola.parola_target.length) return

    const newRisposta = [...risposta, letter]
    setRisposta(newRisposta)

    // Verifica se completo
    if (newRisposta.length === currentParola.parola_target.length) {
      checkAnswer(newRisposta)
    }
  }

  // Rimuovi ultima lettera
  const removeLetter = () => {
    if (risposta.length === 0 || canProceed) return
    setRisposta(risposta.slice(0, -1))
  }

  // Verifica risposta
  const checkAnswer = async (answer: string[]) => {
    if (!currentParola || !userId) return

    const responseTime = Date.now() - trialStartTime
    const userAnswer = answer.join('')
    const correct = userAnswer === currentParola.parola_target

    // Salva risultato in locale
    const risultato: RisultatoProva = {
      parola: currentParola.parola_target,
      risposta: userAnswer,
      esito: correct ? 'positivo' : 'negativo',
      tempo: responseTime
    }
    setRisultati(prev => [...prev, risultato])

    // Salva risultato su DB
    try {
      await fetch('/api/esercizi/scrivo-parole-lettere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_risultato',
          id_utente: userId,
          parola_target: currentParola.parola_target,
          risposta_utente: userAnswer,
          esito: correct ? 'corretto' : 'errato',
          tempo_risposta_ms: responseTime,
          numero_prova: currentTrial,
          numero_prove_totali: totalTrials,
          progressivo_esercizio: progressivoEsercizio
        })
      })
    } catch (error) {
      console.error('Errore salvataggio risultato:', error)
    }

    // Feedback
    if (correct) {
      setShowCelebration(true)
      speak('Bravo!')
    } else {
      setShowError(true)
      speak('Riprova!')
    }

    setCanProceed(true)

    // Auto-avanza dopo feedback
    setTimeout(() => {
      if (currentTrial < totalTrials) {
        nextTrial()
      } else {
        endSession()
      }
    }, 2500)
  }

  // Fine sessione
  const endSession = () => {
    setIsStarted(false)
    setShowSummary(true)

    const corrette = risultati.filter(r => r.esito === 'positivo').length
    speak(`Esercizio completato. Hai risposto correttamente ${corrette} volte su ${risultati.length}.`)
  }

  // Chiudi riepilogo
  const closeSummary = () => {
    setShowSummary(false)
    router.push('/training')
  }

  // Installa PWA
  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  // Calcola colore hint
  const getHintColor = () => {
    const gray = 255 - Math.round((hintIntensity / 100) * 255)
    return `rgb(${gray}, ${gray}, ${gray})`
  }

  // Statistiche
  const corrette = risultati.filter(r => r.esito === 'positivo').length
  const errate = risultati.filter(r => r.esito === 'negativo').length
  const percentuale = risultati.length > 0 ? Math.round((corrette / risultati.length) * 100) : 0

  // Auth Error
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sessione Scaduta</h2>
          <p className="text-gray-600 mb-6">Effettua nuovamente l'accesso per continuare.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600"
          >
            Vai al Login
          </Link>
        </div>
      </div>
    )
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-pink-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere${userId ? `?utente=${userId}` : ''}`}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </Link>
              <Link
                href="/training"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <Home className="h-5 w-5 text-white" />
              </Link>
            </div>

            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Type className="h-6 w-6" />
              Scrivo Parole
            </h1>

            <div className="flex items-center gap-2">
              {isInstallable && (
                <button
                  onClick={handleInstall}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Installa App"
                >
                  <Download className="h-5 w-5 text-white" />
                </button>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Toolbar */}
        {userId && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700">
              Prova: <span className="text-pink-600">{currentTrial}</span> / {totalTrials}
            </span>
            <div className="flex gap-2">
              {!isStarted ? (
                <button
                  onClick={startExercise}
                  disabled={parole.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="h-5 w-5" />
                  Inizia
                </button>
              ) : (
                <button
                  onClick={nextTrial}
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipForward className="h-5 w-5" />
                  Avanti
                </button>
              )}
            </div>
          </div>
        )}

        {/* Placeholder prima di iniziare */}
        {!isStarted && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Type className="h-12 w-12 text-pink-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Scrivo Parole con le Lettere
            </h2>
            <p className="text-gray-600 mb-6">
              {parole.length > 0
                ? `Hai ${parole.length} parole configurate. Premi "Inizia" per cominciare!`
                : 'Nessuna parola configurata. Chiedi al tuo educatore di creare delle parole.'}
            </p>
            {parole.length === 0 && (
              <Link
                href={`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere/gestione${userId ? `?utente=${userId}` : ''}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600"
              >
                <Settings className="h-5 w-5" />
                Vai alle Impostazioni
              </Link>
            )}
          </div>
        )}

        {/* Area Esercizio */}
        {isStarted && currentParola && (
          <div className="space-y-6">
            {/* Stimolo - sfondo sempre bianco */}
            <div
              className="bg-white rounded-2xl shadow-lg p-8 text-center min-h-[200px] flex items-center justify-center relative"
            >
              {currentParola.url_immagine ? (
                <img
                  src={currentParola.url_immagine}
                  alt={currentParola.parola_target}
                  className="max-w-[250px] max-h-[250px] object-contain"
                />
              ) : (
                <span
                  className="text-5xl font-bold uppercase tracking-wider"
                  style={{
                    color: textColor,
                    fontSize: `${3 * fontScale}rem`
                  }}
                >
                  {currentParola.parola_target}
                </span>
              )}
              <button
                onClick={() => speak(currentParola.parola_target)}
                className="absolute top-4 right-4 p-3 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200 transition-colors"
              >
                <Volume2 className="h-6 w-6" />
              </button>
            </div>

            {/* Box Risposta */}
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500">La tua risposta:</span>
                {hintEnabled && (
                  <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                    Aiuto attivo
                  </span>
                )}
              </div>
              <div className="flex justify-center gap-2 flex-wrap min-h-[80px] items-center">
                {Array.from({ length: currentParola.parola_target.length }).map((_, i) => {
                  const letter = risposta[i]
                  const hintLetter = currentParola.parola_target[i]
                  const isNextEmpty = i === risposta.length && cursorEnabled

                  return (
                    <div
                      key={i}
                      className={`relative flex items-center justify-center border-3 rounded-lg transition-all ${letter
                        ? showCelebration
                          ? 'border-green-500'
                          : showError
                            ? 'border-red-500'
                            : 'border-pink-500'
                        : isNextEmpty
                          ? 'border-pink-500'
                          : 'border-gray-300'
                        }`}
                      style={{
                        width: `${60 * fontScale}px`,
                        height: `${70 * fontScale}px`,
                        fontSize: `${2 * fontScale}rem`,
                        backgroundColor: showCelebration ? '#dcfce7' : showError ? '#fee2e2' : bgColor
                      }}
                    >
                      {letter ? (
                        <span
                          className="font-bold uppercase"
                          style={{ color: showCelebration ? '#22c55e' : showError ? '#ef4444' : textColor }}
                        >
                          {letter}
                        </span>
                      ) : hintEnabled ? (
                        <span
                          className="font-bold uppercase"
                          style={{ color: getHintColor() }}
                        >
                          {hintLetter}
                        </span>
                      ) : null}
                      {isNextEmpty && !letter && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-0.5 h-8 bg-pink-500 animate-pulse" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {tastoCancellaVisibile && (
                <button
                  onClick={removeLetter}
                  disabled={risposta.length === 0 || canProceed}
                  className="mt-4 px-6 py-2 bg-yellow-500 text-white rounded-full font-semibold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                >
                  <Delete className="h-5 w-5 inline mr-2" />
                  Cancella
                </button>
              )}
            </div>

            {/* Lettere Disponibili */}
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <p className="text-gray-500 mb-4">Tocca le lettere per comporre la parola:</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {lettereDisponibili.map((letter, i) => (
                  <button
                    key={`${letter}-${i}`}
                    onClick={() => selectLetter(letter)}
                    disabled={canProceed}
                    className="font-bold uppercase rounded-lg shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-300"
                    style={{
                      width: `${60 * fontScale}px`,
                      height: `${60 * fontScale}px`,
                      fontSize: `${1.8 * fontScale}rem`,
                      backgroundColor: bgColor,
                      color: textColor
                    }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Celebrazione */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-bounce-in max-w-md">
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-4xl font-bold text-green-500 mb-2">BRAVO!</h2>
            <p className="text-2xl font-bold text-pink-600 uppercase">{currentParola?.parola_target}</p>
          </div>
        </div>
      )}

      {/* Modal Errore */}
      {showError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl border-4 border-red-500 max-w-md animate-shake">
            <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-red-500 mb-2">Riprova!</h2>
            <p className="text-gray-600 mb-2">La risposta corretta era:</p>
            <p className="text-2xl font-bold text-pink-600 uppercase bg-pink-50 px-4 py-2 rounded-lg inline-block">
              {currentParola?.parola_target}
            </p>
          </div>
        </div>
      )}

      {/* Modal Riepilogo */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold text-pink-600 flex items-center gap-2">
                <Trophy className="h-8 w-8" />
                Riepilogo Sessione
              </h3>
            </div>
            <div className="p-6">
              {/* Statistiche */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <span className="text-3xl font-bold text-green-600">{corrette}</span>
                  <p className="text-sm text-gray-500">Corrette</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <span className="text-3xl font-bold text-red-600">{errate}</span>
                  <p className="text-sm text-gray-500">Errate</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <span className="text-3xl font-bold text-blue-600">{percentuale}%</span>
                  <p className="text-sm text-gray-500">Successo</p>
                </div>
              </div>

              {/* Tabella risultati */}
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Parola</th>
                      <th className="px-4 py-2 text-left">Risposta</th>
                      <th className="px-4 py-2 text-left">Esito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {risultati.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-bold uppercase">{r.parola}</td>
                        <td className="px-4 py-2 uppercase">{r.risposta}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${r.esito === 'positivo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.esito === 'positivo' ? '✓ Corretto' : '✗ Errato'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t text-center">
              <button
                onClick={closeSummary}
                className="px-8 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Impostazioni */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Impostazioni
              </h3>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Grandezza Font */}
              <div className="border-b pb-4">
                <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                  <Type className="h-4 w-4 text-pink-500" />
                  Grandezza Elementi
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">A</span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.1"
                    value={fontScale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setFontScale(val)
                      savePreference('scrivo_font_scale', val.toString())
                    }}
                    className="flex-1 accent-pink-500"
                  />
                  <span className="text-lg font-bold">A</span>
                </div>
              </div>

              {/* Colore Sfondo */}
              <div className="border-b pb-4">
                <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                  Colore Sfondo
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {['#FFFFFF', '#000000', '#0000FF', '#FFFF00', '#FF0000', '#00FF00'].map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setBgColor(color)
                        savePreference('scrivo_bg_color', color)
                      }}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${bgColor === color ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Colore Testo */}
              <div className="border-b pb-4">
                <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                  Colore Testo
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {['#FFFFFF', '#000000', '#0000FF', '#FFFF00', '#FF0000', '#00FF00'].map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setTextColor(color)
                        savePreference('scrivo_text_color', color)
                      }}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${textColor === color ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Aiuto Lettere */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">Mostra Aiuto Lettere</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = !hintEnabled
                      setHintEnabled(newVal)
                      savePreference('scrivo_hint_enabled', newVal ? '1' : '0')
                    }}
                    className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${hintEnabled ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${hintEnabled ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Mostra le lettere in trasparenza nei box risposta
                </p>
                {hintEnabled && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <span className="text-sm text-gray-600">Chiaro</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={hintIntensity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setHintIntensity(val)
                        savePreference('scrivo_hint_intensity', val.toString())
                      }}
                      className="flex-1 accent-yellow-500"
                    />
                    <span className="text-sm text-gray-600">Scuro</span>
                  </div>
                )}
              </div>

              {/* Cursore Tastiera */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Cursore Lampeggiante</span>
                  <div
                    onClick={() => {
                      const newVal = !cursorEnabled
                      setCursorEnabled(newVal)
                      savePreference('scrivo_cursor_enabled', newVal ? '1' : '0')
                    }}
                    className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${cursorEnabled ? 'bg-pink-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${cursorEnabled ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stili animazioni */}
      <style jsx global>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease;
        }
      `}</style>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        TrainingCognitivo &copy; 2026
      </footer>
    </div>
  )
}
