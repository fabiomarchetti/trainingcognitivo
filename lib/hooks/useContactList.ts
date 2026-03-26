/**
 * Hook per la rubrica contatti videocall
 * Carica i contatti chiamabili e incrocia con lo stato presenza
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { PresenceUser } from './usePresence'

export interface Contact {
  id: string
  nome: string
  cognome: string
  ruoloCodice: string
  ruoloNome: string
  idSede: number | null
  isOnline: boolean
}

interface UseContactListOptions {
  onlineUsers: PresenceUser[]
  enabled: boolean // carica solo quando serve
}

interface UseContactListReturn {
  contacts: Contact[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useContactList({
  onlineUsers,
  enabled,
}: UseContactListOptions): UseContactListReturn {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const fetchContacts = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/videocall/rubrica')
      const json = await response.json()

      if (json.success) {
        const loadedContacts = (json.data || []).map((c: any) => ({
          ...c,
          isOnline: false,
        }))
        setContacts(loadedContacts)
        hasLoadedRef.current = true
      } else {
        setError(json.message || 'Errore caricamento rubrica')
      }
    } catch (err: any) {
      setError(err.message || 'Errore di rete')
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [])

  // Carica contatti quando enabled diventa true
  useEffect(() => {
    if (enabled && !hasLoadedRef.current) {
      fetchContacts()
    }
  }, [enabled, fetchContacts])

  // Aggiorna stato online/offline quando cambia la lista presenza
  useEffect(() => {
    if (contacts.length === 0) return

    setContacts((prev) =>
      prev.map((contact) => ({
        ...contact,
        isOnline: onlineUsers.some((u) => u.userId === contact.id),
      }))
    )
  }, [onlineUsers])

  // Refresh manuale
  const refresh = useCallback(async () => {
    hasLoadedRef.current = false
    await fetchContacts()
  }, [fetchContacts])

  // Ordina: online prima, poi per cognome
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return a.cognome.localeCompare(b.cognome)
  })

  return { contacts: sortedContacts, isLoading, error, refresh }
}
