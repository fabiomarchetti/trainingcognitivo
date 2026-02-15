/**
 * Pagina Training - Home Utente
 * Mostra gli esercizi assegnati all'utente loggato
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Play, LogOut, User, Loader2, AlertCircle,
  Puzzle, RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CategoriaEsercizi } from '@/lib/supabase/types'

interface EsercizioAssegnato {
  id: number
  id_esercizio: number
  esercizio: {
    id: number
    nome: string
    descrizione: string
    slug: string
    categoria: CategoriaEsercizi | null
  } | null
}

// Colori per le categorie
const categoriaColori: Record<string, { bg: string; text: string; border: string }> = {
  'leggo-scrivo': { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' },
  'strumenti': { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' },
  'coordinazione-visuo-motoria': { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500' },
  'causa-effetto': { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500' },
  'memoria': { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-500' },
  'attenzione': { bg: 'bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-500' },
  'default': { bg: 'bg-gray-500', text: 'text-gray-600', border: 'border-gray-500' }
}

// Icone per le categorie
const categoriaIcone: Record<string, string> = {
  'leggo-scrivo': '📖',
  'strumenti': '🔧',
  'coordinazione-visuo-motoria': '🎯',
  'causa-effetto': '💡',
  'memoria': '🧠',
  'attenzione': '👁️',
  'default': '📚'
}

export default function TrainingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [esercizi, setEsercizi] = useState<EsercizioAssegnato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carica dati utente e esercizi assegnati
  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Ottieni utente corrente
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Carica profilo utente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nome, cognome')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setUserName(`${profile.nome || ''} ${profile.cognome || ''}`.trim() || 'Utente')

      // Carica esercizi assegnati (solo attivi)
      const { data: assegnazioni, error: assegnazioniError } = await supabase
        .from('utenti_esercizi')
        .select(`
          id,
          id_esercizio,
          esercizio:esercizi(
            id,
            nome,
            descrizione,
            slug,
            categoria:categorie_esercizi(*)
          )
        `)
        .eq('id_utente', user.id)
        .eq('stato', 'attivo')

      if (assegnazioniError) throw assegnazioniError

      setEsercizi(assegnazioni || [])

    } catch (err: any) {
      console.error('[TRAINING] Errore:', err)
      setError(err.message || 'Errore durante il caricamento')
    } finally {
      setIsLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Vai all'esercizio
  const goToExercise = (esercizio: EsercizioAssegnato['esercizio']) => {
    if (!esercizio) return

    const categoriaSlug = esercizio.categoria?.slug || ''
    const path = `/training_cognitivo/${categoriaSlug}/${esercizio.slug}?utente=${userId}`
    router.push(path)
  }

  // Ottieni colori categoria
  const getCategoriaStyle = (slug: string | undefined) => {
    if (!slug) return categoriaColori['default']
    return categoriaColori[slug] || categoriaColori['default']
  }

  // Ottieni icona categoria
  const getCategoriaIcon = (slug: string | undefined) => {
    if (!slug) return categoriaIcone['default']
    return categoriaIcone[slug] || categoriaIcone['default']
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Benvenuto</p>
                <h1 className="text-xl font-bold text-white">{userName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadUserData}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Aggiorna"
              >
                <RefreshCw className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-white font-medium"
              >
                <LogOut className="h-5 w-5" />
                Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Titolo sezione */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-2">
            <Puzzle className="h-7 w-7 text-blue-600" />
            Seleziona l'Esercizio
          </h2>
          {esercizi.length > 0 && (
            <p className="text-gray-600">
              Hai <strong>{esercizi.length}</strong> eserciz{esercizi.length === 1 ? 'io assegnato' : 'i assegnati'}.
              Seleziona quale esercizio vuoi svolgere:
            </p>
          )}
        </div>

        {/* Errore */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Nessun esercizio */}
        {esercizi.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              Nessun esercizio assegnato
            </h3>
            <p className="text-gray-500">
              Non hai ancora esercizi assegnati. Contatta il tuo educatore.
            </p>
          </div>
        )}

        {/* Griglia esercizi */}
        {esercizi.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {esercizi.map((item) => {
              if (!item.esercizio) return null

              const categoriaStyle = getCategoriaStyle(item.esercizio.categoria?.slug)
              const categoriaIcon = getCategoriaIcon(item.esercizio.categoria?.slug)

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-transparent hover:${categoriaStyle.border} transition-all hover:shadow-xl hover:-translate-y-1 group`}
                >
                  {/* Contenuto card */}
                  <div className="p-6">
                    {/* Icona */}
                    <div className="flex justify-center mb-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${categoriaStyle.text} bg-opacity-10`}
                           style={{ backgroundColor: `${categoriaStyle.bg.replace('bg-', '')}20` }}>
                        <BookOpen className={`h-8 w-8 ${categoriaStyle.text}`} />
                      </div>
                    </div>

                    {/* Nome esercizio */}
                    <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                      {item.esercizio.nome}
                    </h3>

                    {/* Descrizione */}
                    <p className="text-gray-500 text-sm text-center mb-4 line-clamp-3">
                      {item.esercizio.descrizione}
                    </p>

                    {/* Badge categoria */}
                    {item.esercizio.categoria && (
                      <div className="flex justify-center mb-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold text-white rounded-full ${categoriaStyle.bg}`}>
                          {item.esercizio.categoria.nome}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottone */}
                  <button
                    onClick={() => goToExercise(item.esercizio)}
                    className={`w-full py-4 ${categoriaStyle.bg} text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                  >
                    <Play className="h-5 w-5" />
                    Clicca per iniziare
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        TrainingCognitivo © 2026
      </footer>
    </div>
  )
}
