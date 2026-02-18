/**
 * Esercizio: ascolto la musica
 * Categoria: strumenti
 *
 * con uno strumento come YouTube, si consente di ascoltare la musica prima archiviata dall'educatore o familiare
 */
'use client'

import { useState, useEffect } from 'react'
import { Home, Download, RotateCcw, Play, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AscoltoLaMusicaPage() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const supabase = createClient()

  // Gestione PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
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

  // Logout, reset e torna alla home
  const handleReset = async () => {
    // 1. Logout da Supabase
    await supabase.auth.signOut()

    // 2. Pulisci cache Service Worker
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // 3. Pulisci TUTTO il localStorage (inclusa sessione Supabase)
    localStorage.clear()

    // 4. Pulisci sessionStorage
    sessionStorage.clear()

    // 5. Unregister Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
    }

    // 6. Redirect alla home per re-login
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">ascolto la musica</h1>
          <div className="flex gap-2">
            {isInstallable && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                title="Installa App"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Installa</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="Esci e pulisci cache"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="h-12 w-12 text-indigo-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ascolto la musica
          </h2>

          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            con uno strumento come YouTube, si consente di ascoltare la musica prima archiviata dall'educatore o familiare
          </p>

          <button
            className="px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
          >
            <Play className="h-6 w-6 inline mr-2" />
            Inizia Esercizio
          </button>

          <p className="mt-8 text-sm text-gray-400">
            Questo è un template. Implementa la logica dell'esercizio in questo file.
          </p>
        </div>
      </main>
    </div>
  )
}
