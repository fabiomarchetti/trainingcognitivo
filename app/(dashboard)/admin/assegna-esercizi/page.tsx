/**
 * Pagina Assegna Esercizi agli Utenti
 * Permette di assegnare esercizi agli utenti e visualizzare le assegnazioni attive
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ClipboardCheck, Plus, Trash2, ExternalLink, RefreshCw, AlertCircle,
  Loader2, User, Puzzle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/auth-provider'
import { ConfirmModal } from '@/components/ui/modal'
import type { CategoriaEsercizi, UtenteEsercizio } from '@/lib/supabase/types'

interface AssegnazioneWithRelations extends UtenteEsercizio {
  utente?: {
    id: string
    nome: string | null
    cognome: string | null
  } | null
  esercizio?: {
    id: number
    nome: string
    slug: string
    categoria?: CategoriaEsercizi | null
  } | null
  assegnante?: {
    id: string
    nome: string | null
    cognome: string | null
  } | null
}

interface UtenteOption {
  id: string
  nome: string
  cognome: string
}

interface EsercizioOption {
  id: number
  nome: string
  slug: string
  categoria: CategoriaEsercizi | null
}

// Colori per le categorie
const categoriaColori: Record<string, string> = {
  'leggo-scrivo': 'bg-emerald-500',
  'strumenti': 'bg-blue-500',
  'coordinazione-visuo-motoria': 'bg-purple-500',
  'causa-effetto': 'bg-orange-500',
  'memoria': 'bg-pink-500',
  'attenzione': 'bg-cyan-500',
  'default': 'bg-gray-500'
}

export default function AssegnaEserciziPage() {
  const { profile } = useAuth()
  const supabase = createClient()

  // Stati dati
  const [utenti, setUtenti] = useState<UtenteOption[]>([])
  const [esercizi, setEsercizi] = useState<EsercizioOption[]>([])
  const [assegnazioni, setAssegnazioni] = useState<AssegnazioneWithRelations[]>([])

  // Stati form
  const [selectedUtente, setSelectedUtente] = useState<string>('')
  const [selectedEsercizio, setSelectedEsercizio] = useState<string>('')
  const [note, setNote] = useState<string>('')

  // Stati UI
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modal elimina
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [assegnazioneToDelete, setAssegnazioneToDelete] = useState<AssegnazioneWithRelations | null>(null)

  const isLoadingRef = useRef(false)
  const ruoloCodice = profile?.ruolo?.codice

  // Ruoli autorizzati
  const ruoliAutorizzati = ['sviluppatore', 'responsabile_centro', 'educatore']
  const canAccess = ruoloCodice && ruoliAutorizzati.includes(ruoloCodice)

  // Verifica accesso
  if (profile && !canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border-4 border-red-400 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Accesso Negato</h2>
          <p className="text-red-700">Non hai i permessi per accedere a questa pagina.</p>
        </div>
      </div>
    )
  }

  // Carica dati
  const loadData = async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Carica utenti (solo ruolo utente/paziente)
      const { data: utentiData, error: utentiError } = await supabase
        .from('profiles')
        .select('id, nome, cognome, id_ruolo, ruoli!inner(codice)')
        .eq('ruoli.codice', 'utente')
        .eq('stato', 'attivo')
        .order('cognome')

      if (utentiError) throw utentiError
      setUtenti(utentiData?.map(u => ({
        id: u.id,
        nome: u.nome || '',
        cognome: u.cognome || ''
      })) || [])

      // Carica esercizi attivi con categoria
      const { data: eserciziData, error: eserciziError } = await supabase
        .from('esercizi')
        .select('id, nome, slug, stato, categoria:categorie_esercizi(*)')
        .eq('stato', 'attivo')
        .order('nome')

      if (eserciziError) throw eserciziError
      setEsercizi(eserciziData?.map(e => ({
        id: e.id,
        nome: e.nome,
        slug: e.slug,
        categoria: (Array.isArray(e.categoria) ? e.categoria[0] : e.categoria) as CategoriaEsercizi | null
      })) || [])

      // Carica assegnazioni attive
      await loadAssegnazioni()

    } catch (err: any) {
      console.error('[ASSEGNA] Errore caricamento:', err)
      setError(err.message || 'Errore durante il caricamento dei dati')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }

  const loadAssegnazioni = async () => {
    try {
      const { data, error } = await supabase
        .from('utenti_esercizi')
        .select(`
          *,
          utente:profiles!utenti_esercizi_id_utente_fkey(id, nome, cognome),
          esercizio:esercizi!utenti_esercizi_id_esercizio_fkey(id, nome, slug, categoria:categorie_esercizi(*)),
          assegnante:profiles!utenti_esercizi_id_assegnante_fkey(id, nome, cognome)
        `)
        .eq('stato', 'attivo')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssegnazioni(data || [])
    } catch (err: any) {
      console.error('[ASSEGNA] Errore caricamento assegnazioni:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Assegna esercizio
  const handleAssegna = async () => {
    if (!selectedUtente || !selectedEsercizio) {
      setError('Seleziona utente ed esercizio')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Verifica se già assegnato
      const { data: existing } = await supabase
        .from('utenti_esercizi')
        .select('id')
        .eq('id_utente', selectedUtente)
        .eq('id_esercizio', parseInt(selectedEsercizio))
        .eq('stato', 'attivo')
        .single()

      if (existing) {
        setError('Questo esercizio è già assegnato a questo utente')
        setIsSaving(false)
        return
      }

      // Inserisci assegnazione
      const { error: insertError } = await supabase
        .from('utenti_esercizi')
        .insert({
          id_utente: selectedUtente,
          id_esercizio: parseInt(selectedEsercizio),
          id_assegnante: profile?.id || null,
          note: note.trim() || null,
          stato: 'attivo'
        })

      if (insertError) throw insertError

      // Reset form
      setSelectedUtente('')
      setSelectedEsercizio('')
      setNote('')
      setSuccessMessage('Esercizio assegnato con successo!')

      // Ricarica assegnazioni
      await loadAssegnazioni()

      // Nascondi messaggio dopo 3 secondi
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (err: any) {
      console.error('[ASSEGNA] Errore assegnazione:', err)
      setError(err.message || 'Errore durante l\'assegnazione')
    } finally {
      setIsSaving(false)
    }
  }

  // Rimuovi assegnazione
  const handleRemove = async () => {
    if (!assegnazioneToDelete) return

    try {
      const { error } = await supabase
        .from('utenti_esercizi')
        .update({ stato: 'archiviato' })
        .eq('id', assegnazioneToDelete.id)

      if (error) throw error

      await loadAssegnazioni()
      setDeleteModalOpen(false)
      setAssegnazioneToDelete(null)
    } catch (err: any) {
      console.error('[ASSEGNA] Errore rimozione:', err)
      setError(err.message || 'Errore durante la rimozione')
    }
  }

  // Apri esercizio
  const getEsercizioPath = (esercizio: EsercizioOption | AssegnazioneWithRelations['esercizio'], utenteId?: string) => {
    if (!esercizio) return '#'

    const categoria = 'categoria' in esercizio && esercizio.categoria
      ? esercizio.categoria.slug
      : ''

    let basePath = `/training_cognitivo/${categoria}/${esercizio.slug}`

    if (utenteId) {
      basePath += `?utente=${utenteId}`
    }

    return basePath
  }

  // Colore badge categoria
  const getCategoriaColor = (slug: string | undefined) => {
    if (!slug) return categoriaColori['default']
    return categoriaColori[slug] || categoriaColori['default']
  }

  // Formatta data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-blue-600" />
          Assegna Esercizi agli Utenti
        </h1>
        <button
          onClick={() => loadData()}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Aggiorna"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Messaggi */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Card Nuova Assegnazione */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuova Assegnazione
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Seleziona Utente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona Utente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedUtente}
                  onChange={(e) => setSelectedUtente(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Seleziona utente...</option>
                  {utenti.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.cognome} {u.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seleziona Esercizio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona Esercizio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Puzzle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedEsercizio}
                  onChange={(e) => setSelectedEsercizio(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">Seleziona esercizio...</option>
                  {esercizi.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome} {e.categoria ? `(${e.categoria.nome})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note opzionali sull'assegnazione..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Bottone Assegna */}
          <div className="flex justify-end">
            <button
              onClick={handleAssegna}
              disabled={isSaving || !selectedUtente || !selectedEsercizio}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ClipboardCheck className="h-5 w-5" />
              )}
              Assegna Esercizio
            </button>
          </div>
        </div>
      </div>

      {/* Card Elenco Assegnazioni */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            Elenco Assegnazioni Attive
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Utente</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Esercizio</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Categoria</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Data Assegnazione</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Assegnato Da</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Note</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assegnazioni.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Nessuna assegnazione attiva
                  </td>
                </tr>
              ) : (
                assegnazioni.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">
                        {a.utente?.nome} {a.utente?.cognome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {a.esercizio?.nome}
                    </td>
                    <td className="px-6 py-4">
                      {a.esercizio?.categoria && (
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold text-white rounded-full ${getCategoriaColor(a.esercizio.categoria.slug)}`}>
                          {a.esercizio.categoria.nome}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {a.assegnante ? `${a.assegnante.nome} ${a.assegnante.cognome}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {a.note || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setAssegnazioneToDelete(a)
                            setDeleteModalOpen(true)
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Rimuovi
                        </button>
                        <a
                          href={getEsercizioPath(a.esercizio, a.utente?.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Apri
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setAssegnazioneToDelete(null)
        }}
        onConfirm={handleRemove}
        title="Rimuovi Assegnazione"
        message={`Vuoi rimuovere l'assegnazione dell'esercizio "${assegnazioneToDelete?.esercizio?.nome}" all'utente "${assegnazioneToDelete?.utente?.nome} ${assegnazioneToDelete?.utente?.cognome}"?`}
        confirmText="Rimuovi"
      />
    </div>
  )
}
