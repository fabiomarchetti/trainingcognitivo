/**
 * Ascolto la Musica - Area Educatore
 *
 * Gestione brani YouTube per gli utenti:
 * - Form a sinistra (1/3 schermo)
 * - YouTube si apre in popup separato (2/3 schermo a destra)
 */
'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Save, X, Search,
  Music, RefreshCw, ExternalLink, Clock, Users, Youtube, List, Headphones
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
  stato: string
  created_at: string
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
    <div className="min-h-screen bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Caricamento...</p>
      </div>
    </div>
  )
}

// Componente principale wrappato con Suspense per useSearchParams
export default function EducatoreAscoltoMusicaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EducatoreAscoltoMusicaContent />
    </Suspense>
  )
}

function EducatoreAscoltoMusicaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()
  const utenteIdFromUrl = searchParams.get('utente')

  // Stati
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUtente, setSelectedUtente] = useState<Utente | null>(null)
  const [brani, setBrani] = useState<Brano[]>([])
  const [categorie, setCategorie] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegularUser, setIsRegularUser] = useState(false)
  const [showBraniList, setShowBraniList] = useState(false)
  const [youtubeStatus, setYoutubeStatus] = useState<string>('')

  // Form brano
  const [branoForm, setBranoForm] = useState({
    nome_brano: '',
    categoria: '',
    nuova_categoria: '',
    link_youtube: '',
    inizio_min: 0,
    inizio_sec: 0,
    fine_min: 0,
    fine_sec: 0
  })

  // Refs
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const isSavingRef = useRef(false)
  const categoryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const youtubeWindowRef = useRef<Window | null>(null)

  // Carica brani di un utente
  const loadBrani = useCallback(async (idUtente: string) => {
    try {
      const { data, error } = await supabaseRef.current
        .from('ascolto_musica_brani')
        .select('*')
        .eq('id_utente', idUtente)
        .eq('stato', 'attivo')
        .order('created_at', { ascending: false })

      if (error) throw error

      setBrani(data || [])

      // Estrai categorie uniche
      const cats = [...new Set((data || []).map(b => b.categoria))]
      setCategorie(cats)
    } catch (err: any) {
      console.error('Errore caricamento brani:', err)
    }
  }, [])

  // Carica utenti tramite API (bypassa RLS)
  const loadUtenti = useCallback(async () => {
    if (!user || isLoadingRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const res = await fetch('/api/utenti/lista')
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.message || 'Errore caricamento utenti')
      }

      const utentiList = data.data || []

      // Se c'è un solo utente, è l'utente corrente (caso utente normale)
      if (utentiList.length === 1) {
        setIsRegularUser(true)
        const currentUser: Utente = {
          id: utentiList[0].id,
          nome: utentiList[0].nome || '',
          cognome: utentiList[0].cognome || ''
        }
        setUtenti([currentUser])
        setSelectedUtente(currentUser)
        await loadBrani(utentiList[0].id)
      } else {
        setUtenti(utentiList)
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

  // Cleanup: chiudi finestra YouTube quando si lascia la pagina
  useEffect(() => {
    return () => {
      if (youtubeWindowRef.current && !youtubeWindowRef.current.closed) {
        youtubeWindowRef.current.close()
      }
    }
  }, [])

  // Auto-seleziona utente da URL
  useEffect(() => {
    if (utenteIdFromUrl && utenti.length > 0 && !selectedUtente) {
      const utente = utenti.find(u => u.id === utenteIdFromUrl)
      if (utente) {
        selectUtente(utente)
      }
    }
  }, [utenteIdFromUrl, utenti, selectedUtente])

  // Seleziona utente
  const selectUtente = async (utente: Utente) => {
    setSelectedUtente(utente)
    await loadBrani(utente.id)
  }

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

  // Apri YouTube in finestra popup
  const openYouTubePopup = (query: string) => {
    const searchQuery = query || 'musica per bambini'
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`

    // Calcola dimensioni: 2/3 schermo a destra
    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    const screenLeft = (window.screen as unknown as { availLeft?: number }).availLeft || 0

    const youtubeWidth = Math.floor(screenWidth * 0.667)
    const youtubeHeight = screenHeight
    const youtubeLeft = screenLeft + Math.floor(screenWidth * 0.333)
    const youtubeTop = 0

    // Se finestra già aperta, aggiorna URL
    if (youtubeWindowRef.current && !youtubeWindowRef.current.closed) {
      try {
        youtubeWindowRef.current.location.href = url
        youtubeWindowRef.current.focus()
        setYoutubeStatus(`Ricerca: "${searchQuery}"`)
        return
      } catch (e) {
        youtubeWindowRef.current.close()
        youtubeWindowRef.current = null
      }
    }

    // Apri nuova finestra
    youtubeWindowRef.current = window.open(
      url,
      'YouTubeSearch',
      `width=${youtubeWidth},height=${youtubeHeight},left=${youtubeLeft},top=${youtubeTop},scrollbars=yes,resizable=yes,menubar=no,toolbar=yes,location=yes`
    )

    if (!youtubeWindowRef.current) {
      alert('Impossibile aprire YouTube. Verifica che i popup non siano bloccati dal browser.')
      setYoutubeStatus('Popup bloccato dal browser')
    } else {
      youtubeWindowRef.current.focus()
      setYoutubeStatus(`Ricerca: "${searchQuery}"`)
    }
  }

  // Chiudi finestra YouTube
  const closeYouTubePopup = () => {
    if (youtubeWindowRef.current && !youtubeWindowRef.current.closed) {
      youtubeWindowRef.current.close()
    }
    youtubeWindowRef.current = null
    setYoutubeStatus('')
  }

  // Gestione cambio categoria
  const handleCategoriaChange = (value: string) => {
    setBranoForm({ ...branoForm, categoria: value, nuova_categoria: '' })

    if (categoryTimeoutRef.current) {
      clearTimeout(categoryTimeoutRef.current)
    }

    if (value && value !== '__altra__' && value.length >= 2) {
      categoryTimeoutRef.current = setTimeout(() => {
        openYouTubePopup(value)
      }, 1000)
    }
  }

  // Gestione nuova categoria
  const handleNuovaCategoriaChange = (value: string) => {
    setBranoForm({ ...branoForm, nuova_categoria: value })

    if (categoryTimeoutRef.current) {
      clearTimeout(categoryTimeoutRef.current)
    }

    if (value.length >= 3) {
      categoryTimeoutRef.current = setTimeout(() => {
        openYouTubePopup(value)
      }, 1000)
    }
  }

  // Salva brano
  const saveBrano = useCallback(async () => {
    if (!selectedUtente || isSavingRef.current) return

    const categoria = branoForm.nuova_categoria.trim() || branoForm.categoria
    if (!branoForm.nome_brano.trim() || !categoria || !branoForm.link_youtube.trim()) {
      alert('Compila nome brano, categoria e link YouTube')
      return
    }

    const videoId = extractYouTubeId(branoForm.link_youtube)
    if (!videoId) {
      alert('Link YouTube non valido')
      return
    }

    isSavingRef.current = true
    setIsSaving(true)

    try {
      const inizioSec = branoForm.inizio_min * 60 + branoForm.inizio_sec
      const fineSec = branoForm.fine_min * 60 + branoForm.fine_sec

      const { error } = await supabaseRef.current
        .from('ascolto_musica_brani')
        .insert({
          id_utente: selectedUtente.id,
          nome_brano: branoForm.nome_brano.trim(),
          categoria: categoria,
          link_youtube: branoForm.link_youtube.trim(),
          inizio_brano: inizioSec,
          fine_brano: fineSec,
          stato: 'attivo'
        })

      if (error) throw error

      // Reset form
      setBranoForm({
        nome_brano: '',
        categoria: '',
        nuova_categoria: '',
        link_youtube: '',
        inizio_min: 0,
        inizio_sec: 0,
        fine_min: 0,
        fine_sec: 0
      })

      // Chiudi YouTube
      closeYouTubePopup()

      await loadBrani(selectedUtente.id)
      alert('Brano salvato con successo!')
    } catch (err: any) {
      console.error('Errore salvataggio brano:', err)
      alert('Errore: ' + err.message)
    } finally {
      setIsSaving(false)
      isSavingRef.current = false
    }
  }, [selectedUtente, branoForm, loadBrani])

  // Elimina brano
  const deleteBrano = async (brano: Brano) => {
    if (!confirm(`Eliminare il brano "${brano.nome_brano}"?`)) return

    try {
      const { error } = await supabaseRef.current
        .from('ascolto_musica_brani')
        .update({ stato: 'archiviato' })
        .eq('id_brano', brano.id_brano)

      if (error) throw error

      if (selectedUtente) {
        await loadBrani(selectedUtente.id)
      }
    } catch (err: any) {
      console.error('Errore eliminazione brano:', err)
      alert('Errore: ' + err.message)
    }
  }

  // Reset form
  const resetForm = () => {
    setBranoForm({
      nome_brano: '',
      categoria: '',
      nuova_categoria: '',
      link_youtube: '',
      inizio_min: 0,
      inizio_sec: 0,
      fine_min: 0,
      fine_sec: 0
    })
    closeYouTubePopup()
  }

  // Formatta tempo
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // Loading
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800">
      {/* Header */}
      <header className="bg-violet-700 shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                closeYouTubePopup()
                router.push('/training_cognitivo/strumenti/ascolto-la-musica')
              }}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="h-6 w-6" />
            {isRegularUser ? 'I Miei Brani' : 'Gestione Brani'}
          </h1>

          <div className="flex items-center gap-2">
            {selectedUtente && (
              <>
                <button
                  onClick={() => setShowBraniList(!showBraniList)}
                  className={`p-2 rounded-full transition-colors ${showBraniList ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  title="Mostra lista brani"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    closeYouTubePopup()
                    router.push(`/training_cognitivo/strumenti/ascolto-la-musica/ascolta?utente=${selectedUtente.id}`)
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Vai all'Area Utente"
                >
                  <Headphones className="h-4 w-4" />
                  <span className="hidden sm:inline">Area Utente</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main - Form occupa tutto lo schermo, YouTube in popup */}
      <main className="p-6">
        <div className="max-w-2xl">
          {/* Card Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {/* Dropdown selezione utente */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-violet-700 font-medium mb-2">
                <Users className="h-5 w-5" />
                {isRegularUser ? 'Utente' : 'Seleziona Utente'}
              </label>
              {isRegularUser ? (
                <div className="px-4 py-3 bg-violet-100 rounded-lg font-medium text-violet-800">
                  {selectedUtente?.nome} {selectedUtente?.cognome}
                </div>
              ) : (
                <select
                  value={selectedUtente?.id || ''}
                  onChange={(e) => {
                    const utente = utenti.find(u => u.id === e.target.value)
                    if (utente) selectUtente(utente)
                  }}
                  className="w-full px-4 py-3 border-2 border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-amber-50 font-medium"
                >
                  <option value="">-- Seleziona un utente --</option>
                  {utenti.map((utente) => (
                    <option key={utente.id} value={utente.id}>
                      {utente.cognome} {utente.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedUtente && (
              <>
                <h3 className="font-bold text-violet-800 text-lg mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Aggiungi Nuovo Brano
                </h3>

                {/* Status YouTube */}
                {youtubeStatus && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Youtube className="h-5 w-5 text-red-600" />
                      <span className="text-red-800 font-medium">{youtubeStatus}</span>
                    </div>
                    <button
                      onClick={closeYouTubePopup}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Categoria */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={branoForm.categoria}
                    onChange={(e) => handleCategoriaChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-orange-50"
                  >
                    <option value="">-- Seleziona categoria --</option>
                    {categorie.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__altra__">+ Nuova categoria...</option>
                  </select>

                  {branoForm.categoria === '__altra__' && (
                    <input
                      type="text"
                      value={branoForm.nuova_categoria}
                      onChange={(e) => handleNuovaCategoriaChange(e.target.value)}
                      className="w-full mt-2 px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                      placeholder="Scrivi il nome della nuova categoria..."
                      autoFocus
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Seleziona o crea una categoria. YouTube si aprirà in una finestra separata.
                  </p>
                </div>

                {/* Link YouTube */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link YouTube *
                  </label>
                  <input
                    type="url"
                    value={branoForm.link_youtube}
                    onChange={(e) => setBranoForm({ ...branoForm, link_youtube: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-100"
                    placeholder="Incolla qui il link del video..."
                  />
                  {branoForm.link_youtube && extractYouTubeId(branoForm.link_youtube) && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">✓ Link valido</p>
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeId(branoForm.link_youtube)}/mqdefault.jpg`}
                        alt="Anteprima"
                        className="mt-2 w-full max-w-sm rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Nome Brano */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Brano *
                  </label>
                  <input
                    type="text"
                    value={branoForm.nome_brano}
                    onChange={(e) => setBranoForm({ ...branoForm, nome_brano: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50"
                    placeholder="Es: La Bella Lavanderina"
                  />
                </div>

                {/* Tempo Inizio/Fine */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inizio (min:sec)
                    </label>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        min="0"
                        value={branoForm.inizio_min}
                        onChange={(e) => setBranoForm({ ...branoForm, inizio_min: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-2 border-2 border-orange-200 rounded-lg text-center bg-orange-50"
                      />
                      <span className="font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={branoForm.inizio_sec}
                        onChange={(e) => setBranoForm({ ...branoForm, inizio_sec: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-2 border-2 border-orange-200 rounded-lg text-center bg-orange-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fine (min:sec)
                    </label>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        min="0"
                        value={branoForm.fine_min}
                        onChange={(e) => setBranoForm({ ...branoForm, fine_min: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-2 border-2 border-blue-200 rounded-lg text-center bg-blue-50"
                      />
                      <span className="font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={branoForm.fine_sec}
                        onChange={(e) => setBranoForm({ ...branoForm, fine_sec: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-2 border-2 border-blue-200 rounded-lg text-center bg-blue-50"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-6">Lascia 0:00 per iniziare/finire naturalmente</p>

                {/* Riepilogo */}
                {branoForm.nome_brano && (
                  <div className="mb-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
                    <h4 className="font-medium text-violet-800 mb-2">Riepilogo:</h4>
                    <p><strong>Nome:</strong> {branoForm.nome_brano}</p>
                    <p><strong>Categoria:</strong> {branoForm.nuova_categoria || branoForm.categoria || '-'}</p>
                    <p><strong>Utente:</strong> {selectedUtente.nome} {selectedUtente.cognome}</p>
                  </div>
                )}

                {/* Bottoni */}
                <div className="flex gap-3">
                  <button
                    onClick={saveBrano}
                    disabled={isSaving || !branoForm.nome_brano || !branoForm.link_youtube || (!branoForm.categoria && !branoForm.nuova_categoria)}
                    className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-bold"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    Salva Brano
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    title="Svuota campi"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Istruzioni */}
                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <h4 className="font-bold text-blue-800 mb-2">Come funziona:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Seleziona o crea una categoria</li>
                    <li>YouTube si apre automaticamente in una finestra separata</li>
                    <li>Cerca e seleziona il video desiderato</li>
                    <li>Copia il link dalla barra degli indirizzi</li>
                    <li>Incolla il link nel campo "Link YouTube"</li>
                    <li>Compila il nome del brano e salva</li>
                  </ol>
                </div>
              </>
            )}

            {!selectedUtente && (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">Seleziona un utente per iniziare</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Lista Brani */}
      {showBraniList && selectedUtente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-violet-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <List className="h-5 w-5" />
                Brani di {selectedUtente.nome} ({brani.length})
              </h3>
              <button onClick={() => setShowBraniList(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] divide-y">
              {brani.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Music className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessun brano salvato</p>
                </div>
              ) : (
                brani.map((brano) => {
                  const videoId = extractYouTubeId(brano.link_youtube)
                  return (
                    <div key={brano.id_brano} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      {videoId && (
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={brano.nome_brano}
                          className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">{brano.nome_brano}</h3>
                        <p className="text-sm text-violet-600">{brano.categoria}</p>
                        {(brano.inizio_brano > 0 || brano.fine_brano > 0) && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(brano.inizio_brano)} - {brano.fine_brano > 0 ? formatTime(brano.fine_brano) : 'fine'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={brano.link_youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Apri su YouTube"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => deleteBrano(brano)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t">
              <button
                onClick={() => setShowBraniList(false)}
                className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
