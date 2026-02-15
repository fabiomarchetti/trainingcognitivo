/**
 * Modal per creazione/modifica utente (paziente)
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, User, Mail, Lock, Building2, Users, GraduationCap, Save, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Sede, Settore, Classe, ProfileWithRelations } from '@/lib/supabase/types'

interface UtenteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  utente?: ProfileWithRelations | null // Se presente, modalità modifica
  sedi: Sede[]
  settori: Settore[]
  classi: Classe[]
  idRuoloUtente: number // ID del ruolo 'utente' dalla tabella ruoli
}

interface FormData {
  nome: string
  cognome: string
  email: string
  password: string
  id_sede: number | null
  id_settore: number | null
  id_classe: number | null
  telefono: string
  note: string
  stato: 'attivo' | 'sospeso'
}

// Normalizza il nome: minuscolo, senza accenti, senza spazi
function normalizzaNome(nome: string): string {
  return nome
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/\s+/g, '') // Rimuove spazi
    .replace(/[^a-z0-9]/g, '') // Rimuove caratteri speciali
}

// Genera credenziali automatiche dal nome e cognome
function generaCredenziali(nome: string, cognome: string): { email: string; password: string } {
  const nomeNorm = normalizzaNome(nome || 'utente')
  const cognomeNorm = normalizzaNome(cognome || '')

  // Se nome e cognome sono uguali o cognome vuoto, usa solo nome
  let baseNome = nomeNorm
  if (cognomeNorm && cognomeNorm !== nomeNorm) {
    baseNome = `${nomeNorm}.${cognomeNorm}`
  }

  return {
    email: `${baseNome}@gmail.com`,
    password: `${nomeNorm}pwd`
  }
}

export function UtenteModal({
  isOpen,
  onClose,
  onSuccess,
  utente,
  sedi,
  settori,
  classi,
  idRuoloUtente
}: UtenteModalProps) {
  const supabase = createClient()
  const isEditMode = !!utente

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    id_sede: null,
    id_settore: null,
    id_classe: null,
    telefono: '',
    note: '',
    stato: 'attivo'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref per tracciare l'ultimo utente caricato (evita loop)
  const lastLoadedUtenteId = useRef<string | null>(null)
  const wasOpen = useRef(false)

  // Popola form in modalità modifica - solo quando il modal si apre o cambia utente
  useEffect(() => {
    // Se il modal si sta aprendo (era chiuso, ora è aperto)
    const justOpened = isOpen && !wasOpen.current
    wasOpen.current = isOpen

    if (!isOpen) {
      // Modal chiuso, reset del tracking
      lastLoadedUtenteId.current = null
      return
    }

    // Se è lo stesso utente già caricato, non fare nulla
    if (utente?.id === lastLoadedUtenteId.current && !justOpened) {
      return
    }

    // Aggiorna il tracking
    lastLoadedUtenteId.current = utente?.id || null

    if (utente) {
      setFormData({
        nome: utente.nome || '',
        cognome: utente.cognome || '',
        email: utente.email_contatto || '',
        password: '',
        id_sede: utente.id_sede || null,
        id_settore: utente.id_settore || null,
        id_classe: utente.id_classe || null,
        telefono: utente.telefono || '',
        note: utente.note || '',
        stato: (utente.stato as 'attivo' | 'sospeso') || 'attivo'
      })
    } else {
      // Reset form per nuovo utente
      setFormData({
        nome: '',
        cognome: '',
        email: '',
        password: '',
        id_sede: sedi.length > 0 ? sedi[0].id : null,
        id_settore: null,
        id_classe: null,
        telefono: '',
        note: '',
        stato: 'attivo'
      })
    }
    setError(null)
  }, [utente, sedi, isOpen])

  // Filtra settori per sede selezionata
  const settoriFiltrati = settori.filter(s => s.id_sede === formData.id_sede)

  // Filtra classi per settore selezionato
  const classiFiltrate = classi.filter(c => c.id_settore === formData.id_settore)

  // Quando cambia la sede, resetta settore e classe
  const handleSedeChange = (id_sede: number | null) => {
    setFormData(prev => ({
      ...prev,
      id_sede,
      id_settore: null,
      id_classe: null
    }))
  }

  // Quando cambia il settore, resetta classe
  const handleSettoreChange = (id_settore: number | null) => {
    setFormData(prev => ({
      ...prev,
      id_settore,
      id_classe: null
    }))
  }

  const handleSubmit = async () => {
    setError(null)

    // Validazione
    if (!formData.nome.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    if (!formData.cognome.trim()) {
      setError('Il cognome è obbligatorio')
      return
    }
    // Modifica: se password inserita, deve avere minimo 6 caratteri
    if (isEditMode && formData.password && formData.password.length > 0 && formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && utente) {
        // MODIFICA utente esistente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            nome: formData.nome.trim(),
            cognome: formData.cognome.trim(),
            id_sede: formData.id_sede,
            id_settore: formData.id_settore,
            id_classe: formData.id_classe,
            telefono: formData.telefono.trim() || null,
            email_contatto: formData.email.trim() || null,
            note: formData.note.trim() || null,
            stato: formData.stato,
            updated_at: new Date().toISOString()
          })
          .eq('id', utente.id)

        if (updateError) {
          console.error('Errore update:', updateError)
          setError(`Errore: ${updateError.message}`)
          return
        }

        // Se è stata inserita una nuova password, aggiornala
        if (formData.password && formData.password.length >= 6) {
          const response = await fetch('/api/admin/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: utente.id,
              password: formData.password
            })
          })

          const result = await response.json()
          if (!result.success) {
            setError(`Profilo aggiornato, ma errore password: ${result.error}`)
            return
          }
        }
      } else {
        // CREA nuovo utente con credenziali generate automaticamente
        const credenziali = generaCredenziali(formData.nome, formData.cognome)

        // Usa API Admin per creare utente (bypassa verifica email)
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credenziali.email,
            password: credenziali.password,
            nome: formData.nome.trim(),
            cognome: formData.cognome.trim(),
            id_ruolo: idRuoloUtente,
            id_sede: formData.id_sede,
            id_settore: formData.id_settore,
            id_classe: formData.id_classe,
            telefono: formData.telefono.trim() || null,
            note: formData.note.trim() || null,
            stato: formData.stato
          })
        })

        const result = await response.json()

        if (!result.success) {
          if (result.message.includes('already been registered')) {
            setError('Esiste già un utente con questo nome e cognome')
          } else {
            setError(result.message)
          }
          return
        }
      }

      // Reset stato e chiudi
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
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-4 border-teal-300 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-green-500 rounded-t-2xl p-4 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <User className="h-6 w-6" />
              {isEditMode ? 'Modifica Utente' : 'Nuovo Utente'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="p-6 space-y-4 overflow-y-auto flex-grow">
            {error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium"
                  placeholder="Nome"
                />
              </div>
            </div>

            {/* Cognome */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Cognome *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium"
                  placeholder="Cognome"
                />
              </div>
            </div>

            {/* Credenziali generate automaticamente (solo creazione) */}
            {!isEditMode && formData.nome && formData.cognome && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Credenziali Login (generate automaticamente)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-blue-600">Email</p>
                    <p className="font-mono text-blue-800 font-bold">
                      {generaCredenziali(formData.nome, formData.cognome).email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Password</p>
                    <p className="font-mono text-blue-800 font-bold">
                      {generaCredenziali(formData.nome, formData.cognome).password}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email (solo modifica - read only) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl font-medium bg-gray-100 text-gray-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">L'email non può essere modificata</p>
              </div>
            )}

            {/* Password (solo modifica) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Password
                  <span className="font-normal text-gray-500"> (lascia vuoto per non modificare)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium"
                    placeholder="Nuova password (opzionale)"
                  />
                </div>
              </div>
            )}

            {/* Sede */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Sede</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                <select
                  value={formData.id_sede || ''}
                  onChange={(e) => handleSedeChange(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium bg-white appearance-none"
                >
                  <option value="">Seleziona sede...</option>
                  {sedi.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Settore */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Settore</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                <select
                  value={formData.id_settore || ''}
                  onChange={(e) => handleSettoreChange(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!formData.id_sede}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium bg-white appearance-none disabled:bg-gray-100"
                >
                  <option value="">Seleziona settore...</option>
                  {settoriFiltrati.map((settore) => (
                    <option key={settore.id} value={settore.id}>
                      {settore.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Classe */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Classe</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500" />
                <select
                  value={formData.id_classe || ''}
                  onChange={(e) => setFormData({ ...formData, id_classe: e.target.value ? parseInt(e.target.value) : null })}
                  disabled={!formData.id_settore}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium bg-white appearance-none disabled:bg-gray-100"
                >
                  <option value="">Seleziona classe...</option>
                  {classiFiltrate.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Telefono */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Telefono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium"
                placeholder="+39 333 1234567"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Note</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium resize-none"
                placeholder="Note opzionali..."
              />
            </div>

            {/* Stato (solo modifica) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Stato</label>
                <select
                  value={formData.stato}
                  onChange={(e) => setFormData({ ...formData, stato: e.target.value as 'attivo' | 'sospeso' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-medium bg-white"
                >
                  <option value="attivo">Attivo</option>
                  <option value="sospeso">Sospeso</option>
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-green-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Salvataggio...' : 'Creazione...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Salva Modifiche' : 'Crea Utente'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
