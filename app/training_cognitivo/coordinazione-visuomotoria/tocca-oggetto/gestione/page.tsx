'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Home, ArrowLeft, RotateCcw, Settings, Search,
  Save, Target, AlertCircle, Loader2, CheckCircle, XCircle,
  Play, Minus, Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { GameConfig, GameImage } from '../types'
import { DEFAULT_CONFIG } from '../types'

const ARASAAC_API = 'https://api.arasaac.org/api'
const ARASAAC_STATIC = 'https://static.arasaac.org/pictograms'
const RUOLI_STAFF = ['sviluppatore', 'amministratore', 'direttore', 'casemanager']

interface Utente { id: string; nome: string; cognome: string }
interface ArasaacImg { id: number; url: string }

export default function GestioneToccaOggettoPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { user, isLoading: isAuthLoading } = useAuth()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')

  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)

  // Ricerca ARASAAC
  const [searchTarget, setSearchTarget] = useState('')
  const [searchDistractor, setSearchDistractor] = useState('')
  const [resultsTarget, setResultsTarget] = useState<ArasaacImg[]>([])
  const [resultsDistractor, setResultsDistractor] = useState<ArasaacImg[]>([])
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [loadingDistractor, setLoadingDistractor] = useState(false)

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Auth → carica utenti
  useEffect(() => {
    if (isAuthLoading) return
    if (!user) return
    if (!hasLoadedRef.current) loadCurrentUser()
  }, [isAuthLoading, user])

  // Carica config quando si seleziona utente
  useEffect(() => {
    if (selectedUserId) loadConfig()
  }, [selectedUserId])

  // Debounce ricerca
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTarget.length >= 2) searchArasaac('target', searchTarget)
      else setResultsTarget([])
    }, 400)
    return () => clearTimeout(t)
  }, [searchTarget])

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDistractor.length >= 2) searchArasaac('distractor', searchDistractor)
      else setResultsDistractor([])
    }, 400)
    return () => clearTimeout(t)
  }, [searchDistractor])

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
      console.error('Errore:', err)
    } finally {
      isLoadingRef.current = false
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch(`/api/esercizi/tocca-oggetto?action=get_config&id_utente=${selectedUserId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setConfig(data.data)
      } else {
        setConfig(DEFAULT_CONFIG)
      }
    } catch (err) {
      setConfig(DEFAULT_CONFIG)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/esercizi/tocca-oggetto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', id_utente: selectedUserId, id_educatore: user?.id, config })
      })
      const data = await res.json()
      if (data.success) showToast('Configurazione salvata!', 'success')
      else showToast(data.message || 'Errore salvataggio', 'error')
    } catch (err) {
      showToast('Errore di connessione', 'error')
    } finally {
      setSaving(false)
    }
  }

  const searchArasaac = async (type: 'target' | 'distractor', query: string) => {
    const setLoading = type === 'target' ? setLoadingTarget : setLoadingDistractor
    const setResults = type === 'target' ? setResultsTarget : setResultsDistractor
    setLoading(true)
    try {
      const res = await fetch(`${ARASAAC_API}/pictograms/it/search/${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (!Array.isArray(data)) { setResults([]); return }
      setResults(data.slice(0, 24).map((item: any) => ({ id: item._id, url: `${ARASAAC_STATIC}/${item._id}/${item._id}_500.png` })))
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const toggleImage = (img: ArasaacImg, type: 'target' | 'distractor') => {
    if (type === 'target') {
      const exists = config.target_images.find(i => i.id === img.id)
      setConfig(c => ({ ...c, target_images: exists ? c.target_images.filter(i => i.id !== img.id) : [...c.target_images, img] }))
    } else {
      const exists = config.distractor_images.find(i => i.id === img.id)
      setConfig(c => ({ ...c, distractor_images: exists ? c.distractor_images.filter(i => i.id !== img.id) : [...c.distractor_images, img] }))
    }
  }

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage locale?')) return
    await supabase.auth.signOut()
    if ('caches' in window) { const cn = await caches.keys(); await Promise.all(cn.map(n => caches.delete(n))) }
    localStorage.clear(); sessionStorage.clear()
    window.location.href = '/'
  }

  const BG_COLORS = ['#e0f2fe', '#f0fdf4', '#fef3c7', '#fce7f3', '#f3e8ff', '#ffffff', '#1e293b', '#0f172a']

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      <header className="bg-gradient-to-r from-violet-600 to-purple-700 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <a href="/" className="p-2 bg-white/30 rounded-full hover:bg-white/40 transition-colors">
              <Home className="h-5 w-5 text-white" />
            </a>
            <Link
              href={`/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/esercizio${selectedUserId ? `?utente=${selectedUserId}` : ''}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors text-sm font-bold shadow"
              title="Area Utente"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Utente</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6" /> Area Educatore
          </h1>
          <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <RotateCcw className="h-5 w-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Selezione Utente */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-violet-700 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" /> Seleziona Utente
          </h2>
          <select
            value={selectedUserId}
            onChange={e => {
              setSelectedUserId(e.target.value)
              const u = utenti.find(u => u.id === e.target.value)
              if (u) setSelectedUserName(`${u.nome} ${u.cognome}`)
            }}
            className="w-full p-3 border-2 border-violet-200 rounded-lg focus:border-violet-500 focus:outline-none"
            disabled={currentUserRole === 'utente'}
          >
            <option value="">-- Seleziona un utente --</option>
            {utenti.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
          </select>
        </section>

        {selectedUserId && (
          <>
            {/* Parametri gioco */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-violet-700 mb-6 flex items-center gap-2">
                <Settings className="h-5 w-5" /> Parametri Esercizio
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Numero Target */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-500" /> Target da toccare
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setConfig(c => ({ ...c, num_target: Math.max(1, c.num_target - 1) }))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-2xl font-bold text-violet-700 w-10 text-center">{config.num_target}</span>
                    <button onClick={() => setConfig(c => ({ ...c, num_target: Math.min(10, c.num_target + 1) }))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Numero Distrattori */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" /> Distrattori
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setConfig(c => ({ ...c, num_distrattori: Math.max(0, c.num_distrattori - 1) }))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-2xl font-bold text-violet-700 w-10 text-center">{config.num_distrattori}</span>
                    <button onClick={() => setConfig(c => ({ ...c, num_distrattori: Math.min(10, c.num_distrattori + 1) }))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Dimensione */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dimensione oggetti</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[{v:1,l:'S'},{v:2,l:'M'},{v:3,l:'L'},{v:4,l:'XL'}].map(({v,l}) => (
                      <button
                        key={v}
                        onClick={() => setConfig(c => ({ ...c, dimensione: v }))}
                        className={`py-2 rounded-lg font-bold text-sm transition-all ${config.dimensione === v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >{l}</button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">S=60px M=100px L=150px XL=200px</p>
                </div>

                {/* Velocità */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Velocità</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[{v:1,l:'Lenta'},{v:2,l:'Media'},{v:3,l:'Veloce'}].map(({v,l}) => (
                      <button
                        key={v}
                        onClick={() => setConfig(c => ({ ...c, velocita: v }))}
                        className={`py-2 rounded-lg font-bold text-xs transition-all ${config.velocita === v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Colore sfondo */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Colore sfondo area di gioco</label>
                <div className="flex gap-2 flex-wrap">
                  {BG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setConfig(c => ({ ...c, background_color: color }))}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${config.background_color === color ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Immagini Target */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Immagini Target
                <span className="ml-auto text-sm font-normal text-gray-500">{config.target_images.length} selezionate</span>
              </h2>

              {/* Selezionate */}
              {config.target_images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  {config.target_images.map(img => (
                    <div key={img.id} className="relative">
                      <img src={img.url} alt="" className="w-16 h-16 object-contain border-2 border-emerald-400 rounded-lg" />
                      <button onClick={() => toggleImage(img, 'target')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Ricerca */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text" value={searchTarget} onChange={e => setSearchTarget(e.target.value)}
                  placeholder="Cerca pittogramma target..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="h-40 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                {loadingTarget ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 text-emerald-500 animate-spin" /></div>
                ) : resultsTarget.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">Inserisci almeno 2 caratteri...</div>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {resultsTarget.map(p => (
                      <div key={p.id} onClick={() => toggleImage(p, 'target')}
                        className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${config.target_images.find(i => i.id === p.id) ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:border-emerald-300'}`}>
                        <img src={p.url} alt="" className="w-full aspect-square object-contain" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Immagini Distrattori */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Immagini Distrattori
                <span className="ml-auto text-sm font-normal text-gray-500">{config.distractor_images.length} selezionate</span>
              </h2>

              {config.distractor_images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
                  {config.distractor_images.map(img => (
                    <div key={img.id} className="relative">
                      <img src={img.url} alt="" className="w-16 h-16 object-contain border-2 border-red-400 rounded-lg" />
                      <button onClick={() => toggleImage(img, 'distractor')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text" value={searchDistractor} onChange={e => setSearchDistractor(e.target.value)}
                  placeholder="Cerca pittogramma distrattore..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-red-200 rounded-lg focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="h-40 overflow-y-auto border-2 border-gray-100 rounded-lg p-2">
                {loadingDistractor ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 text-red-500 animate-spin" /></div>
                ) : resultsDistractor.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">Inserisci almeno 2 caratteri...</div>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {resultsDistractor.map(p => (
                      <div key={p.id} onClick={() => toggleImage(p, 'distractor')}
                        className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${config.distractor_images.find(i => i.id === p.id) ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-red-300'}`}>
                        <img src={p.url} alt="" className="w-full aspect-square object-contain" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Salva + Vai */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-full hover:from-violet-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Salva Configurazione
              </button>
              <Link
                href={`/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/esercizio?utente=${selectedUserId}`}
                className="px-8 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-full hover:from-sky-600 hover:to-cyan-600 transition-all flex items-center gap-2 shadow-lg"
              >
                <Play className="h-5 w-5" /> Vai all'Esercizio
              </Link>
            </div>
          </>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 z-50 ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'}`}>
          {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
