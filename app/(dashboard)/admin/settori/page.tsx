/**
 * Pagina Gestione Settori e Classi
 */
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dataCache } from '@/lib/cache/data-cache'
import { ConfirmModal } from '@/components/ui/modal'
import { SettoreModal } from '@/components/admin/settore-modal'
import { ClasseModal } from '@/components/admin/classe-modal'
import type { Database } from '@/lib/supabase/types'

type Settore = Database['public']['Tables']['settori']['Row']
type Classe = Database['public']['Tables']['classi']['Row']

const CACHE_KEY_SEDI = 'admin:sedi'
const CACHE_KEY_SETTORI = 'admin:settori'
const CACHE_KEY_CLASSI = 'admin:classi'

interface SettoreWithCount extends Settore {
  classi_count: number
  sede_nome: string | null
}

interface ClasseWithSettore extends Classe {
  settore_nome: string
}

type Sede = Database['public']['Tables']['sedi']['Row']

export default function SettoriPage() {
  // NON usiamo più auth - RLS pubblica permette lettura
  const [settori, setSettori] = useState<SettoreWithCount[]>([])
  const [classi, setClassi] = useState<ClasseWithSettore[]>([])
  const [sedi, setSedi] = useState<Sede[]>([])
  const [isLoadingSettori, setIsLoadingSettori] = useState(true)
  const [isLoadingClassi, setIsLoadingClassi] = useState(true)

  // Filtri
  const [filtroSedeId, setFiltroSedeId] = useState<number | 'all' | 'null'>('all')

  // Settori modal states
  const [isSettoreModalOpen, setIsSettoreModalOpen] = useState(false)
  const [selectedSettore, setSelectedSettore] = useState<Settore | null>(null)
  const [deleteSettoreModalOpen, setDeleteSettoreModalOpen] = useState(false)
  const [settoreToDelete, setSettoreToDelete] = useState<Settore | null>(null)

  // Classi modal states
  const [isClasseModalOpen, setIsClasseModalOpen] = useState(false)
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null)
  const [deleteClasseModalOpen, setDeleteClasseModalOpen] = useState(false)
  const [classeToDelete, setClasseToDelete] = useState<Classe | null>(null)
  // Usa direttamente createClient() - è un singleton, non serve useRef
  const supabase = createClient()
  const isLoadingSettoriRef = useRef(false)
  const isLoadingClassiRef = useRef(false)
  const hasLoadedSettoriRef = useRef(false)
  const hasLoadedClassiRef = useRef(false)
  const hasLoadedSediRef = useRef(false)

  // Carica sedi
  const loadSedi = async () => {
    if (hasLoadedSediRef.current) return

    // Controlla cache
    const cached = dataCache.get<Sede[]>(CACHE_KEY_SEDI)
    if (cached) {
      console.log('[SETTORI/SEDI] Dati trovati in cache')
      setSedi(cached)
      hasLoadedSediRef.current = true
      return
    }

    try {
      const { data, error } = await supabase
        .from('sedi')
        .select('*')
        .order('nome', { ascending: true })

      if (error) throw error

      const sedeData = data || []
      setSedi(sedeData)
      dataCache.set(CACHE_KEY_SEDI, sedeData)
      hasLoadedSediRef.current = true
    } catch (err) {
      console.error('[SEDI] Errore caricamento sedi:', err)
    }
  }

  // Carica settori con conteggio classi
  const loadSettori = async (forceReload = false) => {
    if (isLoadingSettoriRef.current) {
      console.log('[SETTORI] Caricamento già in corso, skip')
      return
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<SettoreWithCount[]>(CACHE_KEY_SETTORI)
      if (cached) {
        console.log('[SETTORI] Dati trovati in cache:', cached.length, 'settori')
        setSettori(cached)
        setIsLoadingSettori(false)
        hasLoadedSettoriRef.current = true
        return
      }
    }

    // NON verificare session - RLS pubblica permette lettura
    console.log('[SETTORI] Inizio caricamento da database (RLS pubblica)')
    isLoadingSettoriRef.current = true

    setIsLoadingSettori(true)
    try {
      // Query 1: Ottieni tutti i settori con nome sede
      const { data: settoriData, error: settoriError } = await supabase
        .from('settori')
        .select(`
          *,
          sedi:id_sede (
            nome
          )
        `)
        .order('ordine', { ascending: true })
        .order('nome', { ascending: true })

      if (settoriError) {
        console.error('[SETTORI] Errore query settori:', settoriError)
        throw settoriError
      }

      // Query 2: Conta le classi per ogni settore
      const { data: classiData, error: classiError } = await supabase
        .from('classi')
        .select('id_settore')

      if (classiError) {
        console.error('[SETTORI] Errore query classi count:', classiError)
        throw classiError
      }

      // Combina i risultati
      const classiCounts = classiData?.reduce((acc: Record<number, number>, classe: { id_settore: number | null }) => {
        if (classe.id_settore !== null) {
          acc[classe.id_settore] = (acc[classe.id_settore] || 0) + 1
        }
        return acc
      }, {} as Record<number, number>) || {}

      const settoriWithCount = (settoriData || []).map((s: any) => ({
        ...s,
        classi_count: classiCounts[s.id] || 0,
        sede_nome: s.sedi?.nome || null,
      }))

      console.log('[SETTORI] Dati caricati:', settoriWithCount.length, 'settori')
      setSettori(settoriWithCount)
      dataCache.set(CACHE_KEY_SETTORI, settoriWithCount)
      hasLoadedSettoriRef.current = true
    } catch (err) {
      console.error('[SETTORI] Errore caricamento settori:', err)
    } finally {
      setIsLoadingSettori(false)
      isLoadingSettoriRef.current = false
      console.log('[SETTORI] Fine caricamento')
    }
  }

  // Carica classi con nome settore
  const loadClassi = async (forceReload = false) => {
    if (isLoadingClassiRef.current) {
      console.log('[CLASSI] Caricamento già in corso, skip')
      return
    }

    // Controlla cache
    if (!forceReload) {
      const cached = dataCache.get<ClasseWithSettore[]>(CACHE_KEY_CLASSI)
      if (cached) {
        console.log('[CLASSI] Dati trovati in cache:', cached.length, 'classi')
        setClassi(cached)
        setIsLoadingClassi(false)
        hasLoadedClassiRef.current = true
        return
      }
    }

    // NON verificare session - RLS pubblica permette lettura
    console.log('[CLASSI] Inizio caricamento da database (RLS pubblica)')
    isLoadingClassiRef.current = true

    setIsLoadingClassi(true)
    try {
      // Query 1: Ottieni tutte le classi
      const { data: classiData, error: classiError } = await supabase
        .from('classi')
        .select('*')
        .order('ordine', { ascending: true })
        .order('nome', { ascending: true })

      if (classiError) {
        console.error('[CLASSI] Errore query classi:', classiError)
        throw classiError
      }

      // Query 2: Ottieni tutti i settori
      const { data: settoriData, error: settoriError } = await supabase
        .from('settori')
        .select('id, nome')

      if (settoriError) {
        console.error('[CLASSI] Errore query settori:', settoriError)
        throw settoriError
      }

      // Crea mappa settori per lookup veloce
      const settoriMap = settoriData?.reduce((acc: Record<number, string>, settore: { id: number; nome: string }) => {
        acc[settore.id] = settore.nome
        return acc
      }, {} as Record<number, string>) || {}

      // Combina i risultati
      const classiWithSettore = (classiData || []).map((c: Classe) => ({
        ...c,
        settore_nome: settoriMap[c.id_settore ?? 0] || '-',
      }))

      console.log('[CLASSI] Dati caricati:', classiWithSettore.length, 'classi')
      setClassi(classiWithSettore)
      dataCache.set(CACHE_KEY_CLASSI, classiWithSettore)
      hasLoadedClassiRef.current = true
    } catch (err) {
      console.error('[CLASSI] Errore caricamento classi:', err)
    } finally {
      setIsLoadingClassi(false)
      isLoadingClassiRef.current = false
      console.log('[CLASSI] Fine caricamento')
    }
  }

  // Filtra settori in base alla sede selezionata
  const settoriFiltrati = useMemo(() => {
    if (filtroSedeId === 'all') {
      return settori
    }
    if (filtroSedeId === 'null') {
      return settori.filter(s => !s.id_sede)
    }
    return settori.filter(s => s.id_sede === filtroSedeId)
  }, [settori, filtroSedeId])

  useEffect(() => {
    console.log('[SETTORI/CLASSI] useEffect - Mount/Update')

    // NON attendere auth - RLS pubblica permette lettura
    // Carica immediatamente se non già caricato

    if (!hasLoadedSediRef.current) {
      loadSedi()
    }

    if (!hasLoadedSettoriRef.current) {
      console.log('[SETTORI/CLASSI] Chiamata loadSettori')
      loadSettori()
    }

    if (!hasLoadedClassiRef.current) {
      console.log('[SETTORI/CLASSI] Chiamata loadClassi')
      loadClassi()
    }

    return () => {
      console.log('[SETTORI/CLASSI] useEffect cleanup')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Settori handlers
  const handleNewSettore = () => {
    setSelectedSettore(null)
    setIsSettoreModalOpen(true)
  }

  const handleEditSettore = (settore: Settore) => {
    setSelectedSettore(settore)
    setIsSettoreModalOpen(true)
  }

  const handleDeleteSettoreClick = (settore: Settore) => {
    setSettoreToDelete(settore)
    setDeleteSettoreModalOpen(true)
  }

  const handleDeleteSettoreConfirm = async () => {
    if (!settoreToDelete) return

    try {
      const { error } = await supabase
        .from('settori')
        .delete()
        .eq('id', settoreToDelete.id)

      if (error) throw error

      setDeleteSettoreModalOpen(false)
      setSettoreToDelete(null)
      // Invalida cache e ricarica
      dataCache.invalidate(CACHE_KEY_SETTORI)
      dataCache.invalidate(CACHE_KEY_CLASSI)
      loadSettori(true)
      loadClassi(true)
    } catch (err) {
      console.error('Errore eliminazione settore:', err)
      alert('Errore durante l\'eliminazione del settore')
    }
  }

  // Classi handlers
  const handleNewClasse = () => {
    setSelectedClasse(null)
    setIsClasseModalOpen(true)
  }

  const handleEditClasse = (classe: Classe) => {
    setSelectedClasse(classe)
    setIsClasseModalOpen(true)
  }

  const handleDeleteClasseClick = (classe: Classe) => {
    setClasseToDelete(classe)
    setDeleteClasseModalOpen(true)
  }

  const handleDeleteClasseConfirm = async () => {
    if (!classeToDelete) return

    try {
      const { error } = await supabase
        .from('classi')
        .delete()
        .eq('id', classeToDelete.id)

      if (error) throw error

      setDeleteClasseModalOpen(false)
      setClasseToDelete(null)
      // Invalida cache e ricarica
      dataCache.invalidate(CACHE_KEY_CLASSI)
      dataCache.invalidate(CACHE_KEY_SETTORI)
      loadClassi(true)
      loadSettori(true)
    } catch (err) {
      console.error('Errore eliminazione classe:', err)
      alert('Errore durante l\'eliminazione della classe')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ========== CARD SETTORI ========== */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
        {/* Header Settori */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">Gestione Settori</h2>
            <button
              onClick={handleNewSettore}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuovo Settore
            </button>
          </div>
          {/* Filtro Sede */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filtra per sede:</label>
            <select
              value={filtroSedeId}
              onChange={(e) => {
                const val = e.target.value
                setFiltroSedeId(val === 'all' ? 'all' : val === 'null' ? 'null' : Number(val))
              }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">Tutte le sedi ({settori.length})</option>
              {sedi.map(sede => {
                const count = settori.filter(s => s.id_sede === sede.id).length
                return (
                  <option key={sede.id} value={sede.id}>
                    {sede.nome} ({count})
                  </option>
                )
              })}
              <option value="null">Senza sede ({settori.filter(s => !s.id_sede).length})</option>
            </select>
          </div>
        </div>

        {/* Tabella Settori */}
        <div>
          {isLoadingSettori ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto" />
            </div>
          ) : settoriFiltrati.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {settori.length === 0
                ? 'Nessun settore presente'
                : 'Nessun settore trovato con il filtro selezionato'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Settore</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Sede</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Utilizzi</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settoriFiltrati.map((settore) => (
                  <tr key={settore.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{settore.nome}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {settore.sede_nome || <span className="text-gray-400 italic">Non assegnata</span>}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 bg-cyan-400 text-white rounded-full font-semibold text-xs">
                        {settore.classi_count}
                      </span>
                      <span className="text-gray-600 ml-2">utilizzi</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditSettore(settore)}
                          className="p-1.5 border border-blue-500 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSettoreClick(settore)}
                          className="p-1.5 border border-red-500 text-red-500 hover:bg-red-50 rounded transition-colors"
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
          )}
        </div>
      </div>

      {/* ========== CARD CLASSI ========== */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
        {/* Header Classi */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Gestione Classi</h2>
          <button
            onClick={handleNewClasse}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuova Classe
          </button>
        </div>

        {/* Tabella Classi */}
        <div>
          {isLoadingClassi ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto" />
            </div>
          ) : classi.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nessuna classe presente
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Classe</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Settore</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Utilizzi</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classi.map((classe) => (
                  <tr key={classe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{classe.nome}</td>
                    <td className="px-6 py-3">
                      <span className="inline-block px-3 py-1 bg-gray-600 text-white rounded-full text-xs font-medium">
                        {classe.settore_nome}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 bg-cyan-400 text-white rounded-full font-semibold text-xs">
                        0
                      </span>
                      <span className="text-gray-600 ml-2">utilizzi</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClasse(classe)}
                          className="p-1.5 border border-blue-500 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClasseClick(classe)}
                          className="p-1.5 border border-red-500 text-red-500 hover:bg-red-50 rounded transition-colors"
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
          )}
        </div>
      </div>

      {/* Modal Settori */}
      <SettoreModal
        isOpen={isSettoreModalOpen}
        onClose={() => {
          setIsSettoreModalOpen(false)
          setSelectedSettore(null)
        }}
        onSuccess={() => {
          dataCache.invalidate(CACHE_KEY_SETTORI)
          dataCache.invalidate(CACHE_KEY_CLASSI)
          loadSettori(true)
          loadClassi(true)
        }}
        settore={selectedSettore}
        sedi={sedi}
      />

      <ConfirmModal
        isOpen={deleteSettoreModalOpen}
        onClose={() => {
          setDeleteSettoreModalOpen(false)
          setSettoreToDelete(null)
        }}
        onConfirm={handleDeleteSettoreConfirm}
        title="Elimina Settore"
        message={`Sei sicuro di voler eliminare il settore "${settoreToDelete?.nome}"? Questa azione eliminerà anche tutte le classi associate.`}
        confirmText="Elimina"
        variant="danger"
      />

      {/* Modal Classi */}
      <ClasseModal
        isOpen={isClasseModalOpen}
        onClose={() => {
          setIsClasseModalOpen(false)
          setSelectedClasse(null)
        }}
        onSuccess={() => {
          dataCache.invalidate(CACHE_KEY_CLASSI)
          dataCache.invalidate(CACHE_KEY_SETTORI)
          loadClassi(true)
          loadSettori(true)
        }}
        classe={selectedClasse}
        settori={settori}
      />

      <ConfirmModal
        isOpen={deleteClasseModalOpen}
        onClose={() => {
          setDeleteClasseModalOpen(false)
          setClasseToDelete(null)
        }}
        onConfirm={handleDeleteClasseConfirm}
        title="Elimina Classe"
        message={`Sei sicuro di voler eliminare la classe "${classeToDelete?.nome}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        variant="danger"
      />
    </div>
  )
}
