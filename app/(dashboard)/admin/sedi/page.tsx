/**
 * Pagina Gestione Sedi - Stile colorato infanzia
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import { SedeModal } from '@/components/admin/sede-modal'
import type { Database } from '@/lib/supabase/types'

type Sede = Database['public']['Tables']['sedi']['Row']

export default function SediPage() {
  const [sedi, setSedi] = useState<Sede[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const isLoadingRef = useRef(false)

  // Carica sedi
  const loadSedi = async () => {
    if (isLoadingRef.current) {
      console.log('[SEDI] Caricamento già in corso, skip')
      return
    }

    console.log('[SEDI] Inizio caricamento')
    isLoadingRef.current = true

    setIsLoading(true)
    try {
      console.log('[SEDI] Avvio query Supabase...')
      const { data, error } = await supabase
        .from('sedi')
        .select('*')
        .order('nome', { ascending: true })

      console.log('[SEDI] Query completata', { hasData: !!data, hasError: !!error })

      if (error) {
        console.error('[SEDI] Errore query:', error)
        throw error
      }

      console.log('[SEDI] Dati caricati:', data?.length || 0, 'sedi')
      setSedi(data || [])
    } catch (err: any) {
      console.error('[SEDI] Errore caricamento sedi:', err)
      console.error('[SEDI] Dettaglio errore:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      })
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('[SEDI] Fine caricamento')
    }
  }

  useEffect(() => {
    console.log('[SEDI] useEffect mount')

    // Verifica che il client Supabase sia configurato
    if (!supabase) {
      console.error('[SEDI] Client Supabase non configurato!')
      return
    }

    loadSedi()

    return () => {
      console.log('[SEDI] useEffect cleanup')
      // Reset loading flag on unmount
      isLoadingRef.current = false
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
      loadSedi()
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
              onClick={loadSedi}
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
        {isLoading ? (
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
        onSuccess={loadSedi}
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
