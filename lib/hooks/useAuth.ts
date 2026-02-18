/**
 * Hook per gestione autenticazione
 *
 * Segue i pattern fondamentali per evitare AbortError e loop infiniti:
 * - Client Supabase stabile con useRef
 * - isLoadingRef per prevenire chiamate concorrenti
 * - hasLoadedRef per evitare ricaricamenti multipli
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: Error | null
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  // Stato
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  })

  // Refs per evitare problemi
  const supabaseRef = useRef(createClient())
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const isMountedRef = useRef(true)

  // Carica sessione iniziale
  const loadSession = useCallback(async () => {
    // Evita chiamate multiple
    if (isLoadingRef.current || hasLoadedRef.current) return

    isLoadingRef.current = true

    try {
      const { data: { session }, error } = await supabaseRef.current.auth.getSession()

      if (error) throw error

      if (isMountedRef.current) {
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          isLoading: false,
          error: null,
        })
        hasLoadedRef.current = true
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error,
        }))
      }
    } finally {
      isLoadingRef.current = false
    }
  }, [])

  // Effetto per caricare sessione e ascoltare cambiamenti
  useEffect(() => {
    isMountedRef.current = true

    // Carica sessione iniziale
    loadSession()

    // Ascolta cambiamenti auth
    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return

        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session: session ?? null,
          isLoading: false,
        }))
      }
    )

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [loadSession])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabaseRef.current.auth.signOut()
      if (error) throw error

      if (isMountedRef.current) {
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
        })
        hasLoadedRef.current = false
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error }))
      }
    }
  }, [])

  // Refresh sessione
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabaseRef.current.auth.refreshSession()

      if (error) throw error

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session: session ?? null,
          error: null,
        }))
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error }))
      }
    }
  }, [])

  return {
    ...state,
    signOut,
    refreshSession,
  }
}
