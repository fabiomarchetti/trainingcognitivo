/**
 * Modal per inserimento/modifica sede - Stile colorato infanzia
 */
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Building2, MapPin, Mail, Phone, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sedeSchema, type SedeFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Database } from '@/lib/supabase/types'

type Sede = Database['public']['Tables']['sedi']['Row']

interface SedeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  sede?: Sede | null
}

export function SedeModal({ isOpen, onClose, onSuccess, sede }: SedeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!sede

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SedeFormData>({
    resolver: zodResolver(sedeSchema),
    defaultValues: {
      nome: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      telefono: '',
      email: '',
      stato: 'attiva',
    },
  })

  // Reset form quando cambia la sede
  useEffect(() => {
    if (sede) {
      reset({
        nome: sede.nome || '',
        indirizzo: sede.indirizzo || '',
        citta: sede.citta || '',
        provincia: sede.provincia || '',
        cap: sede.cap || '',
        telefono: sede.telefono || '',
        email: sede.email || '',
        stato: sede.stato || 'attiva',
      })
    } else {
      reset({
        nome: '',
        indirizzo: '',
        citta: '',
        provincia: '',
        cap: '',
        telefono: '',
        email: '',
        stato: 'attiva',
      })
    }
  }, [sede, reset])

  const onSubmit = async (data: SedeFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (isEdit && sede) {
        // Update
        const { error: updateError } = await supabase
          .from('sedi')
          .update({
            nome: data.nome,
            indirizzo: data.indirizzo || null,
            citta: data.citta || null,
            provincia: data.provincia || null,
            cap: data.cap || null,
            telefono: data.telefono || null,
            email: data.email || null,
            stato: data.stato,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sede.id)

        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('sedi')
          .insert({
            nome: data.nome,
            indirizzo: data.indirizzo || null,
            citta: data.citta || null,
            provincia: data.provincia || null,
            cap: data.cap || null,
            telefono: data.telefono || null,
            email: data.email || null,
            stato: data.stato,
          })

        if (insertError) throw insertError
      }

      reset()
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Errore salvataggio sede:', err)
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
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-t-3xl p-6 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-lg">
              {isEdit ? 'Modifica Sede' : 'Nuova Sede'}
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

            {/* Nome Sede */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nome Sede *
              </label>
              <Input
                placeholder="Inserisci il nome della sede"
                className="h-12 rounded-xl border-2 border-gray-300 focus:border-red-400 text-base font-semibold"
                disabled={isLoading}
                error={errors.nome?.message}
                {...register('nome')}
              />
            </div>

            {/* Indirizzo */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Indirizzo
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                <Input
                  placeholder="Via, piazza, numero civico"
                  className="pl-11 h-12 rounded-xl border-2 border-gray-300 focus:border-orange-400 text-base font-semibold"
                  disabled={isLoading}
                  error={errors.indirizzo?.message}
                  {...register('indirizzo')}
                />
              </div>
            </div>

            {/* Città e Provincia */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Città
                </label>
                <Input
                  placeholder="Nome della città"
                  className="h-12 rounded-xl border-2 border-gray-300 focus:border-cyan-400 text-base font-semibold"
                  disabled={isLoading}
                  error={errors.citta?.message}
                  {...register('citta')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Provincia
                </label>
                <Input
                  placeholder="RM"
                  maxLength={2}
                  className="h-12 rounded-xl border-2 border-gray-300 focus:border-cyan-400 text-base font-semibold uppercase"
                  disabled={isLoading}
                  error={errors.provincia?.message}
                  {...register('provincia')}
                />
              </div>
            </div>

            {/* CAP e Telefono */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  CAP
                </label>
                <Input
                  placeholder="Codice postale"
                  className="h-12 rounded-xl border-2 border-gray-300 focus:border-green-400 text-base font-semibold"
                  disabled={isLoading}
                  error={errors.cap?.message}
                  {...register('cap')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Telefono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  <Input
                    placeholder="Numero di telefono"
                    className="pl-11 h-12 rounded-xl border-2 border-gray-300 focus:border-green-400 text-base font-semibold"
                    disabled={isLoading}
                    error={errors.telefono?.message}
                    {...register('telefono')}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                <Input
                  type="email"
                  placeholder="Email della sede"
                  className="pl-11 h-12 rounded-xl border-2 border-gray-300 focus:border-blue-400 text-base font-semibold"
                  disabled={isLoading}
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </div>

            {/* Stato */}
            {isEdit && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stato
                </label>
                <Select
                  className="h-12 rounded-xl border-2 border-gray-300 focus:border-purple-400 text-base font-semibold"
                  disabled={isLoading}
                  error={errors.stato?.message}
                  options={[
                    { value: 'attiva', label: 'Attiva' },
                    { value: 'sospesa', label: 'Sospesa' },
                    { value: 'chiusa', label: 'Chiusa' },
                  ]}
                  {...register('stato')}
                />
              </div>
            )}

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
                className="flex-1 h-12 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-black text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                {!isLoading && <Save className="h-5 w-5" />}
                {isLoading ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
