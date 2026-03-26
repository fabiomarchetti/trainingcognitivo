/**
 * Hook per gestione presenza online/offline
 * Usa Supabase Realtime Presence per tracciare gli utenti connessi
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  userId: string
  nome: string
  cognome: string
  ruoloCodice: string
  onlineAt: string
}

interface UsePresenceOptions {
  userId: string | null
  nome: string | null
  cognome: string | null
  ruoloCodice: string | null
}

interface UsePresenceReturn {
  onlineUsers: PresenceUser[]
  isUserOnline: (userId: string) => boolean
  isConnected: boolean
}

const PRESENCE_CHANNEL = 'presence:online'

export function usePresence({
  userId,
  nome,
  cognome,
  ruoloCodice,
}: UsePresenceOptions): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    // Non sottoscrivere se non c'e un utente autenticato
    if (!userId || !nome || !cognome || !ruoloCodice) return

    const supabase = supabaseRef.current
    const channel = supabase.channel(PRESENCE_CHANNEL)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!isMountedRef.current) return

        const state = channel.presenceState()
        const users: PresenceUser[] = []

        // Estrai tutti gli utenti presenti
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            // Evita duplicati
            if (!users.find((u) => u.userId === presence.userId)) {
              users.push({
                userId: presence.userId,
                nome: presence.nome,
                cognome: presence.cognome,
                ruoloCodice: presence.ruoloCodice,
                onlineAt: presence.onlineAt,
              })
            }
          })
        })

        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (!isMountedRef.current) return

        if (status === 'SUBSCRIBED') {
          // Registra la presenza dell'utente corrente
          await channel.track({
            userId,
            nome,
            cognome,
            ruoloCodice,
            onlineAt: new Date().toISOString(),
          })
          setIsConnected(true)
        }
      })

    return () => {
      isMountedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [userId, nome, cognome, ruoloCodice])

  const isUserOnline = useCallback(
    (targetUserId: string): boolean => {
      return onlineUsers.some((u) => u.userId === targetUserId)
    },
    [onlineUsers]
  )

  return { onlineUsers, isUserOnline, isConnected }
}
