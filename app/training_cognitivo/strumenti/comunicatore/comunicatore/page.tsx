/**
 * Comunicatore CAA - Interfaccia Utente
 *
 * Griglia 2x2 con pittogrammi per la comunicazione.
 * Supporta:
 * - Swipe tra pagine
 * - TTS (Text-to-Speech)
 * - Sottopagine navigabili
 * - Timer automatico
 * - Navigazione con tastiera/switch
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, Settings, ChevronLeft, ChevronRight, RefreshCw,
  Menu, X, Download, Volume2, VolumeX, Play, Pause,
  ArrowLeft
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
}

interface ComunicatorePagina {
  id_pagina: number
  id_utente: string
  nome_pagina: string
  descrizione?: string
  numero_ordine: number
  stato: 'attiva' | 'sottopagina' | 'archiviata'
  items: ComunicatoreItem[]
}

export default function ComunicatorePage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const { user, isLoading: isAuthLoading } = useAuth()

  // Stato principale
  const [pagine, setPagine] = useState<ComunicatorePagina[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [currentItemsPageIndex, setCurrentItemsPageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Navigazione sottopagine
  const [pageStack, setPageStack] = useState<number[]>([])
  const [currentSubPage, setCurrentSubPage] = useState<ComunicatorePagina | null>(null)

  // UI
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingItemId, setSpeakingItemId] = useState<number | null>(null)
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  // Timer automatico
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(3)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Touch/Swipe
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Refs per evitare chiamate multiple
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // Carica pagine dal database
  const loadPagine = useCallback(async () => {
    if (!user || isLoadingRef.current || hasLoadedRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Carica pagine attive dell'utente
      const { data: pagineData, error: pagineError } = await supabaseRef.current
        .from('comunicatore_pagine')
        .select('*')
        .eq('id_utente', user.id)
        .in('stato', ['attiva', 'sottopagina'])
        .order('numero_ordine', { ascending: true })

      if (pagineError) throw pagineError

      if (!pagineData || pagineData.length === 0) {
        setPagine([])
        hasLoadedRef.current = true
        return
      }

      // Carica items per ogni pagina
      const pagineConItems: ComunicatorePagina[] = []

      for (const pagina of pagineData) {
        const { data: itemsData, error: itemsError } = await supabaseRef.current
          .from('comunicatore_items')
          .select('*')
          .eq('id_pagina', pagina.id_pagina)
          .eq('stato', 'attivo')
          .order('posizione_griglia', { ascending: true })

        if (itemsError) throw itemsError

        pagineConItems.push({
          ...pagina,
          items: itemsData || []
        })
      }

      // Filtra solo pagine attive (non sottopagine) per la visualizzazione principale
      const pagineAttive = pagineConItems.filter(p => p.stato === 'attiva')
      setPagine(pagineAttive)
      hasLoadedRef.current = true

    } catch (err: any) {
      console.error('Errore caricamento pagine:', err)
      setError(err.message || 'Errore nel caricamento delle pagine')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [user])

  // Carica pagine quando l'utente è autenticato
  useEffect(() => {
    if (!isAuthLoading && user) {
      loadPagine()
    }
  }, [isAuthLoading, user, loadPagine])

  // Pagina corrente da visualizzare
  const currentPage = currentSubPage || pagine[currentPageIndex]

  // Items del gruppo corrente (4 per gruppo)
  const getCurrentItems = (): ComunicatoreItem[] => {
    if (!currentPage) return []
    const startIndex = currentItemsPageIndex * 4
    const endIndex = startIndex + 4
    // Filtra per posizione_griglia corretta
    return currentPage.items.filter(item => {
      const pos = item.posizione_griglia
      return pos > startIndex && pos <= endIndex
    })
  }

  const totalItemsPages = currentPage ? Math.ceil(currentPage.items.length / 4) : 0

  // TTS - Sintesi vocale
  const speak = useCallback((text: string, itemId: number) => {
    if (!ttsEnabled || !text) return

    // Cancella eventuali speech precedenti
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 0.9
    utterance.pitch = 1

    utterance.onstart = () => {
      setIsSpeaking(true)
      setSpeakingItemId(itemId)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setSpeakingItemId(null)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setSpeakingItemId(null)
    }

    window.speechSynthesis.speak(utterance)
  }, [ttsEnabled])

  // Gestione click su item
  const handleItemClick = async (item: ComunicatoreItem) => {
    // Se è una sottopagina, naviga
    if (item.tipo_item === 'sottopagina' && item.id_pagina_riferimento) {
      navigateToSubPage(item.id_pagina_riferimento)
      return
    }

    // Altrimenti pronuncia la frase
    speak(item.frase_tts, item.id_item)

    // Log utilizzo
    try {
      await supabaseRef.current.from('comunicatore_log').insert({
        id_utente: user?.id,
        id_item: item.id_item,
        sessione: sessionStorage.getItem('comunicatore_session') || crypto.randomUUID()
      })
    } catch (err) {
      console.error('Errore log utilizzo:', err)
    }
  }

  // Navigazione sottopagine
  const navigateToSubPage = async (idPagina: number) => {
    try {
      const { data: pagina, error } = await supabaseRef.current
        .from('comunicatore_pagine')
        .select('*')
        .eq('id_pagina', idPagina)
        .single()

      if (error) throw error

      const { data: items } = await supabaseRef.current
        .from('comunicatore_items')
        .select('*')
        .eq('id_pagina', idPagina)
        .eq('stato', 'attivo')
        .order('posizione_griglia', { ascending: true })

      setPageStack(prev => [...prev, currentPageIndex])
      setCurrentSubPage({ ...pagina, items: items || [] })
      setCurrentItemsPageIndex(0)

    } catch (err) {
      console.error('Errore navigazione sottopagina:', err)
    }
  }

  // Torna indietro dalla sottopagina
  const goBack = () => {
    if (currentSubPage) {
      setCurrentSubPage(null)
      setCurrentItemsPageIndex(0)
      if (pageStack.length > 0) {
        const prevIndex = pageStack[pageStack.length - 1]
        setPageStack(prev => prev.slice(0, -1))
        setCurrentPageIndex(prevIndex)
      }
    }
  }

  // Navigazione pagine con swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Swipe orizzontale (minimo 50px, prevalente rispetto a verticale)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swipe destra -> pagina precedente
        if (currentPageIndex > 0) {
          setCurrentPageIndex(prev => prev - 1)
          setCurrentItemsPageIndex(0)
        }
      } else {
        // Swipe sinistra -> pagina successiva
        if (currentPageIndex < pagine.length - 1) {
          setCurrentPageIndex(prev => prev + 1)
          setCurrentItemsPageIndex(0)
        }
      }
    }
  }

  // Navigazione items (gruppi da 4)
  const navigateItemsPage = (delta: number) => {
    const newIndex = currentItemsPageIndex + delta
    if (newIndex >= 0 && newIndex < totalItemsPages) {
      setCurrentItemsPageIndex(newIndex)
    }
  }

  // Timer automatico
  useEffect(() => {
    if (timerEnabled && currentPage && currentPage.items.length > 0) {
      timerRef.current = setInterval(() => {
        setFocusedItemIndex(prev => {
          const items = getCurrentItems()
          if (prev === null) return 0
          return (prev + 1) % items.length
        })
      }, timerSeconds * 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timerEnabled, timerSeconds, currentPage, currentItemsPageIndex])

  // Navigazione con tastiera
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const items = getCurrentItems()
      if (!items.length) return

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (focusedItemIndex !== null && items[focusedItemIndex]) {
            handleItemClick(items[focusedItemIndex])
          }
          break
        case 'ArrowRight':
          setFocusedItemIndex(prev => {
            if (prev === null) return 0
            return (prev + 1) % items.length
          })
          break
        case 'ArrowLeft':
          setFocusedItemIndex(prev => {
            if (prev === null) return items.length - 1
            return (prev - 1 + items.length) % items.length
          })
          break
        case 'ArrowDown':
          setFocusedItemIndex(prev => {
            if (prev === null) return 0
            return Math.min(prev + 2, items.length - 1)
          })
          break
        case 'ArrowUp':
          setFocusedItemIndex(prev => {
            if (prev === null) return 0
            return Math.max(prev - 2, 0)
          })
          break
        case 'Escape':
          if (currentSubPage) {
            goBack()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedItemIndex, currentPage, currentItemsPageIndex, currentSubPage])

  // Genera sessione
  useEffect(() => {
    if (!sessionStorage.getItem('comunicatore_session')) {
      sessionStorage.setItem('comunicatore_session', crypto.randomUUID())
    }
  }, [])

  // URL immagine ARASAAC
  const getImageUrl = (item: ComunicatoreItem): string => {
    if (item.tipo_immagine === 'arasaac' && item.id_arasaac) {
      return `https://static.arasaac.org/pictograms/${item.id_arasaac}/${item.id_arasaac}_500.png`
    }
    if (item.tipo_immagine === 'upload' && item.url_immagine) {
      return item.url_immagine
    }
    return ''
  }

  // Calcola layout griglia
  const getGridLayout = (itemCount: number): string => {
    switch (itemCount) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-2'
      case 3:
        return 'grid-cols-2'
      default:
        return 'grid-cols-2 grid-rows-2'
    }
  }

  // Loading
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-700 font-medium">Caricamento comunicatore...</p>
        </div>
      </div>
    )
  }

  // Errore
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Errore</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Riprova
          </button>
        </div>
      </div>
    )
  }

  // Nessuna pagina
  if (pagine.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-purple-700 mb-2">Nessuna Pagina</h2>
          <p className="text-gray-600 mb-4">
            Non hai ancora configurato pagine per il comunicatore.
            Vai nell&apos;Area Educatore per creare le tue prime pagine.
          </p>
          <button
            onClick={() => router.push('/training_cognitivo/strumenti/comunicatore/gestione')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Vai all&apos;Area Educatore
          </button>
        </div>
      </div>
    )
  }

  const items = getCurrentItems()

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Bottone Home */}
      <button
        onClick={() => router.push('/training_cognitivo/strumenti/comunicatore')}
        className="fixed top-3 left-3 z-50 w-12 h-12 bg-white rounded-full shadow-lg border-2 border-purple-500 flex items-center justify-center hover:bg-purple-50 transition-colors"
        title="Torna alla Home"
      >
        <Home className="h-6 w-6 text-purple-600" />
      </button>

      {/* Bottone Back (sottopagine) */}
      {currentSubPage && (
        <button
          onClick={goBack}
          className="fixed top-3 left-18 z-50 w-12 h-12 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors"
          style={{ left: '4.5rem' }}
          title="Torna indietro"
        >
          <ArrowLeft className="h-6 w-6 text-blue-600" />
        </button>
      )}

      {/* Bottone Educatore */}
      <button
        onClick={() => router.push('/training_cognitivo/strumenti/comunicatore/gestione')}
        className="fixed top-3 right-3 z-50 w-12 h-12 bg-white rounded-full shadow-lg border-2 border-orange-500 flex items-center justify-center hover:bg-orange-50 transition-colors"
        title="Area Educatore"
      >
        <Settings className="h-6 w-6 text-orange-600" />
      </button>

      {/* Header Pagina */}
      {currentPage && (
        <div className="bg-white shadow-md mx-4 mt-16 mb-2 rounded-xl p-3 flex items-center justify-between">
          {/* Freccia sinistra items */}
          <button
            onClick={() => navigateItemsPage(-1)}
            disabled={currentItemsPageIndex === 0}
            className="w-10 h-10 rounded-full border-2 border-purple-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-purple-600" />
          </button>

          {/* Titolo e indicatore */}
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-purple-700">{currentPage.nome_pagina}</h1>
            {totalItemsPages > 1 && (
              <span className="text-xs text-gray-500">
                Gruppo {currentItemsPageIndex + 1} / {totalItemsPages}
              </span>
            )}
          </div>

          {/* Freccia destra items + Refresh */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateItemsPage(1)}
              disabled={currentItemsPageIndex >= totalItemsPages - 1}
              className="w-10 h-10 rounded-full border-2 border-purple-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-purple-600" />
            </button>
            <button
              onClick={loadPagine}
              className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center hover:bg-green-100 transition-colors"
              title="Ricarica"
            >
              <RefreshCw className="h-4 w-4 text-green-600" />
            </button>
          </div>
        </div>
      )}

      {/* Griglia Items */}
      <div className={`flex-1 p-4 grid ${getGridLayout(items.length)} gap-4`}>
        {items.map((item, index) => {
          const imageUrl = getImageUrl(item)
          const isFocused = focusedItemIndex === index
          const isSpeakingItem = speakingItemId === item.id_item

          return (
            <button
              key={item.id_item}
              onClick={() => handleItemClick(item)}
              className={`
                relative bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center justify-center
                transition-all duration-200 hover:shadow-xl hover:-translate-y-1
                ${isFocused ? 'ring-4 ring-orange-400 ring-offset-2 scale-105' : ''}
                ${isSpeakingItem ? 'ring-4 ring-purple-500 animate-pulse' : ''}
                ${items.length === 3 && index === 2 ? 'col-span-2 max-w-[50%] mx-auto' : ''}
              `}
              style={{
                backgroundColor: item.colore_sfondo,
              }}
            >
              {/* Badge sottopagina */}
              {item.tipo_item === 'sottopagina' && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <ChevronRight className="h-5 w-5 text-white" />
                </div>
              )}

              {/* Immagine */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={item.titolo}
                  className="w-full max-w-[180px] max-h-[180px] object-contain mb-3"
                  loading="lazy"
                />
              )}

              {/* Titolo */}
              <span
                className="text-lg font-bold text-center leading-tight"
                style={{ color: item.colore_testo }}
              >
                {item.titolo}
              </span>

              {/* Indicatore TTS */}
              {item.frase_tts && item.tipo_item !== 'sottopagina' && (
                <div className="absolute bottom-2 right-2 text-gray-400">
                  <Volume2 className="h-4 w-4" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Indicatori Pagina (se più pagine) */}
      {pagine.length > 1 && !currentSubPage && (
        <div className="bg-white rounded-t-xl py-3 px-4 flex justify-center gap-2">
          {pagine.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentPageIndex(index)
                setCurrentItemsPageIndex(0)
              }}
              className={`
                h-3 rounded-full transition-all
                ${index === currentPageIndex
                  ? 'w-6 bg-purple-600'
                  : 'w-3 bg-gray-300 hover:bg-gray-400'}
              `}
            />
          ))}
        </div>
      )}

      {/* Bottone Menu */}
      <button
        onClick={() => setShowMenu(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-white rounded-full shadow-lg border-3 border-purple-600 flex items-center justify-center hover:bg-purple-50 transition-colors"
      >
        <Menu className="h-7 w-7 text-purple-600" />
      </button>

      {/* Timer Controls */}
      <div className={`
        fixed bottom-5 left-5 bg-white rounded-2xl shadow-lg border-2 px-4 py-3 flex items-center gap-4 z-40
        ${timerEnabled ? 'border-green-500' : 'border-purple-500'}
      `}>
        <div className="text-purple-600">
          {timerEnabled ? <Play className="h-5 w-5 text-green-600 animate-pulse" /> : <Pause className="h-5 w-5" />}
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min="1"
            max="10"
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
            disabled={timerEnabled}
            className="w-20 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50"
          />
          <span className="text-xs text-purple-600 font-semibold text-center">{timerSeconds}s</span>
        </div>
        <label className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={timerEnabled}
              onChange={(e) => setTimerEnabled(e.target.checked)}
              className="sr-only"
            />
            <div className={`
              w-10 h-5 rounded-full transition-colors
              ${timerEnabled ? 'bg-green-500' : 'bg-gray-300'}
            `}>
              <div className={`
                w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5
                ${timerEnabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}
              `} />
            </div>
          </div>
          <span className="text-xs text-gray-600 font-semibold">Auto</span>
        </label>
      </div>

      {/* Menu Laterale */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 animate-slide-in-right">
            <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">Menu</h3>
              <button onClick={() => setShowMenu(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <ul className="divide-y">
              <li>
                <button
                  onClick={() => {
                    setTtsEnabled(!ttsEnabled)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  {ttsEnabled ? <Volume2 className="h-5 w-5 text-green-600" /> : <VolumeX className="h-5 w-5 text-red-600" />}
                  <span>{ttsEnabled ? 'Disattiva' : 'Attiva'} Sintesi Vocale</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    router.push('/training_cognitivo/strumenti/comunicatore/gestione')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-5 w-5 text-purple-600" />
                  <span>Area Educatore</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    router.push('/training_cognitivo/strumenti/comunicatore/statistiche')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-5 w-5 text-indigo-600" />
                  <span>Statistiche</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    router.push('/training_cognitivo/strumenti/comunicatore')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <Home className="h-5 w-5 text-emerald-600" />
                  <span>Torna alla Home</span>
                </button>
              </li>
            </ul>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
