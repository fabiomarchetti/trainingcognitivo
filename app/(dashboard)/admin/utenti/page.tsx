/**
 * Pagina Gestione Utenti - Accessibile solo a sviluppatore
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Pencil, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { useAuth } from '@/components/auth/auth-provider'
import { RoleBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import type { ProfileWithRelations } from '@/lib/supabase/types'

type Profile = ProfileWithRelations

const CACHE_KEY = 'admin:utenti'

export default function UtentiPage() {
  const { profile } = useAuth()
  const [utenti, setUtenti] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [utenteToDelete, setUtenteToDelete] = useState<Profile | null>(null)
  const supabase = createClient()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // Verifica che solo sviluppatore possa accedere
  if (profile && profile.ruolo?.codice !== 'sviluppatore') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border-4 border-red-400 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Accesso Negato</h2>
          <p className="text-red-700">Solo lo sviluppatore può accedere a questa pagina.</p>
        </div>
      </div>
    )
  }

  // Carica utenti
  const loadUtenti = async (forceReload = false) => {
    if (isLoadingRef.current) {
      console.log('[UTENTI] Caricamento già in corso, skip')
      return
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<Profile[]>(CACHE_KEY)
      if (cached) {
        console.log('[UTENTI] Dati trovati in cache:', cached.length, 'utenti')
        setUtenti(cached)
        setIsLoading(false)
        hasLoadedRef.current = true
        return
      }
    }

    console.log('[UTENTI] Inizio caricamento da database')
    isLoadingRef.current = true

    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, ruoli!id_ruolo(*)')
        .order('cognome', { ascending: true })

      if (error) {
        console.error('[UTENTI] Errore query:', error)
        setError(`Errore caricamento utenti: ${error.message}`)
        throw error
      }

      console.log('[UTENTI] Dati caricati:', data?.length || 0, 'utenti')
      // Rinomina ruoli -> ruolo per compatibilità
      const utentiData = (data || []).map(u => ({
        ...u,
        ruolo: (u as any).ruoli,
        ruoli: undefined
      }))
      setUtenti(utentiData as any)
      dataCache.set(CACHE_KEY, utentiData)
      hasLoadedRef.current = true
    } catch (err: any) {
      console.error('[UTENTI] Errore caricamento utenti:', err)
      if (!error) {
        setError(`Errore: ${err?.message || 'Errore sconosciuto'}`)
      }
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current || profile?.ruolo?.codice !== 'sviluppatore') return
    loadUtenti()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Elimina utente
  const handleDeleteClick = (utente: Profile) => {
    setUtenteToDelete(utente)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!utenteToDelete) return

    try {
      // Elimina da auth.users (cascata su profiles)
      const { error } = await supabase.auth.admin.deleteUser(utenteToDelete.id)

      if (error) throw error

      setDeleteModalOpen(false)
      setUtenteToDelete(null)
      dataCache.invalidate(CACHE_KEY)
      loadUtenti(true)
    } catch (err) {
      console.error('Errore eliminazione utente:', err)
      alert('Errore durante l\'eliminazione dell\'utente')
    }
  }

  // Formatta data
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('it-IT')
  }

  // Formatta ruolo
  const formatRuolo = (ruolo: RuoloUtente) => {
    const ruoliMap: Record<RuoloUtente, string> = {
      'sviluppatore': 'Sviluppatore',
      'responsabile_centro': 'Responsabile Centro',
      'educatore': 'Educatore',
      'utente': 'Utente',
      'visitatore': 'Visitatore'
    }
    return ruoliMap[ruolo] || ruolo
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <Users className="h-8 w-8" />
              Gestione Utenti
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              Crea e gestisci tutti gli utenti del sistema
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                dataCache.invalidate(CACHE_KEY)
                loadUtenti(true)
              }}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
            >
              <RefreshCw className="h-5 w-5" />
              Aggiorna
            </button>
            <button
              onClick={() => alert('Funzione in sviluppo: crea nuovo utente')}
              className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
            >
              <Plus className="h-5 w-5" />
              Nuovo Utente
            </button>
          </div>
        </div>
      </div>

      {/* Tabella Utenti */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-indigo-200 overflow-hidden">
        {error ? (
          <div className="p-12 text-center">
            <div className="bg-red-100 border-4 border-red-400 rounded-2xl p-6 mb-4">
              <p className="text-red-700 font-bold text-lg mb-2">Errore</p>
              <p className="text-red-600">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null)
                hasLoadedRef.current = false
                loadUtenti()
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
            >
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Caricamento utenti...</p>
          </div>
        ) : utenti.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">Nessun utente presente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-400 to-purple-400 text-white">
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Nome</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Cognome</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Email</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Ruolo</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Stato</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Ultimo Accesso</th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map((utente, index) => (
                  <tr
                    key={utente.id}
                    className={`border-b border-gray-200 hover:bg-indigo-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {utente.nome}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {utente.cognome}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {utente.email_contatto || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadge role={utente.ruolo?.codice || 'utente'} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {utente.stato}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(utente.ultimo_accesso)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => alert('Funzione in sviluppo: modifica utente')}
                          className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(utente)}
                          className="p-2 bg-red-400 hover:bg-red-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setUtenteToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Elimina Utente"
        message={`Sei sicuro di voler eliminare l'utente "${utenteToDelete?.nome} ${utenteToDelete?.cognome}"? Questa azione eliminerà anche l'account dall'autenticazione e non può essere annullata.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
