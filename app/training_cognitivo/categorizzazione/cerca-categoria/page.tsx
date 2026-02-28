/**
 * Cerca Categoria - Pagina Iniziale
 *
 * Pagina di selezione con 3 aree:
 * - Area Educatore: crea e gestisce esercizi di categorizzazione
 * - Esercizio: l'utente cerca le immagini della categoria
 * - Statistiche: visualizza risultati e andamento
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home, Download, RotateCcw, Settings,
  Search, ChevronRight, Info,
  CheckCircle, Hand, Volume2, BarChart3, TrendingUp, Grid3x3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CercaCategoriaHomePage() {
  const supabase = createClient()

  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    if (localStorage.getItem('cercaCatInstallBannerDismissed') === 'true') {
      setBannerDismissed(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstallable(false)
    setDeferredPrompt(null)
  }

  const dismissBanner = () => {
    setBannerDismissed(true)
    localStorage.setItem('cercaCatInstallBannerDismissed', 'true')
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
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
    }
    window.location.href = '/'
  }

  const showInstallBanner = isInstallable && !bannerDismissed && !isStandalone

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Torna alla Home"
          >
            <Home className="h-5 w-5 text-white" />
          </a>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Search className="h-6 w-6" />
            Cerca Categoria
          </h1>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                onClick={isInstallable ? handleInstall : () => setShowInstructions(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-teal-700 font-bold rounded-lg hover:bg-teal-50 transition-colors shadow-md"
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

      <main className="max-w-5xl mx-auto p-6">
        {/* Welcome */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Search className="h-12 w-12 text-teal-600" />
          </div>
          <h2 className="text-3xl font-bold text-teal-800 mb-2">Benvenuto!</h2>
          <p className="text-gray-600 text-lg">Seleziona l'area in cui vuoi entrare</p>
        </div>

        {/* Cards Grid - 3 colonne */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Card 1: Area Educatore */}
          <Link
            href="/training_cognitivo/categorizzazione/cerca-categoria/gestione"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-teal-400 hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-teal-700 mb-2">Area Educatore</h3>
              <p className="text-gray-600 text-sm mb-4">Crea e gestisci gli esercizi di categorizzazione</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-teal-500" />
                  Crea esercizi per categoria
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-teal-500" />
                  Cerca pittogrammi ARASAAC
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-teal-500" />
                  Gestisci target e distrattori
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-teal-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 2: Esercizio */}
          <Link
            href="/training_cognitivo/categorizzazione/cerca-categoria/esercizio"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-indigo-400 hover:shadow-xl transition-all hover:-translate-y-2 relative"
          >
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-400 to-violet-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              Gioca
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center mb-4">
                <Grid3x3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-indigo-700 mb-2">Cerca Categoria</h3>
              <p className="text-gray-600 text-sm mb-4">Ascolta l'istruzione e trova le immagini giuste</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Volume2 className="h-4 w-4 text-indigo-500" />
                  Ascolta l'istruzione
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Hand className="h-4 w-4 text-indigo-500" />
                  Clicca le immagini della categoria
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-indigo-500" />
                  Feedback immediato
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-indigo-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 3: Statistiche */}
          <Link
            href="/training_cognitivo/categorizzazione/cerca-categoria/statistiche"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-violet-400 hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-violet-700 mb-2">Statistiche</h3>
              <p className="text-gray-600 text-sm mb-4">Visualizza i risultati e l'andamento</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  Andamento per categoria
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  Grafici dettagliati
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-violet-500" />
                  Export PDF
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-violet-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-teal-50 border-l-4 border-teal-400 rounded-lg p-4 flex gap-4 items-start mb-8">
          <Info className="h-6 w-6 text-teal-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-teal-700 mb-1">Come funziona?</p>
            <p className="text-teal-600 text-sm">
              L'educatore crea esercizi scegliendo immagini target (appartenenti alla categoria) e distrattori.
              L'utente ascolta l'istruzione e deve cliccare tutte le immagini della categoria, ignorando i distrattori.
            </p>
          </div>
        </div>

        {/* Install Banner */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-white" />
              <div>
                <p className="font-bold text-white">Installa l'app</p>
                <p className="text-teal-100 text-sm">Accesso rapido senza aprire il browser</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-teal-700 font-bold rounded-lg hover:bg-teal-50 transition-colors"
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

      <footer className="text-center py-6 text-gray-500 text-sm">
        TrainingCognitivo © 2026 - Training Cognitivo
      </footer>

      {/* Modal Istruzioni Installazione */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
              <Download className="h-6 w-6" />
              Installa l'App
            </h3>
            <div className="space-y-4 text-gray-600">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-bold text-blue-700 mb-2">Chrome / Edge:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Clicca sui <strong>3 puntini</strong> in alto a destra</li>
                  <li>Seleziona "<strong>Installa app</strong>"</li>
                  <li>Conferma cliccando "<strong>Installa</strong>"</li>
                </ol>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="font-bold text-orange-700 mb-2">iPhone / iPad (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Tocca l'icona <strong>Condividi</strong></li>
                  <li>Tocca "<strong>Aggiungi a Home</strong>"</li>
                  <li>Tocca "<strong>Aggiungi</strong>"</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
