/**
 * Form di Login - Stile colorato infanzia
 */
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o password non corretti')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email non confermata. Controlla la tua casella di posta.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('Errore durante il login. Riprova.')
        return
      }

      // Recupera profilo per determinare redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('ruolo')
        .eq('id', authData.user.id)
        .single()

      // Log accesso
      await supabase.from('log_accessi').insert({
        id_utente: authData.user.id,
        email: data.email,
        esito: 'successo',
      })

      // Redirect basato su ruolo
      let destination = redirectTo
      if (profile?.ruolo) {
        switch (profile.ruolo) {
          case 'sviluppatore':
          case 'responsabile_centro':
            destination = '/admin'
            break
          case 'educatore':
            destination = '/dashboard'
            break
          case 'utente':
            destination = '/training'
            break
          case 'visitatore':
            destination = '/demo' // TODO: creare pagina demo
            break
        }
      }

      router.push(destination)
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError('Si è verificato un errore. Riprova più tardi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-4 border-white shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-cyan-400 to-green-400 rounded-2xl flex items-center justify-center mb-2 shadow-xl">
          <Sparkles className="h-8 w-8 text-white animate-pulse" />
        </div>
        <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-green-600">
          Bentornato! 👋
        </CardTitle>
        <CardDescription className="text-lg font-semibold text-gray-600">
          Inserisci le tue credenziali per accedere
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          {/* Messaggio errore */}
          {error && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-700 bg-red-100 rounded-2xl border-2 border-red-300 font-semibold">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Email */}
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-500" />
              <Input
                type="email"
                placeholder="Email"
                className="pl-12 h-14 rounded-2xl border-3 border-gray-300 focus:border-cyan-400 text-lg font-semibold"
                autoComplete="email"
                disabled={isLoading}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>

          {/* Campo Password */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              <Input
                type="password"
                placeholder="Password"
                className="pl-12 h-14 rounded-2xl border-3 border-gray-300 focus:border-green-400 text-lg font-semibold"
                autoComplete="current-password"
                disabled={isLoading}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
          </div>

          {/* Link password dimenticata */}
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
            >
              Password dimenticata? 🔑
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full h-14 bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            size="lg"
            isLoading={isLoading}
          >
            {!isLoading && <LogIn className="h-5 w-5" />}
            {isLoading ? 'Accesso...' : 'Accedi 🚀'}
          </Button>

          <p className="text-sm text-center text-gray-700 font-semibold">
            Non hai un account?{' '}
            <Link href="/register" className="text-cyan-600 hover:underline font-black">
              Registrati ✨
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
