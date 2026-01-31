/**
 * Pagina Gestione Utenti - Pazienti/Fruitori dell'applicazione
 * Accessibile a: sviluppatore, responsabile_centro, educatore
 * Gli educatori vedono solo i propri utenti assegnati
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Pencil, Trash2, RefreshCw, AlertCircle, UserPlus, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { useAuth } from '@/components/auth/auth-provider'
import { StatusBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import type { ProfileWithRelations } from '@/lib/supabase/types'

type Profile = ProfileWithRelations

const CACHE_KEY = 'admin:utenti'

export default function UtentiPage() {
  const { profile, user } = useAuth()
  const [utenti, setUtenti] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [utenteToDelete, setUtenteToDelete] = useState<Profile | null>(null)
  const supabase = createClient()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const ruoloCodice = profile?.ruolo?.codice

  // Ruoli che possono accedere a questa pagina
  const ruoliAutorizzati = ['sviluppatore', 'responsabile_centro', 'educatore']
  const canAccess = ruoloCodice && ruoliAutorizzati.includes(ruoloCodice)
  const canCreate = ruoloCodice && ['sviluppatore', 'responsabile_centro'].includes(ruoloCodice)
  const canDelete = ruoloCodice && ['sviluppatore', 'responsabile_centro'].includes(ruoloCodice)

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

  // Carica utenti (solo tipo_ruolo = 'paziente')
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
      let query = supabase
        .from('profiles')
        .select('*, ruoli!id_ruolo(*)')
        .order('cognome', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.error('[UTENTI] Errore query:', error)
        setError(`Errore caricamento utenti: ${error.message}`)
        throw error
      }

      // Filtra solo pazienti (tipo_ruolo = 'paziente')
      let utentiData = (data || [])
        .filter((u: any) => u.ruoli?.tipo_ruolo === 'paziente')
        .map((u: any) => ({
          ...u,
          ruolo: u.ruoli,
          ruoli: undefined
        }))

      // Se l'utente è un educatore, filtra solo i propri utenti assegnati
      if (ruoloCodice === 'educatore' && user?.id) {
        const { data: assegnazioni } = await supabase
          .from('educatori_utenti')
          .select('id_utente')
          .eq('id_educatore', user.id)
          .eq('is_attiva', true)

        const utentiAssegnati = (assegnazioni || []).map((a: { id_utente: string }) => a.id_utente)
        utentiData = utentiData.filter((u: any) => utentiAssegnati.includes(u.id))
      }

      console.log('[UTENTI] Dati caricati:', utentiData.length, 'utenti')
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
    if (hasLoadedRef.current || !canAccess) return
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-400 via-teal-400 to-green-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <Users className="h-8 w-8" />
              Gestione Utenti
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              {ruoloCodice === 'educatore'
                ? 'I tuoi utenti assegnati'
                : 'Gestisci gli utenti/pazienti del sistema'
              }
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
            {canCreate && (
              <button
                onClick={() => alert('Funzione in sviluppo: crea nuovo utente')}
                className="flex items-center gap-2 px-5 py-3 bg-white text-teal-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
              >
                <UserPlus className="h-5 w-5" />
                Nuovo Utente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info per educatori */}
      {ruoloCodice === 'educatore' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <Link2 className="h-5 w-5 text-blue-500" />
          <p className="text-blue-700 font-medium">
            Visualizzi solo gli utenti a te assegnati dal responsabile centro.
          </p>
        </div>
      )}

      {/* Tabella Utenti */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-teal-200 overflow-hidden">
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
              className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-all"
            >
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Caricamento utenti...</p>
          </div>
        ) : utenti.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">
              {ruoloCodice === 'educatore'
                ? 'Nessun utente assegnato'
                : 'Nessun utente presente'
              }
            </p>
            {canCreate && (
              <button
                onClick={() => alert('Funzione in sviluppo: crea nuovo utente')}
                className="mt-4 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-all"
              >
                <UserPlus className="h-5 w-5 inline mr-2" />
                Crea il primo utente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-teal-500 to-green-500 text-white">
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Nome</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Cognome</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Sede</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Settore</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Classe</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Stato</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Ultimo Accesso</th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map((utente, index) => (
                  <tr
                    key={utente.id}
                    className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
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
                      {utente.id_sede || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {utente.id_settore || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {utente.id_classe || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={utente.stato} />
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
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(utente)}
                            className="p-2 bg-red-400 hover:bg-red-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
