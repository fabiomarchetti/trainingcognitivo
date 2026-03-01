/**
 * Area Educatore - Gestione esercizi Cerca Categoria
 *
 * Permette all'educatore di:
 * - Selezionare un utente
 * - Creare esercizi con frase TTS + immagini target + distrattori
 * - Visualizzare e eliminare esercizi esistenti
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings, Search,
  Plus, Trash2, CheckCircle, XCircle, Save, Image as ImageIcon, Loader2,
  Play, Volume2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { EsercizioCategoria, Pittogramma } from '../types'

const ARASAAC_API = 'https://api.arasaac.org/api'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'

const RUOLI_STAFF = ['sviluppatore', 'amministratore', 'direttore', 'casemanager']

interface Utente {
  id: string
  nome: string
  cognome: string
}

interface PittogrammaRicerca {
  id: number
  url: string
}

export default function GestioneCercaCategoriaPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // Stato utente
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  // Form nuovo esercizio
  const [fraseTts, setFraseTts] = useState<string>('')
  const [categoriaTarget, setCategoriaTarget] = useState<string>('')
  const [immaginiTarget, setImmaginiTarget] = useState<PittogrammaRicerca[]>([])
  const [immaginiDistrattori, setImmaginiDistrattori] = useState<PittogrammaRicerca[]>([])

  // Ricerca ARASAAC
  const [searchTarget, setSearchTarget] = useState('')
  const [searchDistractor, setSearchDistractor] = useState('')
  const [resultsTarget, setResultsTarget] = useState<PittogrammaRicerca[]>([])
  const [resultsDistractor, setResultsDistractor] = useState<PittogrammaRicerca[]>([])
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [loadingDistractor, setLoadingDistractor] = useState(false)

  // Esercizi esistenti
  const [esercizi, setEsercizi] = useState<EsercizioCategoria[]>([])
  const [loadingEsercizi, setLoadingEsercizi] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Carica utenti quando auth è pronta
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) return
    if (!hasLoadedRef.current) {
      loadCurrentUser()
    }
  }, [isAuthLoading, user])

  // Carica esercizi quando si seleziona utente
  useEffect(() => {
    if (selectedUserId) {
      loadEsercizi()
    }
  }, [selectedUserId])

  // Debounce ricerca target
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTarget.length >= 2) searchArasaac('target', searchTarget)
      else setResultsTarget([])
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTarget])

  // Debounce ricerca distrattore
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDistractor.length >= 2) searchArasaac('distractor', searchDistractor)
      else setResultsDistractor([])
    }, 400)
    return () => clearTimeout(timer)
  }, [searchDistractor])

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadCurrentUser = async () => {
    if (isLoadingRef.current) return
    if (!user) return
    isLoadingRef.current = true
    try {
      // Usa la nuova API che bypassa RLS
      const res = await fetch('/api/utenti/lista')
      const data = await res.json()

      if (!data.success) {
        console.error('Errore API utenti:', data.message)
        return
      }

      const utentiList = data.data || []
      setUtenti(utentiList.map((p: any) => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))

      // Se c'è un solo utente, selezionalo automaticamente (caso utente normale)
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
      const res = await fetch(`/api/esercizi/cerca-categoria?action=list_esercizi&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) setEsercizi(data.data || [])
    } catch (err) {
      console.error('Errore caricamento esercizi:', err)
    } finally {
      setLoadingEsercizi(false)
    }
  }

  const searchArasaac = async (type: 'target' | 'distractor', query: string) => {
    const setLoading = type === 'target' ? setLoadingTarget : setLoadingDistractor
    const setResults = type === 'target' ? setResultsTarget : setResultsDistractor
    setLoading(true)
    try {
      const res = await fetch(`${ARASAAC_API}/pictograms/it/search/${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) { setResults([]); return }
      setResults(data.slice(0, 24).map((item: any) => ({
        id: item._id,
        url: `${ARASAAC_STATIC}/${item._id}/${item._id}_500.png`
      })))
    } catch (err) {
      console.error('Errore ARASAAC:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const addImmagine = (pitto: PittogrammaRicerca, type: 'target' | 'distractor') => {
    if (type === 'target') {
      if (!immaginiTarget.find(i => i.id === pitto.id)) {
        setImmaginiTarget(prev => [...prev, pitto])
      }
    } else {
      if (!immaginiDistrattori.find(i => i.id === pitto.id)) {
        setImmaginiDistrattori(prev => [...prev, pitto])
      }
    }
  }

  const removeImmagine = (id: number, type: 'target' | 'distractor') => {
    if (type === 'target') setImmaginiTarget(prev => prev.filter(i => i.id !== id))
    else setImmaginiDistrattori(prev => prev.filter(i => i.id !== id))
  }

  const salvaEsercizio = async () => {
    if (!fraseTts.trim()) { showToast('Inserisci la frase TTS', 'warning'); return }
    if (immaginiTarget.length === 0) { showToast('Aggiungi almeno un immagine target', 'warning'); return }
    if (immaginiDistrattori.length === 0) { showToast('Aggiungi almeno un distrattore', 'warning'); return }

    try {
      const res = await fetch('/api/esercizi/cerca-categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_esercizio',
          id_utente: selectedUserId,
          id_educatore: user?.id,
          frase_tts: fraseTts.trim(),
          categoria_target: categoriaTarget.trim() || fraseTts.trim(),
          immagini_target: immaginiTarget,
          immagini_distrattori: immaginiDistrattori
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Esercizio creato!', 'success')
        setFraseTts('')
        setCategoriaTarget('')
        setImmaginiTarget([])
        setImmaginiDistrattori([])
        setSearchTarget('')
        setSearchDistractor('')
        setResultsTarget([])
        setResultsDistractor([])
        loadEsercizi()
      } else {
        showToast(data.message || 'Errore salvataggio', 'error')
      }
    } catch (err) {
      showToast('Errore di connessione', 'error')
    }
  }

  const deleteEsercizio = async (id: number) => {
    if (!confirm('Eliminare questo esercizio?')) return
    try {
      const res = await fetch('/api/esercizi/cerca-categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_esercizio', id_esercizio: id })
      })
      const data = await res.json()
      if (data.success) { showToast('Esercizio eliminato', 'success'); loadEsercizi() }
      else showToast(data.message || 'Errore eliminazione', 'error')
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

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'it-IT'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training_cognitivo/categorizzazione/cerca-categoria"
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

        {/* Selezione Utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-teal-700 mb-4 flex items-center gap-2">
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
            className="w-full p-3 border-2 border-teal-200 rounded-lg focus:border-teal-500 focus:outline-none"
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
            {/* Crea Nuovo Esercizio */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-teal-700 mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crea Nuovo Esercizio
              </h2>

              {/* Frase TTS */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Istruzione (frase TTS) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fraseTts}
                    onChange={e => setFraseTts(e.target.value)}
                    placeholder="es: Cerca gli animali, Trova le verdure..."
                    className="flex-1 p-3 border-2 border-teal-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                  <button
                    onClick={() => fraseTts && speakText(fraseTts)}
                    disabled={!fraseTts}
                    className="p-3 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors disabled:opacity-40"
                    title="Ascolta"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Questa frase verrà letta ad alta voce durante l'esercizio</p>
              </div>

              {/* Griglia ricerca */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-teal-600 font-bold">
                    <CheckCircle className="h-5 w-5" />
                    IMMAGINI TARGET (Corrette) — {immaginiTarget.length} selezionate
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTarget}
                      onChange={e => setSearchTarget(e.target.value)}
                      placeholder="Cerca pittogramma target..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-teal-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Risultati ricerca */}
                  <div className="h-40 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                    {loadingTarget ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                      </div>
                    ) : resultsTarget.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Inserisci almeno 2 caratteri per cercare...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {resultsTarget.map(p => (
                          <div
                            key={p.id}
                            onClick={() => addImmagine(p, 'target')}
                            className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${
                              immaginiTarget.find(i => i.id === p.id)
                                ? 'border-teal-500 bg-teal-50'
                                : 'border-transparent hover:border-teal-300'
                            }`}
                          >
                            <img src={p.url} alt="" className="w-full aspect-square object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Immagini selezionate */}
                  {immaginiTarget.length > 0 && (
                    <div className="border-2 border-teal-200 rounded-lg p-3 bg-teal-50">
                      <p className="text-xs font-semibold text-teal-700 mb-2">Selezionate:</p>
                      <div className="flex flex-wrap gap-2">
                        {immaginiTarget.map(p => (
                          <div key={p.id} className="relative">
                            <img src={p.url} alt="" className="w-14 h-14 object-contain border-2 border-teal-300 rounded-lg" />
                            <button
                              onClick={() => removeImmagine(p.id, 'target')}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Distrattori */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600 font-bold">
                    <XCircle className="h-5 w-5" />
                    DISTRATTORI (Sbagliate) — {immaginiDistrattori.length} selezionate
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchDistractor}
                      onChange={e => setSearchDistractor(e.target.value)}
                      placeholder="Cerca pittogramma distrattore..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-red-200 rounded-lg focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="h-40 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                    {loadingDistractor ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                      </div>
                    ) : resultsDistractor.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Inserisci almeno 2 caratteri per cercare...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {resultsDistractor.map(p => (
                          <div
                            key={p.id}
                            onClick={() => addImmagine(p, 'distractor')}
                            className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${
                              immaginiDistrattori.find(i => i.id === p.id)
                                ? 'border-red-500 bg-red-50'
                                : 'border-transparent hover:border-red-300'
                            }`}
                          >
                            <img src={p.url} alt="" className="w-full aspect-square object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {immaginiDistrattori.length > 0 && (
                    <div className="border-2 border-red-200 rounded-lg p-3 bg-red-50">
                      <p className="text-xs font-semibold text-red-700 mb-2">Selezionate:</p>
                      <div className="flex flex-wrap gap-2">
                        {immaginiDistrattori.map(p => (
                          <div key={p.id} className="relative">
                            <img src={p.url} alt="" className="w-14 h-14 object-contain border-2 border-red-300 rounded-lg" />
                            <button
                              onClick={() => removeImmagine(p.id, 'distractor')}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottone Salva */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={salvaEsercizio}
                  disabled={!fraseTts.trim() || immaginiTarget.length === 0 || immaginiDistrattori.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-full hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <Save className="h-5 w-5" />
                  Salva Esercizio
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
                  href={`/training_cognitivo/categorizzazione/cerca-categoria/esercizio?utente=${selectedUserId}`}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <Play className="h-6 w-6" />
                  Vai all'Esercizio
                </Link>
              </section>
            )}

            {/* Esercizi Esistenti */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-teal-700 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Esercizi Creati
                </h2>
                <span className="text-gray-500">{esercizi.length} esercizi</span>
              </div>

              {loadingEsercizi ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                </div>
              ) : esercizi.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nessun esercizio creato per questo utente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {esercizi.map(esercizio => (
                    <div key={esercizio.id} className="border-2 border-gray-100 rounded-xl p-4 hover:border-teal-200 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => speakText(esercizio.frase_tts)}
                              className="p-1 bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200 transition-colors"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                            <p className="font-bold text-gray-800">{esercizio.frase_tts}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-teal-500" />
                              {esercizio.immagini_target?.length || 0} target
                            </span>
                            <span className="flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-red-500" />
                              {esercizio.immagini_distrattori?.length || 0} distrattori
                            </span>
                          </div>
                          {/* Preview immagini */}
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {esercizio.immagini_target?.slice(0, 4).map((img, i) => (
                              <img key={i} src={img.url} alt="" className="w-10 h-10 object-contain border border-teal-200 rounded" />
                            ))}
                            {(esercizio.immagini_target?.length || 0) > 4 && (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                                +{(esercizio.immagini_target?.length || 0) - 4}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEsercizio(esercizio.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shrink-0"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          toast.type === 'success' ? 'bg-teal-600' :
          toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
        }`}>
          {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
