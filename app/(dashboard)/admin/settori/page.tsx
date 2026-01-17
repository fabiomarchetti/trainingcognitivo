/**
 * Pagina Gestione Settori e Classi - Stile colorato infanzia
 */
'use client'

import { useState, useEffect } from 'react'
import { FolderTree, Users, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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

  const supabase = createClient()

  // Carica settori con conteggio classi
  const loadSettori = async () => {
    setIsLoadingSettori(true)
    try {
      const { data, error } = await supabase
        .from('settori')
        .select('*, classi(count)')
        .order('ordine', { ascending: true })
        .order('nome', { ascending: true })

      if (error) throw error

      const settoriWithCount = (data || []).map((s: any) => ({
        ...s,
        classi_count: s.classi?.[0]?.count || 0,
      }))

      setSettori(settoriWithCount)
    } catch (err) {
      console.error('Errore caricamento settori:', err)
    } finally {
      setIsLoadingSettori(false)
    }
  }

  // Carica classi con nome settore
  const loadClassi = async () => {
    setIsLoadingClassi(true)
    try {
      const { data, error } = await supabase
        .from('classi')
        .select('*, settori(nome)')
        .order('ordine', { ascending: true })
        .order('nome', { ascending: true })

      if (error) throw error

      const classiWithSettore = (data || []).map((c: any) => ({
        ...c,
        settore_nome: c.settori?.nome || '-',
      }))

      setClassi(classiWithSettore)
    } catch (err) {
      console.error('Errore caricamento classi:', err)
    } finally {
      setIsLoadingClassi(false)
    }
  }

  useEffect(() => {
    loadSettori()
    loadClassi()
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
    <div className="space-y-8">
      {/* ========== SEZIONE SETTORI ========== */}
      <div className="space-y-4">
        {/* Header Settori */}
        <div className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-3 drop-shadow-lg">
                <FolderTree className="h-7 w-7" />
                Gestione Settori
              </h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadSettori}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleNewSettore}
                className="flex items-center gap-2 px-5 py-3 bg-white text-purple-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
              >
                <Plus className="h-5 w-5" />
                Nuovo Settore
              </button>
            </div>
          </div>
        </div>

        {/* Tabella Settori */}
        <div className="bg-white rounded-3xl shadow-xl border-4 border-purple-200 overflow-hidden">
          {isLoadingSettori ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4" />
              <p className="text-gray-600 font-semibold">Caricamento settori...</p>
            </div>
          ) : settori.length === 0 ? (
            <div className="p-12 text-center">
              <FolderTree className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold text-lg">Nessun settore presente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-400 to-indigo-400 text-white">
                    <th className="px-6 py-4 text-left text-sm font-black uppercase">Settore</th>
                    <th className="px-6 py-4 text-center text-sm font-black uppercase">Utilizzi</th>
                    <th className="px-6 py-4 text-center text-sm font-black uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {settori.map((settore, index) => (
                    <tr
                      key={settore.id}
                      className={`border-b border-gray-200 hover:bg-purple-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-base font-bold text-gray-900">{settore.nome}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-cyan-400 text-white rounded-full font-bold shadow-md">
                          {settore.classi_count}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">utilizzi</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditSettore(settore)}
                            className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                            title="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSettoreClick(settore)}
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
      </div>

      {/* ========== SEZIONE CLASSI ========== */}
      <div className="space-y-4">
        {/* Header Classi */}
        <div className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 rounded-3xl p-6 text-white shadow-2xl border-4 border-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-3 drop-shadow-lg">
                <Users className="h-7 w-7" />
                Gestione Classi
              </h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadClassi}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg hover:scale-105"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleNewClasse}
                className="flex items-center gap-2 px-5 py-3 bg-white text-teal-600 rounded-2xl font-bold hover:scale-110 transition-all shadow-xl hover:shadow-2xl"
              >
                <Plus className="h-5 w-5" />
                Nuova Classe
              </button>
            </div>
          </div>
        </div>

        {/* Tabella Classi */}
        <div className="bg-white rounded-3xl shadow-xl border-4 border-teal-200 overflow-hidden">
          {isLoadingClassi ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600 mx-auto mb-4" />
              <p className="text-gray-600 font-semibold">Caricamento classi...</p>
            </div>
          ) : classi.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold text-lg">Nessuna classe presente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-400 to-cyan-400 text-white">
                    <th className="px-6 py-4 text-left text-sm font-black uppercase">Classe</th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase">Settore</th>
                    <th className="px-6 py-4 text-center text-sm font-black uppercase">Utilizzi</th>
                    <th className="px-6 py-4 text-center text-sm font-black uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {classi.map((classe, index) => (
                    <tr
                      key={classe.id}
                      className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-base font-bold text-gray-900">{classe.nome}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-4 py-1 bg-gray-500 text-white rounded-full text-sm font-bold">
                          {classe.settore_nome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-cyan-400 text-white rounded-full font-bold shadow-md">
                          0
                        </span>
                        <span className="text-sm text-gray-600 ml-2">utilizzi</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClasse(classe)}
                            className="p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl transition-all hover:scale-110 shadow-md"
                            title="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClasseClick(classe)}
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
