/**
 * Ascolto la Musica - Landing Page
 *
 * Strumento per gestire e ascoltare video YouTube:
 * - Area Educatore: gestione brani per utenti
 * - Area Utente: ascolto brani salvati
 * - Statistiche: visualizzazione utilizzo
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Music, Headphones, Settings, BarChart3,
  Home, Download, Trash2, Info, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AscoltoLaMusicaPage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  // PWA States
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // Rileva modalita standalone
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      setIsStandalone(standalone)
    }

    checkStandalone()

    // Ascolta evento installazione PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
      // Mostra banner se non dismissato
      const dismissed = localStorage.getItem('ascolto_musica_install_dismissed')
      if (!dismissed) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  // Installa PWA
  const handleInstallPWA = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstallable(false)
      setShowInstallBanner(false)
    }
    setDeferredPrompt(null)
  }

  // Dismissal banner
  const dismissBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('ascolto_musica_install_dismissed', 'true')
  }

  // Reset cache e logout
  const handleReset = async () => {
    if (!confirm('Vuoi davvero uscire e pulire la cache?')) return

    try {
      await supabaseRef.current.auth.signOut()

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
    } catch (err) {
      console.error('Errore reset:', err)
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800">
      {/* Header */}
      <header className="bg-violet-700 shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isStandalone && (
              <button
                onClick={() => router.push('/')}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Torna alla Home"
              >
                <Home className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="h-6 w-6" />
            Ascolto la Musica
          </h1>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={handleInstallPWA}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Installa App"
              >
                <Download className="h-5 w-5 text-white" />
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Esci e Pulisci Cache"
            >
              <Trash2 className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center mb-8">
          <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="h-12 w-12 text-violet-600" />
          </div>
          <h2 className="text-3xl font-bold text-violet-800 mb-4">Benvenuto!</h2>
          <p className="text-gray-600 text-lg mb-2">
            Questo e lo strumento <strong>Ascolto la Musica</strong>
          </p>
          <p className="text-gray-500">
            Scegli la modalita con cui vuoi accedere:
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Area Educatore */}
          <button
            onClick={() => router.push('/training_cognitivo/strumenti/ascolto-la-musica/educatore')}
            className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-violet-200 transition-colors">
              <Settings className="h-10 w-10 text-violet-600" />
            </div>
            <h3 className="text-xl font-bold text-violet-800 mb-2">Area Educatore</h3>
            <p className="text-gray-500">
              Gestisci i brani per ogni utente
            </p>
          </button>

          {/* Area Utente */}
          <button
            onClick={() => router.push('/training_cognitivo/strumenti/ascolto-la-musica/ascolta')}
            className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <Headphones className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">Area Utente</h3>
            <p className="text-gray-500">
              Ascolta i brani salvati
            </p>
          </button>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <button
            onClick={() => router.push('/training_cognitivo/strumenti/ascolto-la-musica/statistiche')}
            className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all flex items-center justify-center gap-4"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-emerald-800">Statistiche</h3>
              <p className="text-gray-500 text-sm">Visualizza le statistiche di ascolto</p>
            </div>
          </button>
        </div>

        {/* Info Button */}
        <div className="text-center">
          <button
            onClick={() => setShowInfoModal(true)}
            className="px-6 py-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors inline-flex items-center gap-2"
          >
            <Info className="h-5 w-5" />
            Informazioni
          </button>
        </div>
      </main>

      {/* Banner Installazione PWA */}
      {showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-violet-900 text-white p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-bold">Installa Ascolto la Musica</p>
                <p className="text-sm text-violet-200">Accesso rapido dal desktop</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallPWA}
                className="px-4 py-2 bg-white text-violet-800 font-bold rounded-lg hover:bg-violet-100 transition-colors"
              >
                Installa
              </button>
              <button
                onClick={dismissBanner}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Info */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-violet-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Info className="h-5 w-5" />
                Informazioni
              </h3>
              <button onClick={() => setShowInfoModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <h4 className="font-bold text-violet-800 mb-3">Ascolto la Musica</h4>
              <p className="text-gray-600 mb-4">
                Strumento di training cognitivo per la gestione e ascolto di brani musicali.
              </p>

              <div className="bg-violet-50 border-l-4 border-violet-500 p-4 rounded-r-lg mb-4">
                <p className="text-sm text-violet-800">
                  <strong>Area Educatore:</strong> Aggiungi e gestisci i brani YouTube per ogni utente.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="text-sm text-blue-800">
                  <strong>Area Utente:</strong> Ascolta i brani salvati con un player semplice e intuitivo.
                </p>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                <strong>Versione:</strong> 1.0.0 (Next.js)
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full px-4 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 transition-colors"
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
