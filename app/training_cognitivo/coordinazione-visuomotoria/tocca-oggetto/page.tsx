'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home, Download, RotateCcw, Settings, Play,
  ChevronRight, Info, Target, AlertCircle, BarChart3, TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ToccaOggettoHomePage() {
  const supabase = createClient()
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (window.matchMedia('(display-mode: standalone)').matches) setIsStandalone(true)
    if (localStorage.getItem('toccaOggettoInstallDismissed') === 'true') setBannerDismissed(true)
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
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(n => caches.delete(n)))
    }
    localStorage.clear()
    sessionStorage.clear()
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    window.location.href = '/'
  }

  const showBanner = isInstallable && !bannerDismissed && !isStandalone

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      <header className="bg-gradient-to-r from-violet-600 to-purple-700 shadow-lg p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <Home className="h-5 w-5 text-white" />
          </a>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="h-6 w-6" />
            Tocca Oggetto
          </h1>
          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                onClick={isInstallable ? handleInstall : () => setShowInstructions(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-violet-700 font-bold rounded-lg hover:bg-violet-50 shadow-md"
              >
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
          <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Target className="h-12 w-12 text-violet-600" />
          </div>
          <h2 className="text-3xl font-bold text-violet-800 mb-2">Benvenuto!</h2>
          <p className="text-gray-600 text-lg">Seleziona l'area in cui vuoi entrare</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card Educatore */}
          <Link href="/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/gestione"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-violet-400 hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-violet-700 mb-2">Area Educatore</h3>
              <p className="text-gray-600 text-sm mb-4">Configura l'esercizio per l'utente</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700"><Target className="h-4 w-4 text-violet-500" /> Scegli immagini target</li>
                <li className="flex items-center gap-2 text-gray-700"><AlertCircle className="h-4 w-4 text-violet-500" /> Scegli distrattori</li>
                <li className="flex items-center gap-2 text-gray-700"><Settings className="h-4 w-4 text-violet-500" /> Imposta velocità e dimensione</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-violet-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card Gioca */}
          <Link href="/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/esercizio"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-sky-400 hover:shadow-xl transition-all hover:-translate-y-2 relative">
            <div className="h-2 bg-gradient-to-r from-sky-500 to-cyan-500" />
            <div className="absolute top-4 right-4 bg-gradient-to-r from-sky-400 to-cyan-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">Gioca</div>
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                <Play className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-sky-700 mb-2">Tocca Oggetto</h3>
              <p className="text-gray-600 text-sm mb-4">Tocca i target che si muovono sullo schermo</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700"><Target className="h-4 w-4 text-sky-500" /> Tocca i target</li>
                <li className="flex items-center gap-2 text-gray-700"><AlertCircle className="h-4 w-4 text-red-500" /> Evita i distrattori</li>
                <li className="flex items-center gap-2 text-gray-700"><Play className="h-4 w-4 text-sky-500" /> Oggetti che rimbalzano</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-sky-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          {/* Card Statistiche */}
          <Link href="/training_cognitivo/coordinazione-visuomotoria/tocca-oggetto/statistiche"
            className="group bg-white rounded-2xl shadow-lg overflow-hidden border-4 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all hover:-translate-y-2">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-emerald-700 mb-2">Statistiche</h3>
              <p className="text-gray-600 text-sm mb-4">Visualizza risultati e andamento</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700"><TrendingUp className="h-4 w-4 text-emerald-500" /> Andamento sessioni</li>
                <li className="flex items-center gap-2 text-gray-700"><BarChart3 className="h-4 w-4 text-emerald-500" /> Target e errori</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-8 w-8 text-emerald-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-violet-50 border-l-4 border-violet-400 rounded-lg p-4 flex gap-4 items-start mb-8">
          <Info className="h-6 w-6 text-violet-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-violet-700 mb-1">Come funziona?</p>
            <p className="text-violet-600 text-sm">
              L'educatore sceglie le immagini target e i distrattori, imposta velocità e dimensione.
              L'utente tocca gli oggetti target che si muovono sullo schermo evitando i distrattori.
            </p>
          </div>
        </div>

        {showBanner && (
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-white" />
              <div>
                <p className="font-bold text-white">Installa l'app</p>
                <p className="text-violet-100 text-sm">Accesso rapido senza browser</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleInstall} className="px-4 py-2 bg-white text-violet-700 font-bold rounded-lg">Installa</button>
              <button onClick={() => { setBannerDismissed(true); localStorage.setItem('toccaOggettoInstallDismissed', 'true') }} className="p-2 bg-white/20 rounded-full hover:bg-white/30">
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
            <h3 className="text-xl font-bold text-violet-700 mb-4">Installa l'App</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-bold text-blue-700 mb-2">Chrome / Edge:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Clicca sui <strong>3 puntini</strong> in alto a destra</li>
                  <li>Seleziona "<strong>Installa app</strong>"</li>
                </ol>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="font-bold text-orange-700 mb-2">iPhone / iPad (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Tocca l'icona <strong>Condividi</strong></li>
                  <li>Tocca "<strong>Aggiungi a Home</strong>"</li>
                </ol>
              </div>
            </div>
            <button onClick={() => setShowInstructions(false)} className="mt-6 w-full py-3 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700">Ho capito</button>
          </div>
        </div>
      )}
    </div>
  )
}
