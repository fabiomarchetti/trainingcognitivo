/**
 * Form per reimpostare la password
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function ResetPasswordForm() {
  const router = useRouter()
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

  // Verifica che ci sia una sessione di recovery valida
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Se c'è una sessione, l'utente può reimpostare la password
      setIsValidSession(!!session)
    }

    checkSession()

    // Ascolta eventi auth per catturare il token di recovery
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
      <Card className="w-full max-w-md">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sessione non valida
  if (!isValidSession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Link non valido</CardTitle>
          <CardDescription>
            Il link per reimpostare la password non è valido o è scaduto.
            Richiedi un nuovo link.
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link href="/forgot-password" className="w-full">
            <Button className="w-full">
              Richiedi nuovo link
            </Button>
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Password aggiornata</CardTitle>
          <CardDescription>
            La tua password è stata reimpostata con successo.
            Verrai reindirizzato al login...
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full">
              Vai al login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Nuova password</CardTitle>
        <CardDescription>
          Inserisci la tua nuova password
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Messaggio errore */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Password */}
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Nuova password"
                className="pl-10"
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
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Conferma password"
                className="pl-10"
                autoComplete="new-password"
                disabled={isLoading}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            La password deve contenere almeno 8 caratteri
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Reimposta password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
