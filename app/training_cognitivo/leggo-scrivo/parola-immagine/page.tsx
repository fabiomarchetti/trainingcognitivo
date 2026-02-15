/**
 * Parola-Immagine - Pagina Iniziale
 *
 * Pagina di selezione con 3 aree:
 * - Area Educatore: gestione coppie parola-immagine
 * - Parola → Immagine: esercizio dove si vede la parola e si sceglie l'immagine
 * - Immagine → Parola: esercizio dove si vede l'immagine e si sceglie la parola
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home, Download, RotateCcw, Settings,
  BookOpen, Image, Type, ChevronRight, Info,
  CheckCircle, Eye, Hand, Volume2, BarChart3, TrendingUp, Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ParolaImmagineHomePage() {
  const supabase = createClient()

  // PWA
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  // Registra Service Worker e gestione PWA install prompt
  useEffect(() => {
    // Registra Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrato:', reg.scope)
        })
        .catch((err) => {
          console.error('[PWA] Service Worker errore:', err)
        })
    }

    // Check se già in modalità standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    // Check se banner già dismesso
    if (localStorage.getItem('installBannerDismissed') === 'true') {
      setBannerDismissed(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
      console.log('[PWA] beforeinstallprompt catturato')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Installa PWA
  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  // Dismisses install banner
  const dismissBanner = () => {
    setBannerDismissed(true)
    localStorage.setItem('installBannerDismissed', 'true')
  }

  // Mostra istruzioni installazione manuale
  const showInstallInstructions = () => {
    setShowInstructions(true)
  }

  // Reset e logout
  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage locale? La pagina verrà ricaricata.')) return

    await supabase.auth.signOut()

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    localStorage.clear()
    sessionStorage.clear()

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
    }

    window.location.href = '/'
  }

  const showInstallBanner = isInstallable && !bannerDismissed && !isStandalone

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Torna alla Home"
            >
              <Home className="h-5 w-5 text-white" />
            </a>
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Image className="h-6 w-6" />
            Parola-Immagine
          </h1>

          <div className="flex items-center gap-2">
            {/* Bottone Installa PWA - sempre visibile se non in standalone */}
            {!isStandalone && (
              <button
                onClick={isInstallable ? handleInstall : showInstallInstructions}
                className="flex items-center gap-2 px-3 py-2 bg-white text-green-700 font-bold rounded-lg hover:bg-green-50 transition-colors shadow-md"
                title="Installa l'app sul desktop"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Installa App</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Cancella cache e ricarica"
            >
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        {/* Welcome */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <BookOpen className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-green-800 mb-2">Benvenuto!</h2>
          <p className="text-gray-600 text-lg">Seleziona l'area in cui vuoi entrare</p>
        </div>

        {/* Cards Grid - 4 colonne */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

          {/* Card 1: Area Educatore */}
          <Link
            href="/training_cognitivo/leggo-scrivo/parola-immagine/gestione"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-green-400 hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Area Educatore</h3>
              <p className="text-gray-600 text-sm mb-4">Gestisci gli esercizi per i tuoi utenti</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Crea coppie target-distrattore
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Cerca pittogrammi ARASAAC
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Imposta numero prove
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-green-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 2: Parola → Immagine */}
          <Link
            href="/training_cognitivo/leggo-scrivo/parola-immagine/esercizio"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-orange-400 hover:shadow-xl transition-all hover:-translate-y-2 relative"
          >
            <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-800 px-3 py-1 rounded-full text-xs font-bold shadow">
              ABC → 🖼️
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center mb-4">
                <Type className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-orange-700 mb-2">Parola → Immagine</h3>
              <p className="text-gray-600 text-sm mb-4">Leggi la parola e trova l'immagine giusta</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Eye className="h-4 w-4 text-orange-500" />
                  Vedi la parola
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Hand className="h-4 w-4 text-orange-500" />
                  Scegli l'immagine
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Volume2 className="h-4 w-4 text-orange-500" />
                  Ascolto con TTS
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-orange-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 3: Immagine → Parola */}
          <Link
            href="/training_cognitivo/leggo-scrivo/parola-immagine/immagine-parola"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-purple-400 hover:shadow-xl transition-all hover:-translate-y-2 relative"
          >
            <div className="h-2 bg-gradient-to-r from-purple-500 to-fuchsia-500" />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-400 to-fuchsia-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              🖼️ → ABC
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center mb-4">
                <Image className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-700 mb-2">Immagine → Parola</h3>
              <p className="text-gray-600 text-sm mb-4">Guarda l'immagine e trova la parola giusta</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Eye className="h-4 w-4 text-purple-500" />
                  Vedi l'immagine
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Hand className="h-4 w-4 text-purple-500" />
                  Scegli la parola
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Volume2 className="h-4 w-4 text-purple-500" />
                  Ascolto con TTS
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-purple-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 4: Statistiche */}
          <Link
            href="/training_cognitivo/leggo-scrivo/parola-immagine/statistiche"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-indigo-400 hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-indigo-700 mb-2">Statistiche</h3>
              <p className="text-gray-600 text-sm mb-4">Visualizza i risultati e l'andamento</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  Andamento sessioni
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Tempi di risposta
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Grafici dettagliati
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-indigo-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 flex gap-4 items-start mb-8">
          <Info className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-700 mb-1">Come funziona?</p>
            <p className="text-blue-600 text-sm">
              L'educatore crea le coppie parola-immagine con target e distrattore.
              Gli utenti possono poi scegliere tra due tipi di esercizio: dalla parola all'immagine o dall'immagine alla parola.
            </p>
          </div>
        </div>

        {/* Install Banner */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-white" />
              <div>
                <p className="font-bold text-white">Installa l'app</p>
                <p className="text-green-100 text-sm">Aggiungi questa app alla tua schermata home per un accesso rapido</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-green-700 font-bold rounded-lg hover:bg-green-50 transition-colors"
              >
                Installa
              </button>
              <button
                onClick={dismissBanner}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        TrainingCognitivo © 2026 - Training Cognitivo
      </footer>

      {/* Modal Istruzioni Installazione */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <Download className="h-6 w-6" />
              Installa l'App
            </h3>

            <div className="space-y-4 text-gray-600">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-bold text-blue-700 mb-2">Chrome / Edge:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Clicca sui <strong>3 puntini</strong> in alto a destra</li>
                  <li>Seleziona "<strong>Installa Parola-Immagine</strong>" o "<strong>Installa app</strong>"</li>
                  <li>Conferma cliccando "<strong>Installa</strong>"</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-bold text-gray-700 mb-2">Safari (Mac):</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Clicca su <strong>File</strong> nella barra menu</li>
                  <li>Seleziona "<strong>Aggiungi al Dock</strong>"</li>
                </ol>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <p className="font-bold text-orange-700 mb-2">iPhone / iPad:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Tocca l'icona <strong>Condividi</strong> (quadrato con freccia)</li>
                  <li>Scorri e tocca "<strong>Aggiungi a Home</strong>"</li>
                  <li>Tocca "<strong>Aggiungi</strong>"</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
