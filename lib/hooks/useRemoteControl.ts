/**
 * Hook per assistenza remota dentro la webapp
 * L'operatore invia comandi (click, scroll, navigazione) all'utente
 * L'utente riceve e simula i comandi sul proprio browser
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Tipi di comandi remoti
export type RemoteCommandType = 'click' | 'scroll' | 'navigate' | 'highlight'

export interface RemoteCommand {
  type: RemoteCommandType
  // Coordinate normalizzate (0-1) rispetto alla viewport
  x?: number
  y?: number
  deltaX?: number
  deltaY?: number
  url?: string
  from: string
}

interface UseRemoteControlOptions {
  sessionId: string | null // ID sessione chiamata attiva
  currentUserId: string | null
  isOperator: boolean // true = invia comandi, false = riceve comandi
  enabled: boolean
}

interface UseRemoteControlReturn {
  isRemoteActive: boolean
  requestRemote: () => void
  acceptRemote: () => void
  revokeRemote: () => void
  sendCommand: (command: Omit<RemoteCommand, 'from'>) => void
  // Per l'utente: indicatore visivo
  lastHighlight: { x: number; y: number } | null
}

export function useRemoteControl({
  sessionId,
  currentUserId,
  isOperator,
  enabled,
}: UseRemoteControlOptions): UseRemoteControlReturn {
  const [isRemoteActive, setIsRemoteActive] = useState(false)
  const [lastHighlight, setLastHighlight] = useState<{ x: number; y: number } | null>(null)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    if (!sessionId || !currentUserId || !enabled) return

    const supabase = supabaseRef.current
    const channel = supabase.channel(`remote:${sessionId}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'remote-control' }, ({ payload }) => {
        if (!isMountedRef.current) return
        const msg = payload as RemoteCommand | { type: string; from: string }

        // Ignora propri messaggi
        if (msg.from === currentUserId) return

        // Messaggi di controllo sessione
        if (msg.type === 'remote-request' && !isOperator) {
          // L'operatore chiede il controllo - accetta automaticamente
          // (l'utente puo revocare dopo)
          setIsRemoteActive(true)
          channel.send({
            type: 'broadcast',
            event: 'remote-control',
            payload: { type: 'remote-accepted', from: currentUserId },
          })
          return
        }

        if (msg.type === 'remote-accepted' && isOperator) {
          setIsRemoteActive(true)
          return
        }

        if (msg.type === 'remote-revoked') {
          setIsRemoteActive(false)
          return
        }

        // Comandi remoti (solo lato utente)
        if (!isOperator && isRemoteActive) {
          executeCommand(msg as RemoteCommand)
        }
      })
      .subscribe()

    return () => {
      isMountedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsRemoteActive(false)
    }
  }, [sessionId, currentUserId, isOperator, enabled])

  // Esegui un comando remoto sul browser dell'utente
  const executeCommand = useCallback((command: RemoteCommand) => {
    switch (command.type) {
      case 'click': {
        if (command.x === undefined || command.y === undefined) return
        // Converti coordinate normalizzate in pixel
        const clickX = command.x * window.innerWidth
        const clickY = command.y * window.innerHeight

        // Trova l'elemento alla posizione e simula click
        const element = document.elementFromPoint(clickX, clickY)
        if (element && element instanceof HTMLElement) {
          // Mostra highlight prima del click
          setLastHighlight({ x: clickX, y: clickY })
          setTimeout(() => setLastHighlight(null), 1000)

          // Simula click
          element.click()
        }
        break
      }

      case 'scroll': {
        if (command.deltaX === undefined || command.deltaY === undefined) return
        window.scrollBy({
          left: command.deltaX,
          top: command.deltaY,
          behavior: 'smooth',
        })
        break
      }

      case 'navigate': {
        if (!command.url) return
        // Accetta solo URL interni
        if (command.url.startsWith('/')) {
          window.location.href = command.url
        }
        break
      }

      case 'highlight': {
        if (command.x === undefined || command.y === undefined) return
        const hx = command.x * window.innerWidth
        const hy = command.y * window.innerHeight
        setLastHighlight({ x: hx, y: hy })
        setTimeout(() => setLastHighlight(null), 2000)
        break
      }
    }
  }, [])

  // Operatore: richiedi controllo
  const requestRemote = useCallback(() => {
    if (!channelRef.current || !currentUserId) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'remote-control',
      payload: { type: 'remote-request', from: currentUserId },
    })
  }, [currentUserId])

  // Utente: accetta controllo
  const acceptRemote = useCallback(() => {
    if (!channelRef.current || !currentUserId) return
    setIsRemoteActive(true)
    channelRef.current.send({
      type: 'broadcast',
      event: 'remote-control',
      payload: { type: 'remote-accepted', from: currentUserId },
    })
  }, [currentUserId])

  // Utente: revoca controllo
  const revokeRemote = useCallback(() => {
    if (!channelRef.current || !currentUserId) return
    setIsRemoteActive(false)
    channelRef.current.send({
      type: 'broadcast',
      event: 'remote-control',
      payload: { type: 'remote-revoked', from: currentUserId },
    })
  }, [currentUserId])

  // Operatore: invia comando
  const sendCommand = useCallback(
    (command: Omit<RemoteCommand, 'from'>) => {
      if (!channelRef.current || !currentUserId || !isRemoteActive) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'remote-control',
        payload: { ...command, from: currentUserId },
      })
    },
    [currentUserId, isRemoteActive]
  )

  return {
    isRemoteActive,
    requestRemote,
    acceptRemote,
    revokeRemote,
    sendCommand,
    lastHighlight,
  }
}
