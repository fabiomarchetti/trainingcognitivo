/**
 * Pagina gestione ruoli
 * Solo per sviluppatori
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Shield, Users, Heart, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth'
import { Button } from '@/components/ui/button'
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
      // Dobbiamo verificare se il ruolo è sviluppatore
      // Per ora facciamo check semplice, poi miglioreremo con hook
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
    } catch (err) {
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

    return (
      <Badge variant="outline" className={colors[tipo as keyof typeof colors] || ''}>
        <span className="flex items-center gap-1">
          {getTipoRuoloIcon(tipo)}
          {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
        </span>
      </Badge>
    )
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Ruoli</h1>
          <p className="text-gray-500 mt-1">
            Crea e gestisci i ruoli del sistema dinamicamente
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Nuovo Ruolo
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ruoli.map((ruolo) => (
          <Card key={ruolo.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {ruolo.nome}
                    {!ruolo.is_attivo && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">
                        Disattivato
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">
                    {ruolo.codice}
                  </CardDescription>
                </div>
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

                <div className="pt-3 flex gap-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit2 className="h-3 w-3" />
                    Modifica
                  </Button>
                  {ruolo.codice !== 'sviluppatore' && (
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
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
