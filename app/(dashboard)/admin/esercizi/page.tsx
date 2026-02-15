/**
 * Pagina Gestione Esercizi
 * CRUD completo per gli esercizi
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Puzzle, Plus, Pencil, Trash2, RefreshCw, AlertCircle, Play, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { useAuth } from '@/components/auth/auth-provider'
import { StatusBadge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import { EsercizioModal } from '@/components/admin/esercizio-modal'
import type { Esercizio, CategoriaEsercizi } from '@/lib/supabase/types'

interface EsercizioWithCategoria extends Esercizio {
  categoria?: CategoriaEsercizi | null
}

const CACHE_KEY = 'admin:esercizi'

export default function EserciziPage() {
  const { profile } = useAuth()
  const [esercizi, setEsercizi] = useState<EsercizioWithCategoria[]>([])
  const [categorie, setCategorie] = useState<CategoriaEsercizi[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtri
  const [filtroCategoria, setFiltroCategoria] = useState<number | null>(null)
  const [filtroStato, setFiltroStato] = useState<string | null>(null)

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [esercizioToDelete, setEsercizioToDelete] = useState<EsercizioWithCategoria | null>(null)
  const [esercizioModalOpen, setEsercizioModalOpen] = useState(false)
  const [esercizioToEdit, setEsercizioToEdit] = useState<EsercizioWithCategoria | null>(null)

  // Sorting state
  type SortColumn = 'id' | 'nome' | 'categoria' | 'stato' | 'created_at'
  type SortDirection = 'asc' | 'desc'
  const [sortColumn, setSortColumn] = useState<SortColumn>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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
  const loadCategorie = async () => {
    try {
      const { data } = await supabase
        .from('categorie_esercizi')
        .select('*')
        .order('ordine', { ascending: true })

      if (data) setCategorie(data)
    } catch (err) {
      console.error('[ESERCIZI] Errore caricamento categorie:', err)
    }
  }

  // Carica esercizi
  const loadEsercizi = async (forceReload = false) => {
    // Segna che abbiamo tentato il caricamento (previene loop)
    if (!forceReload) {
      hasLoadedRef.current = true
    }

    if (isLoadingRef.current) {
      console.log('[ESERCIZI] Caricamento già in corso, skip')
      return
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<EsercizioWithCategoria[]>(CACHE_KEY)
      if (cached) {
        setEsercizi(cached)
        setIsLoading(false)
        return
      }
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('esercizi')
        .select(`
          *,
          categoria:id_categoria(*)
        `)
        .order('id', { ascending: false })

      if (queryError) {
        setError(`Errore caricamento esercizi: ${queryError.message}`)
        return
      }

      const eserciziData = (data || []).map((e: any) => ({
        ...e,
        categoria: e.categoria
      }))

      setEsercizi(eserciziData)
      dataCache.set(CACHE_KEY, eserciziData)
    } catch (err: any) {
      const isAbortError = err?.message?.includes('AbortError') ||
                          err?.name === 'AbortError'
      if (isAbortError) return
      setError(`Errore: ${err?.message || 'Errore sconosciuto'}`)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current || !canAccess) return
    loadEsercizi()
    loadCategorie()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Apri modal creazione
  const handleOpenCreateModal = () => {
    setEsercizioToEdit(null)
    setEsercizioModalOpen(true)
  }

  // Apri modal modifica
  const handleEditClick = (esercizio: EsercizioWithCategoria) => {
    setEsercizioToEdit(esercizio)
    setEsercizioModalOpen(true)
  }

  // Chiudi modal
  const handleCloseModal = () => {
    setEsercizioModalOpen(false)
    setEsercizioToEdit(null)
  }

  // Successo operazione
  const handleSuccess = () => {
    dataCache.invalidate(CACHE_KEY)
    loadEsercizi(true)
  }

  // Elimina esercizio
  const handleDeleteClick = (esercizio: EsercizioWithCategoria) => {
    setEsercizioToDelete(esercizio)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!esercizioToDelete) return

    try {
      const { error } = await supabase
        .from('esercizi')
        .delete()
        .eq('id', esercizioToDelete.id)

      if (error) throw error

      setDeleteModalOpen(false)
      setEsercizioToDelete(null)
      dataCache.invalidate(CACHE_KEY)
      loadEsercizi(true)
    } catch (err: any) {
      console.error('Errore eliminazione esercizio:', err)
      alert(`Errore durante l'eliminazione: ${err.message}`)
    }
  }

  // Apri esercizio
  const handleOpenExercise = (esercizio: EsercizioWithCategoria) => {
    const categoriaSlug = esercizio.categoria?.slug || 'default'
    const url = `/training_cognitivo/${categoriaSlug}/${esercizio.slug}`
    window.open(url, '_blank')
  }

  // Formatta data
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  // Colori per badge categoria
  const getCategoriaColor = (categoriaNome: string) => {
    const colors: Record<string, string> = {
      'categorizzazione': 'bg-blue-500',
      'sequenze temporali': 'bg-purple-500',
      'sequenze logiche': 'bg-indigo-500',
      'causa effetto': 'bg-green-500',
      'scrivi con le sillabe': 'bg-yellow-500',
      'test memoria': 'bg-pink-500',
      'trascina immagini': 'bg-orange-500',
      'clicca immagine': 'bg-teal-500',
      'strumenti': 'bg-gray-500',
      'coordinazione visuo-motoria': 'bg-red-500',
      'leggo-scrivo': 'bg-cyan-500',
    }
    return colors[categoriaNome.toLowerCase()] || 'bg-gray-500'
  }

  // Filtra e ordina esercizi
  const filteredAndSortedEsercizi = [...esercizi]
    .filter(e => {
      if (filtroCategoria && e.id_categoria !== filtroCategoria) return false
      if (filtroStato && e.stato !== filtroStato) return false
      return true
    })
    .sort((a, b) => {
      let valueA: string | number = ''
      let valueB: string | number = ''

      switch (sortColumn) {
        case 'id':
          valueA = a.id
          valueB = b.id
          break
        case 'nome':
          valueA = a.nome?.toLowerCase() || ''
          valueB = b.nome?.toLowerCase() || ''
          break
        case 'categoria':
          valueA = a.categoria?.nome?.toLowerCase() || ''
          valueB = b.categoria?.nome?.toLowerCase() || ''
          break
        case 'stato':
          valueA = a.stato || ''
          valueB = b.stato || ''
          break
        case 'created_at':
          valueA = a.created_at ? new Date(a.created_at).getTime() : 0
          valueB = b.created_at ? new Date(b.created_at).getTime() : 0
          break
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-lg">
              <Puzzle className="h-8 w-8" />
              Gestione Esercizi
            </h1>
            <p className="text-white/90 mt-2 font-semibold text-lg drop-shadow">
              Gestisci gli esercizi del sistema ({filteredAndSortedEsercizi.length})
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                dataCache.invalidate(CACHE_KEY)
                loadEsercizi(true)
              }}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
            >
              <RefreshCw className="h-5 w-5" />
              Aggiorna
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-white text-rose-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
            >
              <Plus className="h-5 w-5" />
              Nuovo Esercizio
            </button>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Filtra per Categoria:</label>
            <select
              value={filtroCategoria || ''}
              onChange={(e) => setFiltroCategoria(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium bg-white"
            >
              <option value="">Tutte le categorie</option>
              {categorie.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Filtra per Stato:</label>
            <select
              value={filtroStato || ''}
              onChange={(e) => setFiltroStato(e.target.value || null)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium bg-white"
            >
              <option value="">Tutti gli stati</option>
              <option value="attivo">Attivo</option>
              <option value="bozza">Bozza</option>
              <option value="archiviato">Archiviato</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabella Esercizi */}
      <div className="bg-white rounded-3xl shadow-xl border-4 border-rose-200 overflow-hidden">
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
                loadEsercizi()
              }}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all"
            >
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Caricamento esercizi...</p>
          </div>
        ) : filteredAndSortedEsercizi.length === 0 ? (
          <div className="p-12 text-center">
            <Puzzle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">Nessun esercizio trovato</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all"
            >
              <Plus className="h-5 w-5 inline mr-2" />
              Crea il primo esercizio
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                  <th
                    className="px-4 py-4 text-center text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors w-16"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      ID
                      <SortIcon column="id" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-2">
                      Nome Esercizio
                      <SortIcon column="nome" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('categoria')}
                  >
                    <div className="flex items-center gap-2">
                      Categoria
                      <SortIcon column="categoria" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase">
                    Descrizione
                  </th>
                  <th
                    className="px-4 py-4 text-center text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('stato')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Stato
                      <SortIcon column="stato" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-center text-sm font-black uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Data Creazione
                      <SortIcon column="created_at" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase w-16">
                    Link
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase w-28">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEsercizi.map((esercizio, index) => (
                  <tr
                    key={esercizio.id}
                    className={`border-b border-gray-200 hover:bg-rose-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-4 text-center font-bold text-gray-600">
                      {esercizio.id}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-gray-900">{esercizio.nome}</span>
                    </td>
                    <td className="px-4 py-4">
                      {esercizio.categoria ? (
                        <span className={`${getCategoriaColor(esercizio.categoria.nome)} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                          {esercizio.categoria.nome}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 max-w-md">
                      <span className="line-clamp-2">{esercizio.descrizione || '-'}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={esercizio.stato} />
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">
                      {formatDate(esercizio.created_at)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleOpenExercise(esercizio)}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                        title="Apri esercizio"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(esercizio)}
                          className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(esercizio)}
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

      {/* Modal Creazione/Modifica Esercizio */}
      <EsercizioModal
        isOpen={esercizioModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        esercizio={esercizioToEdit}
        categorie={categorie}
      />

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setEsercizioToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Elimina Esercizio"
        message={`Sei sicuro di voler eliminare l'esercizio "${esercizioToDelete?.nome}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
