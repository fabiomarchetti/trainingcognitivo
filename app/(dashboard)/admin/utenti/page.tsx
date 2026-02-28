/**
 * Pagina Gestione Utenti - Pazienti/Fruitori dell'applicazione
 * Accessibile a: sviluppatore, responsabile_centro, educatore
 * Gli educatori vedono solo i propri utenti assegnati
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Pencil, Trash2, RefreshCw, AlertCircle, UserPlus, Link2, ArrowUpDown, ArrowUp, ArrowDown, Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { useAuth } from '@/components/auth/auth-provider'
import { StatusBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import { UtenteModal } from '@/components/admin/utente-modal'
import type { ProfileWithRelations, Sede, Settore, Classe, Ruolo } from '@/lib/supabase/types'

type Profile = ProfileWithRelations

const CACHE_KEY = 'admin:utenti'

export default function UtentiPage() {
  const { profile, user, isLoading: isAuthLoading } = useAuth()
  const [utenti, setUtenti] = useState<Profile[]>([])
  const [sedi, setSedi] = useState<Sede[]>([])
  const [settori, setSettori] = useState<Settore[]>([])
  const [classi, setClassi] = useState<Classe[]>([])
  const [ruoloUtente, setRuoloUtente] = useState<Ruolo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [utenteToDelete, setUtenteToDelete] = useState<Profile | null>(null)
  const [utenteModalOpen, setUtenteModalOpen] = useState(false)
  const [utenteToEdit, setUtenteToEdit] = useState<Profile | null>(null)

  // Import da Aruba
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  // Sorting state
  type SortColumn = 'nome' | 'cognome' | 'sede' | 'settore' | 'classe' | 'stato' | 'ultimo_accesso'
  type SortDirection = 'asc' | 'desc'
  const [sortColumn, setSortColumn] = useState<SortColumn>('cognome')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  // Carica dati di supporto (sedi, settori, classi, ruolo utente)
  const loadSupportData = async () => {
    try {
      const [sediRes, settoriRes, classiRes, ruoloRes] = await Promise.all([
        supabase.from('sedi').select('*').eq('stato', 'attiva').order('nome'),
        supabase.from('settori').select('*').eq('stato', 'attivo').order('ordine'),
        supabase.from('classi').select('*').eq('stato', 'attiva').order('ordine'),
        supabase.from('ruoli').select('*').eq('codice', 'utente').single()
      ])

      if (sediRes.data) setSedi(sediRes.data)
      if (settoriRes.data) setSettori(settoriRes.data)
      if (classiRes.data) setClassi(classiRes.data)
      if (ruoloRes.data) setRuoloUtente(ruoloRes.data)
    } catch (err) {
      console.error('[UTENTI] Errore caricamento dati supporto:', err)
    }
  }

  // Carica utenti (solo tipo_ruolo = 'paziente')
  const loadUtenti = async (forceReload = false) => {
    if (isLoadingRef.current) {
      console.log('[UTENTI] Caricamento già in corso, skip')
      return
    }

    // Segna che abbiamo tentato il caricamento (previene loop)
    if (!forceReload) {
      hasLoadedRef.current = true
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<Profile[]>(CACHE_KEY)
      if (cached) {
        console.log('[UTENTI] Dati trovati in cache:', cached.length, 'utenti')
        setUtenti(cached)
        setIsLoading(false)
        return
      }
    }

    console.log('[UTENTI] Inizio caricamento da database')
    isLoadingRef.current = true

    setIsLoading(true)
    setError(null)
    try {
      // Query con join per sedi, settori, classi
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          ruoli!id_ruolo(*),
          sedi:id_sede(id, nome),
          settori:id_settore(id, nome),
          classi:id_classe(id, nome)
        `)
        .order('cognome', { ascending: true })

      if (error) {
        console.error('[UTENTI] Errore query:', error)
        setError(`Errore caricamento utenti: ${error.message}`)
        throw error
      }

      // Filtra solo pazienti (tipo_ruolo = 'paziente') e non eliminati
      let utentiData = (data || [])
        .filter((u: any) => u.ruoli?.tipo_ruolo === 'paziente' && u.stato !== 'eliminato')
        .map((u: any) => ({
          ...u,
          ruolo: u.ruoli,
          sede: u.sedi,
          settore: u.settori,
          classe: u.classi,
          ruoli: undefined,
          sedi: undefined,
          settori: undefined,
          classi: undefined
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
    } catch (err: any) {
      // Ignora AbortError
      const isAbortError = err?.message?.includes('AbortError') ||
                          err?.name === 'AbortError' ||
                          err?.details?.includes('AbortError')

      if (isAbortError) {
        console.log('[UTENTI] AbortError ignorato')
        return
      }
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
    if (isAuthLoading) return
    if (hasLoadedRef.current || !canAccess) return
    loadUtenti()
    loadSupportData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, profile])

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    setUtenteToEdit(null)
    setUtenteModalOpen(true)
  }

  // Apri modal modifica
  const handleEditClick = (utente: Profile) => {
    setUtenteToEdit(utente)
    setUtenteModalOpen(true)
  }

  // Chiudi modal
  const handleCloseModal = () => {
    setUtenteModalOpen(false)
    setUtenteToEdit(null)
  }

  // Successo operazione
  const handleSuccess = () => {
    dataCache.invalidate(CACHE_KEY)
    loadUtenti(true)
  }

  // Importa utenti da Aruba
  const handleImportAruba = async () => {
    setIsImporting(true)
    setImportResult(null)

    try {
      const response = await fetch('/api/seed/utenti', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setImportResult({
          success: true,
          message: data.message
        })
        // Ricarica la lista
        dataCache.invalidate(CACHE_KEY)
        loadUtenti(true)
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Errore durante l\'importazione'
        })
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err?.message || 'Errore di connessione'
      })
    } finally {
      setIsImporting(false)
      // Nascondi il messaggio dopo 5 secondi
      setTimeout(() => setImportResult(null), 5000)
    }
  }

  // Elimina utente
  const handleDeleteClick = (utente: Profile) => {
    setUtenteToDelete(utente)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!utenteToDelete) return

    try {
      // Elimina fisicamente l'utente tramite API admin
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: utenteToDelete.id })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }

      setDeleteModalOpen(false)
      setUtenteToDelete(null)
      dataCache.invalidate(CACHE_KEY)
      loadUtenti(true)
    } catch (err: any) {
      console.error('Errore eliminazione utente:', err)
      alert(`Errore durante l'eliminazione: ${err.message}`)
    }
  }

  // Formatta data
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('it-IT')
  }

  // Gestione ordinamento
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Icona ordinamento
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />
  }

  // Utenti ordinati
  const sortedUtenti = [...utenti].sort((a, b) => {
    let valueA: string | number | null = null
    let valueB: string | number | null = null

    switch (sortColumn) {
      case 'nome':
        valueA = a.nome?.toLowerCase() || ''
        valueB = b.nome?.toLowerCase() || ''
        break
      case 'cognome':
        valueA = a.cognome?.toLowerCase() || ''
        valueB = b.cognome?.toLowerCase() || ''
        break
      case 'sede':
        valueA = (a as any).sede?.nome?.toLowerCase() || ''
        valueB = (b as any).sede?.nome?.toLowerCase() || ''
        break
      case 'settore':
        valueA = (a as any).settore?.nome?.toLowerCase() || ''
        valueB = (b as any).settore?.nome?.toLowerCase() || ''
        break
      case 'classe':
        valueA = (a as any).classe?.nome?.toLowerCase() || ''
        valueB = (b as any).classe?.nome?.toLowerCase() || ''
        break
      case 'stato':
        valueA = a.stato || ''
        valueB = b.stato || ''
        break
      case 'ultimo_accesso':
        valueA = a.ultimo_accesso ? new Date(a.ultimo_accesso).getTime() : 0
        valueB = b.ultimo_accesso ? new Date(b.ultimo_accesso).getTime() : 0
        break
    }

    if (valueA === null || valueA === '') return 1
    if (valueB === null || valueB === '') return -1

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

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
                ? `I tuoi utenti assegnati (${utenti.length})`
                : `Gestisci gli utenti/pazienti del sistema (${utenti.length})`
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
            {ruoloCodice === 'sviluppatore' && (
              <button
                onClick={handleImportAruba}
                disabled={isImporting}
                className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Importazione...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Importa da Aruba
                  </>
                )}
              </button>
            )}
            {canCreate && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-5 py-3 bg-white text-teal-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
              >
                <UserPlus className="h-5 w-5" />
                Nuovo Utente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messaggio risultato import */}
      {importResult && (
        <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${
          importResult.success
            ? 'bg-green-100 border-green-400 text-green-800'
            : 'bg-red-100 border-red-400 text-red-800'
        }`}>
          {importResult.success ? (
            <Download className="h-6 w-6" />
          ) : (
            <AlertCircle className="h-6 w-6" />
          )}
          <span className="font-bold">{importResult.message}</span>
        </div>
      )}

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
                onClick={handleOpenCreateModal}
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
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('cognome')}
                  >
                    <div className="flex items-center gap-2">
                      Cognome
                      <SortIcon column="cognome" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-2">
                      Nome
                      <SortIcon column="nome" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('sede')}
                  >
                    <div className="flex items-center gap-2">
                      Sede
                      <SortIcon column="sede" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('settore')}
                  >
                    <div className="flex items-center gap-2">
                      Settore
                      <SortIcon column="settore" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('classe')}
                  >
                    <div className="flex items-center gap-2">
                      Classe
                      <SortIcon column="classe" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('stato')}
                  >
                    <div className="flex items-center gap-2">
                      Stato
                      <SortIcon column="stato" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('ultimo_accesso')}
                  >
                    <div className="flex items-center gap-2">
                      Ultimo Accesso
                      <SortIcon column="ultimo_accesso" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedUtenti.map((utente, index) => (
                  <tr
                    key={utente.id}
                    className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {utente.cognome}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      {utente.nome}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {(utente as any).sede?.nome || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {(utente as any).settore?.nome || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {(utente as any).classe?.nome || '-'}
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
                          onClick={() => handleEditClick(utente)}
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

      {/* Modal Creazione/Modifica Utente */}
      <UtenteModal
        isOpen={utenteModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        utente={utenteToEdit}
        sedi={sedi}
        settori={settori}
        classi={classi}
        idRuoloUtente={ruoloUtente?.id || 0}
      />

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setUtenteToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Elimina Utente"
        message={`Sei sicuro di voler eliminare l'utente "${utenteToDelete?.cognome} ${utenteToDelete?.nome}"? L'utente verrà disattivato e non potrà più accedere.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
