/**
 * Modal per inserimento/modifica classe - Stile colorato infanzia
 */
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Users, Save, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { classeSchema, type ClasseFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import type { Database } from '@/lib/supabase/types'

type Classe = Database['public']['Tables']['classi']['Row']
type Settore = Database['public']['Tables']['settori']['Row']

interface ClasseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  classe?: Classe | null
  settori: Settore[]
}

export function ClasseModal({ isOpen, onClose, onSuccess, classe, settori }: ClasseModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!classe

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(classeSchema),
    defaultValues: {
      id_settore: '',
      nome: '',
      descrizione: '',
    },
  })

  useEffect(() => {
    if (classe) {
      reset({
        id_settore: classe.id_settore || '',
        nome: classe.nome || '',
        descrizione: classe.descrizione || '',
      })
    } else {
      reset({
        id_settore: '',
        nome: '',
        descrizione: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classe])

  const onSubmit = async (data: ClasseFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (isEdit && classe) {
        // Update
        const { error: updateError } = await supabase
          .from('classi')
          .update({
            id_settore: data.id_settore,
            nome: data.nome,
            descrizione: data.descrizione || null,
          })
          .eq('id', classe.id)

        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('classi')
          .insert({
            id_settore: data.id_settore,
            nome: data.nome,
            descrizione: data.descrizione || null,
            ordine: 0,
            stato: 'attiva',
          })

        if (insertError) throw insertError
      }

      reset()
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Errore salvataggio classe:', err)
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
        <div className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-t-3xl p-6 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-teal-500" />
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-lg">
              {isEdit ? 'Modifica Classe' : 'Nuova Classe'}
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

            {/* Settore di Riferimento */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Settore di Riferimento *
              </label>
              <Select
                className="h-12 rounded-xl border-2 border-gray-300 focus:border-teal-400 text-base font-semibold"
                disabled={isLoading}
                error={errors.id_settore?.message as string}
                placeholder="Seleziona settore..."
                options={settori.map(s => ({ value: s.id, label: s.nome }))}
                {...register('id_settore', { valueAsNumber: true })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Le classi sono associate a un settore specifico
              </p>
            </div>

            {/* Nome Classe */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nome Classe *
              </label>
              <Input
                placeholder="Inserisci il nome della classe"
                className="h-12 rounded-xl border-2 border-gray-300 focus:border-cyan-400 text-base font-semibold"
                disabled={isLoading}
                error={errors.nome?.message as string}
                {...register('nome')}
              />
              <p className="text-xs text-gray-500 mt-1">
                Il nome della classe (può includere sezione)
              </p>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Descrizione
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-cyan-500" />
                <Textarea
                  placeholder="Descrizione opzionale della classe"
                  className="pl-11 rounded-xl border-2 border-gray-300 focus:border-cyan-400 text-base font-semibold resize-none"
                  rows={3}
                  disabled={isLoading}
                  error={errors.descrizione?.message as string}
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
                className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-black text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                {!isLoading && <Save className="h-5 w-5" />}
                {isLoading ? 'Salvataggio...' : 'Salva Classe'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
