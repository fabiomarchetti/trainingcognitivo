/**
 * Esercizio Parola → Immagine
 *
 * L'utente vede una parola e deve scegliere l'immagine corretta
 * tra due opzioni (target e distrattore)
 */
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Type, Play, SkipForward,
  RefreshCw, X, Star, BarChart3, CheckCircle, XCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Coppia, Risultato, AppState } from '../types'

interface Utente {
  id: string
  nome: string
  cognome: string
}

export default function EsercizioPage() {
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

  // UI State
  const [isStarted, setIsStarted] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [trialStartTime, setTrialStartTime] = useState<number | null>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const [showExerciseArea, setShowExerciseArea] = useState(false)
  const [loading, setLoading] = useState(false)

  // Feedback modals
  const [showCelebration, setShowCelebration] = useState(false)
  const [showError, setShowError] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // Feedback visivo immagini
  const [topImageClass, setTopImageClass] = useState('')
  const [bottomImageClass, setBottomImageClass] = useState('')

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    // Sviluppatore e responsabile vedono tutti gli utenti
    if (ruoloCodice === 'sviluppatore' || ruoloCodice === 'responsabile_centro') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, cognome')
        .order('cognome')

      if (profiles) {
        setUtenti(profiles.map(p => ({
          id: p.id,
          nome: p.nome || '',
          cognome: p.cognome || ''
        })))
      }
      return
    }

    // Educatore: solo utenti assegnati
    const { data: associazioni } = await supabase
      .from('educatori_utenti')
      .select('id_utente')
      .eq('id_educatore', user.id)
      .eq('is_attiva', true)

    if (associazioni && associazioni.length > 0) {
      const userIds = associazioni.map(a => a.id_utente)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, cognome')
        .in('id', userIds)
        .order('cognome')

      if (profiles) {
        setUtenti(profiles.map(p => ({
          id: p.id,
          nome: p.nome || '',
          cognome: p.cognome || ''
        })))
      }
    }
  }

  const loadDataForUser = async (userId: string) => {
    setLoading(true)

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

  const getRandomUnusedPairIndex = () => {
    if (!pairs || pairs.length === 0) return -1

    let indices = [...usedPairsIndices]
    if (indices.length >= pairs.length) {
      indices = []
    }

    const availableIndices = []
    for (let i = 0; i < pairs.length; i++) {
      if (!indices.includes(i)) {
        availableIndices.push(i)
      }
    }

    if (availableIndices.length === 0) return -1

    const randomIndex = Math.floor(Math.random() * availableIndices.length)
    return availableIndices[randomIndex]
  }

  const startExercise = () => {
    setIsStarted(true)
    setCurrentTrial(0)
    setResults([])
    setUsedPairsIndices([])
    setSessionId(`session_${Date.now()}`)
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
    setTopImageClass('')
    setBottomImageClass('')

    // Abilita interazione
    setIsWaiting(true)
    setTrialStartTime(Date.now())

    // Leggi parola
    setTimeout(() => {
      speakWord(pair.parola_target)
    }, 300)
  }

  const repeatExercise = () => {
    if (!currentPair) return

    // Inverti posizioni
    setTargetPosition(targetPosition === 'top' ? 'bottom' : 'top')

    // Reset feedback
    setTopImageClass('')
    setBottomImageClass('')

    // Abilita interazione
    setIsWaiting(true)
    setTrialStartTime(Date.now())

    // Leggi parola
    setTimeout(() => {
      speakWord(currentPair.parola_target)
    }, 300)
  }

  const selectImage = async (position: 'top' | 'bottom') => {
    if (!isWaiting || !currentPair) return

    setIsWaiting(false)
    const responseTime = Date.now() - (trialStartTime || Date.now())
    const isCorrect = position === targetPosition

    // Feedback visivo
    if (isCorrect) {
      if (position === 'top') setTopImageClass('ring-4 ring-green-500')
      else setBottomImageClass('ring-4 ring-green-500')
    } else {
      if (position === 'top') setTopImageClass('ring-4 ring-red-500')
      else setBottomImageClass('ring-4 ring-red-500')
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
          numero_prove_totali: totalTrials
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg p-4">
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
            <Type className="h-6 w-6" />
            Parola → Immagine
          </h1>

          <button
            onClick={handleReset}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Cancella cache e ricarica"
          >
            <RotateCcw className="h-5 w-5 text-white" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">

        {/* Selezione Utente */}
        {showUserSelection && (
          <section className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">
              Seleziona il tuo profilo
            </h2>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full p-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none"
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
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              </div>
            )}
          </section>
        )}

        {/* Toolbar */}
        {(showPlaceholder || showExerciseArea) && (
          <div className="flex items-center justify-between bg-white rounded-full shadow-lg px-6 py-3 mb-6">
            <div className="text-gray-600">
              Prova <span className="font-bold text-orange-600">{currentTrial}</span> / {totalTrials}
            </div>
            <div className="flex items-center gap-2">
              {!isStarted && (
                <button
                  onClick={startExercise}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-2"
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
                    className="px-4 py-2 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
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
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Type className="h-12 w-12 text-orange-500" />
            </div>
            <p className="text-xl text-gray-600">
              Premi <strong className="text-orange-600">Inizia</strong> per cominciare l'esercizio
            </p>
          </div>
        )}

        {/* Area Esercizio */}
        {showExerciseArea && currentPair && (
          <div className="grid grid-cols-2 gap-8">
            {/* Colonna Parola */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-800 uppercase tracking-wide">
                {currentPair.parola_target}
              </span>
            </div>

            {/* Colonna Immagini */}
            <div className="space-y-4">
              {/* Immagine Top */}
              <div
                onClick={() => selectImage('top')}
                className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${topImageClass}`}
              >
                <img
                  src={targetPosition === 'top' ? currentPair.url_immagine_target : currentPair.url_immagine_distrattore}
                  alt="Immagine sopra"
                  className="w-full h-48 object-contain"
                />
              </div>

              {/* Immagine Bottom */}
              <div
                onClick={() => selectImage('bottom')}
                className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${bottomImageClass}`}
              >
                <img
                  src={targetPosition === 'bottom' ? currentPair.url_immagine_target : currentPair.url_immagine_distrattore}
                  alt="Immagine sotto"
                  className="w-full h-48 object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Celebrazione */}
      {showCelebration && (
        <div className="fixed inset-0 bg-green-600/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-md animate-bounce-in">
            <h2 className="text-3xl font-bold text-green-600 flex items-center justify-center gap-2 mb-4">
              <Star className="h-8 w-8 text-yellow-500" />
              BRAVO!
              <Star className="h-8 w-8 text-yellow-500" />
            </h2>
            <img
              src="https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif"
              alt="Celebrazione"
              className="w-48 h-48 mx-auto mb-4"
            />
            <p className="text-xl text-green-700">Ottimo lavoro!</p>
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
            <p className="text-xl text-gray-600 mb-2">Questa non è l'immagine giusta.</p>
            <p className="text-gray-500">Premi <strong>Ripeti</strong> per riprovare.</p>
          </div>
        </div>
      )}

      {/* Modal Riepilogo */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center justify-center gap-2 mb-6">
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
              <div className="bg-orange-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{percentage}%</div>
                <div className="text-sm text-orange-700">Percentuale</div>
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
              className="w-full py-3 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-colors"
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
