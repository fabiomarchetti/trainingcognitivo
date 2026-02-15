/**
 * Area Educatore - Gestione parole e lettere
 *
 * Permette all'educatore di:
 * - Selezionare un utente
 * - Impostare numero di prove e tasto cancella
 * - Creare parole target con lettere disponibili
 * - Aggiungere immagini ARASAAC o caricate
 * - Visualizzare e eliminare configurazioni esistenti
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings, Search,
  Plus, Trash2, Save, Image as ImageIcon, Loader2,
  Play, Type, X, Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type {
  ConfigurazioneParola, ImpostazioniEsercizio, Utente,
  PittogrammaArasaac, ALFABETO_ITALIANO, getConfigKey
} from '../types'

// ARASAAC API
const ARASAAC_API = 'https://api.arasaac.org/api'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'

// Alfabeto italiano
const ALFABETO = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Z'
]

export default function GestionePage() {
  const supabase = createClient()

  // Stato utente
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Impostazioni
  const [numeroProve, setNumeroProve] = useState<number>(10)
  const [tastoCancellaVisibile, setTastoCancellaVisibile] = useState<boolean>(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Parola corrente
  const [parolaTarget, setParolaTarget] = useState('')
  const [lettereSelezionate, setLettereSelezionate] = useState<string[]>([])
  const [letterInput, setLetterInput] = useState('')

  // Immagine
  const [tipoImmagine, setTipoImmagine] = useState<'nessuna' | 'arasaac' | 'upload'>('nessuna')
  const [searchArasaac, setSearchArasaac] = useState('')
  const [resultsArasaac, setResultsArasaac] = useState<PittogrammaArasaac[]>([])
  const [loadingArasaac, setLoadingArasaac] = useState(false)
  const [selectedArasaac, setSelectedArasaac] = useState<PittogrammaArasaac | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Parole esistenti
  const [paroleConfigurate, setParoleConfigurate] = useState<ConfigurazioneParola[]>([])
  const [loadingParole, setLoadingParole] = useState(false)
  const [isSavingParola, setIsSavingParola] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Carica utente corrente all'avvio
  useEffect(() => {
    loadCurrentUser()
  }, [])

  // Carica configurazione quando si seleziona un utente
  useEffect(() => {
    if (selectedUserId) {
      loadConfigurazione()
    }
  }, [selectedUserId])

  // Debounce ricerca ARASAAC
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchArasaac.length >= 2) {
        cercaArasaac(searchArasaac)
      } else {
        setResultsArasaac([])
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchArasaac])

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Carica utente corrente e lista utenti
  const loadCurrentUser = async () => {
    setIsLoadingUser(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingUser(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, cognome, id_ruolo, ruoli(codice)')
        .eq('id', user.id)
        .single()

      if (profile) {
        const ruoloCodice = (profile.ruoli as any)?.codice || ''
        setCurrentUserRole(ruoloCodice)

        if (ruoloCodice === 'utente') {
          setSelectedUserId(profile.id)
          setSelectedUserName(`${profile.nome} ${profile.cognome}`)
          setUtenti([{ id: profile.id, nome: profile.nome || '', cognome: profile.cognome || '' }])
        } else {
          await loadUtenti()
        }
      }
    } catch (error) {
      console.error('[Gestione] Errore caricamento utente:', error)
    } finally {
      setIsLoadingUser(false)
    }
  }

  const loadUtenti = async () => {
    try {
      const { data: ruoloUtente } = await supabase
        .from('ruoli')
        .select('id')
        .eq('codice', 'utente')
        .single()

      if (!ruoloUtente) return

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
    } catch (error) {
      console.error('[Gestione] Errore caricamento utenti:', error)
    }
  }

  // Carica configurazione da Supabase
  const loadConfigurazione = async () => {
    if (!selectedUserId) return
    setLoadingParole(true)

    try {
      // Cerca l'esercizio "scrivo-parole-con-le-lettere"
      const { data: esercizio } = await supabase
        .from('esercizi')
        .select('id')
        .eq('slug', 'scrivo-parole-con-le-lettere')
        .single()

      if (!esercizio) {
        setParoleConfigurate([])
        return
      }

      // Carica configurazione utente
      const { data: assegnazione } = await supabase
        .from('utenti_esercizi')
        .select('config')
        .eq('id_utente', selectedUserId)
        .eq('id_esercizio', esercizio.id)
        .eq('stato', 'attivo')
        .single()

      if (assegnazione?.config) {
        const config = assegnazione.config as any
        setNumeroProve(config.impostazioni?.numero_prove || 10)
        setTastoCancellaVisibile(config.impostazioni?.tasto_cancella_visibile || false)
        setParoleConfigurate(config.parole || [])
      } else {
        // Fallback localStorage
        const localConfig = localStorage.getItem(`scrivo_lettere_config_${selectedUserId}`)
        if (localConfig) {
          const config = JSON.parse(localConfig)
          setNumeroProve(config.impostazioni?.numero_prove || 10)
          setTastoCancellaVisibile(config.impostazioni?.tasto_cancella_visibile || false)
          setParoleConfigurate(config.parole || [])
        } else {
          setNumeroProve(10)
          setTastoCancellaVisibile(false)
          setParoleConfigurate([])
        }
      }
    } catch (error) {
      console.error('[Gestione] Errore caricamento configurazione:', error)
      // Fallback localStorage
      const localConfig = localStorage.getItem(`scrivo_lettere_config_${selectedUserId}`)
      if (localConfig) {
        const config = JSON.parse(localConfig)
        setNumeroProve(config.impostazioni?.numero_prove || 10)
        setTastoCancellaVisibile(config.impostazioni?.tasto_cancella_visibile || false)
        setParoleConfigurate(config.parole || [])
      }
    } finally {
      setLoadingParole(false)
    }
  }

  // Salva configurazione
  const salvaConfigurazione = async (parole: ConfigurazioneParola[], impostazioni?: ImpostazioniEsercizio) => {
    if (!selectedUserId) return

    const config = {
      impostazioni: impostazioni || {
        numero_prove: numeroProve,
        tasto_cancella_visibile: tastoCancellaVisibile
      },
      parole
    }

    // Salva in localStorage come backup
    localStorage.setItem(`scrivo_lettere_config_${selectedUserId}`, JSON.stringify(config))

    try {
      // Cerca l'esercizio
      const { data: esercizio } = await supabase
        .from('esercizi')
        .select('id')
        .eq('slug', 'scrivo-parole-con-le-lettere')
        .single()

      if (!esercizio) {
        showToast('Esercizio non trovato', 'error')
        return
      }

      // Aggiorna o crea assegnazione
      const { data: existing } = await supabase
        .from('utenti_esercizi')
        .select('id')
        .eq('id_utente', selectedUserId)
        .eq('id_esercizio', esercizio.id)
        .single()

      if (existing) {
        await supabase
          .from('utenti_esercizi')
          .update({ config, stato: 'attivo' })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('utenti_esercizi')
          .insert({
            id_utente: selectedUserId,
            id_esercizio: esercizio.id,
            stato: 'attivo',
            config
          })
      }
    } catch (error) {
      console.error('[Gestione] Errore salvataggio:', error)
    }
  }

  // Salva impostazioni
  const salvaImpostazioni = async () => {
    setIsSavingSettings(true)
    const impostazioni = {
      numero_prove: numeroProve,
      tasto_cancella_visibile: tastoCancellaVisibile
    }
    await salvaConfigurazione(paroleConfigurate, impostazioni)
    setIsSavingSettings(false)
    showToast('Impostazioni salvate!', 'success')
  }

  // Cerca pittogrammi ARASAAC
  const cercaArasaac = async (query: string) => {
    setLoadingArasaac(true)
    try {
      const response = await fetch(`${ARASAAC_API}/pictograms/it/search/${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        const results = (data || []).slice(0, 20).map((p: any) => ({
          id: p._id,
          name: p.keywords?.[0]?.keyword || `Pittogramma ${p._id}`,
          url: `${ARASAAC_STATIC}/${p._id}/${p._id}_500.png`,
          thumbnail: `${ARASAAC_STATIC}/${p._id}/${p._id}_300.png`
        }))
        setResultsArasaac(results)
      }
    } catch (error) {
      console.error('[ARASAAC] Errore ricerca:', error)
    } finally {
      setLoadingArasaac(false)
    }
  }

  // Gestione lettere
  const aggiungiTuttoAlfabeto = () => {
    setLettereSelezionate([...ALFABETO])
    showToast('Alfabeto italiano aggiunto', 'success')
  }

  const aggiungiLettereParola = () => {
    if (!parolaTarget.trim()) {
      showToast('Inserisci prima una parola', 'warning')
      return
    }
    const lettere = [...new Set(parolaTarget.toUpperCase().split('').filter(l => /^[A-Z]$/.test(l)))]
    const nuove = lettere.filter(l => !lettereSelezionate.includes(l))
    setLettereSelezionate([...lettereSelezionate, ...nuove])
    showToast('Lettere della parola aggiunte', 'success')
  }

  const rimuoviLettera = (lettera: string) => {
    setLettereSelezionate(lettereSelezionate.filter(l => l !== lettera))
  }

  const svuotaLettere = () => {
    setLettereSelezionate([])
  }

  const aggiungiLetteraDaInput = () => {
    const lettere = letterInput.toUpperCase().split('').filter(l => /^[A-Z]$/.test(l))
    const nuove = lettere.filter(l => !lettereSelezionate.includes(l))
    setLettereSelezionate([...lettereSelezionate, ...nuove])
    setLetterInput('')
  }

  // Upload immagine
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImageUrl(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Salva parola
  const salvaParola = async () => {
    if (!parolaTarget.trim()) {
      showToast('Inserisci una parola target', 'warning')
      return
    }

    if (lettereSelezionate.length === 0) {
      showToast('Seleziona almeno una lettera', 'warning')
      return
    }

    // Verifica che tutte le lettere della parola siano disponibili
    const lettereParola = parolaTarget.toUpperCase().split('').filter(l => /^[A-Z]$/.test(l))
    const mancanti = lettereParola.filter(l => !lettereSelezionate.includes(l))
    if (mancanti.length > 0) {
      showToast(`Mancano le lettere: ${[...new Set(mancanti)].join(', ')}`, 'warning')
      return
    }

    // Verifica immagine se richiesta
    if (tipoImmagine === 'arasaac' && !selectedArasaac) {
      showToast('Seleziona un pittogramma ARASAAC', 'warning')
      return
    }
    if (tipoImmagine === 'upload' && !uploadedImageUrl) {
      showToast('Carica un\'immagine', 'warning')
      return
    }

    setIsSavingParola(true)

    const nuovaParola: ConfigurazioneParola = {
      id: `parola_${Date.now()}`,
      parola_target: parolaTarget.toUpperCase(),
      lettere_disponibili: [...lettereSelezionate].sort(),
      tipo_immagine: tipoImmagine,
      id_arasaac: tipoImmagine === 'arasaac' ? selectedArasaac?.id : null,
      url_immagine: tipoImmagine === 'arasaac'
        ? selectedArasaac?.url
        : tipoImmagine === 'upload'
          ? uploadedImageUrl
          : null,
      created_at: new Date().toISOString()
    }

    const nuoveParole = [...paroleConfigurate, nuovaParola]
    setParoleConfigurate(nuoveParole)
    await salvaConfigurazione(nuoveParole)

    // Reset form
    setParolaTarget('')
    setLettereSelezionate([])
    setTipoImmagine('nessuna')
    setSearchArasaac('')
    setResultsArasaac([])
    setSelectedArasaac(null)
    setUploadedImageUrl(null)

    setIsSavingParola(false)
    showToast('Parola creata!', 'success')
  }

  // Elimina parola
  const eliminaParola = async (id: string) => {
    if (!confirm('Eliminare questa parola?')) return

    const nuoveParole = paroleConfigurate.filter(p => p.id !== id)
    setParoleConfigurate(nuoveParole)
    await salvaConfigurazione(nuoveParole)
    showToast('Parola eliminata', 'success')
  }

  // Reset
  const handleReset = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  // Verifica se il bottone salva è abilitato
  const canSave = parolaTarget.trim() &&
    lettereSelezionate.length > 0 &&
    (tipoImmagine === 'nessuna' ||
      (tipoImmagine === 'arasaac' && selectedArasaac) ||
      (tipoImmagine === 'upload' && uploadedImageUrl))

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-fuchsia-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-pink-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-fuchsia-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Torna indietro"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </Link>
              <Link
                href="/training"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Home"
              >
                <Home className="h-5 w-5 text-white" />
              </Link>
            </div>

            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Area Educatore
            </h1>

            <button
              onClick={handleReset}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Reset"
            >
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Selezione Utente */}
        <section className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Type className="h-5 w-5" />
              Seleziona Utente
            </h2>
          </div>
          <div className="p-6">
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value)
                const user = utenti.find(u => u.id === e.target.value)
                setSelectedUserName(user ? `${user.nome} ${user.cognome}` : '')
              }}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
              disabled={currentUserRole === 'utente'}
            >
              <option value="">-- Seleziona un utente --</option>
              {utenti.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome} {u.cognome}
                </option>
              ))}
            </select>
          </div>
        </section>

        {selectedUserId && (
          <>
            {/* Impostazioni */}
            <section className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Impostazioni
                </h2>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-3">
                    <label className="font-medium text-gray-700">Numero prove:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={numeroProve}
                      onChange={(e) => setNumeroProve(parseInt(e.target.value) || 10)}
                      className="w-20 p-2 border-2 border-gray-200 rounded-lg focus:border-pink-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tastoCancellaVisibile}
                        onChange={(e) => setTastoCancellaVisibile(e.target.checked)}
                        className="w-5 h-5 accent-pink-500"
                      />
                      <span className="font-medium text-gray-700">Mostra tasto cancella</span>
                    </label>
                  </div>
                  <button
                    onClick={salvaImpostazioni}
                    disabled={isSavingSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salva Impostazioni
                  </button>
                </div>
              </div>
            </section>

            {/* Nuova Parola */}
            <section className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Crea Nuova Parola
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Parola Target */}
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Parola Target *</label>
                  <input
                    type="text"
                    value={parolaTarget}
                    onChange={(e) => setParolaTarget(e.target.value)}
                    placeholder="Es: CASA, PANE, SOLE..."
                    className="w-full p-4 text-2xl font-bold text-center uppercase tracking-wider border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                  />
                  <p className="text-sm text-gray-500 mt-1">Inserisci la parola che l'utente dovrà comporre</p>
                </div>

                {/* Tipo Immagine */}
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Tipo Stimolo</label>
                  <div className="flex gap-4 flex-wrap">
                    {[
                      { value: 'nessuna', label: 'Solo Parola' },
                      { value: 'arasaac', label: 'Pittogramma ARASAAC' },
                      { value: 'upload', label: 'Immagine Caricata' }
                    ].map(opt => (
                      <label key={opt.value} className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${tipoImmagine === opt.value ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}>
                        <input
                          type="radio"
                          name="tipoImmagine"
                          value={opt.value}
                          checked={tipoImmagine === opt.value}
                          onChange={(e) => setTipoImmagine(e.target.value as any)}
                          className="accent-pink-500"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ricerca ARASAAC */}
                {tipoImmagine === 'arasaac' && (
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">Cerca Pittogramma</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={searchArasaac}
                          onChange={(e) => setSearchArasaac(e.target.value)}
                          placeholder="Cerca pittogramma..."
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-pink-500"
                        />
                      </div>
                    </div>
                    {loadingArasaac && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                      </div>
                    )}
                    {resultsArasaac.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4 max-h-64 overflow-y-auto p-2 border-2 border-gray-100 rounded-lg bg-gray-50">
                        {resultsArasaac.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedArasaac(p)}
                            className={`p-2 rounded-lg border-2 transition-all ${selectedArasaac?.id === p.id ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-pink-300'}`}
                          >
                            <img src={p.thumbnail} alt={p.name} className="w-full h-auto" />
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedArasaac && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500 mb-2">Selezionato:</p>
                        <img src={selectedArasaac.url} alt={selectedArasaac.name} className="max-w-[150px] max-h-[150px] mx-auto border-2 border-pink-500 rounded-lg" />
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Immagine */}
                {tipoImmagine === 'upload' && (
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">Carica Immagine</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full p-2 border-2 border-gray-200 rounded-lg"
                    />
                    {uploadedImageUrl && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500 mb-2">Anteprima:</p>
                        <img src={uploadedImageUrl} alt="Anteprima" className="max-w-[150px] max-h-[150px] mx-auto border-2 border-pink-500 rounded-lg" />
                      </div>
                    )}
                  </div>
                )}

                {/* Lettere Disponibili */}
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Lettere Disponibili *</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={aggiungiTuttoAlfabeto}
                      className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-pink-100 hover:border-pink-300 transition-all text-sm"
                    >
                      + Tutto Alfabeto
                    </button>
                    <button
                      onClick={aggiungiLettereParola}
                      className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-pink-100 hover:border-pink-300 transition-all text-sm"
                    >
                      + Lettere Parola
                    </button>
                    <button
                      onClick={svuotaLettere}
                      className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all text-sm text-red-600"
                    >
                      Svuota
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={letterInput}
                      onChange={(e) => setLetterInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && aggiungiLetteraDaInput()}
                      placeholder="Aggiungi lettere..."
                      className="flex-1 p-3 border-2 border-gray-200 rounded-lg uppercase focus:border-pink-500"
                    />
                    <button
                      onClick={aggiungiLetteraDaInput}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                    {lettereSelezionate.length === 0 ? (
                      <p className="text-gray-400">Nessuna lettera selezionata</p>
                    ) : (
                      [...lettereSelezionate].sort().map(l => (
                        <span
                          key={l}
                          onClick={() => rimuoviLettera(l)}
                          className="px-4 py-2 bg-pink-500 text-white rounded-lg font-bold text-lg cursor-pointer hover:bg-red-500 transition-colors flex items-center gap-1"
                        >
                          {l}
                          <X className="h-4 w-4 opacity-70" />
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Bottone Salva */}
                <div className="text-center pt-4">
                  <button
                    onClick={salvaParola}
                    disabled={!canSave || isSavingParola}
                    className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-lg font-bold rounded-full hover:shadow-lg hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 mx-auto"
                  >
                    {isSavingParola ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Salva Parola
                  </button>
                </div>
              </div>
            </section>

            {/* Parole Configurate */}
            <section className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Parole Configurate
                </h2>
                <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-semibold">
                  {paroleConfigurate.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {loadingParole ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                  </div>
                ) : paroleConfigurate.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nessuna parola creata per questo utente</p>
                ) : (
                  paroleConfigurate.map(parola => (
                    <div key={parola.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                      {parola.url_immagine && (
                        <img
                          src={parola.url_immagine}
                          alt={parola.parola_target}
                          className="w-12 h-12 object-contain rounded-lg border border-gray-200"
                        />
                      )}
                      <span className="text-xl font-bold text-pink-600 uppercase min-w-[120px]">
                        {parola.parola_target}
                      </span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {parola.lettere_disponibili.map(l => (
                          <span key={l} className="px-2 py-1 bg-gray-100 rounded text-sm font-bold">
                            {l}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => eliminaParola(parola.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Link Esercizio */}
            {paroleConfigurate.length > 0 && (
              <div className="text-center">
                <Link
                  href={`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere/esercizio?utente=${selectedUserId}`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-lg font-bold rounded-full hover:from-pink-600 hover:to-rose-700 hover:shadow-lg hover:-translate-y-1 transition-all shadow-md"
                >
                  <Play className="h-6 w-6" />
                  Vai all'Esercizio
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-white border-l-4 border-green-500' : toast.type === 'error' ? 'bg-white border-l-4 border-red-500' : 'bg-white border-l-4 border-yellow-500'}`}>
            {toast.type === 'success' && <Check className="h-5 w-5 text-green-500" />}
            {toast.type === 'error' && <X className="h-5 w-5 text-red-500" />}
            {toast.type === 'warning' && <X className="h-5 w-5 text-yellow-500" />}
            <span className="text-gray-800">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        TrainingCognitivo &copy; 2026
      </footer>
    </div>
  )
}
