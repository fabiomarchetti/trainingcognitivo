/**
 * Bottone "Chiama" per operatori
 * Da inserire accanto a ogni utente nella rubrica/dashboard
 */
'use client'

import { Phone } from 'lucide-react'
import { useVideoCall } from './VideoCallProvider'
import type { Contact } from '@/lib/hooks/useContactList'

interface CallButtonProps {
  contact: Contact
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export default function CallButton({
  contact,
  size = 'sm',
  showLabel = false,
}: CallButtonProps) {
  const { startCall, callStatus } = useVideoCall()

  const isDisabled =
    !contact.isOnline ||
    (callStatus !== 'idle' && callStatus !== 'ended')

  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      onClick={() => startCall(contact)}
      disabled={isDisabled}
      className={`inline-flex items-center gap-2 rounded-full transition-colors ${
        isDisabled
          ? 'cursor-not-allowed bg-gray-100 text-gray-300'
          : 'bg-green-100 text-green-700 hover:bg-green-200'
      } ${showLabel ? 'px-3 py-1.5' : `${sizeClasses} justify-center`}`}
      title={
        !contact.isOnline
          ? `${contact.nome} non e online`
          : `Chiama ${contact.nome} ${contact.cognome}`
      }
      aria-label={`Chiama ${contact.nome} ${contact.cognome}`}
    >
      <Phone className={iconSize} />
      {showLabel && (
        <span className="text-sm font-medium">Chiama</span>
      )}
    </button>
  )
}
