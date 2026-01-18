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
    console.log('[AUTH PROVIDER] Logout iniziato')
    try {
      // Cancella stato locale PRIMA del signOut per evitare race conditions
      setUser(null)
      setSession(null)
      setProfile(null)

      // SignOut da Supabase con scope local (cancella solo questo dispositivo)
      const { error } = await supabase.auth.signOut({ scope: 'local' })

      if (error) {
        console.error('[AUTH PROVIDER] Errore signOut Supabase:', error)
      } else {
        console.log('[AUTH PROVIDER] SignOut Supabase completato')
      }

      // Piccolo delay per dare tempo a Supabase di cancellare cookies/storage
      await new Promise(resolve => setTimeout(resolve, 100))

      // Redirect al login
      console.log('[AUTH PROVIDER] Redirect al login')
      window.location.href = '/login'
    } catch (error) {
      console.error('[AUTH PROVIDER] Errore logout:', error)
      // Anche in caso di errore, pulisci e redirect
      setUser(null)
      setSession(null)
      setProfile(null)
      window.location.href = '/login'
    }
  }

  // Init e listener auth state
  useEffect(() => {
    console.log('[AUTH PROVIDER] Init')
    let isMounted = true
    let subscription: any = null

    const initAuth = async () => {
      if (!isMounted) return
      setIsLoading(true)

      try {
        console.log('[AUTH PROVIDER] Getting session...')
        // Ottieni sessione corrente
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (!isMounted) {
          console.log('[AUTH PROVIDER] Component unmounted, skipping')
          return
        }

        if (error) {
          console.error('[AUTH PROVIDER] Errore getSession:', error)
          setIsLoading(false)
          return
        }

        console.log('[AUTH PROVIDER] Session retrieved:', !!currentSession)

        if (currentSession?.user && isMounted) {
          setSession(currentSession)
          const profileData = await loadProfile(currentSession.user.id)
          if (isMounted) {
            setUser({
              ...currentSession.user,
              profile: profileData,
            })
          }
        }
      } catch (error: any) {
        if (!isMounted) return
        console.error('[AUTH PROVIDER] Errore init:', error)
        // Ignora AbortError - succede durante navigazione
        if (error?.name !== 'AbortError' && error?.message?.indexOf('AbortError') === -1) {
          console.error('[AUTH PROVIDER] Errore non-abort:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Setup auth state listener
    const setupListener = () => {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!isMounted) return
          console.log('[AUTH PROVIDER] Auth state changed:', event)
          setSession(newSession)

          if (event === 'SIGNED_IN' && newSession?.user && isMounted) {
            const profileData = await loadProfile(newSession.user.id)
            if (isMounted) {
              setUser({
                ...newSession.user,
                profile: profileData,
              })
            }
          } else if (event === 'SIGNED_OUT' && isMounted) {
            setUser(null)
            setProfile(null)
          } else if (event === 'TOKEN_REFRESHED' && newSession?.user && isMounted) {
            setUser(prev => prev ? { ...prev, ...newSession.user } : null)
          }
        }
      )
      subscription = data.subscription
    }

    initAuth()
    setupListener()

    return () => {
      console.log('[AUTH PROVIDER] Cleanup')
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
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
