/**
 * Pagina Gestione Sedi - Stile colorato infanzia
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import { SedeModal } from '@/components/admin/sede-modal'
import type { Database } from '@/lib/supabase/types'

type Sede = Database['public']['Tables']['sedi']['Row']

const CACHE_KEY = 'admin:sedi'

export default function SediPage() {
  console.log('[SEDI PAGE] Render component')

  // NON usiamo più auth - RLS pubblica permette lettura
  const [sedi, setSedi] = useState<Sede[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null)
  // Usa direttamente createClient() - è un singleton, non serve useRef
  const supabase = createClient()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // Carica sedi
  const loadSedi = async (forceReload = false) => {
    if (isLoadingRef.current) {
      console.log('[SEDI] Caricamento già in corso, skip')
      return
    }

    // Segna che abbiamo tentato il caricamento (previene loop)
    if (!forceReload) {
      hasLoadedRef.current = true
    }

    // Controlla cache prima di caricare
    if (!forceReload) {
      const cached = dataCache.get<Sede[]>(CACHE_KEY)
      if (cached) {
        console.log('[SEDI] Dati trovati in cache:', cached.length, 'sedi')
        setSedi(cached)
        setIsLoading(false)
        return
      }
    }

    // NON verificare session - RLS pubblica permette lettura senza auth
    console.log('[SEDI] Inizio caricamento da database (RLS pubblica)')
    isLoadingRef.current = true

    setIsLoading(true)
    setError(null)
    try {
      console.log('[SEDI] Avvio query Supabase...')

      const { data, error } = await supabase
        .from('sedi')
        .select('*')
        .order('nome', { ascending: true })

      console.log('[SEDI] Query completata', { hasData: !!data, hasError: !!error })

      if (error) {
        // Ignora AbortError
        if (error.message?.includes('AbortError') || error.details?.includes('AbortError')) {
          console.log('[SEDI] AbortError query ignorato')
          return
        }
        console.error('[SEDI] Errore query:', error)
        setError(`Errore caricamento sedi: ${error.message}`)
        throw error
      }

      console.log('[SEDI] Dati caricati:', data?.length || 0, 'sedi')
      const sedeData = data || []
      setSedi(sedeData)
      // Salva in cache
      dataCache.set(CACHE_KEY, sedeData)
    } catch (err: any) {
      // Ignora AbortError - è normale durante navigazione/unmount
      const isAbortError = err?.message?.includes('AbortError') ||
                          err?.name === 'AbortError' ||
                          err?.details?.includes('AbortError')

      if (isAbortError) {
        console.log('[SEDI] AbortError ignorato (normale durante navigazione)')
        return // Non aggiornare stato se abortato
      }

      console.error('[SEDI] Errore caricamento sedi:', err)
      console.error('[SEDI] Dettaglio errore:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        status: err?.status
      })
      if (!error) {
        setError(`Errore: ${err?.message || 'Errore sconosciuto'}`)
      }
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('[SEDI] Fine caricamento')
    }
  }

  useEffect(() => {
    console.log('[SEDI] useEffect - Mount/Update')

    // Se abbiamo già caricato i dati, non fare nulla
    if (hasLoadedRef.current) {
      console.log('[SEDI] Dati già caricati, skip')
      return
    }

    // Se stiamo già caricando, non fare nulla
    if (isLoadingRef.current) {
      console.log('[SEDI] Caricamento già in corso, skip')
      return
    }

    // NON attendere l'auth - le sedi hanno RLS pubblica
    // Carica immediatamente i dati
    console.log('[SEDI] Caricamento immediato (RLS pubblica)')
    loadSedi()

    return () => {
      console.log('[SEDI] useEffect cleanup')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apri modal nuova sede
  const handleNewSede = () => {
    setSelectedSede(null)
    setIsModalOpen(true)
  }

  // Apri modal modifica sede
  const handleEditSede = (sede: Sede) => {
    setSelectedSede(sede)
    setIsModalOpen(true)
  }

  // Conferma eliminazione
  const handleDeleteClick = (sede: Sede) => {
    setSedeToDelete(sede)
    setDeleteModalOpen(true)
  }

  // Elimina sede
  const handleDeleteConfirm = async () => {
    if (!sedeToDelete) return

    try {
      const { error } = await supabase
        .from('sedi')
        .delete()
        .eq('id', sedeToDelete.id)

      if (error) throw error

      setDeleteModalOpen(false)
      setSedeToDelete(null)
      // Invalida cache e ricarica
      dataCache.invalidate(CACHE_KEY)
      loadSedi(true)
    } catch (err) {
      console.error('Errore eliminazione sede:', err)
      alert('Errore durante l\'eliminazione della sede')
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
      <div className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <Building2 className="h-8 w-8" />
              Gestione Sedi
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              Gestisci le sedi del sistema
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                dataCache.invalidate(CACHE_KEY)
                loadSedi(true)
              }}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
            >
              <RefreshCw className="h-5 w-5" />
              Aggiorna
            </button>
            <button
              onClick={handleNewSede}
              className="flex items-center gap-2 px-5 py-3 bg-white text-red-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
            >
              <Plus className="h-5 w-5" />
              Nuova Sede
            </button>
          </div>
        </div>
      </div>

      {/* Tabella Sedi */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-cyan-200 overflow-hidden">
        {error ? (
          <div className="p-12 text-center">
            <div className="bg-red-100 border-4 border-red-400 rounded-2xl p-6 mb-4">
              <p className="text-red-700 font-bold text-lg mb-2">Errore</p>
              <p className="text-red-600">{error}</p>
              <p className="text-gray-600 text-sm mt-4">
                Controlla la console del browser per maggiori dettagli
              </p>
            </div>
            <button
              onClick={() => {
                setError(null)
                hasLoadedRef.current = false
                loadSedi()
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
            >
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-200 border-t-cyan-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Caricamento sedi...</p>
          </div>
        ) : sedi.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">Nessuna sede presente</p>
            <p className="text-gray-400 text-sm mt-2">
              Clicca su "Nuova Sede" per aggiungerne una
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400 to-blue-400 text-white">
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">ID</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Nome Sede</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Indirizzo</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Città</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Provincia</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">CAP</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Telefono</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Email</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Stato</th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">Data Creazione</th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sedi.map((sede, index) => (
                  <tr
                    key={sede.id}
                    className={`border-b border-gray-200 hover:bg-cyan-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-sm font-bold text-gray-800">{sede.id}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {sede.nome}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {sede.indirizzo || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {sede.citta || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                      {sede.provincia || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {sede.cap || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {sede.telefono || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {sede.email || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={sede.stato || 'attiva'} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(sede.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditSede(sede)}
                          className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sede)}
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

      {/* Modal Inserimento/Modifica */}
      <SedeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedSede(null)
        }}
        onSuccess={() => {
          dataCache.invalidate(CACHE_KEY)
          loadSedi(true)
        }}
        sede={selectedSede}
      />

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSedeToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Elimina Sede"
        message={`Sei sicuro di voler eliminare la sede "${sedeToDelete?.nome}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
