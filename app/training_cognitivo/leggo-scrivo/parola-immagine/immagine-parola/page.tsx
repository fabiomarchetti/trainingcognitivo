/**
 * Esercizio Immagine → Parola
 *
 * L'utente vede un'immagine e deve scegliere la parola corretta
 * tra due opzioni (target e distrattore)
 */
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Image as ImageIcon, Play, SkipForward,
  RefreshCw, X, Star, BarChart3, CheckCircle, XCircle, Loader2, Printer,
  Menu, Settings, Palette, Type, AlertCircle, LogIn, Download, Smartphone
} from 'lucide-react'
import jsPDF from 'jspdf'
import { createClient } from '@/lib/supabase/client'
import type { Coppia, Risultato } from '../types'

interface Utente {
  id: string
  nome: string
  cognome: string
}

// Componente wrapper con Suspense
export default function ImmagineParolaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-fuchsia-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
      </div>
    }>
      <ImmagineParolaContent />
    </Suspense>
  )
}

function ImmagineParolaContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const utenteParam = searchParams.get('utente')

  // Stato utente
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [showUserSelection, setShowUserSelection] = useState(!utenteParam)

  // Stato esercizio
  const [pairs, setPairs] = useState<Coppia[]>([])
  const [usedPairsIndices, setUsedPairsIndices] = useState<number[]>([])
  const [currentPair, setCurrentPair] = useState<Coppia | null>(null)
  const [targetPosition, setTargetPosition] = useState<'top' | 'bottom'>('top')
  const [totalTrials, setTotalTrials] = useState(10)
  const [currentTrial, setCurrentTrial] = useState(0)
  const [results, setResults] = useState<Risultato[]>([])
  const [sessionId, setSessionId] = useState('')
  const [progressivoEsercizio, setProgressivoEsercizio] = useState<number>(1)

  // UI State
  const [isStarted, setIsStarted] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [trialStartTime, setTrialStartTime] = useState<number | null>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const [showExerciseArea, setShowExerciseArea] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(false)

  // PWA Install
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [installBannerDismissed, setInstallBannerDismissed] = useState(false)

  // Feedback modals
  const [showCelebration, setShowCelebration] = useState(false)
  const [showError, setShowError] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // Feedback visivo parole
  const [topWordClass, setTopWordClass] = useState('')
  const [bottomWordClass, setBottomWordClass] = useState('')

  // Menu impostazioni
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  // Preferenze visualizzazione
  const [fontSize, setFontSize] = useState(36) // px
  const [fontColor, setFontColor] = useState('#1f2937') // gray-800
  const [fontBgColor, setFontBgColor] = useState('#ffffff') // white
  const [imageSize, setImageSize] = useState(192) // px (h-48 = 12rem = 192px)
  const [imageBgColor, setImageBgColor] = useState('#ffffff') // white

  // Colori disponibili
  const availableColors = [
    { name: 'Bianco', value: '#ffffff' },
    { name: 'Nero', value: '#000000' },
    { name: 'Giallo', value: '#facc15' },
    { name: 'Blu', value: '#3b82f6' },
    { name: 'Rosso', value: '#ef4444' },
    { name: 'Verde', value: '#22c55e' }
  ]

  // Funzioni per gestione localStorage preferenze
  const getStorageKey = (userId: string) => `training_visual_prefs_${userId}`

  const loadPreferences = (userId: string) => {
    if (typeof window === 'undefined' || !userId) return
    try {
      const saved = localStorage.getItem(getStorageKey(userId))
      if (saved) {
        const prefs = JSON.parse(saved)
        if (prefs.fontSize) setFontSize(prefs.fontSize)
        if (prefs.fontColor) setFontColor(prefs.fontColor)
        if (prefs.fontBgColor) setFontBgColor(prefs.fontBgColor)
        if (prefs.imageSize) setImageSize(prefs.imageSize)
        if (prefs.imageBgColor) setImageBgColor(prefs.imageBgColor)
      }
    } catch (e) {
      console.error('Errore caricamento preferenze:', e)
    }
  }

  const savePreferences = (userId: string) => {
    if (typeof window === 'undefined' || !userId) return
    try {
      const prefs = { fontSize, fontColor, fontBgColor, imageSize, imageBgColor }
      localStorage.setItem(getStorageKey(userId), JSON.stringify(prefs))
    } catch (e) {
      console.error('Errore salvataggio preferenze:', e)
    }
  }

  // Salva preferenze quando cambiano
  useEffect(() => {
    if (selectedUserId) {
      savePreferences(selectedUserId)
    }
  }, [fontSize, fontColor, fontBgColor, imageSize, imageBgColor, selectedUserId])

  // TTS
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Init TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis

      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || []
        voiceRef.current = voices.find(v => v.lang.startsWith('it')) || voices[0] || null
      }

      if (synthRef.current.getVoices().length > 0) {
        loadVoices()
      } else {
        synthRef.current.addEventListener('voiceschanged', loadVoices)
      }
    }
  }, [])

  // Carica utenti all'avvio
  useEffect(() => {
    loadCurrentUser()
  }, [])

  // PWA Install prompt
  useEffect(() => {
    // Check se già in modalità standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    // Check se banner già dismesso
    if (localStorage.getItem('exerciseInstallBannerDismissed') === 'true') {
      setInstallBannerDismissed(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Installa PWA
  const handleInstallPWA = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  // Chiudi banner installazione
  const dismissInstallBanner = () => {
    setInstallBannerDismissed(true)
    localStorage.setItem('exerciseInstallBannerDismissed', 'true')
  }

  const showInstallBanner = isInstallable && !installBannerDismissed && !isStandalone && selectedUserId

  const speakWord = (text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0
    if (voiceRef.current) {
      utterance.voice = voiceRef.current
    }
    synthRef.current.speak(utterance)
  }

  const loadCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user || error) {
      console.log('[Auth] Utente non autenticato:', error?.message)
      setAuthError(true)
      return
    }

    // Se c'è un utente passato come parametro, carica direttamente quello
    if (utenteParam) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, nome, cognome')
        .eq('id', utenteParam)
        .single()

      if (targetProfile) {
        setSelectedUserId(targetProfile.id)
        setSelectedUserName(`${targetProfile.nome} ${targetProfile.cognome}`)
        setUtenti([{ id: targetProfile.id, nome: targetProfile.nome || '', cognome: targetProfile.cognome || '' }])
        await loadDataForUser(targetProfile.id)
      }
      return
    }

    // Altrimenti comportamento normale
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nome, cognome, id_ruolo, ruoli(codice)')
      .eq('id', user.id)
      .single()

    if (profile) {
      const ruoloCodice = (profile.ruoli as any)?.codice || ''

      // Se utente normale, carica direttamente
      if (ruoloCodice === 'utente') {
        setSelectedUserId(profile.id)
        setSelectedUserName(`${profile.nome} ${profile.cognome}`)
        setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
        await loadDataForUser(profile.id)
      } else {
        // Educatore: carica lista utenti
        await loadUtenti(ruoloCodice)
      }
    }
  }

  const loadUtenti = async (ruoloCodice: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Carica solo utenti che hanno coppie create (con stato attivo)
    const { data: coppieUtenti } = await supabase
      .from('parola_immagine_coppie')
      .select('id_utente')
      .eq('stato', 'attiva')

    if (!coppieUtenti || coppieUtenti.length === 0) {
      setUtenti([])
      return
    }

    // Estrai ID univoci degli utenti con coppie
    const userIdsConCoppie = [...new Set(coppieUtenti.map(c => c.id_utente))]

    // Carica profili solo per utenti con coppie
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, cognome')
      .in('id', userIdsConCoppie)
      .order('cognome')

    if (profiles) {
      setUtenti(profiles.map(p => ({
        id: p.id,
        nome: p.nome || '',
        cognome: p.cognome || ''
      })))
    }
  }

  const loadDataForUser = async (userId: string) => {
    setLoading(true)

    // Carica preferenze visualizzazione dal localStorage
    loadPreferences(userId)

    // Carica impostazioni
    try {
      const res = await fetch(`/api/esercizi/parola-immagine?action=get_impostazioni&id_utente=${userId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setTotalTrials(data.data.numero_prove || 10)
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error)
    }

    // Carica coppie
    try {
      const res = await fetch(`/api/esercizi/parola-immagine?action=get_coppie&id_utente=${userId}`)
      const data = await res.json()
      if (data.success) {
        setPairs(data.data || [])
        if (data.data && data.data.length > 0) {
          setShowUserSelection(false)
          setShowPlaceholder(true)
        }
      }
    } catch (error) {
      console.error('Errore caricamento coppie:', error)
    }

    setLoading(false)
  }

  const handleUserChange = async (userId: string) => {
    if (!userId) return
    setSelectedUserId(userId)
    const user = utenti.find(u => u.id === userId)
    if (user) setSelectedUserName(`${user.nome} ${user.cognome}`)
    await loadDataForUser(userId)
  }

  const startExercise = async () => {
    // Ottieni il prossimo progressivo dal server (separato per tipo esercizio)
    try {
      const res = await fetch(`/api/esercizi/parola-immagine?action=get_next_progressivo&id_utente=${selectedUserId}&tipo_esercizio=immagine-parola`)
      const data = await res.json()
      if (data.success) {
        setProgressivoEsercizio(data.data.progressivo)
      }
    } catch (error) {
      console.error('Errore ottenimento progressivo:', error)
    }

    setIsStarted(true)
    setCurrentTrial(0)
    setResults([])
    setUsedPairsIndices([])
    setSessionId(`session_img2word_${Date.now()}`)
    setShowPlaceholder(false)
    setShowExerciseArea(true)
    nextExercise(0, [])
  }

  const nextExercise = (trial: number = currentTrial, usedIndices: number[] = usedPairsIndices) => {
    const newTrial = trial + 1

    if (newTrial > totalTrials) {
      endSession()
      return
    }

    setCurrentTrial(newTrial)

    // Seleziona coppia random
    let indices = [...usedIndices]
    if (indices.length >= pairs.length) {
      indices = []
    }

    const availableIndices = []
    for (let i = 0; i < pairs.length; i++) {
      if (!indices.includes(i)) {
        availableIndices.push(i)
      }
    }

    if (availableIndices.length === 0) {
      endSession()
      return
    }

    const randomIdx = Math.floor(Math.random() * availableIndices.length)
    const pairIndex = availableIndices[randomIdx]
    const pair = pairs[pairIndex]

    setUsedPairsIndices([...indices, pairIndex])
    setCurrentPair(pair)

    // Posizione random del target
    const position = Math.random() < 0.5 ? 'top' : 'bottom'
    setTargetPosition(position)

    // Reset feedback
    setTopWordClass('')
    setBottomWordClass('')

    // Abilita interazione
    setIsWaiting(true)
    setTrialStartTime(Date.now())

    // Leggi entrambe le parole
    setTimeout(() => {
      speakWord(`Scegli: ${pair.parola_target} o ${pair.parola_distrattore}`)
    }, 300)
  }

  const repeatExercise = () => {
    if (!currentPair) return

    // Inverti posizioni
    setTargetPosition(targetPosition === 'top' ? 'bottom' : 'top')

    // Reset feedback
    setTopWordClass('')
    setBottomWordClass('')

    // Abilita interazione
    setIsWaiting(true)
    setTrialStartTime(Date.now())

    // Leggi parole
    setTimeout(() => {
      speakWord(`Scegli: ${currentPair.parola_target} o ${currentPair.parola_distrattore}`)
    }, 300)
  }

  const selectWord = async (position: 'top' | 'bottom') => {
    if (!isWaiting || !currentPair) return

    setIsWaiting(false)
    const responseTime = Date.now() - (trialStartTime || Date.now())
    const isCorrect = position === targetPosition

    // Feedback visivo
    if (isCorrect) {
      if (position === 'top') setTopWordClass('ring-4 ring-green-500 bg-green-50')
      else setBottomWordClass('ring-4 ring-green-500 bg-green-50')
    } else {
      if (position === 'top') setTopWordClass('ring-4 ring-red-500 bg-red-50')
      else setBottomWordClass('ring-4 ring-red-500 bg-red-50')
    }

    // Salva risultato
    const result: Risultato = {
      parola: currentPair.parola_target,
      esito: isCorrect ? 'corretto' : 'errato',
      tempo: responseTime,
      posizione_target: targetPosition,
      immagine_cliccata: position === targetPosition ? 'target' : 'distrattore'
    }
    setResults(prev => [...prev, result])

    // Salva nel database
    try {
      await fetch('/api/esercizi/parola-immagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_risultato',
          id_utente: selectedUserId,
          id_coppia: currentPair.id,
          parola_target: currentPair.parola_target,
          esito: result.esito,
          tempo_risposta_ms: responseTime,
          posizione_target: targetPosition,
          immagine_cliccata: result.immagine_cliccata,
          id_sessione: sessionId,
          numero_prova: currentTrial,
          numero_prove_totali: totalTrials,
          // Nuovi campi
          progressivo_esercizio: progressivoEsercizio,
          tipo_esercizio: 'immagine-parola',
          parola_distrattore: currentPair.parola_distrattore,
          url_immagine_target: currentPair.url_immagine_target,
          url_immagine_distrattore: currentPair.url_immagine_distrattore
        })
      })
    } catch (error) {
      console.error('Errore salvataggio risultato:', error)
    }

    // Mostra feedback
    if (isCorrect) {
      setShowCelebration(true)
      speakWord('Bravo!')
      setTimeout(() => {
        setShowCelebration(false)
      }, 2500)
    } else {
      setShowError(true)
      speakWord('Riprova')
      setTimeout(() => {
        setShowError(false)
      }, 1500)
    }
  }

  const endSession = () => {
    setIsStarted(false)
    setShowExerciseArea(false)

    const correct = results.filter(r => r.esito === 'corretto').length
    speakWord(`Esercizio completato. Hai risposto correttamente ${correct} volte su ${results.length}.`)

    setShowSummary(true)
  }

  const closeSummary = () => {
    setShowSummary(false)
    setShowUserSelection(true)
    setSelectedUserId('')
    setPairs([])
    setResults([])
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage locale? La pagina verrà ricaricata.')) return
    await supabase.auth.signOut()
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  // Genera PDF con risultati
  const generatePDF = () => {
    if (results.length === 0) {
      alert('Nessun risultato da stampare')
      return
    }

    const doc = new jsPDF()
    const now = new Date()
    const dataStr = now.toLocaleDateString('it-IT')
    const oraStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

    const corretti = results.filter(r => r.esito === 'corretto')
    const errati = results.filter(r => r.esito === 'errato')
    const percCorretti = Math.round((corretti.length / results.length) * 100)
    const percErrati = Math.round((errati.length / results.length) * 100)

    // Intestazione
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Esercizio Immagine - Parola', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Utente: ${selectedUserName}`, 20, 35)
    doc.text(`Data: ${dataStr}`, 20, 43)
    doc.text(`Ora: ${oraStr}`, 20, 51)
    doc.text(`Sessione: ${progressivoEsercizio}`, 20, 59)

    // Risultati
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Risultati', 20, 75)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 128, 0) // Verde
    doc.text(`Risposte corrette: ${corretti.length} (${percCorretti}%)`, 20, 85)
    doc.setTextColor(255, 0, 0) // Rosso
    doc.text(`Risposte errate: ${errati.length} (${percErrati}%)`, 20, 93)
    doc.setTextColor(0, 0, 0) // Nero

    let yPos = 110

    // Dettaglio risposte corrette
    if (corretti.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 128, 0)
      doc.text('Risposte Corrette:', 20, yPos)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      yPos += 8

      corretti.forEach((r, i) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`${i + 1}. Immagine: "${r.parola}" - Parola scelta: corretta`, 25, yPos)
        yPos += 7
      })
    }

    yPos += 5

    // Dettaglio risposte errate
    if (errati.length > 0) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 0, 0)
      doc.text('Risposte Errate:', 20, yPos)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      yPos += 8

      errati.forEach((r, i) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`${i + 1}. Immagine: "${r.parola}" - Parola scelta: errata (scelta distrattore)`, 25, yPos)
        yPos += 7
      })
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text('TrainingCognitivo - Esercizio Immagine-Parola', 105, 290, { align: 'center' })

    // Salva PDF
    doc.save(`immagine-parola_${selectedUserName.replace(/\s+/g, '_')}_${dataStr.replace(/\//g, '-')}.pdf`)
  }

  // Calcola statistiche per riepilogo
  const correctCount = results.filter(r => r.esito === 'corretto').length
  const wrongCount = results.filter(r => r.esito === 'errato').length
  const percentage = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0

  // Statistiche per parola
  const statsByWord: Record<string, { correct: number; wrong: number; total: number }> = {}
  results.forEach(r => {
    if (!statsByWord[r.parola]) {
      statsByWord[r.parola] = { correct: 0, wrong: 0, total: 0 }
    }
    statsByWord[r.parola].total++
    if (r.esito === 'corretto') {
      statsByWord[r.parola].correct++
    } else {
      statsByWord[r.parola].wrong++
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-fuchsia-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training_cognitivo/leggo-scrivo/parola-immagine"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Torna indietro"
              onClick={(e) => {
                if (isStarted && !confirm('Vuoi davvero uscire? I progressi saranno persi.')) {
                  e.preventDefault()
                }
              }}
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a
              href="/"
              className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors"
              title="Torna alla Home"
            >
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            Immagine → Parola
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsMenu(true)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Impostazioni visualizzazione"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Cancella cache e ricarica"
            >
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">

        {/* Errore Autenticazione */}
        {authError && (
          <section className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-purple-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Sessione scaduta
            </h2>
            <p className="text-gray-600 mb-4">
              Per utilizzare l'esercizio devi effettuare il login.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
            >
              <LogIn className="h-5 w-5" />
              Vai al Login
            </a>
          </section>
        )}

        {/* Selezione Utente */}
        {showUserSelection && !authError && (
          <section className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
              Seleziona il tuo profilo
            </h2>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              <option value="">-- Seleziona --</option>
              {utenti.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome} {u.cognome}
                </option>
              ))}
            </select>
            {loading && (
              <div className="flex justify-center mt-4">
                <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              </div>
            )}
          </section>
        )}

        {/* Banner Installazione PWA */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-4 mb-6 shadow-lg max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Installa l'app sul tuo dispositivo</p>
                  <p className="text-purple-100 text-sm">Accesso rapido senza aprire il browser</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallPWA}
                  className="px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Installa
                </button>
                <button
                  onClick={dismissInstallBanner}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  title="Chiudi"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        {(showPlaceholder || showExerciseArea) && (
          <div className="flex items-center justify-between bg-white rounded-full shadow-lg px-6 py-3 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Prova <span className="font-bold text-purple-600">{currentTrial}</span> / {totalTrials}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <CheckCircle className="h-5 w-5" />
                  {results.filter(r => r.esito === 'corretto').length}
                </span>
                <span className="flex items-center gap-1 text-red-600 font-bold">
                  <XCircle className="h-5 w-5" />
                  {results.filter(r => r.esito === 'errato').length}
                </span>
                <button
                  onClick={generatePDF}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors ml-2"
                  title="Stampa PDF risultati"
                >
                  <Printer className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isStarted && (
                <button
                  onClick={startExercise}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-full hover:from-purple-600 hover:to-fuchsia-600 transition-all flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  Inizia
                </button>
              )}
              {isStarted && (
                <>
                  <button
                    onClick={repeatExercise}
                    disabled={isWaiting}
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-full hover:bg-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Ripeti
                  </button>
                  <button
                    onClick={() => nextExercise()}
                    disabled={isWaiting}
                    className="px-4 py-2 bg-purple-500 text-white font-bold rounded-full hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <SkipForward className="h-5 w-5" />
                    Avanti
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Placeholder */}
        {showPlaceholder && !showExerciseArea && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="h-12 w-12 text-purple-500" />
            </div>
            <p className="text-xl text-gray-600">
              Premi <strong className="text-purple-600">Inizia</strong> per cominciare l'esercizio
            </p>
          </div>
        )}

        {/* Area Esercizio */}
        {showExerciseArea && currentPair && (
          <div className="grid grid-cols-2 gap-8">
            {/* Colonna Immagine */}
            <div
              className="rounded-2xl shadow-lg p-8 flex items-center justify-center"
              style={{ backgroundColor: imageBgColor }}
            >
              <img
                src={currentPair.url_immagine_target}
                alt={currentPair.parola_target}
                className="max-w-full object-contain"
                style={{ height: `${imageSize}px` }}
              />
            </div>

            {/* Colonna Parole */}
            <div className="space-y-4">
              {/* Parola Top */}
              <div
                onClick={() => selectWord('top')}
                className={`rounded-2xl shadow-lg p-8 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 flex items-center justify-center ${topWordClass}`}
                style={{ backgroundColor: fontBgColor }}
              >
                <span
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: `${fontSize}px`, color: fontColor }}
                >
                  {targetPosition === 'top' ? currentPair.parola_target : currentPair.parola_distrattore}
                </span>
              </div>

              {/* Parola Bottom */}
              <div
                onClick={() => selectWord('bottom')}
                className={`rounded-2xl shadow-lg p-8 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 flex items-center justify-center ${bottomWordClass}`}
                style={{ backgroundColor: fontBgColor }}
              >
                <span
                  className="font-bold uppercase tracking-wide"
                  style={{ fontSize: `${fontSize}px`, color: fontColor }}
                >
                  {targetPosition === 'bottom' ? currentPair.parola_target : currentPair.parola_distrattore}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Menu Impostazioni */}
      {showSettingsMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowSettingsMenu(false)}
          />

          {/* Menu laterale */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto">
            {/* Header menu */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Impostazioni
              </h3>
              <button
                onClick={() => setShowSettingsMenu(false)}
                className="p-1 bg-white/20 rounded-full hover:bg-white/30"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Sezione Font */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                  <Type className="h-5 w-5 text-purple-500" />
                  Testo Parola
                </h4>

                {/* Dimensione font */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Dimensione: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="72"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Piccolo</span>
                    <span>Grande</span>
                  </div>
                </div>

                {/* Colore font */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Colore testo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={`font-${color.value}`}
                        onClick={() => setFontColor(color.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          fontColor === color.value ? 'ring-2 ring-purple-500 ring-offset-2' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Sfondo box parola */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Sfondo box parola
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={`fontbg-${color.value}`}
                        onClick={() => setFontBgColor(color.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          fontBgColor === color.value ? 'ring-2 ring-purple-500 ring-offset-2' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sezione Immagini */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                  Immagine
                </h4>

                {/* Dimensione immagine */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Dimensione: {imageSize}px
                  </label>
                  <input
                    type="range"
                    min="120"
                    max="320"
                    step="20"
                    value={imageSize}
                    onChange={(e) => setImageSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Piccola</span>
                    <span>Grande</span>
                  </div>
                </div>

                {/* Sfondo box immagine */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Sfondo box immagine
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={`imgbg-${color.value}`}
                        onClick={() => setImageBgColor(color.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          imageBgColor === color.value ? 'ring-2 ring-purple-500 ring-offset-2' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Anteprima */}
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-bold text-gray-700 text-sm">Anteprima</h4>
                <div className="flex gap-2">
                  <div
                    className="flex-1 rounded-lg p-3 flex items-center justify-center"
                    style={{ backgroundColor: imageBgColor }}
                  >
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div
                    className="flex-1 rounded-lg p-3 flex items-center justify-center"
                    style={{ backgroundColor: fontBgColor }}
                  >
                    <span
                      className="font-bold"
                      style={{ fontSize: `${Math.min(fontSize, 24)}px`, color: fontColor }}
                    >
                      PAROLA
                    </span>
                  </div>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => {
                  setFontSize(36)
                  setFontColor('#1f2937')
                  setFontBgColor('#ffffff')
                  setImageSize(192)
                  setImageBgColor('#ffffff')
                }}
                className="w-full py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Ripristina impostazioni
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Celebrazione */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <img
            src="https://www.gifanimate.com/data/media/492/fuochi-d-artificio-immagine-animata-0002.gif"
            alt="Fuochi d'artificio"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-6xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,0,0.8)] animate-pulse">
              BRAVO!
            </h2>
          </div>
        </div>
      )}

      {/* Modal Errore */}
      {showError && (
        <div className="fixed inset-0 bg-red-600/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md">
            <h2 className="text-3xl font-bold text-red-600 flex items-center justify-center gap-2 mb-4">
              <XCircle className="h-8 w-8" />
              Riprova!
            </h2>
            <p className="text-xl text-gray-600 mb-2">Questa non è la parola giusta.</p>
            <p className="text-gray-500">Premi <strong>Ripeti</strong> per riprovare.</p>
          </div>
        </div>
      )}

      {/* Modal Riepilogo */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-2 mb-6">
              <BarChart3 className="h-8 w-8" />
              Riepilogo Sessione
            </h2>

            {/* Statistiche */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{correctCount}</div>
                <div className="text-sm text-green-700">Corrette</div>
              </div>
              <div className="bg-red-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{wrongCount}</div>
                <div className="text-sm text-red-700">Errate</div>
              </div>
              <div className="bg-purple-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{percentage}%</div>
                <div className="text-sm text-purple-700">Percentuale</div>
              </div>
            </div>

            {/* Tabella risultati */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Parola</th>
                  <th className="p-3 text-center">Esito</th>
                  <th className="p-3 text-center">% Corrette</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statsByWord).map(([word, stats]) => (
                  <tr key={word} className="border-b">
                    <td className="p-3 font-bold">{word}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm mr-2">
                        {stats.correct} <CheckCircle className="h-4 w-4" />
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        {stats.wrong} <XCircle className="h-4 w-4" />
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={closeSummary}
              className="w-full py-3 bg-purple-500 text-white font-bold rounded-full hover:bg-purple-600 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
