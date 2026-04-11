/**
 * Area Educatore - Gestione esercizi Numeri e Lettere
 *
 * Permette all'educatore di:
 * - Selezionare un utente
 * - Creare esercizi con tipo (numero/lettera), carattere, pittogramma e griglia
 * - Visualizzare, avviare ed eliminare esercizi esistenti
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings, Search,
  Plus, Trash2, CheckCircle, Save, Image as ImageIcon, Loader2,
  Play, Hash, Type, Grid3x3, Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { EsercizioNumeriLettere, TipoCarattere, Pittogramma } from '../types'

const ARASAAC_API = 'https://api.arasaac.org/api'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'

interface Utente {
  id: string
  nome: string
  cognome: string
}

interface PittogrammaRicerca {
  id: number
  url: string
  keyword: string
}

export default function GestioneNumeriLetterePage() {
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
  const [nomeEsercizio, setNomeEsercizio] = useState<string>('')
  const [tipo, setTipo] = useState<TipoCarattere>('numero')
  const [carattere, setCarattere] = useState<string>('')
  const [nomeCarattere, setNomeCarattere] = useState<string>('')
  const [colonne, setColonne] = useState<number>(5)
  const [righe, setRighe] = useState<number>(4)
  const [righeGuida, setRigheGuida] = useState<number>(2)
  const [mostraPittogrammi, setMostraPittogrammi] = useState<boolean>(true)
  const [pittogrammaSelezionato, setPittogrammaSelezionato] = useState<PittogrammaRicerca | null>(null)

  // Ricerca ARASAAC
  const [searchPitto, setSearchPitto] = useState('')
  const [resultsPitto, setResultsPitto] = useState<PittogrammaRicerca[]>([])
  const [loadingPitto, setLoadingPitto] = useState(false)

  // Esercizi esistenti
  const [esercizi, setEsercizi] = useState<EsercizioNumeriLettere[]>([])
  const [loadingEsercizi, setLoadingEsercizi] = useState(false)

  // Salvataggio
  const [salvando, setSalvando] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) return
    if (!hasLoadedRef.current) loadCurrentUser()
  }, [isAuthLoading, user])

  useEffect(() => {
    if (selectedUserId) loadEsercizi()
  }, [selectedUserId])

  // Debounce ricerca pittogrammi
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchPitto.length >= 2) searchArasaac(searchPitto)
      else setResultsPitto([])
    }, 400)
    return () => clearTimeout(timer)
  }, [searchPitto])

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadCurrentUser = async () => {
    if (isLoadingRef.current || !user) return
    isLoadingRef.current = true
    try {
      const res = await fetch('/api/utenti/lista')
      const data = await res.json()
      if (!data.success) {
        console.error('Errore API utenti:', data.message)
        return
      }
      const utentiList = data.data || []
      setUtenti(utentiList.map((p: any) => ({ id: p.id, nome: p.nome || '', cognome: p.cognome || '' })))
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
      const res = await fetch(`/api/esercizi/numeri-e-lettere?action=list_esercizi&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success) setEsercizi(data.data || [])
    } catch (err) {
      console.error('Errore caricamento esercizi:', err)
    } finally {
      setLoadingEsercizi(false)
    }
  }

  const searchArasaac = async (query: string) => {
    setLoadingPitto(true)
    try {
      const res = await fetch(`${ARASAAC_API}/pictograms/it/search/${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) { setResultsPitto([]); return }
      setResultsPitto(data.slice(0, 20).map((item: any) => ({
        id: item._id,
        url: `${ARASAAC_STATIC}/${item._id}/${item._id}_500.png`,
        keyword: item.keywords?.[0]?.keyword || query
      })))
    } catch (err) {
      console.error('Errore ARASAAC:', err)
      setResultsPitto([])
    } finally {
      setLoadingPitto(false)
    }
  }

  const handleTipoChange = (nuovoTipo: TipoCarattere) => {
    setTipo(nuovoTipo)
    setCarattere('')
  }

  const handleCarattereChange = (valore: string) => {
    const v = valore.toUpperCase().slice(0, 1)
    if (tipo === 'numero') {
      if (v === '' || /^[0-9]$/.test(v)) setCarattere(v)
    } else {
      if (v === '' || /^[A-Z]$/.test(v)) setCarattere(v)
    }
  }

  const resetForm = () => {
    setNomeEsercizio('')
    setCarattere('')
    setNomeCarattere('')
    setColonne(5)
    setRighe(4)
    setRigheGuida(2)
    setMostraPittogrammi(true)
    setPittogrammaSelezionato(null)
    setSearchPitto('')
    setResultsPitto([])
  }

  const salvaEsercizio = async () => {
    if (!selectedUserId) { showToast('Seleziona un utente', 'warning'); return }
    if (!nomeEsercizio.trim()) { showToast('Inserisci un nome per l\'esercizio', 'warning'); return }
    if (!carattere) { showToast('Inserisci il numero o la lettera', 'warning'); return }
    if (salvando) return

    setSalvando(true)
    try {
      const pittogramma: Pittogramma | null = pittogrammaSelezionato ? {
        id: pittogrammaSelezionato.id,
        url: pittogrammaSelezionato.url,
        keyword: pittogrammaSelezionato.keyword
      } : null

      const configurazione = {
        tipo,
        carattere,
        nome_carattere: nomeCarattere,
        pittogramma,
        colonne,
        righe,
        righe_guida: righeGuida,
        mostra_pittogrammi: mostraPittogrammi
      }

      const res = await fetch('/api/esercizi/numeri-e-lettere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_esercizio',
          id_utente: selectedUserId,
          id_educatore: user?.id,
          nome_esercizio: nomeEsercizio.trim(),
          tipo,
          carattere,
          nome_carattere: nomeCarattere.trim() || null,
          pittogramma_id: pittogrammaSelezionato?.id || null,
          pittogramma_url: pittogrammaSelezionato?.url || null,
          pittogramma_keyword: pittogrammaSelezionato?.keyword || null,
          colonne,
          righe,
          righe_guida: righeGuida,
          mostra_pittogrammi: mostraPittogrammi,
          configurazione
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Esercizio creato!', 'success')
        resetForm()
        loadEsercizi()
      } else {
        showToast(data.message || 'Errore salvataggio', 'error')
      }
    } catch (err) {
      showToast('Errore di connessione', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const deleteEsercizio = async (id: number) => {
    if (!confirm('Eliminare questo esercizio?')) return
    try {
      const res = await fetch('/api/esercizi/numeri-e-lettere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_esercizio', id_esercizio: id })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Esercizio eliminato', 'success')
        loadEsercizi()
      } else {
        showToast(data.message || 'Errore eliminazione', 'error')
      }
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

  // Calcola quanti pittogrammi mostrare nell'anteprima
  const contaPittogrammi = () => {
    if (!mostraPittogrammi || !pittogrammaSelezionato) return 0
    if (tipo === 'numero' && /^[1-9]$/.test(carattere)) return parseInt(carattere)
    return 1
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training_cognitivo/pregrafismo/numeri-e-lettere"
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
          <h2 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
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
            className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
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
              <h2 className="text-lg font-bold text-purple-700 mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crea Nuovo Esercizio
              </h2>

              {/* Nome esercizio */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome Esercizio *
                </label>
                <input
                  type="text"
                  value={nomeEsercizio}
                  onChange={e => setNomeEsercizio(e.target.value)}
                  placeholder="Es: Numero 3 con mele, Lettera A..."
                  className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  maxLength={150}
                />
              </div>

              {/* Tipo: numero / lettera */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo Esercizio *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('numero')}
                    className={`p-4 rounded-xl border-4 transition-all flex flex-col items-center gap-2 font-bold ${
                      tipo === 'numero'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-lg'
                        : 'border-purple-200 bg-white text-purple-700 hover:border-purple-300'
                    }`}
                  >
                    <Hash className="h-8 w-8" />
                    <span>Numero</span>
                    <span className="text-xs opacity-80">0-9</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('lettera')}
                    className={`p-4 rounded-xl border-4 transition-all flex flex-col items-center gap-2 font-bold ${
                      tipo === 'lettera'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-lg'
                        : 'border-purple-200 bg-white text-purple-700 hover:border-purple-300'
                    }`}
                  >
                    <Type className="h-8 w-8" />
                    <span>Lettera</span>
                    <span className="text-xs opacity-80">A-Z</span>
                  </button>
                </div>
              </div>

              {/* Carattere + Nome */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {tipo === 'numero' ? 'Numero' : 'Lettera'} *
                  </label>
                  <input
                    type="text"
                    value={carattere}
                    onChange={e => handleCarattereChange(e.target.value)}
                    placeholder={tipo === 'numero' ? '3' : 'A'}
                    maxLength={1}
                    className="w-32 h-32 text-6xl font-bold text-center border-4 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome scritto (opzionale)
                  </label>
                  <input
                    type="text"
                    value={nomeCarattere}
                    onChange={e => setNomeCarattere(e.target.value)}
                    placeholder="Es: TRE, A, UNO..."
                    className="w-full p-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Appare affianco al numero/lettera</p>
                </div>
              </div>

              {/* Pittogramma */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Pittogramma (opzionale)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mostraPittogrammi}
                      onChange={e => setMostraPittogrammi(e.target.checked)}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <span className="text-sm text-gray-600">Mostra pittogrammi</span>
                  </label>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchPitto}
                    onChange={e => setSearchPitto(e.target.value)}
                    placeholder="Cerca pittogramma (es: mela, gatto...)"
                    className="w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="h-40 overflow-y-auto border-2 border-gray-100 rounded-lg p-2 mb-3">
                  {loadingPitto ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                    </div>
                  ) : resultsPitto.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      Inserisci almeno 2 caratteri per cercare...
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {resultsPitto.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setPittogrammaSelezionato(p)}
                          className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${
                            pittogrammaSelezionato?.id === p.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-transparent hover:border-purple-300'
                          }`}
                        >
                          <img src={p.url} alt={p.keyword} className="w-full aspect-square object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pittogrammaSelezionato && (
                  <div className="border-2 border-purple-200 rounded-lg p-3 bg-purple-50 flex items-center gap-3">
                    <img src={pittogrammaSelezionato.url} alt="" className="w-16 h-16 object-contain border-2 border-purple-300 rounded-lg bg-white" />
                    <div className="flex-1">
                      <p className="font-bold text-purple-700">{pittogrammaSelezionato.keyword}</p>
                      <button
                        onClick={() => setPittogrammaSelezionato(null)}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        × Rimuovi
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Griglia */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  Configurazione Griglia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Colonne</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={colonne}
                      onChange={e => setColonne(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
                      className="w-full p-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Righe</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={righe}
                      onChange={e => setRighe(Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
                      className="w-full p-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Righe con guida</label>
                    <input
                      type="number"
                      min={0}
                      max={righe}
                      value={righeGuida}
                      onChange={e => setRigheGuida(Math.max(0, Math.min(righe, parseInt(e.target.value) || 2)))}
                      className="w-full p-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Le righe guida mostrano il carattere tratteggiato da seguire.</p>
              </div>

              {/* Anteprima */}
              <div className="mb-6 border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Anteprima
                </h3>

                <div className="bg-white rounded-lg p-4 flex items-center gap-4 mb-3">
                  <div className="text-7xl font-bold text-purple-700 min-w-[80px] text-center">
                    {carattere || (tipo === 'numero' ? '3' : 'A')}
                  </div>
                  <div className="flex-1">
                    {nomeCarattere && (
                      <div className="text-2xl text-violet-700 font-semibold">{nomeCarattere}</div>
                    )}
                    {mostraPittogrammi && pittogrammaSelezionato && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {Array.from({ length: contaPittogrammi() }).map((_, i) => (
                          <img
                            key={i}
                            src={pittogrammaSelezionato.url}
                            alt=""
                            className="w-10 h-10 object-contain"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="grid gap-1 bg-white rounded-lg p-2"
                  style={{ gridTemplateColumns: `repeat(${colonne}, 1fr)` }}
                >
                  {Array.from({ length: colonne * righe }).map((_, idx) => {
                    const r = Math.floor(idx / colonne)
                    const c = idx % colonne
                    const isGuida = r < righeGuida || c === 0
                    return (
                      <div
                        key={idx}
                        className={`aspect-square flex items-center justify-center text-xl font-bold rounded border ${
                          isGuida
                            ? 'bg-green-50 border-green-200 text-green-400 italic'
                            : 'bg-gray-50 border-gray-200 text-transparent'
                        }`}
                      >
                        {isGuida ? (carattere || (tipo === 'numero' ? '3' : 'A')) : '·'}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bottone Salva */}
              <div className="flex justify-center">
                <button
                  onClick={salvaEsercizio}
                  disabled={salvando || !nomeEsercizio.trim() || !carattere}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-full hover:from-purple-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Salva Esercizio
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Vai all'Esercizio */}
            {esercizi.length > 0 && (
              <section className="bg-gradient-to-r from-indigo-50 to-sky-50 rounded-2xl shadow-lg p-6 border-2 border-dashed border-indigo-200">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5 text-indigo-600" />
                  Avvia Esercizio per {selectedUserName}
                </h2>
                <Link
                  href={`/training_cognitivo/pregrafismo/numeri-e-lettere/esercizio?utente=${selectedUserId}`}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-sky-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <Play className="h-6 w-6" />
                  Vai all'Esercizio
                </Link>
              </section>
            )}

            {/* Esercizi Esistenti */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Esercizi Creati
                </h2>
                <span className="text-gray-500">{esercizi.length} esercizi</span>
              </div>

              {loadingEsercizi ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                </div>
              ) : esercizi.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nessun esercizio creato per questo utente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {esercizi.map(es => (
                    <div key={es.id} className="border-2 border-gray-100 rounded-xl p-4 hover:border-purple-200 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center text-3xl font-bold text-purple-700">
                            {es.carattere}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{es.nome_esercizio}</p>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                {es.tipo === 'numero' ? <Hash className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                                {es.tipo}
                              </span>
                              {es.nome_carattere && <span>· {es.nome_carattere}</span>}
                              <span className="flex items-center gap-1">
                                <Grid3x3 className="h-4 w-4" />
                                {es.colonne}×{es.righe}
                              </span>
                            </div>
                            {es.pittogramma_url && (
                              <img src={es.pittogramma_url} alt="" className="w-8 h-8 object-contain mt-1" />
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Link
                            href={`/training_cognitivo/pregrafismo/numeri-e-lettere/esercizio?utente=${selectedUserId}&id=${es.id}`}
                            className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
                            title="Avvia"
                          >
                            <Play className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteEsercizio(es.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
          toast.type === 'success' ? 'bg-purple-600' :
          toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
        }`}>
          {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
