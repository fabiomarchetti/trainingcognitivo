/**
 * Modal per inserimento/modifica settore - Stile colorato infanzia
 */
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, FolderTree, Save, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { settoreSchema, type SettoreFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Database } from '@/lib/supabase/types'

type Settore = Database['public']['Tables']['settori']['Row']

interface SettoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  settore?: Settore | null
}

export function SettoreModal({ isOpen, onClose, onSuccess, settore }: SettoreModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!settore

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettoreFormData>({
    resolver: zodResolver(settoreSchema),
    defaultValues: {
      nome: '',
      descrizione: '',
    },
  })

  useEffect(() => {
    if (settore) {
      reset({
        nome: settore.nome || '',
        descrizione: settore.descrizione || '',
      })
    } else {
      reset({
        nome: '',
        descrizione: '',
      })
    }
  }, [settore, reset])

  const onSubmit = async (data: SettoreFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (isEdit && settore) {
        // Update
        const { error: updateError } = await supabase
          .from('settori')
          .update({
            nome: data.nome,
            descrizione: data.descrizione || null,
          })
          .eq('id', settore.id)

        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('settori')
          .insert({
            nome: data.nome,
            descrizione: data.descrizione || null,
            ordine: 0,
            stato: 'attivo',
          })

        if (insertError) throw insertError
      }

      reset()
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Errore salvataggio settore:', err)
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-t-3xl p-6 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <FolderTree className="h-6 w-6 text-purple-500" />
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-lg">
              {isEdit ? 'Modifica Settore' : 'Nuovo Settore'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-xl p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-white rounded-b-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Errore */}
            {error && (
              <div className="p-4 bg-red-100 border-2 border-red-300 rounded-2xl text-red-700 text-sm font-semibold">
                {error}
              </div>
            )}

            {/* Nome Settore */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nome Settore *
              </label>
              <Input
                placeholder="Inserisci il nome del settore"
                className="h-12 rounded-xl border-2 border-gray-300 focus:border-purple-400 text-base font-semibold"
                disabled={isLoading}
                error={errors.nome?.message}
                {...register('nome')}
              />
              <p className="text-xs text-gray-500 mt-1">
                Il nome del settore sarà utilizzato per organizzare educatori e utenti
              </p>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Descrizione
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-indigo-500" />
                <Textarea
                  placeholder="Descrizione opzionale del settore"
                  className="pl-11 rounded-xl border-2 border-gray-300 focus:border-indigo-400 text-base font-semibold resize-none"
                  rows={3}
                  disabled={isLoading}
                  error={errors.descrizione?.message}
                  {...register('descrizione')}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-bold text-base"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-black text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                {!isLoading && <Save className="h-5 w-5" />}
                {isLoading ? 'Salvataggio...' : 'Salva Settore'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
