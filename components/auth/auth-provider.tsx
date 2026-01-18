/**
 * Auth Provider
 * Context per gestione autenticazione client-side
 */
'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile, RuoloUtente } from '@/lib/supabase/types'

interface AuthUser extends User {
  profile?: Profile | null
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carica profilo utente
  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data as Profile)
    }

    return data as Profile | null
  }

  // Refresh profilo
  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id)
    }
  }

  // Logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
      // Forza redirect con window.location per assicurare il reload completo
      window.location.href = '/'
    } catch (error) {
      console.error('Errore logout:', error)
      // Anche in caso di errore, redirect alla home
      window.location.href = '/'
    }
  }

  // Init e listener auth state
  useEffect(() => {
    console.log('[AUTH PROVIDER] Init')

    const initAuth = async () => {
      setIsLoading(true)

      try {
        console.log('[AUTH PROVIDER] Getting session...')
        // Ottieni sessione corrente
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[AUTH PROVIDER] Errore getSession:', error)
          setIsLoading(false)
          return
        }

        console.log('[AUTH PROVIDER] Session retrieved:', !!currentSession)

        if (currentSession?.user) {
          setSession(currentSession)
          const profileData = await loadProfile(currentSession.user.id)
          setUser({
            ...currentSession.user,
            profile: profileData,
          })
        }
      } catch (error: any) {
        console.error('[AUTH PROVIDER] Errore init:', error)
        // Ignora AbortError - succede durante navigazione
        if (error?.name !== 'AbortError') {
          console.error('[AUTH PROVIDER] Errore non-abort:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listener per cambiamenti auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AUTH PROVIDER] Auth state changed:', event)
        setSession(newSession)

        if (event === 'SIGNED_IN' && newSession?.user) {
          const profileData = await loadProfile(newSession.user.id)
          setUser({
            ...newSession.user,
            profile: profileData,
          })
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          setUser(prev => prev ? { ...prev, ...newSession.user } : null)
        }
      }
    )

    return () => {
      console.log('[AUTH PROVIDER] Cleanup')
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook per accedere al contesto auth
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth deve essere usato dentro un AuthProvider')
  }

  return context
}

/**
 * Hook per verificare se l'utente ha un determinato ruolo
 */
export function useHasRole(roles: RuoloUtente | RuoloUtente[]) {
  const { profile } = useAuth()

  if (!profile?.ruolo) return false

  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(profile.ruolo)
}

/**
 * Hook per verificare se l'utente è admin (sviluppatore, amministratore, direttore, casemanager)
 */
export function useIsAdmin() {
  return useHasRole(['sviluppatore', 'amministratore', 'direttore', 'casemanager'])
}

/**
 * Hook per verificare se l'utente è sviluppatore
 */
export function useIsDeveloper() {
  return useHasRole('sviluppatore')
}
