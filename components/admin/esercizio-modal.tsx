/**
 * Modal per creazione/modifica esercizio
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Puzzle, FileText, Save, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Esercizio, CategoriaEsercizi } from '@/lib/supabase/types'

interface EsercizioWithCategoria extends Esercizio {
  categoria?: CategoriaEsercizi | null
}

interface EsercizioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  esercizio?: EsercizioWithCategoria | null
  categorie: CategoriaEsercizi[]
}

interface FormData {
  nome: string
  id_categoria: number | null
  descrizione: string
  slug: string
  stato: 'attivo' | 'bozza' | 'archiviato'
}

export function EsercizioModal({
  isOpen,
  onClose,
  onSuccess,
  esercizio,
  categorie
}: EsercizioModalProps) {
  const supabase = createClient()
  const isEditMode = !!esercizio

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    id_categoria: null,
    descrizione: '',
    slug: '',
    stato: 'attivo'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref per tracciare se il form è già stato inizializzato per questa apertura
  const hasInitializedRef = useRef(false)
  const wasOpenRef = useRef(false)
  // Ref per prevenire submit multipli (più robusto di useState)
  const isSubmittingRef = useRef(false)

  // Popola form - solo quando il modal si apre o cambia esercizio
  useEffect(() => {
    // Rileva se il modal si è appena aperto
    const justOpened = isOpen && !wasOpenRef.current
    wasOpenRef.current = isOpen

    // Reset completo quando si chiude
    if (!isOpen) {
      hasInitializedRef.current = false
      isSubmittingRef.current = false
      setIsSubmitting(false)
      setError(null)
      return
    }

    // Se già inizializzato per questa apertura, skip
    if (hasInitializedRef.current && !justOpened) {
      return
    }

    // Segna come inizializzato PRIMA di fare qualsiasi setState
    hasInitializedRef.current = true

    if (esercizio) {
      setFormData({
        nome: esercizio.nome || '',
        id_categoria: esercizio.id_categoria || null,
        descrizione: esercizio.descrizione || '',
        slug: esercizio.slug || '',
        stato: (esercizio.stato as 'attivo' | 'bozza' | 'archiviato') || 'attivo'
      })
    } else {
      // Per nuovo esercizio, usa la prima categoria disponibile
      const primaCategoria = categorie.length > 0 ? categorie[0].id : null
      setFormData({
        nome: '',
        id_categoria: primaCategoria,
        descrizione: '',
        slug: '',
        stato: 'attivo'
      })
    }
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esercizio, isOpen])

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
    // Prevenzione submit multipli (usa ref per robustezza)
    if (isSubmittingRef.current) {
      console.log('[ESERCIZIO-MODAL] Submit già in corso, skip')
      return
    }

    setError(null)

    // Validazione
    if (!formData.nome.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    if (!formData.id_categoria) {
      setError('La categoria è obbligatoria')
      return
    }
    if (!formData.descrizione.trim()) {
      setError('La descrizione è obbligatoria')
      return
    }

    // Segna come in submit PRIMA di qualsiasi async
    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      const slug = formData.slug.trim() || generateSlug(formData.nome)

      if (isEditMode && esercizio) {
        // MODIFICA esercizio esistente
        const { error: updateError } = await supabase
          .from('esercizi')
          .update({
            nome: formData.nome.trim(),
            id_categoria: formData.id_categoria,
            descrizione: formData.descrizione.trim(),
            slug: slug,
            stato: formData.stato
          })
          .eq('id', esercizio.id)

        if (updateError) {
          if (updateError.message.includes('duplicate') || updateError.message.includes('unique')) {
            setError('Esiste già un esercizio con questo slug')
          } else {
            setError(`Errore: ${updateError.message}`)
          }
          isSubmittingRef.current = false
          setIsSubmitting(false)
          return
        }
      } else {
        // CREA nuovo esercizio
        const { error: insertError } = await supabase
          .from('esercizi')
          .insert({
            nome: formData.nome.trim(),
            id_categoria: formData.id_categoria,
            descrizione: formData.descrizione.trim(),
            slug: slug,
            stato: formData.stato,
            config: {}
          })

        if (insertError) {
          if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
            setError('Esiste già un esercizio con questo slug')
          } else {
            setError(`Errore: ${insertError.message}`)
          }
          isSubmittingRef.current = false
          setIsSubmitting(false)
          return
        }

        // Trova lo slug della categoria
        const categoriaSelezionata = categorie.find(c => c.id === formData.id_categoria)
        const categoriaSlug = categoriaSelezionata?.slug || 'default'

        // Crea la cartella dell'esercizio
        try {
          const folderResponse = await fetch('/api/admin/create-exercise-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoriaSlug,
              esercizioSlug: slug,
              esercizioNome: formData.nome.trim(),
              esercizioDescrizione: formData.descrizione.trim()
            })
          })

          const folderResult = await folderResponse.json()
          if (!folderResult.success) {
            console.warn('Cartella non creata:', folderResult.error)
            // Non blocchiamo, l'esercizio è già nel database
          }
        } catch (folderErr) {
          console.warn('Errore creazione cartella:', folderErr)
          // Non blocchiamo, l'esercizio è già nel database
        }
      }

      isSubmittingRef.current = false
      setIsSubmitting(false)
      onClose()
      onSuccess()
    } catch (err: any) {
      console.error('Errore submit:', err)
      setError(err?.message || 'Errore durante il salvataggio')
      isSubmittingRef.current = false
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
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border-4 border-rose-300 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-t-2xl p-4 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Puzzle className="h-6 w-6" />
              {isEditMode ? 'Modifica Esercizio' : 'Nuovo Esercizio'}
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

            {/* Row 1: Nome e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nome Esercizio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium"
                  placeholder="Es: Riconoscimento Colori"
                />
                <p className="text-xs text-gray-500 mt-1">Es: Riconoscimento Colori, Sequenze Logiche, Memoria Visiva</p>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.id_categoria || ''}
                  onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium bg-white"
                >
                  <option value="">Seleziona categoria...</option>
                  {categorie.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Descrizione Esercizio <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium resize-none"
                placeholder="Descrizione dettagliata dell'esercizio..."
              />
              <p className="text-xs text-gray-500 mt-1">Descrizione dettagliata dell'esercizio: obiettivi, modalità di esecuzione, materiali necessari</p>
            </div>

            {/* Stato */}
            <div className="max-w-xs">
              <label className="block text-sm font-bold text-gray-700 mb-1">Stato</label>
              <select
                value={formData.stato}
                onChange={(e) => setFormData({ ...formData, stato: e.target.value as 'attivo' | 'bozza' | 'archiviato' })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium bg-white"
              >
                <option value="attivo">Attivo</option>
                <option value="bozza">Bozza</option>
                <option value="archiviato">Archiviato</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Stato operativo dell'esercizio</p>
            </div>

            {/* Slug (nascosto in modifica, mostrato per riferimento) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-200 font-medium font-mono text-sm"
                  placeholder="slug-esercizio"
                />
                <p className="text-xs text-gray-500 mt-1">Identificativo univoco per l'URL</p>
              </div>
            )}
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
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Salvataggio...' : 'Creazione...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Salva Modifiche' : 'Salva Esercizio'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
