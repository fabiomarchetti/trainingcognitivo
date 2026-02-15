/**
 * Area Educatore - Gestione coppie parola-immagine
 *
 * Permette all'educatore di:
 * - Selezionare un utente
 * - Impostare il numero di prove
 * - Creare coppie target-distrattore cercando pittogrammi ARASAAC
 * - Visualizzare e eliminare coppie esistenti
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings, Search,
  Plus, Trash2, CheckCircle, XCircle, Save, Image as ImageIcon, Loader2,
  Play, Type
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Coppia } from '../types'

// ARASAAC API
const ARASAAC_API = 'https://api.arasaac.org/api'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'

interface Pittogramma {
  id: number
  name: string
  url: string
}

interface Utente {
  id: string
  nome: string
  cognome: string
}

export default function GestionePage() {
  const supabase = createClient()

  // Stato utente
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  // Impostazioni
  const [numeroProve, setNumeroProve] = useState<number>(10)

  // Ricerca pittogrammi
  const [searchTarget, setSearchTarget] = useState('')
  const [searchDistractor, setSearchDistractor] = useState('')
  const [resultsTarget, setResultsTarget] = useState<Pittogramma[]>([])
  const [resultsDistractor, setResultsDistractor] = useState<Pittogramma[]>([])
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [loadingDistractor, setLoadingDistractor] = useState(false)

  // Selezioni
  const [selectedTarget, setSelectedTarget] = useState<Pittogramma | null>(null)
  const [selectedDistractor, setSelectedDistractor] = useState<Pittogramma | null>(null)

  // Coppie esistenti
  const [coppie, setCoppie] = useState<Coppia[]>([])
  const [loadingCoppie, setLoadingCoppie] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Carica utenti all'avvio
  useEffect(() => {
    loadCurrentUser()
  }, [])

  // Carica dati quando si seleziona un utente
  useEffect(() => {
    if (selectedUserId) {
      loadSettings()
      loadCoppie()
    }
  }, [selectedUserId])

  // Debounce per ricerca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTarget.length >= 2) {
        searchArasaac('target', searchTarget)
      } else {
        setResultsTarget([])
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTarget])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDistractor.length >= 2) {
        searchArasaac('distractor', searchDistractor)
      } else {
        setResultsDistractor([])
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchDistractor])

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Carica utente corrente e lista utenti
  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Ottieni profilo con JOIN sulla tabella ruoli
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nome, cognome, id_ruolo, ruoli(codice)')
      .eq('id', user.id)
      .single()

    if (profile) {
      const ruoloCodice = (profile.ruoli as any)?.codice || ''
      setCurrentUserRole(ruoloCodice)

      // Se utente normale, mostra solo se stesso
      if (ruoloCodice === 'utente') {
        setSelectedUserId(profile.id)
        setSelectedUserName(`${profile.nome} ${profile.cognome}`)
        setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
      } else {
        // Educatore/admin: carica lista utenti
        await loadUtenti(ruoloCodice)
        // Preseleziona se stesso come educatore
        setSelectedUserId(profile.id)
        setSelectedUserName(`${profile.nome} ${profile.cognome}`)
      }
    }
  }

  const loadUtenti = async (ruoloCodice: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Prima ottieni l'ID del ruolo "utente"
    const { data: ruoloUtente } = await supabase
      .from('ruoli')
      .select('id')
      .eq('codice', 'utente')
      .single()

    if (!ruoloUtente) {
      console.error('Ruolo utente non trovato')
      return
    }

    // Carica solo profili con ruolo "utente"
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, cognome')
      .eq('id_ruolo', ruoloUtente.id)
      .order('cognome')

    if (profiles) {
      setUtenti(profiles.map(p => ({
        id: p.id,
        nome: p.nome || '',
        cognome: p.cognome || ''
      })))
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch(`/api/esercizi/parola-immagine?action=get_impostazioni&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setNumeroProve(data.data.numero_prove || 10)
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error)
    }
  }

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/esercizi/parola-immagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_impostazioni',
          id_utente: selectedUserId,
          numero_prove: numeroProve
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Impostazioni salvate!', 'success')
      } else {
        showToast(data.message || 'Errore salvataggio', 'error')
      }
    } catch (error) {
      showToast('Errore di connessione', 'error')
    }
  }

  const loadCoppie = async () => {
    setLoadingCoppie(true)
    try {
      const res = await fetch(`/api/esercizi/parola-immagine?action=get_coppie&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) {
        setCoppie(data.data || [])
      }
    } catch (error) {
      console.error('Errore caricamento coppie:', error)
    } finally {
      setLoadingCoppie(false)
    }
  }

  const searchArasaac = async (type: 'target' | 'distractor', query: string) => {
    const setLoading = type === 'target' ? setLoadingTarget : setLoadingDistractor
    const setResults = type === 'target' ? setResultsTarget : setResultsDistractor

    setLoading(true)
    try {
      const encodedQuery = encodeURIComponent(query)
      const response = await fetch(`${ARASAAC_API}/pictograms/it/search/${encodedQuery}`)

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        setResults([])
        return
      }

      const pictograms: Pittogramma[] = data.slice(0, 24).map((item: any) => {
        const id = item._id
        let name = query
        const keywords = item.keywords || []
        const italianKeywords = keywords.filter((k: any) =>
          k.language && k.language.toLowerCase() === 'it'
        )
        if (italianKeywords.length > 0) {
          italianKeywords.sort((a: any, b: any) => a.keyword.length - b.keyword.length)
          name = italianKeywords[0].keyword
        }
        return {
          id,
          name,
          url: `${ARASAAC_STATIC}/${id}/${id}_500.png`
        }
      })

      setResults(pictograms)
    } catch (error) {
      console.error('Errore ricerca ARASAAC:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const savePair = async () => {
    if (!selectedTarget || !selectedDistractor) {
      showToast('Seleziona sia target che distrattore', 'warning')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    try {
      const res = await fetch('/api/esercizi/parola-immagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_coppia',
          id_utente: selectedUserId,
          id_educatore: user?.id,
          parola_target: selectedTarget.name,
          id_pittogramma_target: selectedTarget.id,
          url_immagine_target: selectedTarget.url,
          parola_distrattore: selectedDistractor.name,
          id_pittogramma_distrattore: selectedDistractor.id,
          url_immagine_distrattore: selectedDistractor.url
        })
      })

      const data = await res.json()

      if (data.success) {
        showToast('Coppia creata con successo!', 'success')
        resetForm()
        loadCoppie()
      } else {
        showToast(data.message || 'Errore creazione coppia', 'error')
      }
    } catch (error) {
      showToast('Errore di connessione', 'error')
    }
  }

  const deletePair = async (idCoppia: number) => {
    if (!confirm('Eliminare questa coppia?')) return

    try {
      const res = await fetch('/api/esercizi/parola-immagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_coppia',
          id_coppia: idCoppia
        })
      })

      const data = await res.json()

      if (data.success) {
        showToast('Coppia eliminata', 'success')
        loadCoppie()
      } else {
        showToast(data.message || 'Errore eliminazione', 'error')
      }
    } catch (error) {
      showToast('Errore di connessione', 'error')
    }
  }

  const resetForm = () => {
    setSearchTarget('')
    setSearchDistractor('')
    setResultsTarget([])
    setResultsDistractor([])
    setSelectedTarget(null)
    setSelectedDistractor(null)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training_cognitivo/leggo-scrivo/parola-immagine"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Torna indietro"
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
            <Settings className="h-6 w-6" />
            Area Educatore
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
      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione Utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Seleziona Utente
          </h2>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value)
              const user = utenti.find(u => u.id === e.target.value)
              if (user) setSelectedUserName(`${user.nome} ${user.cognome}`)
            }}
            className="w-full p-3 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none"
            disabled={currentUserRole === 'utente'}
          >
            <option value="">-- Seleziona un utente --</option>
            {utenti.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome} {u.cognome}
              </option>
            ))}
          </select>
        </section>

        {selectedUserId && (
          <>
            {/* Impostazioni */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Impostazioni Sessione
              </h2>
              <div className="flex items-center gap-4">
                <label className="text-gray-700">Numero prove per sessione:</label>
                <input
                  type="number"
                  value={numeroProve}
                  onChange={(e) => setNumeroProve(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                  min={1}
                  max={50}
                  className="w-24 p-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Salva
                </button>
              </div>
            </section>

            {/* Crea Nuova Coppia */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-green-700 mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crea Nuova Coppia
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 font-bold">
                    <CheckCircle className="h-5 w-5" />
                    TARGET (Risposta Corretta)
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTarget}
                      onChange={(e) => setSearchTarget(e.target.value)}
                      placeholder="Cerca pittogramma target..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Grid risultati */}
                  <div className="h-48 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                    {loadingTarget ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                      </div>
                    ) : resultsTarget.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Inserisci almeno 2 caratteri per cercare...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {resultsTarget.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedTarget(p)}
                            className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${
                              selectedTarget?.id === p.id
                                ? 'border-green-500 bg-green-50'
                                : 'border-transparent hover:border-green-300'
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="w-full aspect-square object-contain" />
                            <p className="text-xs text-center truncate">{p.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className={`h-24 border-2 rounded-lg flex items-center justify-center gap-4 ${
                    selectedTarget ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}>
                    {selectedTarget ? (
                      <>
                        <img src={selectedTarget.url} alt={selectedTarget.name} className="h-16 w-16 object-contain" />
                        <span className="font-bold text-green-700">{selectedTarget.name}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                        <span className="text-gray-400">Nessuna selezione</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Distrattore */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600 font-bold">
                    <XCircle className="h-5 w-5" />
                    DISTRATTORE (Risposta Sbagliata)
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchDistractor}
                      onChange={(e) => setSearchDistractor(e.target.value)}
                      placeholder="Cerca pittogramma distrattore..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-red-200 rounded-lg focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  {/* Grid risultati */}
                  <div className="h-48 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                    {loadingDistractor ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                      </div>
                    ) : resultsDistractor.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        Inserisci almeno 2 caratteri per cercare...
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {resultsDistractor.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedDistractor(p)}
                            className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${
                              selectedDistractor?.id === p.id
                                ? 'border-red-500 bg-red-50'
                                : 'border-transparent hover:border-red-300'
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="w-full aspect-square object-contain" />
                            <p className="text-xs text-center truncate">{p.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className={`h-24 border-2 rounded-lg flex items-center justify-center gap-4 ${
                    selectedDistractor ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}>
                    {selectedDistractor ? (
                      <>
                        <img src={selectedDistractor.url} alt={selectedDistractor.name} className="h-16 w-16 object-contain" />
                        <span className="font-bold text-red-700">{selectedDistractor.name}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                        <span className="text-gray-400">Nessuna selezione</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Pulsante Salva */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={savePair}
                  disabled={!selectedTarget || !selectedDistractor}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  Aggiungi Coppia
                </button>
              </div>
            </section>

            {/* Vai agli Esercizi */}
            {coppie.length > 0 && (
              <section className="bg-gradient-to-r from-orange-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-dashed border-orange-200">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5 text-green-600" />
                  Avvia Esercizio per {selectedUserName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href={`/training_cognitivo/leggo-scrivo/parola-immagine/esercizio?utente=${selectedUserId}`}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <Type className="h-6 w-6" />
                    Parola → Immagine
                  </Link>
                  <Link
                    href={`/training_cognitivo/leggo-scrivo/parola-immagine/immagine-parola?utente=${selectedUserId}`}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-fuchsia-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <ImageIcon className="h-6 w-6" />
                    Immagine → Parola
                  </Link>
                </div>
              </section>
            )}

            {/* Coppie Esistenti */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-green-700 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Coppie Create
                </h2>
                <span className="text-gray-500">{coppie.length} coppi{coppie.length === 1 ? 'a' : 'e'}</span>
              </div>

              {loadingCoppie ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                </div>
              ) : coppie.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nessuna coppia creata per questo utente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coppie.map(coppia => (
                    <div key={coppia.id} className="border-2 border-gray-100 rounded-xl p-4 hover:border-green-200 transition-colors relative group">
                      <div className="flex gap-4 mb-3">
                        <img
                          src={coppia.url_immagine_target}
                          alt={coppia.parola_target}
                          className="w-16 h-16 object-contain border-2 border-green-200 rounded-lg"
                          title={`Target: ${coppia.parola_target}`}
                        />
                        <img
                          src={coppia.url_immagine_distrattore}
                          alt={coppia.parola_distrattore}
                          className="w-16 h-16 object-contain border-2 border-red-200 rounded-lg"
                          title={`Distrattore: ${coppia.parola_distrattore}`}
                        />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-gray-800">{coppia.parola_target}</p>
                        <p className="text-gray-500">
                          <span className="text-green-600">✓ {coppia.parola_target}</span>
                          {' / '}
                          <span className="text-red-600">✗ {coppia.parola_distrattore}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => deletePair(coppia.id)}
                        className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                        title="Elimina coppia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 animate-slide-up ${
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'error' ? 'bg-red-600' :
          'bg-yellow-600'
        }`}>
          {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
