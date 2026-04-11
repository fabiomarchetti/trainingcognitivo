/**
 * Numeri e Lettere - Pagina Iniziale
 *
 * Pagina di selezione con 3 aree:
 * - Area Educatore: crea e gestisce esercizi di pregrafismo
 * - Esercizio: l'utente traccia numeri e lettere
 * - Statistiche: visualizza sessioni svolte
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home, Download, RotateCcw, Settings,
  PencilLine, ChevronRight, Info,
  CheckCircle, Hand, BarChart3, TrendingUp, FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NumeriELettereHomePage() {
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

    if (localStorage.getItem('numeriLettereInstallBannerDismissed') === 'true') {
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
    localStorage.setItem('numeriLettereInstallBannerDismissed', 'true')
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-violet-600 shadow-lg p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            title="Torna alla Home"
          >
            <Home className="h-5 w-5 text-white" />
          </a>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <PencilLine className="h-6 w-6" />
            Numeri e Lettere
          </h1>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                onClick={isInstallable ? handleInstall : () => setShowInstructions(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-purple-700 font-bold rounded-lg hover:bg-purple-50 transition-colors shadow-md"
                title="Installa l'app"
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
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <PencilLine className="h-12 w-12 text-purple-600" />
          </div>
          <h2 className="text-3xl font-bold text-purple-800 mb-2">Benvenuto!</h2>
          <p className="text-gray-600 text-lg">Seleziona l'area in cui vuoi entrare</p>
        </div>

        {/* Cards Grid - 3 colonne */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Card 1: Area Educatore */}
          <Link
            href="/training_cognitivo/pregrafismo/numeri-e-lettere/gestione"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-purple-400 hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div className="h-2 bg-gradient-to-r from-purple-500 to-violet-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-700 mb-2">Area Educatore</h3>
              <p className="text-gray-600 text-sm mb-4">Crea e gestisci gli esercizi di pregrafismo</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  Scegli numero o lettera
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  Cerca pittogrammi ARASAAC
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  Configura griglia personalizzata
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-purple-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 2: Esercizio */}
          <Link
            href="/training_cognitivo/pregrafismo/numeri-e-lettere/esercizio"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-indigo-400 hover:shadow-xl transition-all hover:-translate-y-2 relative"
          >
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-sky-500" />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-400 to-sky-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              Traccia
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full flex items-center justify-center mb-4">
                <PencilLine className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-indigo-700 mb-2">Esercizio</h3>
              <p className="text-gray-600 text-sm mb-4">Traccia numeri e lettere con il dito</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Hand className="h-4 w-4 text-indigo-500" />
                  Segui il tracciato guida
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-indigo-500" />
                  Griglia dinamica
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Scarica PDF del tracciato
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-indigo-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card 3: Statistiche */}
          <Link
            href="/training_cognitivo/pregrafismo/numeri-e-lettere/statistiche"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-emerald-700 mb-2">Statistiche</h3>
              <p className="text-gray-600 text-sm mb-4">Visualizza le sessioni svolte</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Andamento nel tempo
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Sessioni per carattere
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Storico PDF scaricati
                </li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-emerald-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-purple-50 border-l-4 border-purple-400 rounded-lg p-4 flex gap-4 items-start mb-8">
          <Info className="h-6 w-6 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-purple-700 mb-1">Come funziona?</p>
            <p className="text-purple-600 text-sm">
              L'educatore crea esercizi scegliendo un numero o una lettera da tracciare, con pittogrammi opzionali e griglia personalizzabile.
              L'utente segue le righe guida con il dito, tracciando il carattere nelle celle della griglia.
            </p>
          </div>
        </div>

        {/* Install Banner */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-white" />
              <div>
                <p className="font-bold text-white">Installa l'app</p>
                <p className="text-purple-100 text-sm">Accesso rapido senza aprire il browser</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-purple-700 font-bold rounded-lg hover:bg-purple-50 transition-colors"
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
            <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
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
              className="mt-6 w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
