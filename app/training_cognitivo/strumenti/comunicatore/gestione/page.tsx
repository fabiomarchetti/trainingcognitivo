/**
 * Comunicatore CAA - Area Educatore
 *
 * Gestione pagine e items del comunicatore:
 * - Creazione/modifica/eliminazione pagine
 * - Aggiunta pittogrammi ARASAAC o upload immagini
 * - Configurazione frasi TTS
 * - Gestione sottopagine
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Edit, Trash2, Save, X, Search,
  GripVertical, ChevronLeft, ChevronRight, RefreshCw,
  Volume2, Image as ImageIcon, Upload,
  ArrowLeft, Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

// Tipi
interface ComunicatoreItem {
  id_item: number
  id_pagina: number
  posizione_griglia: number
  titolo: string
  frase_tts: string
  tipo_immagine: 'arasaac' | 'upload' | 'nessuna'
  id_arasaac?: number
  url_immagine?: string
  colore_sfondo: string
  colore_testo: string
  tipo_item: 'normale' | 'sottopagina'
  id_pagina_riferimento?: number
  stato: 'attivo' | 'nascosto'
}

interface ComunicatorePagina {
  id_pagina: number
  id_utente: string
  nome_pagina: string
  descrizione?: string
  numero_ordine: number
  stato: 'attiva' | 'sottopagina' | 'archiviata'
}

interface ArasaacResult {
  id: number
  keywords: { keyword: string }[]
  url: string
  thumbnail: string
}

interface Utente {
  id: string
  nome: string
  cognome: string
}

// Ruoli staff che possono vedere tutti gli utenti
const RUOLI_STAFF = ['sviluppatore', 'amministratore', 'direttore', 'casemanager']

export default function GestioneComunicatorePage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()

  // Stato utenti (per staff)
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUtente, setSelectedUtente] = useState<Utente | null>(null)
  const [isRegularUser, setIsRegularUser] = useState(false)

  // Stato pagine
  const [pagine, setPagine] = useState<ComunicatorePagina[]>([])
  const [selectedPagina, setSelectedPagina] = useState<ComunicatorePagina | null>(null)
  const [items, setItems] = useState<ComunicatoreItem[]>([])
  const [currentItemsPageIndex, setCurrentItemsPageIndex] = useState(0)

  // Stato UI
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal Pagina
  const [showPaginaModal, setShowPaginaModal] = useState(false)
  const [editingPagina, setEditingPagina] = useState<ComunicatorePagina | null>(null)
  const [paginaForm, setPaginaForm] = useState({
    nome_pagina: '',
    descrizione: '',
    stato: 'attiva' as 'attiva' | 'sottopagina'
  })

  // Modal Item
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ComunicatoreItem | null>(null)
  const [itemForm, setItemForm] = useState({
    titolo: '',
    frase_tts: '',
    tipo_immagine: 'arasaac' as 'arasaac' | 'upload' | 'nessuna',
    id_arasaac: undefined as number | undefined,
    url_immagine: '',
    colore_sfondo: '#FFFFFF',
    colore_testo: '#000000',
    tipo_item: 'normale' as 'normale' | 'sottopagina',
    id_pagina_riferimento: undefined as number | undefined,
    posizione_griglia: 1
  })

  // Ricerca ARASAAC
  const [arasaacQuery, setArasaacQuery] = useState('')
  const [arasaacResults, setArasaacResults] = useState<ArasaacResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedArasaac, setSelectedArasaac] = useState<ArasaacResult | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Upload immagine
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Refs
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const isSavingRef = useRef(false)
  const isLoadingItemsRef = useRef(false)

  // Ref per selectedPagina (evita dipendenze nel useCallback)
  const selectedPaginaRef = useRef(selectedPagina)
  selectedPaginaRef.current = selectedPagina

  // Ref per selectedUtente
  const selectedUtenteRef = useRef(selectedUtente)
  selectedUtenteRef.current = selectedUtente

  // Carica items di una pagina
  const loadItems = useCallback(async (idPagina: number) => {
    if (isLoadingItemsRef.current) return

    isLoadingItemsRef.current = true
    try {
      const { data, error: fetchError } = await supabaseRef.current
        .from('comunicatore_items')
        .select('*')
        .eq('id_pagina', idPagina)
        .order('posizione_griglia', { ascending: true })

      if (fetchError) throw fetchError

      setItems(data || [])

    } catch (err: any) {
      console.error('Errore caricamento items:', err)
    } finally {
      isLoadingItemsRef.current = false
    }
  }, [])

  // Carica pagine per un utente specifico
  const loadPagineForUtente = useCallback(async (idUtente: string) => {
    try {
      const { data, error: fetchError } = await supabaseRef.current
        .from('comunicatore_pagine')
        .select('*')
        .eq('id_utente', idUtente)
        .order('numero_ordine', { ascending: true })

      if (fetchError) throw fetchError

      setPagine(data || [])
      setSelectedPagina(null)
      setItems([])
      setCurrentItemsPageIndex(0)

    } catch (err: any) {
      console.error('Errore caricamento pagine:', err)
      setError(err.message)
    }
  }, [])

  // Carica utenti in base al ruolo
  const loadUtenti = useCallback(async () => {
    if (!user || isLoadingRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Prima ottieni il ruolo dell'utente corrente (con join sulla tabella ruoli)
      const { data: profileData, error: profileError } = await supabaseRef.current
        .from('profiles')
        .select('id, nome, cognome, id_ruolo, ruoli(codice)')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const ruolo = (profileData?.ruoli as any)?.codice || 'utente'

      // Se è un utente normale, auto-seleziona se stesso
      if (ruolo === 'utente') {
        setIsRegularUser(true)
        const currentUser: Utente = {
          id: user.id,
          nome: profileData?.nome || '',
          cognome: profileData?.cognome || ''
        }
        setUtenti([currentUser])
        setSelectedUtente(currentUser)
        await loadPagineForUtente(user.id)
        hasLoadedRef.current = true
        return
      }

      // Se è staff (sviluppatore, admin, direttore, casemanager), carica tutti gli utenti con ruolo 'utente'
      if (RUOLI_STAFF.includes(ruolo)) {
        // Trova l'id del ruolo 'utente'
        const { data: ruoloUtente } = await supabaseRef.current
          .from('ruoli')
          .select('id')
          .eq('codice', 'utente')
          .single()

        if (ruoloUtente) {
          const { data: profili, error: profError } = await supabaseRef.current
            .from('profiles')
            .select('id, nome, cognome')
            .eq('id_ruolo', ruoloUtente.id)
            .order('cognome')

          if (profError) throw profError
          setUtenti(profili || [])
        }
      }
      // Se è educatore, carica solo utenti assegnati
      else if (ruolo === 'educatore') {
        const { data: assegnazioni, error: assError } = await supabaseRef.current
          .from('educatori_utenti')
          .select('id_utente')
          .eq('id_educatore', user.id)
          .eq('stato', 'attivo')

        if (assError) throw assError

        if (assegnazioni && assegnazioni.length > 0) {
          const utentiIds = assegnazioni.map(a => a.id_utente)

          const { data: profili, error: profError } = await supabaseRef.current
            .from('profiles')
            .select('id, nome, cognome')
            .in('id', utentiIds)
            .order('cognome')

          if (profError) throw profError
          setUtenti(profili || [])
        } else {
          setUtenti([])
        }
      }

      hasLoadedRef.current = true

    } catch (err: any) {
      console.error('Errore caricamento utenti:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [user, loadPagineForUtente])

  // Seleziona utente
  const selectUtente = async (utente: Utente) => {
    setSelectedUtente(utente)
    await loadPagineForUtente(utente.id)
  }

  // Seleziona pagina
  const selectPagina = async (pagina: ComunicatorePagina) => {
    setSelectedPagina(pagina)
    setCurrentItemsPageIndex(0)
    await loadItems(pagina.id_pagina)
  }

  // Effetto iniziale
  useEffect(() => {
    if (!isAuthLoading && user) {
      loadUtenti()
    }
  }, [isAuthLoading, user, loadUtenti])

  // Ricerca ARASAAC con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!arasaacQuery.trim()) {
      setArasaacResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `https://api.arasaac.org/v1/pictograms/it/search/${encodeURIComponent(arasaacQuery)}`
        )
        if (response.ok) {
          const data = await response.json()
          const results = data.slice(0, 20).map((item: any) => ({
            id: item._id,
            keywords: item.keywords,
            url: `https://static.arasaac.org/pictograms/${item._id}/${item._id}_500.png`,
            thumbnail: `https://static.arasaac.org/pictograms/${item._id}/${item._id}_300.png`
          }))
          setArasaacResults(results)
        }
      } catch (err) {
        console.error('Errore ricerca ARASAAC:', err)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [arasaacQuery])

  // ===== CRUD Pagine =====

  const openCreatePaginaModal = () => {
    setEditingPagina(null)
    setPaginaForm({ nome_pagina: '', descrizione: '', stato: 'attiva' })
    setShowPaginaModal(true)
  }

  const openEditPaginaModal = (pagina: ComunicatorePagina) => {
    setEditingPagina(pagina)
    setPaginaForm({
      nome_pagina: pagina.nome_pagina,
      descrizione: pagina.descrizione || '',
      stato: pagina.stato === 'archiviata' ? 'attiva' : pagina.stato
    })
    setShowPaginaModal(true)
  }

  const savePagina = useCallback(async () => {
    const currentSelectedUtente = selectedUtenteRef.current
    if (!currentSelectedUtente || !paginaForm.nome_pagina.trim() || isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)
    try {
      if (editingPagina) {
        // Modifica
        const { error } = await supabaseRef.current
          .from('comunicatore_pagine')
          .update({
            nome_pagina: paginaForm.nome_pagina.trim(),
            descrizione: paginaForm.descrizione.trim() || null,
            stato: paginaForm.stato,
            updated_at: new Date().toISOString()
          })
          .eq('id_pagina', editingPagina.id_pagina)

        if (error) throw error

      } else {
        // Creazione
        const { error } = await supabaseRef.current
          .from('comunicatore_pagine')
          .insert({
            id_utente: currentSelectedUtente.id,
            nome_pagina: paginaForm.nome_pagina.trim(),
            descrizione: paginaForm.descrizione.trim() || null,
            numero_ordine: pagine.length,
            stato: paginaForm.stato
          })

        if (error) throw error
      }

      setShowPaginaModal(false)
      await loadPagineForUtente(currentSelectedUtente.id)

    } catch (err: any) {
      console.error('Errore salvataggio pagina:', err)
      alert('Errore: ' + err.message)
    } finally {
      setIsSaving(false)
      isSavingRef.current = false
    }
  }, [paginaForm, editingPagina, pagine.length, loadPagineForUtente])

  const deletePagina = async (pagina: ComunicatorePagina) => {
    if (!confirm(`Eliminare la pagina "${pagina.nome_pagina}" e tutti i suoi items?`)) return

    try {
      const { error } = await supabaseRef.current
        .from('comunicatore_pagine')
        .delete()
        .eq('id_pagina', pagina.id_pagina)

      if (error) throw error

      if (selectedPagina?.id_pagina === pagina.id_pagina) {
        setSelectedPagina(null)
        setItems([])
      }

      if (selectedUtente) {
        await loadPagineForUtente(selectedUtente.id)
      }

    } catch (err: any) {
      console.error('Errore eliminazione pagina:', err)
      alert('Errore: ' + err.message)
    }
  }

  // ===== CRUD Items =====

  const openAddItemModal = (posizione: number) => {
    if (!selectedPagina) return

    setEditingItem(null)
    setItemForm({
      titolo: '',
      frase_tts: '',
      tipo_immagine: 'arasaac',
      id_arasaac: undefined,
      url_immagine: '',
      colore_sfondo: '#FFFFFF',
      colore_testo: '#000000',
      tipo_item: 'normale',
      id_pagina_riferimento: undefined,
      posizione_griglia: posizione
    })
    setSelectedArasaac(null)
    setUploadPreview(null)
    setArasaacQuery('')
    setArasaacResults([])
    setShowItemModal(true)
  }

  const openEditItemModal = (item: ComunicatoreItem) => {
    setEditingItem(item)
    setItemForm({
      titolo: item.titolo,
      frase_tts: item.frase_tts,
      tipo_immagine: item.tipo_immagine,
      id_arasaac: item.id_arasaac,
      url_immagine: item.url_immagine || '',
      colore_sfondo: item.colore_sfondo,
      colore_testo: item.colore_testo,
      tipo_item: item.tipo_item,
      id_pagina_riferimento: item.id_pagina_riferimento,
      posizione_griglia: item.posizione_griglia
    })

    if (item.tipo_immagine === 'arasaac' && item.id_arasaac) {
      setSelectedArasaac({
        id: item.id_arasaac,
        keywords: [],
        url: `https://static.arasaac.org/pictograms/${item.id_arasaac}/${item.id_arasaac}_500.png`,
        thumbnail: `https://static.arasaac.org/pictograms/${item.id_arasaac}/${item.id_arasaac}_300.png`
      })
    } else {
      setSelectedArasaac(null)
    }

    if (item.tipo_immagine === 'upload' && item.url_immagine) {
      setUploadPreview(item.url_immagine)
    } else {
      setUploadPreview(null)
    }

    setShowItemModal(true)
  }

  const saveItem = useCallback(async () => {
    const currentSelectedPagina = selectedPaginaRef.current
    if (!currentSelectedPagina || !itemForm.titolo.trim() || !itemForm.frase_tts.trim()) {
      alert('Compila titolo e frase TTS')
      return
    }

    if (isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)
    try {
      const itemData = {
        id_pagina: currentSelectedPagina.id_pagina,
        posizione_griglia: itemForm.posizione_griglia,
        titolo: itemForm.titolo.trim(),
        frase_tts: itemForm.frase_tts.trim(),
        tipo_immagine: itemForm.tipo_immagine,
        id_arasaac: itemForm.tipo_immagine === 'arasaac' ? selectedArasaac?.id : null,
        url_immagine: itemForm.tipo_immagine === 'arasaac'
          ? (selectedArasaac ? `https://static.arasaac.org/pictograms/${selectedArasaac.id}/${selectedArasaac.id}_500.png` : null)
          : (itemForm.tipo_immagine === 'upload' ? uploadPreview : null),
        colore_sfondo: itemForm.colore_sfondo,
        colore_testo: itemForm.colore_testo,
        tipo_item: itemForm.tipo_item,
        id_pagina_riferimento: itemForm.tipo_item === 'sottopagina' ? itemForm.id_pagina_riferimento : null,
        stato: 'attivo'
      }

      if (editingItem) {
        // Modifica
        const { error } = await supabaseRef.current
          .from('comunicatore_items')
          .update({
            ...itemData,
            updated_at: new Date().toISOString()
          })
          .eq('id_item', editingItem.id_item)

        if (error) throw error

      } else {
        // Creazione
        const { error } = await supabaseRef.current
          .from('comunicatore_items')
          .insert(itemData)

        if (error) throw error
      }

      setShowItemModal(false)
      await loadItems(currentSelectedPagina.id_pagina)

    } catch (err: any) {
      console.error('Errore salvataggio item:', err)
      alert('Errore: ' + err.message)
    } finally {
      setIsSaving(false)
      isSavingRef.current = false
    }
  }, [itemForm, selectedArasaac, uploadPreview, editingItem, loadItems])

  const deleteItem = async (item: ComunicatoreItem) => {
    if (!confirm(`Eliminare item "${item.titolo}"?`)) return

    try {
      const { error } = await supabaseRef.current
        .from('comunicatore_items')
        .delete()
        .eq('id_item', item.id_item)

      if (error) throw error

      if (selectedPagina) {
        await loadItems(selectedPagina.id_pagina)
      }

    } catch (err: any) {
      console.error('Errore eliminazione item:', err)
      alert('Errore: ' + err.message)
    }
  }

  // Gestione upload immagine
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Test TTS
  const testTTS = (text: string) => {
    if (!text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  // Calcola numero pagine items
  const totalItemsPages = Math.ceil(items.length / 4) || 1
  const baseIndex = currentItemsPageIndex * 4

  // Ottieni items per la griglia corrente
  const getItemForPosition = (pos: number): ComunicatoreItem | undefined => {
    return items.find(i => i.posizione_griglia === pos)
  }

  // URL immagine
  const getImageUrl = (item: ComunicatoreItem): string => {
    if (item.tipo_immagine === 'arasaac' && item.id_arasaac) {
      return `https://static.arasaac.org/pictograms/${item.id_arasaac}/${item.id_arasaac}_300.png`
    }
    if (item.tipo_immagine === 'upload' && item.url_immagine) {
      return item.url_immagine
    }
    return ''
  }

  // Loading
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-700 font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/training_cognitivo/strumenti/comunicatore')}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Torna alla Home"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </div>

          <h1 className="text-xl font-bold text-white">
            Area Educatore - Comunicatore
          </h1>

          <button
            onClick={() => {
              const url = selectedUtente
                ? `/training_cognitivo/strumenti/comunicatore/comunicatore?utente=${selectedUtente.id}`
                : '/training_cognitivo/strumenti/comunicatore/comunicatore'
              router.push(url)
            }}
            className="px-4 py-2 bg-white text-purple-700 font-bold rounded-lg hover:bg-purple-50 transition-colors"
          >
            Vai al Comunicatore
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Dropdown selezione utente - visibile solo per staff */}
        {!isRegularUser && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">Seleziona Utente:</span>
                </div>
                <select
                  value={selectedUtente?.id || ''}
                  onChange={(e) => {
                    const utente = utenti.find(u => u.id === e.target.value)
                    if (utente) selectUtente(utente)
                  }}
                  className="flex-1 max-w-md px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Seleziona un utente --</option>
                  {utenti.map((utente) => (
                    <option key={utente.id} value={utente.id}>
                      {utente.cognome} {utente.nome}
                    </option>
                  ))}
                </select>
                {utenti.length === 0 && (
                  <span className="text-gray-500 text-sm">Nessun utente assegnato</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista Pagine */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-purple-100 p-4 flex justify-between items-center">
                <h2 className="font-bold text-purple-800">
                  {selectedUtente
                    ? `Pagine di ${selectedUtente.nome} ${selectedUtente.cognome}`
                    : 'Pagine'
                  }
                </h2>
                <button
                  onClick={openCreatePaginaModal}
                  disabled={!selectedUtente}
                  className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={selectedUtente ? "Nuova Pagina" : "Seleziona prima un utente"}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {!selectedUtente ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Seleziona un utente per gestire le sue pagine</p>
                  </div>
                ) : pagine.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="mb-2">Nessuna pagina creata</p>
                    <button
                      onClick={openCreatePaginaModal}
                      className="text-purple-600 font-medium hover:underline"
                    >
                      Crea la prima pagina
                    </button>
                  </div>
                ) : (
                  pagine.map((pagina, index) => (
                    <div
                      key={pagina.id_pagina}
                      className={`
                        p-4 flex items-center justify-between cursor-pointer transition-colors
                        ${selectedPagina?.id_pagina === pagina.id_pagina
                          ? 'bg-purple-100'
                          : 'hover:bg-gray-50'}
                      `}
                      onClick={() => selectPagina(pagina)}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-gray-800">{pagina.nome_pagina}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {pagina.stato === 'sottopagina' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                Sottopagina
                              </span>
                            )}
                            <span>#{index + 1}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditPaginaModal(pagina)
                          }}
                          className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePagina(pagina)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Griglia Items */}
          <div className="lg:col-span-2">
            {selectedPagina ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header Griglia */}
                <div className="bg-purple-100 p-4 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-purple-800">{selectedPagina.nome_pagina}</h2>
                    {selectedPagina.descrizione && (
                      <p className="text-sm text-purple-600">{selectedPagina.descrizione}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => currentItemsPageIndex > 0 && setCurrentItemsPageIndex(prev => prev - 1)}
                      disabled={currentItemsPageIndex === 0}
                      className="p-2 rounded-full border-2 border-purple-500 disabled:opacity-40 hover:bg-purple-100 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-purple-600" />
                    </button>
                    <span className="text-sm text-purple-700">
                      Gruppo {currentItemsPageIndex + 1} / {totalItemsPages}
                    </span>
                    <button
                      onClick={() => currentItemsPageIndex < totalItemsPages - 1 && setCurrentItemsPageIndex(prev => prev + 1)}
                      disabled={currentItemsPageIndex >= totalItemsPages - 1}
                      className="p-2 rounded-full border-2 border-purple-500 disabled:opacity-40 hover:bg-purple-100 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-purple-600" />
                    </button>
                    <button
                      onClick={() => setCurrentItemsPageIndex(totalItemsPages)}
                      className="p-2 rounded-full border-2 border-green-500 hover:bg-green-100 transition-colors"
                      title="Nuovo gruppo"
                    >
                      <Plus className="h-4 w-4 text-green-600" />
                    </button>
                  </div>
                </div>

                {/* Griglia 2x2 */}
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((slotIndex) => {
                    const posizione = baseIndex + slotIndex
                    const item = getItemForPosition(posizione)

                    if (item) {
                      const imageUrl = getImageUrl(item)
                      return (
                        <div
                          key={slotIndex}
                          className="relative bg-gray-100 rounded-xl p-4 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all"
                          style={{ backgroundColor: item.colore_sfondo }}
                          onClick={() => openEditItemModal(item)}
                        >
                          {/* Badge posizione */}
                          <span className="absolute top-2 left-2 w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {posizione}
                          </span>

                          {/* Bottone elimina */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteItem(item)
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          {/* Immagine */}
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={item.titolo}
                              className="max-w-[120px] max-h-[120px] object-contain mb-2"
                            />
                          )}

                          {/* Titolo */}
                          <span
                            className="font-bold text-center"
                            style={{ color: item.colore_testo }}
                          >
                            {item.titolo}
                          </span>

                          {/* Frase TTS */}
                          <span className="text-xs text-gray-500 mt-1 text-center italic">
                            &quot;{item.frase_tts}&quot;
                          </span>

                          {/* Badge sottopagina */}
                          {item.tipo_item === 'sottopagina' && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                              Sottopagina
                            </span>
                          )}
                        </div>
                      )
                    } else {
                      return (
                        <div
                          key={slotIndex}
                          className="relative bg-gray-100 rounded-xl p-4 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
                          onClick={() => openAddItemModal(posizione)}
                        >
                          <span className="absolute top-2 left-2 w-6 h-6 bg-gray-400 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {posizione}
                          </span>
                          <Plus className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-gray-500 text-sm">Aggiungi Item</span>
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="h-10 w-10 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Seleziona una Pagina</h3>
                <p className="text-gray-500">
                  Seleziona una pagina dalla lista a sinistra per gestire i suoi items
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Pagina */}
      {showPaginaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingPagina ? 'Modifica Pagina' : 'Nuova Pagina'}
              </h3>
              <button onClick={() => setShowPaginaModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Pagina *
                </label>
                <input
                  type="text"
                  value={paginaForm.nome_pagina}
                  onChange={(e) => setPaginaForm({ ...paginaForm, nome_pagina: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Es: Comunicazione Base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={paginaForm.descrizione}
                  onChange={(e) => setPaginaForm({ ...paginaForm, descrizione: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                  placeholder="Descrizione opzionale..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Pagina
                </label>
                <select
                  value={paginaForm.stato}
                  onChange={(e) => setPaginaForm({ ...paginaForm, stato: e.target.value as 'attiva' | 'sottopagina' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="attiva">Pagina Principale</option>
                  <option value="sottopagina">Sottopagina (accessibile solo da link)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => setShowPaginaModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={savePagina}
                disabled={isSaving || !paginaForm.nome_pagina.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-4">
            <div className="bg-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingItem ? 'Modifica' : 'Aggiungi'} Item - Posizione {itemForm.posizione_griglia}
              </h3>
              <button onClick={() => setShowItemModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Titolo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={itemForm.titolo}
                  onChange={(e) => setItemForm({ ...itemForm, titolo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Es: Voglio mangiare"
                />
              </div>

              {/* Frase TTS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frase TTS * (pronunciata al click)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemForm.frase_tts}
                    onChange={(e) => setItemForm({ ...itemForm, frase_tts: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Es: Ho fame, vorrei mangiare qualcosa"
                  />
                  <button
                    type="button"
                    onClick={() => testTTS(itemForm.frase_tts)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    title="Prova TTS"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Tipo Immagine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Immagine
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoImmagine"
                      value="arasaac"
                      checked={itemForm.tipo_immagine === 'arasaac'}
                      onChange={() => setItemForm({ ...itemForm, tipo_immagine: 'arasaac' })}
                      className="text-purple-600"
                    />
                    <span>ARASAAC</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoImmagine"
                      value="upload"
                      checked={itemForm.tipo_immagine === 'upload'}
                      onChange={() => setItemForm({ ...itemForm, tipo_immagine: 'upload' })}
                      className="text-purple-600"
                    />
                    <span>Upload</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoImmagine"
                      value="nessuna"
                      checked={itemForm.tipo_immagine === 'nessuna'}
                      onChange={() => setItemForm({ ...itemForm, tipo_immagine: 'nessuna' })}
                      className="text-purple-600"
                    />
                    <span>Nessuna</span>
                  </label>
                </div>
              </div>

              {/* Ricerca ARASAAC */}
              {itemForm.tipo_immagine === 'arasaac' && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cerca Pittogramma ARASAAC
                  </label>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={arasaacQuery}
                      onChange={(e) => setArasaacQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Es: mangiare, bere, casa..."
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    {isSearching && (
                      <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500 animate-spin" />
                    )}
                  </div>

                  {/* Pittogramma selezionato */}
                  {selectedArasaac && (
                    <div className="mb-3 p-3 bg-purple-100 rounded-lg flex items-center gap-3">
                      <img
                        src={selectedArasaac.thumbnail}
                        alt="Selezionato"
                        className="w-16 h-16 object-contain bg-white rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-purple-800">Pittogramma selezionato</p>
                        <p className="text-sm text-purple-600">ID: {selectedArasaac.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedArasaac(null)}
                        className="p-1 text-purple-600 hover:text-purple-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}

                  {/* Risultati ricerca */}
                  {arasaacResults.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                      {arasaacResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => setSelectedArasaac(result)}
                          className={`
                            p-2 rounded-lg border-2 transition-all
                            ${selectedArasaac?.id === result.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'}
                          `}
                        >
                          <img
                            src={result.thumbnail}
                            alt={`ID: ${result.id}`}
                            className="w-full aspect-square object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Upload Immagine */}
              {itemForm.tipo_immagine === 'upload' && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carica Immagine
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Seleziona File
                    </button>
                    {uploadPreview && (
                      <div className="flex items-center gap-2">
                        <img
                          src={uploadPreview}
                          alt="Preview"
                          className="w-16 h-16 object-contain bg-white rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadPreview(null)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Colori */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colore Sfondo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={itemForm.colore_sfondo}
                      onChange={(e) => setItemForm({ ...itemForm, colore_sfondo: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{itemForm.colore_sfondo}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colore Testo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={itemForm.colore_testo}
                      onChange={(e) => setItemForm({ ...itemForm, colore_testo: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{itemForm.colore_testo}</span>
                  </div>
                </div>
              </div>

              {/* Sottopagina */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={itemForm.tipo_item === 'sottopagina'}
                    onChange={(e) => setItemForm({
                      ...itemForm,
                      tipo_item: e.target.checked ? 'sottopagina' : 'normale'
                    })}
                    className="w-5 h-5 text-purple-600 rounded"
                  />
                  <span className="font-medium text-gray-700">
                    Questo item apre una sottopagina
                  </span>
                </label>

                {itemForm.tipo_item === 'sottopagina' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seleziona Pagina di Riferimento
                    </label>
                    <select
                      value={itemForm.id_pagina_riferimento || ''}
                      onChange={(e) => setItemForm({
                        ...itemForm,
                        id_pagina_riferimento: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">-- Seleziona Pagina --</option>
                      {pagine
                        .filter(p => p.id_pagina !== selectedPagina?.id_pagina)
                        .map(p => (
                          <option key={p.id_pagina} value={p.id_pagina}>
                            {p.nome_pagina}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={saveItem}
                disabled={isSaving || !itemForm.titolo.trim() || !itemForm.frase_tts.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salva Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
