/**
 * Form per reimpostare la password - Stile colorato infanzia
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, AlertCircle, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  // Verifica e processa il token di recovery dall'URL
  useEffect(() => {
    const processRecoveryToken = async () => {
      const supabase = createClient()

      // Ottieni i parametri dall'URL
      const code = searchParams.get('code')

      if (code) {
        // Processa il codice di recovery
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Error exchanging code:', exchangeError)
          setIsValidSession(false)
          return
        }
      }

      // Verifica che ci sia una sessione valida
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
    }

    processRecoveryToken()

    // Ascolta eventi auth per catturare il token di recovery
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [searchParams])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        if (updateError.message.includes('same as')) {
          setError('La nuova password deve essere diversa da quella precedente')
        } else {
          setError(updateError.message)
        }
        return
      }

      setIsSuccess(true)

      // Redirect al login dopo 3 secondi
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('Si è verificato un errore. Riprova più tardi.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isValidSession === null) {
    return (
      <Card className="w-full max-w-md border-4 border-white shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-200 border-t-cyan-600" />
            <p className="text-gray-600 font-semibold">Caricamento...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sessione non valida
  if (!isValidSession) {
    return (
      <Card className="w-full max-w-md border-4 border-white shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-400 to-orange-400 rounded-2xl flex items-center justify-center mb-2 shadow-xl">
            <AlertCircle className="h-8 w-8 text-white animate-pulse" />
          </div>
          <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600">
            Link non valido ⚠️
          </CardTitle>
          <CardDescription className="text-lg font-semibold text-gray-600">
            Il link per reimpostare la password non è valido o è scaduto.
            Richiedi un nuovo link.
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link href="/forgot-password" className="w-full">
            <Button className="w-full h-14 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
              Richiedi nuovo link 🔑
            </Button>
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 hover:underline font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna al login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Mostra messaggio di successo
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md border-4 border-white shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center mb-2 shadow-xl">
            <CheckCircle className="h-8 w-8 text-white animate-pulse" />
          </div>
          <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
            Password aggiornata! 🎉
          </CardTitle>
          <CardDescription className="text-lg font-semibold text-gray-600">
            La tua password è stata reimpostata con successo.
            Verrai reindirizzato al login...
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full h-14 bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
              Vai al login 🚀
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-4 border-white shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-cyan-400 to-green-400 rounded-2xl flex items-center justify-center mb-2 shadow-xl">
          <Sparkles className="h-8 w-8 text-white animate-pulse" />
        </div>
        <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-green-600">
          Nuova password 🔐
        </CardTitle>
        <CardDescription className="text-lg font-semibold text-gray-600">
          Inserisci la tua nuova password
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

          {/* Campo Password */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-500" />
              <Input
                type="password"
                placeholder="Nuova password"
                className="pl-12 h-14 rounded-2xl border-3 border-gray-300 focus:border-cyan-400 text-lg font-semibold"
                autoComplete="new-password"
                disabled={isLoading}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
          </div>

          {/* Campo Conferma Password */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              <Input
                type="password"
                placeholder="Conferma password"
                className="pl-12 h-14 rounded-2xl border-3 border-gray-300 focus:border-green-400 text-lg font-semibold"
                autoComplete="new-password"
                disabled={isLoading}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600 font-semibold">
            La password deve contenere almeno 8 caratteri
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full h-14 bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            size="lg"
            isLoading={isLoading}
          >
            {isLoading ? 'Aggiornamento...' : 'Reimposta password 🚀'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
