/**
 * API per creare la cartella di un esercizio con i file template
 * POST /api/admin/create-exercise-folder
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

interface RequestBody {
  categoriaSlug: string
  esercizioSlug: string
  esercizioNome: string
  esercizioDescrizione: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { categoriaSlug, esercizioSlug, esercizioNome, esercizioDescrizione } = body

    if (!categoriaSlug || !esercizioSlug || !esercizioNome) {
      return NextResponse.json(
        { success: false, error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    // Percorso base: app/training_cognitivo/[categoria]/[esercizio]
    const basePath = path.join(process.cwd(), 'app', 'training_cognitivo', categoriaSlug, esercizioSlug)

    // Verifica se la cartella esiste già
    try {
      await fs.access(basePath)
      return NextResponse.json(
        { success: false, error: 'La cartella esiste già' },
        { status: 400 }
      )
    } catch {
      // La cartella non esiste, possiamo crearla
    }

    // Crea la struttura delle cartelle
    await fs.mkdir(basePath, { recursive: true })
    await fs.mkdir(path.join(basePath, 'components'), { recursive: true })

    // Genera il contenuto dei file template

    // 1. page.tsx - Pagina principale dell'esercizio
    const pageContent = `/**
 * Esercizio: ${esercizioNome}
 * Categoria: ${categoriaSlug}
 *
 * ${esercizioDescrizione}
 */
'use client'

import { useState, useEffect } from 'react'
import { Home, Download, RotateCcw, Play, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ${toPascalCase(esercizioSlug)}Page() {
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
          <h1 className="text-xl font-bold text-gray-800">${esercizioNome}</h1>
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
            ${esercizioNome}
          </h2>

          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            ${esercizioDescrizione || 'Descrizione dell\'esercizio'}
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
`

    // 2. manifest.json - Manifest PWA
    const manifestContent = {
      name: esercizioNome,
      short_name: esercizioNome.substring(0, 12),
      description: esercizioDescrizione || `Esercizio: ${esercizioNome}`,
      start_url: `/training_cognitivo/${categoriaSlug}/${esercizioSlug}`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#4f46e5',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }

    // 3. components/ExerciseUI.tsx - Componente UI base
    const exerciseUIContent = `/**
 * Componente UI principale per l'esercizio ${esercizioNome}
 */
'use client'

import { useState } from 'react'

interface ExerciseUIProps {
  onComplete?: (result: ExerciseResult) => void
}

interface ExerciseResult {
  score: number
  totalQuestions: number
  timeSpent: number
  errors: number
}

export function ExerciseUI({ onComplete }: ExerciseUIProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const handleStart = () => {
    setIsStarted(true)
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete({
        score: 0,
        totalQuestions: 0,
        timeSpent: 0,
        errors: 0
      })
    }
  }

  return (
    <div className="exercise-container">
      {!isStarted ? (
        <div className="text-center">
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg"
          >
            Inizia
          </button>
        </div>
      ) : (
        <div>
          {/* Implementa qui la logica dell'esercizio */}
          <p>Step: {currentStep}</p>
        </div>
      )}
    </div>
  )
}
`

    // Scrivi i file
    await fs.writeFile(path.join(basePath, 'page.tsx'), pageContent)
    await fs.writeFile(path.join(basePath, 'manifest.json'), JSON.stringify(manifestContent, null, 2))
    await fs.writeFile(path.join(basePath, 'components', 'ExerciseUI.tsx'), exerciseUIContent)

    return NextResponse.json({
      success: true,
      message: `Cartella creata: app/training_cognitivo/${categoriaSlug}/${esercizioSlug}`,
      path: basePath
    })

  } catch (error: any) {
    console.error('Errore creazione cartella esercizio:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Utility: converte kebab-case in PascalCase
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}
