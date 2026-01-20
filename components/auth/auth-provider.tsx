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

    // Cancella stato React immediatamente
    setUser(null)
    setSession(null)
    setProfile(null)

    // Prova signOut Supabase con timeout
    try {
      console.log('[AUTH PROVIDER] Chiamata signOut Supabase...')

      // Promise con timeout di 2 secondi
      const signOutPromise = supabase.auth.signOut({ scope: 'local' })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )

      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any

      if (error) {
        console.error('[AUTH PROVIDER] Errore signOut Supabase:', error)
      } else {
        console.log('[AUTH PROVIDER] SignOut Supabase OK')
      }
    } catch (error: any) {
      if (error?.message === 'Timeout') {
        console.warn('[AUTH PROVIDER] SignOut Supabase timeout - procedo comunque')
      } else {
        console.error('[AUTH PROVIDER] Catch errore signOut:', error)
      }
    }

    // Forza cancellazione manuale da localStorage
    console.log('[AUTH PROVIDER] Pulizia manuale localStorage...')
    try {
      // Supabase salva la sessione in chiavi che iniziano con 'sb-'
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith('sb-') || key.includes('supabase')
      )

      if (keysToRemove.length === 0) {
        console.log('[AUTH PROVIDER] Nessuna chiave da rimuovere')
      } else {
        keysToRemove.forEach(key => {
          console.log('[AUTH PROVIDER] Rimuovo chiave:', key)
          localStorage.removeItem(key)
        })
        console.log('[AUTH PROVIDER] localStorage pulito -', keysToRemove.length, 'chiavi rimosse')
      }
    } catch (error) {
      console.error('[AUTH PROVIDER] Errore pulizia localStorage:', error)
    }

    // Forza anche cancellazione cookies se possibile
    try {
      console.log('[AUTH PROVIDER] Tentativo pulizia cookies...')
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim()
        if (name.startsWith('sb-') || name.includes('supabase')) {
          console.log('[AUTH PROVIDER] Rimuovo cookie:', name)
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
      console.log('[AUTH PROVIDER] Cookies puliti')
    } catch (error) {
      console.error('[AUTH PROVIDER] Errore pulizia cookies:', error)
    }

    // Redirect FORZATO al login
    console.log('[AUTH PROVIDER] Redirect al login in 200ms...')
    setTimeout(() => {
      console.log('[AUTH PROVIDER] Eseguo redirect a /login')
      window.location.href = '/login'
    }, 200)
  }

  // Init e listener auth state
  useEffect(() => {
    console.log('[AUTH PROVIDER] Init - Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    })
    let isMounted = true
    let subscription: any = null

    const initAuth = async () => {
      if (!isMounted) return

      // Non usiamo più getSession() perché in produzione è troppo lento
      // Ci affidiamo completamente al listener onAuthStateChange
      console.log('[AUTH PROVIDER] Init - Attendo listener per sessione...')

      // Safety timeout: se dopo 10 secondi non abbiamo sessione, usciamo da loading
      const safetyTimeout = setTimeout(() => {
        if (isMounted) {
          console.warn('[AUTH PROVIDER] Nessuna sessione dopo 10s, esco da loading')
          setIsLoading(false)
        }
      }, 10000)

      // Cleanup del timeout quando la sessione arriva dal listener
      return () => clearTimeout(safetyTimeout)
    }

    // Setup auth state listener
    const setupListener = () => {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!isMounted) return
          console.log('[AUTH PROVIDER] Auth state changed:', event, 'hasSession:', !!newSession)

          setSession(newSession)

          if (event === 'INITIAL_SESSION') {
            // Prima sessione caricata - esci da loading
            console.log('[AUTH PROVIDER] Sessione iniziale caricata')
            if (newSession?.user && isMounted) {
              const profileData = await loadProfile(newSession.user.id)
              console.log('[AUTH PROVIDER] Profile caricato:', !!profileData, profileData?.ruolo)
              if (isMounted) {
                setUser({
                  ...newSession.user,
                  profile: profileData,
                })
              }
            }
            if (isMounted) {
              console.log('[AUTH PROVIDER] Fine init da listener, isLoading -> false')
              setIsLoading(false)
            }
          } else if (event === 'SIGNED_IN' && newSession?.user && isMounted) {
            const profileData = await loadProfile(newSession.user.id)
            if (isMounted) {
              setUser({
                ...newSession.user,
                profile: profileData,
              })
              setIsLoading(false)
            }
          } else if (event === 'SIGNED_OUT' && isMounted) {
            setUser(null)
            setProfile(null)
            setIsLoading(false)
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
