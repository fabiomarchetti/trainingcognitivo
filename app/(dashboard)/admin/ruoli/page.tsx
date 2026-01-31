/**
 * Pagina gestione ruoli
 * Solo per sviluppatori
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Shield, Users, Heart, AlertCircle, X, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Ruolo, TipoRuolo } from '@/lib/supabase/types'

// Helper per generare codice da nome
function generateCodice(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

export default function RuoliPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    codice: '',
    descrizione: '',
    tipo_ruolo: 'gestore' as TipoRuolo,
    livello_accesso: 50,
    is_attivo: true
  })

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

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    setFormData({
      nome: '',
      codice: '',
      descrizione: '',
      tipo_ruolo: 'gestore',
      livello_accesso: 50,
      is_attivo: true
    })
    setCreateError(null)
    setCreateModalOpen(true)
  }

  // Aggiorna codice quando cambia il nome
  const handleNomeChange = (nome: string) => {
    setFormData(prev => ({
      ...prev,
      nome,
      codice: generateCodice(nome)
    }))
  }

  // Crea nuovo ruolo
  const handleCreateRuolo = async () => {
    setCreateError(null)

    // Validazione
    if (!formData.nome.trim()) {
      setCreateError('Il nome è obbligatorio')
      return
    }
    if (!formData.codice.trim()) {
      setCreateError('Il codice è obbligatorio')
      return
    }
    if (formData.livello_accesso < 0 || formData.livello_accesso > 100) {
      setCreateError('Il livello accesso deve essere tra 0 e 100')
      return
    }

    // Verifica codice unico
    const codiceEsistente = ruoli.find(r => r.codice === formData.codice)
    if (codiceEsistente) {
      setCreateError('Esiste già un ruolo con questo codice')
      return
    }

    setIsCreating(true)

    try {
      const supabase = createClient()

      const { error: insertError } = await supabase
        .from('ruoli')
        .insert({
          nome: formData.nome.trim(),
          codice: formData.codice.trim(),
          descrizione: formData.descrizione.trim() || null,
          tipo_ruolo: formData.tipo_ruolo,
          livello_accesso: formData.livello_accesso,
          is_attivo: formData.is_attivo,
          permessi: {}
        })

      if (insertError) {
        console.error('Errore inserimento ruolo:', insertError)
        setCreateError(`Errore: ${insertError.message}`)
        return
      }

      // Chiudi modal e ricarica
      setCreateModalOpen(false)
      loadRuoli()
    } catch (err: any) {
      console.error('Errore creazione ruolo:', err)
      setCreateError(`Errore: ${err.message || 'Errore sconosciuto'}`)
    } finally {
      setIsCreating(false)
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
        <Button onClick={handleOpenCreateModal}>
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

      {/* Modal Creazione Ruolo */}
      {createModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-4 border-teal-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-teal-500 to-green-500 rounded-t-2xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Nuovo Ruolo
                </h2>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {createError && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {createError}
                  </div>
                )}

                {/* Nome */}
                <Input
                  label="Nome Ruolo *"
                  value={formData.nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="es. Coordinatore"
                />

                {/* Codice */}
                <Input
                  label="Codice *"
                  value={formData.codice}
                  onChange={(e) => setFormData(prev => ({ ...prev, codice: e.target.value }))}
                  placeholder="es. coordinatore"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 -mt-2">
                  Codice univoco per identificare il ruolo (generato automaticamente dal nome)
                </p>

                {/* Descrizione */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={formData.descrizione}
                    onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                    placeholder="Descrizione opzionale del ruolo..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Tipo Ruolo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Ruolo *
                  </label>
                  <select
                    value={formData.tipo_ruolo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_ruolo: e.target.value as TipoRuolo }))}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="gestore">Gestore (Staff del portale)</option>
                    <option value="paziente">Paziente (Utente finale)</option>
                    <option value="familiare">Familiare</option>
                  </select>
                </div>

                {/* Livello Accesso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Livello Accesso * (0-100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.livello_accesso}
                    onChange={(e) => setFormData(prev => ({ ...prev, livello_accesso: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Livello alto = più permessi (100 = sviluppatore, 80 = admin, 50 = educatore, 10 = utente)
                  </p>
                </div>

                {/* Attivo */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_attivo"
                    checked={formData.is_attivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_attivo: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="is_attivo" className="text-sm font-medium text-gray-700">
                    Ruolo attivo
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={isCreating}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreateRuolo}
                  disabled={isCreating}
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Crea Ruolo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
