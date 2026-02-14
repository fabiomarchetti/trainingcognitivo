/**
 * Pagina Gestione Categorie Esercizi
 * CRUD completo per le categorie
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, RefreshCw, AlertCircle, Download, Loader2, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { useAuth } from '@/components/auth/auth-provider'
import { ConfirmModal } from '@/components/ui/modal'
import { CategoriaModal } from '@/components/admin/categoria-modal'
import type { CategoriaEsercizi } from '@/lib/supabase/types'

const CACHE_KEY = 'admin:categorie'

export default function CategoriePage() {
  const { profile } = useAuth()
  const [categorie, setCategorie] = useState<CategoriaEsercizi[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoriaToDelete, setCategoriaToDelete] = useState<CategoriaEsercizi | null>(null)
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false)
  const [categoriaToEdit, setCategoriaToEdit] = useState<CategoriaEsercizi | null>(null)

  // Import da Aruba
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  // Sorting state
  type SortColumn = 'nome' | 'descrizione' | 'ordine'
  type SortDirection = 'asc' | 'desc'
  const [sortColumn, setSortColumn] = useState<SortColumn>('ordine')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const supabase = createClient()
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const ruoloCodice = profile?.ruolo?.codice

  // Ruoli che possono accedere a questa pagina
  const ruoliAutorizzati = ['sviluppatore', 'responsabile_centro']
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

  // Carica categorie
  const loadCategorie = async (forceReload = false) => {
    if (isLoadingRef.current) {
      console.log('[CATEGORIE] Caricamento già in corso, skip')
      return
    }

    // Segna che abbiamo tentato il caricamento (previene loop)
    if (!forceReload) {
      hasLoadedRef.current = true
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<CategoriaEsercizi[]>(CACHE_KEY)
      if (cached) {
        console.log('[CATEGORIE] Dati trovati in cache')
        setCategorie(cached)
        setIsLoading(false)
        return
      }
    }

    console.log('[CATEGORIE] Inizio caricamento da database')
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('categorie_esercizi')
        .select('*')
        .order('ordine', { ascending: true })

      if (queryError) {
        console.error('[CATEGORIE] Errore query:', queryError)
        setError(`Errore caricamento categorie: ${queryError.message}`)
        return
      }

      console.log('[CATEGORIE] Dati caricati:', data?.length || 0, 'categorie')
      setCategorie(data || [])
      dataCache.set(CACHE_KEY, data || [])
    } catch (err: any) {
      const isAbortError = err?.message?.includes('AbortError') ||
                          err?.name === 'AbortError' ||
                          err?.details?.includes('AbortError')
      if (isAbortError) {
        console.log('[CATEGORIE] AbortError ignorato')
        return
      }
      console.error('[CATEGORIE] Errore:', err)
      setError(`Errore: ${err?.message || 'Errore sconosciuto'}`)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return
    if (!canAccess) return
    loadCategorie()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    setCategoriaToEdit(null)
    setCategoriaModalOpen(true)
  }

  // Apri modal modifica
  const handleEditClick = (categoria: CategoriaEsercizi) => {
    setCategoriaToEdit(categoria)
    setCategoriaModalOpen(true)
  }

  // Chiudi modal
  const handleCloseModal = () => {
    setCategoriaModalOpen(false)
    setCategoriaToEdit(null)
  }

  // Successo operazione
  const handleSuccess = () => {
    dataCache.invalidate(CACHE_KEY)
    loadCategorie(true)
  }

  // Importa categorie da Aruba
  const handleImportAruba = async () => {
    setIsImporting(true)
    setImportResult(null)

    try {
      const response = await fetch('/api/seed/categorie', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setImportResult({
          success: true,
          message: data.message
        })
        dataCache.invalidate(CACHE_KEY)
        loadCategorie(true)
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
      setTimeout(() => setImportResult(null), 5000)
    }
  }

  // Elimina categoria
  const handleDeleteClick = (categoria: CategoriaEsercizi) => {
    setCategoriaToDelete(categoria)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoriaToDelete) return

    try {
      const { error } = await supabase
        .from('categorie_esercizi')
        .delete()
        .eq('id', categoriaToDelete.id)

      if (error) throw error

      setDeleteModalOpen(false)
      setCategoriaToDelete(null)
      dataCache.invalidate(CACHE_KEY)
      loadCategorie(true)
    } catch (err: any) {
      console.error('Errore eliminazione categoria:', err)
      alert(`Errore durante l'eliminazione: ${err.message}`)
    }
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

  // Categorie ordinate
  const sortedCategorie = [...categorie].sort((a, b) => {
    let valueA: string | number = ''
    let valueB: string | number = ''

    switch (sortColumn) {
      case 'nome':
        valueA = a.nome?.toLowerCase() || ''
        valueB = b.nome?.toLowerCase() || ''
        break
      case 'descrizione':
        valueA = a.descrizione?.toLowerCase() || ''
        valueB = b.descrizione?.toLowerCase() || ''
        break
      case 'ordine':
        valueA = a.ordine || 0
        valueB = b.ordine || 0
        break
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <FolderOpen className="h-8 w-8" />
              Categorie Esercizi
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              Gestisci le categorie degli esercizi ({categorie.length})
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                dataCache.invalidate(CACHE_KEY)
                loadCategorie(true)
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
                className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-white text-orange-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
            >
              <Plus className="h-5 w-5" />
              Nuova Categoria
            </button>
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

      {/* Tabella Categorie */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-orange-200 overflow-hidden">
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
                loadCategorie()
              }}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all"
            >
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Caricamento categorie...</p>
          </div>
        ) : categorie.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">Nessuna categoria presente</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all"
            >
              <Plus className="h-5 w-5 inline mr-2" />
              Crea la prima categoria
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <th className="px-4 py-4 text-center text-sm font-black uppercase w-16">
                    #
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
                    onClick={() => handleSort('descrizione')}
                  >
                    <div className="flex items-center gap-2">
                      Descrizione
                      <SortIcon column="descrizione" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-center text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors w-24"
                    onClick={() => handleSort('ordine')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Ordine
                      <SortIcon column="ordine" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase w-32">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategorie.map((categoria, index) => (
                  <tr
                    key={categoria.id}
                    className={`border-b border-gray-200 hover:bg-orange-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full font-bold text-sm">
                        {categoria.ordine}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-gray-900">{categoria.nome}</span>
                      {categoria.slug && (
                        <span className="block text-xs text-gray-400 font-mono mt-0.5">{categoria.slug}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-md">
                      <span className="line-clamp-2">{categoria.descrizione || '-'}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600 font-medium">
                      {categoria.ordine}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(categoria)}
                          className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(categoria)}
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

      {/* Modal Creazione/Modifica Categoria */}
      <CategoriaModal
        isOpen={categoriaModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        categoria={categoriaToEdit}
        nextOrdine={categorie.length + 1}
      />

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setCategoriaToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Elimina Categoria"
        message={`Sei sicuro di voler eliminare la categoria "${categoriaToDelete?.nome}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
