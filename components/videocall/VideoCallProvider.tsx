/**
 * VideoCallProvider
 * Context globale per gestire videochiamata, signaling e presenza
 * Va montato nel root layout, gestisce chiamate in arrivo da qualsiasi pagina
 */
'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { usePresence } from '@/lib/hooks/usePresence'
import { useSignaling, type SignalMessage } from '@/lib/hooks/useSignaling'
import { useWebRTC, type CallStatus } from '@/lib/hooks/useWebRTC'
import { useContactList, type Contact } from '@/lib/hooks/useContactList'
import IncomingCallAlert from './IncomingCallAlert'
import FloatingVideoCall from './FloatingVideoCall'

interface VideoCallContextType {
  // Presenza
  onlineUsers: ReturnType<typeof usePresence>['onlineUsers']
  isUserOnline: ReturnType<typeof usePresence>['isUserOnline']
  isPresenceConnected: boolean

  // Rubrica
  contacts: Contact[]
  isLoadingContacts: boolean
  contactsError: string | null
  refreshContacts: () => Promise<void>
  showContactList: boolean
  setShowContactList: (show: boolean) => void

  // Chiamata
  callStatus: CallStatus
  startCall: (contact: Contact) => Promise<void>
  endCall: () => void
  remoteUserName: string | null
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined)

