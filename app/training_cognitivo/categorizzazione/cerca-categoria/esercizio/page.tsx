/**
 * Cerca Categoria - Esercizio Utente
 *
 * L'utente ascolta la frase TTS e deve cliccare tutte le immagini
 * che appartengono alla categoria (target), evitando i distrattori.
 */
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Play, X, SkipForward,
  Volume2, CheckCircle, XCircle, Loader2, Settings, Menu,
  Type, Image as ImageIcon, Grid3x3, AlertCircle, LogIn
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { EsercizioCategoria, RisultatoClick } from '../types'

interface Utente { id: string; nome: string; cognome: string }

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function EsercizioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
      </div>
    }>
      <EsercizioContent />
    </Suspense>
  )
}

function EsercizioContent() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const searchParams = useSearchParams()
  const utenteParam = searchParams.get('utente')

  // Auth
  const [authError, setAuthError] = useState(false)

  // Utenti
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [showUserSelection, setShowUserSelection] = useState(!utenteParam)
  const [loadingUtenti, setLoadingUtenti] = useState(false)

  // Esercizi
  const [esercizi, setEsercizi] = useState<EsercizioCategoria[]>([])
  const [loadingEsercizi, setLoadingEsercizi] = useState(false)
  const [selectedEsercizio, setSelectedEsercizio] = useState<EsercizioCategoria | null>(null)
  const [showEserciziList, setShowEserciziList] = useState(false)
  const [showPlayArea, setShowPlayArea] = useState(false)

  // Stato esercizio corrente
  const [immaginiMischiate, setImmaginiMischiate] = useState<Array<{ id: number; url: string; isTarget: boolean; cliccata: boolean; esito?: 'positivo' | 'negativo' }>>([])
  const [targetTrovati, setTargetTrovati] = useState(0)
  const [totalTarget, setTotalTarget] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [risultatiSessione, setRisultatiSessione] = useState<RisultatoClick[]>([])
  const [progressivoEsercizio, setProgressivoEsercizio] = useState(1)
  const [sessionId] = useState(`session_${Date.now()}`)

  // Feedback
  const [feedbackImg, setFeedbackImg] = useState<{ id: number; esito: 'positivo' | 'negativo' } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // Menu impostazioni
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [imageSize, setImageSize] = useState(160)
  const [imageBgColor, setImageBgColor] = useState('#ffffff')

  // TTS
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  const availableColors = [
    { name: 'Bianco', value: '#ffffff' },
    { name: 'Nero', value: '#000000' },
    { name: 'Giallo', value: '#facc15' },
    { name: 'Blu', value: '#3b82f6' },
    { name: 'Rosso', value: '#ef4444' },
    { name: 'Verde', value: '#22c55e' },
  ]

  // Preferenze localStorage
  const loadPreferences = (userId: string) => {
    if (typeof window === 'undefined' || !userId) return
    try {
      const saved = localStorage.getItem(`cerca_cat_prefs_${userId}`)
      if (saved) {
        const p = JSON.parse(saved)
        if (p.imageSize) setImageSize(p.imageSize)
        if (p.imageBgColor) setImageBgColor(p.imageBgColor)
      }
    } catch {}
  }

  const savePreferences = (userId: string) => {
    if (typeof window === 'undefined' || !userId) return
    try {
      localStorage.setItem(`cerca_cat_prefs_${userId}`, JSON.stringify({ imageSize, imageBgColor }))
    } catch {}
  }

  useEffect(() => { if (selectedUserId) savePreferences(selectedUserId) }, [imageSize, imageBgColor, selectedUserId])

  // Init TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || []
        voiceRef.current = voices.find(v => v.lang.startsWith('it')) || voices[0] || null
      }
      if (synthRef.current.getVoices().length > 0) loadVoices()
      else synthRef.current.addEventListener('voiceschanged', loadVoices)
    }
  }, [])

  // Init: aspetta che l'autenticazione sia completata
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) { setAuthError(true); return }
    if (!hasLoadedRef.current) {
      loadCurrentUser()
    }
  }, [isAuthLoading, user])

  const speak = (text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'it-IT'
    u.rate = 0.9
    if (voiceRef.current) u.voice = voiceRef.current
    synthRef.current.speak(u)
  }

  const loadCurrentUser = async () => {
    if (isLoadingRef.current) return
    if (!user) return
    isLoadingRef.current = true

    try {
      if (utenteParam) {
        const { data: profile } = await supabase
          .from('profiles').select('id, nome, cognome').eq('id', utenteParam).single()
        if (profile) {
          setSelectedUserId(profile.id)
          setSelectedUserName(`${profile.nome} ${profile.cognome}`)
          setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
          loadPreferences(profile.id)
          await loadEsercizi(profile.id)
        }
        hasLoadedRef.current = true
        return
      }

      const { data: profile } = await supabase
        .from('profiles').select('id, nome, cognome, id_ruolo, ruoli(codice)').eq('id', user.id).single()
      if (profile) {
        const ruolo = (profile.ruoli as any)?.codice || 'utente'
        if (ruolo === 'utente') {
          setSelectedUserId(profile.id)
          setSelectedUserName(`${profile.nome} ${profile.cognome}`)
          setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
          loadPreferences(profile.id)
          await loadEsercizi(profile.id)
        } else {
          await loadUtentiConEsercizi()
        }
      }
      hasLoadedRef.current = true
    } catch (err) {
      console.error('Errore caricamento utente:', err)
    } finally {
      isLoadingRef.current = false
    }
  }

  const loadUtentiConEsercizi = async () => {
    setLoadingUtenti(true)
    try {
      const { data: esercizi } = await supabase
        .from('cerca_categoria_esercizi').select('id_utente').eq('stato', 'attiva')
      if (!esercizi || esercizi.length === 0) { setUtenti([]); return }
      const ids = [...new Set(esercizi.map((e: any) => e.id_utente))]
      const { data: profiles } = await supabase
        .from('profiles').select('id, nome, cognome').in('id', ids).order('cognome')
      setUtenti((profiles || []).map((p: any) => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))
    } catch (err) {
      console.error('Errore caricamento utenti:', err)
    } finally {
      setLoadingUtenti(false)
    }
  }

  const loadEsercizi = async (userId: string) => {
    setLoadingEsercizi(true)
    try {
      const res = await fetch(`/api/esercizi/cerca-categoria?action=list_esercizi&id_utente=${userId}`)
      const data = await res.json()
      if (data.success) {
        setEsercizi(data.data || [])
        if (data.data && data.data.length > 0) setShowEserciziList(true)
      }
    } catch (err) {
      console.error('Errore caricamento esercizi:', err)
    } finally {
      setLoadingEsercizi(false)
    }
  }

  const handleUserChange = async (userId: string) => {
    if (!userId) return
    setSelectedUserId(userId)
    const u = utenti.find(u => u.id === userId)
    if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
    setShowUserSelection(false)
    loadPreferences(userId)
    await loadEsercizi(userId)
  }

  const startEsercizio = async (esercizio: EsercizioCategoria) => {
    // Ottieni progressivo
    try {
      const res = await fetch(`/api/esercizi/cerca-categoria?action=get_next_progressivo&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) setProgressivoEsercizio(data.data.progressivo)
    } catch {}

    setSelectedEsercizio(esercizio)
    setRisultatiSessione([])
    setTargetTrovati(0)

    // Mescola target + distrattori
    const tutteImmagini = [
      ...esercizio.immagini_target.map(i => ({ ...i, isTarget: true, cliccata: false })),
      ...esercizio.immagini_distrattori.map(i => ({ ...i, isTarget: false, cliccata: false })),
    ]
    const mischiate = shuffleArray(tutteImmagini)
    setImmaginiMischiate(mischiate)
    setTotalTarget(esercizio.immagini_target.length)
    setStartTime(Date.now())
    setShowEserciziList(false)
    setShowPlayArea(true)

    // Leggi l'istruzione dopo un breve ritardo
    setTimeout(() => speak(esercizio.frase_tts), 500)
  }

  const clickImmagine = async (idx: number) => {
    const img = immaginiMischiate[idx]
    const tempo = Date.now() - startTime
    const esito: 'positivo' | 'negativo' = img.isTarget ? 'positivo' : 'negativo'

    // Feedback visivo
    setFeedbackImg({ id: img.id, esito })
    setTimeout(() => setFeedbackImg(null), 800)

    // Aggiorna stato immagine
    const nuoveImmagini = immaginiMischiate.map((im, i) =>
      i === idx ? { ...im, cliccata: true, esito } : im
    )
    setImmaginiMischiate(nuoveImmagini)

    // Conta target trovati
    if (img.isTarget) {
      const newCount = targetTrovati + 1
      setTargetTrovati(newCount)
      speak('Bravo!')

      // Tutti i target trovati → celebrazione
      if (newCount >= totalTarget) {
        setTimeout(() => {
          setShowCelebration(true)
          speak('Bravo! Hai trovato tutte le immagini!')
          setTimeout(() => { setShowCelebration(false); endEsercizio(nuoveImmagini) }, 2500)
        }, 400)
      }
    } else {
      speak('Riprova!')
    }

    // Salva risultato
    const risultato: RisultatoClick = {
      id_pittogramma: img.id,
      url_pittogramma: img.url,
      tipo_risposta: img.isTarget ? 'target' : 'distrattore',
      risultato: esito,
      tempo_risposta_ms: tempo
    }
    setRisultatiSessione(prev => [...prev, risultato])

    try {
      await fetch('/api/esercizi/cerca-categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_risultato',
          id_utente: selectedUserId,
          id_esercizio: selectedEsercizio?.id,
          frase_tts: selectedEsercizio?.frase_tts,
          categoria_target: selectedEsercizio?.categoria_target,
          id_pittogramma_cliccato: img.id,
          url_pittogramma: img.url,
          tipo_risposta: img.isTarget ? 'target' : 'distrattore',
          risultato: esito,
          tempo_risposta_ms: tempo,
          id_sessione: sessionId,
          progressivo_esercizio: progressivoEsercizio
        })
      })
    } catch (err) {
      console.error('Errore salvataggio:', err)
    }
  }

  const endEsercizio = (immagini = immaginiMischiate) => {
    setShowPlayArea(false)
    setShowSummary(true)
    const corrette = immagini.filter(i => i.esito === 'positivo').length
    speak(`Esercizio completato. ${corrette} risposte corrette.`)
  }

  const closeSummary = () => {
    setShowSummary(false)
    setSelectedEsercizio(null)
    setShowEserciziList(true)
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage?')) return
    await supabase.auth.signOut()
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  const corrette = risultatiSessione.filter(r => r.risultato === 'positivo').length
  const errate = risultatiSessione.filter(r => r.risultato === 'negativo').length
  const percentuale = risultatiSessione.length > 0 ? Math.round((corrette / risultatiSessione.length) * 100) : 0

  // Auth Error
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sessione Scaduta</h2>
          <p className="text-gray-600 mb-6">Effettua nuovamente il login.</p>
          <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-full font-semibold hover:bg-indigo-600">
            <LogIn className="h-5 w-5" /> Vai al Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg p-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/training_cognitivo/categorizzazione/cerca-categoria"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Grid3x3 className="h-6 w-6" />
            Cerca Categoria
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsMenu(true)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Impostazioni"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
            <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">

        {/* Selezione Utente */}
        {showUserSelection && (
          <section className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-indigo-700 mb-4">Seleziona il tuo profilo</h2>
            {loadingUtenti ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <select
                onChange={e => handleUserChange(e.target.value)}
                className="w-full p-3 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Seleziona --</option>
                {utenti.map(u => (
                  <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
                ))}
              </select>
            )}
          </section>
        )}

        {/* Lista Esercizi */}
        {showEserciziList && (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              Esercizi disponibili per {selectedUserName}
            </h2>
            {loadingEsercizi ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
              </div>
            ) : esercizi.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Grid3x3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nessun esercizio disponibile. Chiedi all'educatore di creare degli esercizi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {esercizi.map(esercizio => (
                  <button
                    key={esercizio.id}
                    onClick={() => startEsercizio(esercizio)}
                    className="group text-left bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <Play className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 mb-1 truncate">{esercizio.frase_tts}</p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span className="text-teal-600">{esercizio.immagini_target?.length || 0} target</span>
                          <span className="text-red-500">{esercizio.immagini_distrattori?.length || 0} distrattori</span>
                        </div>
                        {/* Mini anteprima immagini */}
                        <div className="flex gap-1 mt-2">
                          {esercizio.immagini_target?.slice(0, 3).map((img, i) => (
                            <img key={i} src={img.url} alt="" className="w-8 h-8 object-contain rounded border border-indigo-200" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Area Esercizio */}
        {showPlayArea && selectedEsercizio && (
          <div className="space-y-6">
            {/* Istruzione */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Istruzione:</p>
                  <p className="text-2xl font-bold text-indigo-700">{selectedEsercizio.frase_tts}</p>
                </div>
                <button
                  onClick={() => speak(selectedEsercizio.frase_tts)}
                  className="p-4 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors shrink-0"
                  title="Ascolta"
                >
                  <Volume2 className="h-8 w-8" />
                </button>
              </div>

              {/* Progress */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Trovati:</span>
                  <span className="font-bold text-teal-600 text-lg">{targetTrovati}</span>
                  <span className="text-gray-400">/</span>
                  <span className="font-bold text-gray-700">{totalTarget}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600 font-bold">
                    <CheckCircle className="h-4 w-4" />
                    {risultatiSessione.filter(r => r.risultato === 'positivo').length}
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-bold">
                    <XCircle className="h-4 w-4" />
                    {risultatiSessione.filter(r => r.risultato === 'negativo').length}
                  </span>
                </div>
                <button
                  onClick={() => endEsercizio()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors flex items-center gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  Fine
                </button>
              </div>

              {/* Barra progresso */}
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalTarget > 0 ? (targetTrovati / totalTarget) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Grid Immagini */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-sm text-gray-500 mb-4 text-center">Tocca le immagini della categoria:</p>
              <div className="flex flex-wrap justify-center gap-4">
                {immaginiMischiate.map((img, idx) => {
                  const isFeedback = feedbackImg?.id === img.id
                  const borderColor = img.cliccata && img.esito === 'positivo'
                    ? 'border-teal-500 ring-4 ring-teal-200'
                    : isFeedback && img.esito === 'negativo'
                      ? 'border-red-500 ring-4 ring-red-200'
                      : 'border-gray-200 hover:border-indigo-400'
                  const opacity = img.cliccata && img.esito === 'positivo' ? 'opacity-60' : 'opacity-100'
                  const cursor = img.cliccata && img.esito === 'positivo' ? 'cursor-default' : 'cursor-pointer'

                  return (
                    <div
                      key={`${img.id}-${idx}`}
                      onClick={() => !(img.cliccata && img.esito === 'positivo') && clickImmagine(idx)}
                      className={`relative rounded-2xl border-2 transition-all duration-200 ${borderColor} ${opacity} ${cursor} hover:-translate-y-1 hover:shadow-md`}
                      style={{ backgroundColor: imageBgColor, padding: '8px' }}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="object-contain"
                        style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
                      />
                      {/* Badge risultato */}
                      {img.cliccata && img.esito === 'positivo' && (
                        <div className="absolute top-1 right-1 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                      )}
                      {isFeedback && img.esito === 'negativo' && (
                        <div className="absolute inset-0 bg-red-500/20 rounded-2xl flex items-center justify-center">
                          <XCircle className="h-12 w-12 text-red-600 animate-bounce" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Menu Impostazioni */}
      {showSettingsMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSettingsMenu(false)} />
          <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Impostazioni
              </h3>
              <button onClick={() => setShowSettingsMenu(false)} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Grandezza Immagini */}
              <div className="border-b pb-4">
                <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                  <ImageIcon className="h-4 w-4 text-indigo-500" />
                  Grandezza Immagini
                </label>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-400" />
                  <input
                    type="range" min="80" max="240" step="20" value={imageSize}
                    onChange={e => setImageSize(Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="text-xs text-gray-400 text-center mt-1">{imageSize}px</div>
              </div>

              {/* Sfondo Immagini */}
              <div className="border-b pb-4">
                <label className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                  Sfondo Immagini
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {availableColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setImageBgColor(color.value)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${imageBgColor === color.value ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-300'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => { setImageSize(160); setImageBgColor('#ffffff') }}
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

      {/* Modal Riepilogo */}
      {showSummary && selectedEsercizio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-600 flex items-center justify-center gap-2 mb-2">
              Riepilogo
            </h2>
            <p className="text-center text-gray-600 mb-6">{selectedEsercizio.frase_tts}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{corrette}</div>
                <div className="text-sm text-green-700">Corrette</div>
              </div>
              <div className="bg-red-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{errate}</div>
                <div className="text-sm text-red-700">Errate</div>
              </div>
              <div className="bg-indigo-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-indigo-600">{percentuale}%</div>
                <div className="text-sm text-indigo-700">Precisione</div>
              </div>
            </div>

            <p className="text-center text-gray-600 mb-6">
              Hai trovato <strong>{targetTrovati}</strong> su <strong>{totalTarget}</strong> immagini target
            </p>

            <button
              onClick={closeSummary}
              className="w-full py-3 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-600 transition-colors"
            >
              Torna agli Esercizi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
