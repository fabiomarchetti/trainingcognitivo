/**
 * Modal per creazione/modifica categoria esercizi
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, FolderOpen, FileText, Hash, Save, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CategoriaEsercizi } from '@/lib/supabase/types'

interface CategoriaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categoria?: CategoriaEsercizi | null
  nextOrdine: number
}

interface FormData {
  nome: string
  descrizione: string
  note: string
  slug: string
  ordine: number
}

export function CategoriaModal({
  isOpen,
  onClose,
  onSuccess,
  categoria,
  nextOrdine
}: CategoriaModalProps) {
  const supabase = createClient()
  const isEditMode = !!categoria

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descrizione: '',
    note: '',
    slug: '',
    ordine: nextOrdine
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref per tracciare l'ultima categoria caricata (evita loop)
  const lastLoadedCategoriaId = useRef<number | null>(null)
  const wasOpen = useRef(false)

  // Popola form - solo quando il modal si apre o cambia categoria
  useEffect(() => {
    const justOpened = isOpen && !wasOpen.current
    wasOpen.current = isOpen

    if (!isOpen) {
      lastLoadedCategoriaId.current = null
      return
    }

    if (categoria?.id === lastLoadedCategoriaId.current && !justOpened) {
      return
    }

    lastLoadedCategoriaId.current = categoria?.id || null

    if (categoria) {
      setFormData({
        nome: categoria.nome || '',
        descrizione: categoria.descrizione || '',
        note: categoria.note || '',
        slug: categoria.slug || '',
        ordine: categoria.ordine || 1
      })
    } else {
      setFormData({
        nome: '',
        descrizione: '',
        note: '',
        slug: '',
        ordine: nextOrdine
      })
    }
    setError(null)
  }, [categoria, isOpen, nextOrdine])

  // Genera slug automaticamente dal nome
  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
      .replace(/[^a-z0-9\s-]/g, '') // rimuove caratteri speciali
      .replace(/\s+/g, '-') // spazi -> trattini
      .replace(/-+/g, '-') // trattini multipli -> singolo
      .trim()
  }

  const handleNomeChange = (nome: string) => {
    setFormData(prev => ({
      ...prev,
      nome,
      slug: isEditMode ? prev.slug : generateSlug(nome)
    }))
  }

  const handleSubmit = async () => {
    setError(null)

    // Validazione
    if (!formData.nome.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    if (!formData.slug.trim()) {
      setError('Lo slug è obbligatorio')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && categoria) {
        // MODIFICA categoria esistente
        const { error: updateError } = await supabase
          .from('categorie_esercizi')
          .update({
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim(),
            note: formData.note.trim() || null,
            slug: formData.slug.trim(),
            ordine: formData.ordine
          })
          .eq('id', categoria.id)

        if (updateError) {
          if (updateError.message.includes('duplicate') || updateError.message.includes('unique')) {
            setError('Esiste già una categoria con questo slug')
          } else {
            setError(`Errore: ${updateError.message}`)
          }
          setIsSubmitting(false)
          return
        }
      } else {
        // CREA nuova categoria
        const { error: insertError } = await supabase
          .from('categorie_esercizi')
          .insert({
            nome: formData.nome.trim(),
            descrizione: formData.descrizione.trim(),
            note: formData.note.trim() || null,
            slug: formData.slug.trim(),
            ordine: formData.ordine
          })

        if (insertError) {
          if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
            setError('Esiste già una categoria con questo slug')
          } else {
            setError(`Errore: ${insertError.message}`)
          }
          setIsSubmitting(false)
          return
        }
      }

      setIsSubmitting(false)
      onClose()
      onSuccess()
    } catch (err: any) {
      console.error('Errore submit:', err)
      setError(err?.message || 'Errore durante il salvataggio')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-4 border-orange-300 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl p-4 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              {isEditMode ? 'Modifica Categoria' : 'Nuova Categoria'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="p-6 space-y-4 overflow-y-auto grow">
            {error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 font-medium"
                  placeholder="Nome categoria"
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Slug *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 font-medium font-mono text-sm"
                  placeholder="nome-categoria"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Identificativo univoco (generato automaticamente)</p>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Descrizione</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-orange-500" />
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 font-medium resize-none"
                  placeholder="Descrizione della categoria..."
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Note</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 font-medium resize-none"
                placeholder="Note opzionali..."
              />
            </div>

            {/* Ordine */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ordine</label>
              <input
                type="number"
                value={formData.ordine}
                onChange={(e) => setFormData({ ...formData, ordine: parseInt(e.target.value) || 1 })}
                min={1}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 font-medium"
              />
              <p className="text-xs text-gray-500 mt-1">Posizione nella lista delle categorie</p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex gap-3 justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Salvataggio...' : 'Creazione...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Salva Modifiche' : 'Crea Categoria'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
