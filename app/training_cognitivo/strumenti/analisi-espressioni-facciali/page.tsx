/**
 * Esercizio: Analisi Espressioni Facciali
 * Categoria: strumenti
 *
 * Analisi delle espressioni facciali dell'utente con analisi dei risultati
 * Usa MediaPipe FaceLandmarker e face-api.js per rilevare emozioni e eye tracking
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Home, Download, ChevronLeft, Users } from 'lucide-react'
import dynamic from 'next/dynamic'

// Importa FaceTracker dinamicamente per evitare errori SSR
const FaceTracker = dynamic(
  () => import('./components/FaceTracker'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Caricamento componente...</p>
        </div>
      </div>
    )
  }
)

interface Utente {
  id: string
  nome: string
  cognome: string
}

export default function AnalisiEspressioniFaccialiPage() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [selectedUtente, setSelectedUtente] = useState<Utente | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showExercise, setShowExercise] = useState(false)
  const hasLoadedRef = useRef(false)

  // Carica lista utenti tramite API (bypassa RLS)
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadUtenti = async () => {
      try {
        const res = await fetch('/api/utenti/lista')
        const data = await res.json()

        if (!data.success) {
          console.error('Errore API utenti:', data.message)
          return
        }

        setUtenti((data.data || []).map((p: any) => ({
          id: p.id,
          nome: p.nome || '',
          cognome: p.cognome || ''
        })))
      } catch (err) {
        console.error('Errore caricamento utenti:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadUtenti()
  }, [])

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

  // Torna alla home
  const handleGoHome = () => {
    window.location.href = '/training_cognitivo'
  }

  // Avvia esercizio
  const handleStartExercise = () => {
    if (selectedUtente) {
      setShowExercise(true)
    }
  }

  // Torna alla selezione utente
  const handleBack = () => {
    setShowExercise(false)
  }

  // Schermata selezione utente
  if (!showExercise) {
    return (
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoHome}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                title="Torna alla home"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-white">Analisi Espressioni Facciali</h1>
            </div>
            <div className="flex gap-2">
              {isInstallable && (
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Installa App"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Installa</span>
                </button>
              )}
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                title="Torna alla home"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto p-6">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Seleziona Utente
              </h2>
              <p className="text-gray-400">
                Scegli l&apos;utente per iniziare l&apos;analisi delle espressioni facciali
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : utenti.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nessun utente disponibile</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Utente
                  </label>
                  <select
                    value={selectedUtente?.id || ''}
                    onChange={(e) => {
                      const utente = utenti.find(u => u.id === e.target.value)
                      setSelectedUtente(utente || null)
                    }}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Seleziona un utente --</option>
                    {utenti.map((utente) => (
                      <option key={utente.id} value={utente.id}>
                        {utente.cognome} {utente.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleStartExercise}
                  disabled={!selectedUtente}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    selectedUtente
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Inizia Analisi
                </button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-white font-semibold mb-3">Come funziona</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">1.</span>
                Seleziona l&apos;utente da monitorare
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">2.</span>
                Avvia la webcam per iniziare il rilevamento
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">3.</span>
                Il sistema analizza emozioni, eye tracking e movimenti facciali
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">4.</span>
                Visualizza i risultati nella dashboard in tempo reale
              </li>
            </ul>
          </div>
        </main>
      </div>
    )
  }

  // Schermata esercizio
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Torna alla selezione"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Analisi Espressioni Facciali</h1>
              <p className="text-sm text-gray-400">
                Utente: {selectedUtente?.cognome} {selectedUtente?.nome}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isInstallable && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Installa App"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="Torna alla home"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <FaceTracker
          utenteNome={`${selectedUtente?.cognome} ${selectedUtente?.nome}`}
          utenteId={selectedUtente?.id}
        />
      </main>
    </div>
  )
}
