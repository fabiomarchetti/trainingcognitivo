/**
 * Hook per signaling WebRTC tramite Supabase Realtime Broadcast
 * Gestisce lo scambio di messaggi SDP e ICE tra due peer
 */
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Tipi di messaggio scambiati sul canale
export type SignalType =
  | 'call-request'
  | 'call-accepted'
  | 'call-rejected'
  | 'sdp-offer'
  | 'sdp-answer'
  | 'ice-candidate'
  | 'call-ended'
  | 'remote-request'
  | 'remote-accepted'
  | 'remote-revoked'

export interface SignalMessage {
  type: SignalType
  from: string
  fromName?: string
  data?: RTCSessionDescriptionInit | RTCIceCandidateInit | null
}

interface UseSignalingOptions {
  currentUserId: string | null
  onSignal: (message: SignalMessage) => void
}

interface UseSignalingReturn {
  sendSignal: (remoteUserId: string, message: SignalMessage) => void
  subscribeToUser: (remoteUserId: string) => void
  unsubscribeFromUser: (remoteUserId: string) => void
}

export function useSignaling({
  currentUserId,
  onSignal,
}: UseSignalingOptions): UseSignalingReturn {
  const supabaseRef = useRef(createClient())
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const onSignalRef = useRef(onSignal)
  const isMountedRef = useRef(true)

  // Mantieni il callback aggiornato senza ricreare le sottoscrizioni
  useEffect(() => {
    onSignalRef.current = onSignal
  }, [onSignal])

  // Canale personale: riceve chiamate in arrivo da chiunque
  useEffect(() => {
    isMountedRef.current = true

    if (!currentUserId) return

    const supabase = supabaseRef.current
    const personalChannel = supabase.channel(`call:incoming:${currentUserId}`)

    personalChannel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (!isMountedRef.current) return
        onSignalRef.current(payload as SignalMessage)
      })
      .subscribe()

    channelsRef.current.set('personal', personalChannel)

    return () => {
      isMountedRef.current = false
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel)
      })
      channelsRef.current.clear()
    }
  }, [currentUserId])

  // Sottoscrivi al canale di un utente specifico (per ricevere risposte)
  const subscribeToUser = useCallback(
    (remoteUserId: string) => {
      if (!currentUserId) return

      const channelKey = `peer:${remoteUserId}`
      if (channelsRef.current.has(channelKey)) return

      const supabase = supabaseRef.current
      // Canale bidirezionale ordinato per ID
      const channelName = `call:${[currentUserId, remoteUserId].sort().join(':')}`
      const channel = supabase.channel(channelName)

      channel
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          if (!isMountedRef.current) return
          const msg = payload as SignalMessage
          // Ignora i propri messaggi
          if (msg.from === currentUserId) return
          onSignalRef.current(msg)
        })
        .subscribe()

      channelsRef.current.set(channelKey, channel)
    },
    [currentUserId]
  )

  // Rimuovi sottoscrizione a un utente
  const unsubscribeFromUser = useCallback(
    (remoteUserId: string) => {
      const channelKey = `peer:${remoteUserId}`
      const channel = channelsRef.current.get(channelKey)
      if (channel) {
        supabaseRef.current.removeChannel(channel)
        channelsRef.current.delete(channelKey)
      }
    },
    []
  )

  // Invia un messaggio di signaling a un utente
  const sendSignal = useCallback(
    (remoteUserId: string, message: SignalMessage) => {
      if (!currentUserId) return

      const supabase = supabaseRef.current

      // Per call-request, invia sul canale personale del destinatario
      if (message.type === 'call-request') {
        const incomingChannel = supabase.channel(`call:incoming:${remoteUserId}`)
        incomingChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            incomingChannel.send({
              type: 'broadcast',
              event: 'signal',
              payload: message,
            })
            // Rimuovi dopo invio (canale temporaneo)
            setTimeout(() => supabase.removeChannel(incomingChannel), 1000)
          }
        })
        return
      }

      // Per tutti gli altri messaggi, usa il canale bidirezionale
      const channelName = `call:${[currentUserId, remoteUserId].sort().join(':')}`
      const channelKey = `peer:${remoteUserId}`
      let channel = channelsRef.current.get(channelKey)

      if (!channel) {
        channel = supabase.channel(channelName)
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel!.send({
              type: 'broadcast',
              event: 'signal',
              payload: message,
            })
          }
        })
        channelsRef.current.set(channelKey, channel)
      } else {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: message,
        })
      }
    },
    [currentUserId]
  )

  return { sendSignal, subscribeToUser, unsubscribeFromUser }
}
