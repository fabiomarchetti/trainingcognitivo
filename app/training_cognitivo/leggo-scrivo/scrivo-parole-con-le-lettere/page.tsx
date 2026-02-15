/**
 * Scrivo Parole con le Lettere - Pagina Index
 * Selezione Area Educatore / Area Utente
 */
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home, RotateCcw, Type, Settings, Gamepad2,
  CheckCircle2, ArrowRight, Info, Download, Loader2, BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Wrapper con Suspense per useSearchParams
export default function ScrivoParoleLettereIndexPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-pink-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    }>
      <IndexContent />
    </Suspense>
  )
}

function IndexContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Gestione PWA install prompt
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
    const dismissed = localStorage.getItem('pwa_banner_dismissed_scrivo_lettere')
    if (dismissed === 'true') {
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

  // Verifica utente loggato
  useEffect(() => {
    const checkUser = async () => {
      const utenteParam = searchParams.get('utente')

      // Se c'è il parametro utente, siamo in modalità test/educatore - non fare redirect
      if (utenteParam) {
        setUserId(utenteParam)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        // Recupera ruolo
        const { data: profile } = await supabase
          .from('profiles')
          .select('id_ruolo, ruolo:ruoli(codice)')
          .eq('id', user.id)
          .single()

        if (profile?.ruolo) {
          const ruoloCodice = (profile.ruolo as any).codice
          // Se è un utente normale (senza parametro utente), vai direttamente all'esercizio
          if (ruoloCodice === 'utente') {
            router.push(`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere/esercizio?utente=${user.id}`)
          }
        }
      }
    }

    checkUser()
  }, [searchParams, router, supabase])

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

  // Chiudi banner
  const dismissBanner = () => {
    setBannerDismissed(true)
    localStorage.setItem('pwa_banner_dismissed_scrivo_lettere', 'true')
  }

  // Mostra istruzioni installazione manuale
  const showInstallInstructions = () => {
    setShowInstructions(true)
  }

  const showInstallBanner = isInstallable && !bannerDismissed && !isStandalone

  // Reset e logout
  const handleReset = async () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/training"
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Torna alla Home"
              >
                <Home className="h-5 w-5 text-white" />
              </Link>
            </div>

            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Type className="h-6 w-6" />
              Scrivo Parole con le Lettere
            </h1>

            <div className="flex items-center gap-2">
              {/* Bottone Installa PWA - sempre visibile se non in standalone */}
              {!isStandalone && (
                <button
                  onClick={isInstallable ? handleInstall : showInstallInstructions}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-pink-700 font-bold rounded-lg hover:bg-pink-50 transition-colors shadow-md"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Type className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-pink-700 mb-2">Benvenuto!</h2>
          <p className="text-gray-600 text-lg">Seleziona l'area in cui vuoi entrare</p>
        </div>

        {/* Area Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Card Educatore */}
          <Link
            href={`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere/gestione${userId ? `?utente=${userId}` : ''}`}
            className="bg-white rounded-2xl p-6 shadow-lg border-3 border-pink-300 hover:border-pink-500 hover:shadow-xl hover:-translate-y-2 transition-all group"
          >
            <div className="text-5xl mb-4 text-pink-500">
              <Settings className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Area Educatore</h3>
            <p className="text-gray-500 mb-4">Crea esercizi per i tuoi utenti</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Inserisci parole target
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Scegli lettere disponibili
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Imposta numero prove
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Gestisci immagini (ARASAAC)
              </li>
            </ul>
            <div className="mt-4 flex justify-end">
              <ArrowRight className="h-8 w-8 text-pink-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </div>
          </Link>

          {/* Card Utente */}
          <Link
            href={`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere/esercizio${userId ? `?utente=${userId}` : ''}`}
            className="bg-white rounded-2xl p-6 shadow-lg border-3 border-blue-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-2 transition-all group"
          >
            <div className="text-5xl mb-4 text-blue-500">
              <Gamepad2 className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Area Utente</h3>
            <p className="text-gray-500 mb-4">Componi le parole con le lettere</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Vedi la parola da scrivere
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Clicca le lettere
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Ascolto con TTS
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Verifica il risultato
              </li>
            </ul>
            <div className="mt-4 flex justify-end">
              <ArrowRight className="h-8 w-8 text-blue-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </div>
          </Link>

          {/* Card Statistiche */}
          <Link
            href={`/training_cognitivo/leggo-scrivo/scrivo-parole-con-le-lettere/statistiche${userId ? `?userId=${userId}` : ''}`}
            className="bg-white rounded-2xl p-6 shadow-lg border-3 border-purple-300 hover:border-purple-500 hover:shadow-xl hover:-translate-y-2 transition-all group"
          >
            <div className="text-5xl mb-4 text-purple-500">
              <BarChart3 className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Statistiche</h3>
            <p className="text-gray-500 mb-4">Visualizza l'andamento</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Grafici di andamento
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Parole difficili
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Tempi di risposta
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Stampa PDF
              </li>
            </ul>
            <div className="mt-4 flex justify-end">
              <ArrowRight className="h-8 w-8 text-purple-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-xl p-4 shadow-md flex gap-4 items-start mb-6">
          <Info className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-gray-800 mb-1">Come funziona?</strong>
            <p className="text-gray-600 text-sm">
              L'educatore crea le parole e sceglie le lettere disponibili (inclusi distrattori).
              L'utente compone le parole cliccando sulle lettere nell'ordine corretto.
            </p>
          </div>
        </div>

        {/* Install Banner */}
        {showInstallBanner && (
          <div className="bg-white rounded-xl p-4 shadow-md flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Download className="h-8 w-8 text-pink-500" />
              <div>
                <strong className="block text-gray-800">Installa l'app</strong>
                <p className="text-gray-500 text-sm">Aggiungi alla schermata home</p>
              </div>
            </div>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors"
            >
              Installa
            </button>
            <button
              onClick={dismissBanner}
              className="p-2 text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        TrainingCognitivo &copy; 2026
      </footer>

      {/* Modal Istruzioni Installazione */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-pink-700 mb-4 flex items-center gap-2">
              <Download className="h-6 w-6" />
              Installa l'App
            </h3>

            <div className="space-y-4 text-gray-600">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-bold text-blue-700 mb-2">Chrome / Edge:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Clicca sui <strong>3 puntini</strong> in alto a destra</li>
                  <li>Seleziona "<strong>Installa Scrivo Parole</strong>" o "<strong>Installa app</strong>"</li>
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
                  <li>Tocca "<strong>Aggiungi</strong>" in alto a destra</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
