/**
 * Form di Login
 */
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
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
          case 'amministratore':
          case 'direttore':
          case 'casemanager':
            destination = '/admin'
            break
          case 'educatore':
            destination = '/dashboard'
            break
          case 'utente':
            destination = '/training'
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Bentornato</CardTitle>
        <CardDescription>
          Inserisci le tue credenziali per accedere
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

          {/* Campo Email */}
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email"
                className="pl-10"
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
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Password"
                className="pl-10"
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
              className="text-sm text-blue-600 hover:underline"
            >
              Password dimenticata?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            {!isLoading && <LogIn className="h-4 w-4" />}
            Accedi
          </Button>

          <p className="text-sm text-center text-gray-600">
            Non hai un account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Registrati
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
