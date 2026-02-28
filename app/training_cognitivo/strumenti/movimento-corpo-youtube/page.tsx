'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home, Download, RotateCcw, Settings, Play,
  ChevronRight, Info, Video, Hand
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MovimentoCorpoYoutubePage() {
  const supabase = createClient()
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (window.matchMedia('(display-mode: standalone)').matches) setIsStandalone(true)
    if (localStorage.getItem('mcytInstallDismissed') === 'true') setBannerDismissed(true)
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setIsInstallable(true) }
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

  const handleReset = async () => {
    if (!confirm('Vuoi cancellare cache e storage locale?')) return
    await supabase.auth.signOut()
    if ('caches' in window) { const cn = await caches.keys(); await Promise.all(cn.map(n => caches.delete(n))) }
    localStorage.clear(); sessionStorage.clear()
    if ('serviceWorker' in navigator) { const r = await navigator.serviceWorker.getRegistrations(); await Promise.all(r.map(x => x.unregister())) }
    window.location.href = '/'
  }

  const showBanner = isInstallable && !bannerDismissed && !isStandalone

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-blue-700 to-indigo-700 shadow-lg p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <Home className="h-5 w-5 text-white" />
          </a>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="h-6 w-6" />
            Movimento Corpo YouTube
          </h1>
          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button onClick={isInstallable ? handleInstall : () => setShowInstructions(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 shadow-md">
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Installa</span>
              </button>
            )}
            <button onClick={handleReset} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Video className="h-12 w-12 text-blue-700" />
          </div>
          <h2 className="text-3xl font-bold text-blue-800 mb-2">Benvenuto!</h2>
          <p className="text-gray-600 text-lg">Controlla video YouTube con il movimento del tuo corpo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link href="/training_cognitivo/strumenti/movimento-corpo-youtube/gestione"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-blue-400 hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-700 mb-2">Area Educatore</h3>
              <p className="text-gray-600 text-sm mb-4">Configura video YouTube e parametri di controllo per ogni utente</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700"><Video className="h-4 w-4 text-blue-500" /> Link YouTube per ogni tab</li>
                <li className="flex items-center gap-2 text-gray-700"><Settings className="h-4 w-4 text-blue-500" /> Calibra soglie e sensibilità</li>
                <li className="flex items-center gap-2 text-gray-700"><Hand className="h-4 w-4 text-blue-500" /> Configura area ROI mano</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-blue-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href="/training_cognitivo/strumenti/movimento-corpo-youtube/esercizio"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all hover:-translate-y-2 relative">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-400 to-teal-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">Gioca</div>
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
                <Play className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-emerald-700 mb-2">Avvia Esercizio</h3>
              <p className="text-gray-600 text-sm mb-4">Controlla YouTube con il corpo — 3 modalità</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-rose-50 rounded-lg p-2 text-center">
                  <div className="text-2xl mb-1">👄</div>
                  <span className="text-rose-700 font-semibold">Bocca</span>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <div className="text-2xl mb-1">↔️</div>
                  <span className="text-emerald-700 font-semibold">Testa</span>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 text-center">
                  <div className="text-2xl mb-1">✋</div>
                  <span className="text-amber-700 font-semibold">Mano</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-emerald-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 flex gap-4 items-start mb-8">
          <Info className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-700 mb-1">Come funziona?</p>
            <p className="text-blue-600 text-sm">
              L&apos;educatore configura link YouTube e parametri per ogni modalità.
              L&apos;utente usa la webcam: <strong>bocca aperta</strong> per avviare,
              <strong> orientamento testa</strong> per selezionare il video,
              <strong> mano nell&apos;area</strong> per attivare.
            </p>
          </div>
        </div>

        {showBanner && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-white" />
              <div>
                <p className="font-bold text-white">Installa l&apos;app</p>
                <p className="text-blue-100 text-sm">Accesso rapido senza browser</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleInstall} className="px-4 py-2 bg-white text-blue-700 font-bold rounded-lg">Installa</button>
              <button onClick={() => { setBannerDismissed(true); localStorage.setItem('mcytInstallDismissed', 'true') }} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                <span className="text-white text-xl">×</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-gray-500 text-sm">TrainingCognitivo © 2026</footer>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-blue-700 mb-4">Installa l&apos;App</h3>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-bold text-blue-700 mb-1">Chrome / Edge:</p>
                <p className="text-gray-600">Menu 3 puntini → &quot;Installa app&quot;</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-sm">
                <p className="font-bold text-orange-700 mb-1">Safari iPhone/iPad:</p>
                <p className="text-gray-600">Condividi → &quot;Aggiungi a Home&quot;</p>
              </div>
            </div>
            <button onClick={() => setShowInstructions(false)} className="mt-4 w-full py-3 bg-blue-700 text-white font-bold rounded-lg">Ho capito</button>
          </div>
        </div>
      )}
    </div>
  )
}
