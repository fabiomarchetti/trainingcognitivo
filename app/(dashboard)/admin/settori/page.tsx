/**
 * Pagina Gestione Settori e Classi
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmModal } from '@/components/ui/modal'
import { SettoreModal } from '@/components/admin/settore-modal'
import { ClasseModal } from '@/components/admin/classe-modal'
import type { Database } from '@/lib/supabase/types'

type Settore = Database['public']['Tables']['settori']['Row']
type Classe = Database['public']['Tables']['classi']['Row']

interface SettoreWithCount extends Settore {
  classi_count: number
}

interface ClasseWithSettore extends Classe {
  settore_nome: string
}

export default function SettoriPage() {
  const [settori, setSettori] = useState<SettoreWithCount[]>([])
  const [classi, setClassi] = useState<ClasseWithSettore[]>([])
  const [isLoadingSettori, setIsLoadingSettori] = useState(true)
  const [isLoadingClassi, setIsLoadingClassi] = useState(true)

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
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  // Carica settori con conteggio classi
  const loadSettori = useCallback(async () => {
    setIsLoadingSettori(true)
    try {
      // Query 1: Ottieni tutti i settori
      const { data: settoriData, error: settoriError } = await supabase
        .from('settori')
        .select('*')
        .order('ordine', { ascending: true })
        .order('nome', { ascending: true })

      if (settoriError) throw settoriError

      // Query 2: Conta le classi per ogni settore
      const { data: classiData, error: classiError } = await supabase
        .from('classi')
        .select('id_settore')

      if (classiError) throw classiError

      // Combina i risultati
      const classiCounts = classiData?.reduce((acc, classe) => {
        acc[classe.id_settore] = (acc[classe.id_settore] || 0) + 1
        return acc
      }, {} as Record<number, number>) || {}

      const settoriWithCount = (settoriData || []).map(s => ({
        ...s,
        classi_count: classiCounts[s.id] || 0,
      }))

      setSettori(settoriWithCount)
    } catch (err) {
      console.error('Errore caricamento settori:', err)
    } finally {
      setIsLoadingSettori(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carica classi con nome settore
  const loadClassi = useCallback(async () => {
    setIsLoadingClassi(true)
    try {
      // Query 1: Ottieni tutte le classi
      const { data: classiData, error: classiError } = await supabase
        .from('classi')
        .select('*')
        .order('ordine', { ascending: true })
        .order('nome', { ascending: true })

      if (classiError) throw classiError

      // Query 2: Ottieni tutti i settori
      const { data: settoriData, error: settoriError } = await supabase
        .from('settori')
        .select('id, nome')

      if (settoriError) throw settoriError

      // Crea mappa settori per lookup veloce
      const settoriMap = settoriData?.reduce((acc, settore) => {
        acc[settore.id] = settore.nome
        return acc
      }, {} as Record<number, string>) || {}

      // Combina i risultati
      const classiWithSettore = (classiData || []).map(c => ({
        ...c,
        settore_nome: settoriMap[c.id_settore] || '-',
      }))

      setClassi(classiWithSettore)
    } catch (err) {
      console.error('Errore caricamento classi:', err)
    } finally {
      setIsLoadingClassi(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadSettori()
    loadClassi()
  }, [loadSettori, loadClassi])

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
      loadSettori()
      loadClassi() // Ricarica anche le classi
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
      loadClassi()
      loadSettori() // Ricarica anche i settori per aggiornare il conteggio
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Gestione Settori</h2>
          <button
            onClick={handleNewSettore}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuovo Settore
          </button>
        </div>

        {/* Tabella Settori */}
        <div>
          {isLoadingSettori ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto" />
            </div>
          ) : settori.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nessun settore presente
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Settore</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Utilizzi</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settori.map((settore) => (
                  <tr key={settore.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{settore.nome}</td>
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
          loadSettori()
          loadClassi()
        }}
        settore={selectedSettore}
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
          loadClassi()
          loadSettori()
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
