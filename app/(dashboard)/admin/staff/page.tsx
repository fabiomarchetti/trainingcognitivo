/**
 * Pagina Gestione Staff - Gestori dell'applicazione
 * Accessibile solo a sviluppatore
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, Plus, Pencil, Trash2, RefreshCw, AlertCircle, X, Mail, Lock, User, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { useAuth } from '@/components/auth/auth-provider'
import { RoleBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ProfileWithRelations, Ruolo } from '@/lib/supabase/types'

type Profile = ProfileWithRelations

const CACHE_KEY = 'admin:staff'

export default function StaffPage() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState<Profile[]>([])
  const [ruoliDisponibili, setRuoliDisponibili] = useState<Ruolo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<Profile | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const supabase = createClient()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // Form state per nuovo staff
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    id_ruolo: 0
  })

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

  // Carica ruoli disponibili (solo gestori)
  const loadRuoli = async () => {
    const { data } = await supabase
      .from('ruoli')
      .select('*')
      .eq('tipo_ruolo', 'gestore')
      .eq('is_attivo', true)
      .order('livello_accesso', { ascending: false })

    if (data) {
      // Escludi sviluppatore dalla lista (non può essere creato)
      setRuoliDisponibili(data.filter((r: Ruolo) => r.codice !== 'sviluppatore'))
    }
  }

  // Carica staff (solo tipo_ruolo = 'gestore')
  const loadStaff = async (forceReload = false) => {
    if (isLoadingRef.current) {
      console.log('[STAFF] Caricamento già in corso, skip')
      return
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<Profile[]>(CACHE_KEY)
      if (cached) {
        console.log('[STAFF] Dati trovati in cache:', cached.length, 'staff')
        setStaff(cached)
        setIsLoading(false)
        hasLoadedRef.current = true
        return
      }
    }

    console.log('[STAFF] Inizio caricamento da database')
    isLoadingRef.current = true

    setIsLoading(true)
    setError(null)
    try {
      // Query con filtro tipo_ruolo = 'gestore'
      const { data, error } = await supabase
        .from('profiles')
        .select('*, ruoli!id_ruolo(*)')
        .order('cognome', { ascending: true })

      if (error) {
        console.error('[STAFF] Errore query:', error)
        setError(`Errore caricamento staff: ${error.message}`)
        throw error
      }

      // Filtra solo gestori (tipo_ruolo = 'gestore')
      const staffData = (data || [])
        .filter((u: any) => u.ruoli?.tipo_ruolo === 'gestore')
        .map((u: any) => ({
          ...u,
          ruolo: u.ruoli,
          ruoli: undefined
        }))

      console.log('[STAFF] Dati caricati:', staffData.length, 'staff')
      setStaff(staffData as any)
      dataCache.set(CACHE_KEY, staffData)
      hasLoadedRef.current = true
    } catch (err: any) {
      console.error('[STAFF] Errore caricamento staff:', err)
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
    loadStaff()
    loadRuoli()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    setFormData({
      nome: '',
      cognome: '',
      email: '',
      password: '',
      id_ruolo: ruoliDisponibili[0]?.id || 0
    })
    setCreateError(null)
    setCreateModalOpen(true)
  }

  // Crea nuovo staff
  const handleCreateStaff = async () => {
    setCreateError(null)

    // Validazione
    if (!formData.nome.trim()) {
      setCreateError('Il nome è obbligatorio')
      return
    }
    if (!formData.cognome.trim()) {
      setCreateError('Il cognome è obbligatorio')
      return
    }
    if (!formData.email.trim()) {
      setCreateError('L\'email è obbligatoria')
      return
    }
    if (!formData.password || formData.password.length < 8) {
      setCreateError('La password deve essere di almeno 8 caratteri')
      return
    }
    if (!formData.id_ruolo) {
      setCreateError('Seleziona un ruolo')
      return
    }

    setIsCreating(true)

    try {
      // Trova il codice del ruolo selezionato
      const ruoloSelezionato = ruoliDisponibili.find(r => r.id === formData.id_ruolo)

      // Crea utente con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nome: formData.nome,
            cognome: formData.cognome,
            ruolo: ruoloSelezionato?.codice || 'educatore'
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setCreateError('Questa email è già registrata')
        } else {
          setCreateError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setCreateError('Errore durante la creazione dell\'utente')
        return
      }

      // Aggiorna il profilo con id_ruolo corretto (il trigger usa il codice, ma potremmo voler forzare l'ID)
      await supabase
        .from('profiles')
        .update({ id_ruolo: formData.id_ruolo })
        .eq('id', authData.user.id)

      // Chiudi modal e ricarica
      setCreateModalOpen(false)
      dataCache.invalidate(CACHE_KEY)
      loadStaff(true)
    } catch (err: any) {
      console.error('Errore creazione staff:', err)
      setCreateError(err?.message || 'Errore durante la creazione')
    } finally {
      setIsCreating(false)
    }
  }

  // Elimina staff
  const handleDeleteClick = (member: Profile) => {
    setStaffToDelete(member)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return

    try {
      // Elimina da auth.users (cascata su profiles)
      const { error } = await supabase.auth.admin.deleteUser(staffToDelete.id)

      if (error) throw error

      setDeleteModalOpen(false)
      setStaffToDelete(null)
      dataCache.invalidate(CACHE_KEY)
      loadStaff(true)
    } catch (err) {
      console.error('Errore eliminazione staff:', err)
      alert('Errore durante l\'eliminazione dello staff')
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
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <Shield className="h-8 w-8" />
              Gestione Staff
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              Gestisci gli operatori e amministratori del portale
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                dataCache.invalidate(CACHE_KEY)
                loadStaff(true)
              }}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
            >
              <RefreshCw className="h-5 w-5" />
              Aggiorna
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-white text-purple-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
            >
              <Plus className="h-5 w-5" />
              Nuovo Staff
            </button>
          </div>
        </div>
      </div>

      {/* Tabella Staff */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-purple-200 overflow-hidden">
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
                loadStaff()
              }}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition-all"
            >
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Caricamento staff...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">Nessun membro staff presente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
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
                {staff.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`border-b border-gray-200 hover:bg-purple-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {member.nome}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {member.cognome}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {member.email_contatto || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadge role={member.ruolo?.codice || 'utente'} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {member.stato}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(member.ultimo_accesso)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => alert('Funzione in sviluppo: modifica staff')}
                          className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {member.ruolo?.codice !== 'sviluppatore' && (
                          <button
                            onClick={() => handleDeleteClick(member)}
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

      {/* Modal Creazione Staff */}
      {createModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border-4 border-purple-300">
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl p-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Plus className="h-6 w-6" />
                  Nuovo Staff
                </h2>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 space-y-4">
                {createError && (
                  <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{createError}</span>
                  </div>
                )}

                {/* Nome */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Nome *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium"
                      placeholder="Nome"
                    />
                  </div>
                </div>

                {/* Cognome */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Cognome *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <input
                      type="text"
                      value={formData.cognome}
                      onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium"
                      placeholder="Cognome"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium"
                      placeholder="email@esempio.it"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Password * <span className="font-normal text-gray-500">(min. 8 caratteri)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Ruolo */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Ruolo *
                  </label>
                  <select
                    value={formData.id_ruolo}
                    onChange={(e) => setFormData({ ...formData, id_ruolo: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium bg-white"
                  >
                    <option value={0}>Seleziona ruolo...</option>
                    {ruoliDisponibili.map((ruolo) => (
                      <option key={ruolo.id} value={ruolo.id}>
                        {ruolo.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateStaff}
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Crea Staff
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setStaffToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Elimina Staff"
        message={`Sei sicuro di voler eliminare "${staffToDelete?.nome} ${staffToDelete?.cognome}"? Questa azione eliminerà anche l'account dall'autenticazione e non può essere annullata.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
