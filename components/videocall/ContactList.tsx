/**
 * Lista contatti rubrica per videocall
 * Mostra contatti con stato online/offline e bottone chiama
 */
'use client'

import { Phone, RefreshCw, Users } from 'lucide-react'
import type { Contact } from '@/lib/hooks/useContactList'

interface ContactListProps {
  contacts: Contact[]
  isLoading: boolean
  error: string | null
  onCall: (contact: Contact) => void
  onRefresh: () => void
}

export default function ContactList({
  contacts,
  isLoading,
  error,
  onCall,
  onRefresh,
}: ContactListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Caricamento rubrica...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
        <p className="mb-2">{error}</p>
        <button
          onClick={onRefresh}
          className="text-sm font-medium text-red-600 underline hover:text-red-800"
        >
          Riprova
        </button>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-gray-500">
        <Users className="mb-2 h-8 w-8" />
        <p>Nessun contatto disponibile</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Rubrica ({contacts.length})
        </h3>
        <button
          onClick={onRefresh}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Aggiorna rubrica"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            {/* Indicatore online/offline */}
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                contact.isOnline ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={contact.isOnline ? 'Online' : 'Offline'}
            />

            <div>
              <p className="text-sm font-medium text-gray-900">
                {contact.cognome} {contact.nome}
              </p>
              <p className="text-xs text-gray-500">{contact.ruoloNome}</p>
            </div>
          </div>

          {/* Bottone chiama (solo se online) */}
          <button
            onClick={() => onCall(contact)}
            disabled={!contact.isOnline}
            className={`rounded-full p-2 transition-colors ${
              contact.isOnline
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'cursor-not-allowed bg-gray-100 text-gray-300'
            }`}
            aria-label={`Chiama ${contact.nome} ${contact.cognome}`}
            title={contact.isOnline ? 'Chiama' : 'Non disponibile'}
          >
            <Phone className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