export function VideoCallProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading: isAuthLoading } = useAuth()

  // Stato chiamata
  const [incomingCall, setIncomingCall] = useState<{
    from: string
    fromName: string
  } | null>(null)
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null)
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null)
  const [showContactList, setShowContactList] = useState(false)

  // Ref per evitare loop nei callback
  const remoteUserIdRef = useRef<string | null>(null)

  // Presenza
  const {
    onlineUsers,
    isUserOnline,
    isConnected: isPresenceConnected,
  } = usePresence({
    userId: user?.id || null,
    nome: profile?.nome || null,
    cognome: profile?.cognome || null,
    ruoloCodice: profile?.ruolo?.codice || null,
  })

  // WebRTC - callback per invio segnali
  const onIceCandidate = useCallback(
    (candidate: RTCIceCandidateInit) => {
      if (!remoteUserIdRef.current || !user?.id) return
      sendSignal(remoteUserIdRef.current, {
        type: 'ice-candidate',
        from: user.id,
        data: candidate,
      })
    },
    [user?.id]
  )

  const onOffer = useCallback(
    (offer: RTCSessionDescriptionInit) => {
      if (!remoteUserIdRef.current || !user?.id) return
      sendSignal(remoteUserIdRef.current, {
        type: 'sdp-offer',
        from: user.id,
        data: offer,
      })
    },
    [user?.id]
  )

  const onAnswer = useCallback(
    (answer: RTCSessionDescriptionInit) => {
      if (!remoteUserIdRef.current || !user?.id) return
      sendSignal(remoteUserIdRef.current, {
        type: 'sdp-answer',
        from: user.id,
        data: answer,
      })
    },
    [user?.id]
  )

  const {
    localStream,
    remoteStream,
    callStatus,
    setCallStatus,
    startLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    endCall: endWebRTC,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
  } = useWebRTC({ onIceCandidate, onOffer, onAnswer })

  // Gestione messaggi signaling in arrivo
  const handleSignal = useCallback(
    (message: SignalMessage) => {
      switch (message.type) {
        case 'call-request':
          // Chiamata in arrivo
          setIncomingCall({
            from: message.from,
            fromName: message.fromName || 'Sconosciuto',
          })
          setCallStatus('ringing')
          break

        case 'call-accepted':
          // L'utente remoto ha accettato, crea offer WebRTC
          createOffer()
          break

        case 'call-rejected':
          // L'utente remoto ha rifiutato
          endWebRTC()
          setRemoteUserId(null)
          remoteUserIdRef.current = null
          setRemoteUserName(null)
          break

        case 'sdp-offer':
          if (message.data) {
            handleOffer(message.data as RTCSessionDescriptionInit)
          }
          break

        case 'sdp-answer':
          if (message.data) {
            handleAnswer(message.data as RTCSessionDescriptionInit)
          }
          break

        case 'ice-candidate':
          if (message.data) {
            handleIceCandidate(message.data as RTCIceCandidateInit)
          }
          break

        case 'call-ended':
          endWebRTC()
          setRemoteUserId(null)
          remoteUserIdRef.current = null
          setRemoteUserName(null)
          setIncomingCall(null)
          break
      }
    },
    [createOffer, handleOffer, handleAnswer, handleIceCandidate, endWebRTC, setCallStatus]
  )

  // Signaling
  const { sendSignal, subscribeToUser, unsubscribeFromUser } = useSignaling({
    currentUserId: user?.id || null,
    onSignal: handleSignal,
  })

  // Rubrica
  const {
    contacts,
    isLoading: isLoadingContacts,
    error: contactsError,
    refresh: refreshContacts,
  } = useContactList({
    onlineUsers,
    enabled: !!user?.id && !isAuthLoading,
  })

  // Avvia una chiamata verso un contatto
  const startCall = useCallback(
    async (contact: Contact) => {
      if (!user?.id || !profile) return

      setRemoteUserId(contact.id)
      remoteUserIdRef.current = contact.id
      setRemoteUserName(`${contact.nome} ${contact.cognome}`)
      setCallStatus('calling')

      // Avvia stream locale
      await startLocalStream()

      // Sottoscrivi al canale dell'utente remoto
      subscribeToUser(contact.id)

      // Invia richiesta di chiamata
      sendSignal(contact.id, {
        type: 'call-request',
        from: user.id,
        fromName: `${profile.nome} ${profile.cognome}`,
      })
    },
    [user?.id, profile, setCallStatus, startLocalStream, subscribeToUser, sendSignal]
  )

  // Accetta chiamata in arrivo
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user?.id) return

    setRemoteUserId(incomingCall.from)
    remoteUserIdRef.current = incomingCall.from
    setRemoteUserName(incomingCall.fromName)

    // Avvia stream locale
    await startLocalStream()

    // Sottoscrivi al canale
    subscribeToUser(incomingCall.from)

    // Comunica accettazione
    sendSignal(incomingCall.from, {
      type: 'call-accepted',
      from: user.id,
    })

    setIncomingCall(null)
    setCallStatus('connected')
  }, [incomingCall, user?.id, startLocalStream, subscribeToUser, sendSignal, setCallStatus])

  // Rifiuta chiamata in arrivo
  const rejectCall = useCallback(() => {
    if (!incomingCall || !user?.id) return

    sendSignal(incomingCall.from, {
      type: 'call-rejected',
      from: user.id,
    })

    setIncomingCall(null)
    setCallStatus('idle')
  }, [incomingCall, user?.id, sendSignal, setCallStatus])

  // Chiudi chiamata
  const endCall = useCallback(() => {
    if (remoteUserIdRef.current && user?.id) {
      sendSignal(remoteUserIdRef.current, {
        type: 'call-ended',
        from: user.id,
      })
      unsubscribeFromUser(remoteUserIdRef.current)
    }

    endWebRTC()
    setRemoteUserId(null)
    remoteUserIdRef.current = null
    setRemoteUserName(null)
    setIncomingCall(null)
  }, [user?.id, sendSignal, unsubscribeFromUser, endWebRTC])

  // Non renderizzare nulla se non autenticato
  if (!user?.id) {
    return <>{children}</>
  }

  return (
    <VideoCallContext.Provider
      value={{
        onlineUsers,
        isUserOnline,
        isPresenceConnected,
        contacts,
        isLoadingContacts,
        contactsError,
        refreshContacts,
        showContactList,
        setShowContactList,
        callStatus,
        startCall,
        endCall,
        remoteUserName,
      }}
    >
      {children}

      {/* Chiamata in arrivo */}
      {incomingCall && callStatus === 'ringing' && (
        <IncomingCallAlert
          callerName={incomingCall.fromName}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Finestra video flottante */}
      {(callStatus === 'calling' || callStatus === 'connected') && (
        <FloatingVideoCall
          localStream={localStream}
          remoteStream={remoteStream}
          callerName={remoteUserName || 'Chiamata in corso'}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEnd={endCall}
        />
      )}
    </VideoCallContext.Provider>
  )
}

/**
 * Hook per accedere al contesto videocall
 */
export function useVideoCall() {
  const context = useContext(VideoCallContext)
  if (context === undefined) {
    throw new Error('useVideoCall deve essere usato dentro un VideoCallProvider')
  }
  return context
}
