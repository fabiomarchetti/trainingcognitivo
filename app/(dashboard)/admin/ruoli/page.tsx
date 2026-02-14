/**
 * Pagina visualizzazione ruoli (sola lettura)
 * Solo per sviluppatori
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, Heart, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Ruolo } from '@/lib/supabase/types'

export default function RuoliPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Controllo accesso: solo sviluppatore
  useEffect(() => {
    if (!authLoading && profile?.id_ruolo) {
      checkAccess()
    }
  }, [authLoading, profile])

  const checkAccess = async () => {
    if (!profile) return

    const supabase = createClient()
    const { data: ruoloData } = await supabase
      .from('ruoli')
      .select('codice')
      .eq('id', profile.id_ruolo)
      .single()

    if (ruoloData?.codice !== 'sviluppatore') {
      router.push('/dashboard')
    }
  }

  useEffect(() => {
    loadRuoli()
  }, [])

  const loadRuoli = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('ruoli')
        .select('*')
        .order('livello_accesso', { ascending: false })

      if (fetchError) throw fetchError

      setRuoli(data || [])
    } catch (err: any) {
      // Ignora AbortError - è normale durante navigazione/unmount
      const isAbortError = err?.message?.includes('AbortError') ||
                          err?.name === 'AbortError' ||
                          err?.details?.includes('AbortError')

      if (isAbortError) {
        console.log('[RUOLI] AbortError ignorato (normale durante navigazione)')
        return
      }
      console.error('Errore caricamento ruoli:', err)
      setError('Impossibile caricare i ruoli')
    } finally {
      setIsLoading(false)
    }
  }

  const getTipoRuoloIcon = (tipo: string) => {
    switch (tipo) {
      case 'gestore':
        return <Shield className="h-4 w-4" />
      case 'paziente':
        return <Users className="h-4 w-4" />
      case 'familiare':
        return <Heart className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTipoRuoloBadge = (tipo: string) => {
    const colors = {
      gestore: 'bg-blue-100 text-blue-700',
      paziente: 'bg-purple-100 text-purple-700',
      familiare: 'bg-pink-100 text-pink-700',
    }

    // Mappa per visualizzare etichette diverse
    const labels: Record<string, string> = {
      gestore: 'Gestore',
      paziente: 'Utente',
      familiare: 'Familiare',
    }

    return (
      <Badge variant="outline" className={colors[tipo as keyof typeof colors] || ''}>
        <span className="flex items-center gap-1">
          {getTipoRuoloIcon(tipo)}
          {labels[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1)}
        </span>
      </Badge>
    )
  }

  // Determina la pagina di gestione in base al codice ruolo
  const getAddHref = (codice: string) => {
    switch (codice) {
      case 'educatore':
        return '/admin/educatori'
      case 'utente':
        return '/admin/utenti'
      default:
        // Staff: sviluppatore, responsabile_centro, insegnante, visitatore
        return '/admin/staff'
    }
  }

  // Mappa nomi ruolo per visualizzazione
  const getDisplayName = (nome: string) => {
    if (nome.toLowerCase() === 'paziente') return 'Utente'
    return nome
  }

  // Colore del bottone in base al tipo ruolo
  const getAddButtonColor = (codice: string) => {
    switch (codice) {
      case 'sviluppatore':
        return 'bg-purple-500 hover:bg-purple-600'
      case 'responsabile_centro':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'educatore':
        return 'bg-teal-500 hover:bg-teal-600'
      case 'insegnante':
        return 'bg-amber-500 hover:bg-amber-600'
      case 'visitatore':
        return 'bg-gray-500 hover:bg-gray-600'
      case 'utente':
        return 'bg-emerald-500 hover:bg-emerald-600'
      default:
        return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ruoli del Sistema</h1>
        <p className="text-gray-500 mt-1">
          Panoramica dei ruoli configurati nel sistema
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ruoli.map((ruolo) => (
          <Card key={ruolo.id} className="hover:shadow-lg transition-shadow relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {getDisplayName(ruolo.nome)}
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">
                    {ruolo.codice}
                  </CardDescription>
                </div>
                <Link
                  href={getAddHref(ruolo.codice)}
                  prefetch={false}
                  className={`${getAddButtonColor(ruolo.codice)} text-white rounded-xl p-2.5 transition-all hover:scale-110 shadow-lg border-2 border-white`}
                  title={`Aggiungi ${getDisplayName(ruolo.nome)}`}
                >
                  <Plus className="h-5 w-5" strokeWidth={3} />
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div>
                  {getTipoRuoloBadge(ruolo.tipo_ruolo)}
                </div>

                {ruolo.descrizione && (
                  <p className="text-sm text-gray-600">{ruolo.descrizione}</p>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-700">Livello accesso:</span>
                  <Badge
                    variant="outline"
                    className={
                      ruolo.livello_accesso >= 80
                        ? 'bg-red-100 text-red-700'
                        : ruolo.livello_accesso >= 50
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }
                  >
                    {ruolo.livello_accesso}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ruoli.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nessun ruolo trovato
          </CardContent>
        </Card>
      )}
    </div>
  )
}
