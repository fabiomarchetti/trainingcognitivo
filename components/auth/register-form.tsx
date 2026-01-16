/**
 * Form di Registrazione
 * Nota: La registrazione autonoma è limitata. Gli admin creano gli account dal pannello.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function RegisterForm() {
  const router = useRouter()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nome: '',
      cognome: '',
      email: '',
      password: '',
      confirmPassword: '',
      ruolo: 'utente',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Registra utente con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome: data.nome,
            cognome: data.cognome,
            ruolo: data.ruolo,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Questa email è già registrata')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('Errore durante la registrazione. Riprova.')
        return
      }

      // Mostra messaggio di successo
      setSuccess(true)

      // Se email confirmation è disabilitata, redirect immediato
      if (authData.session) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      console.error('Register error:', err)
      setError('Si è verificato un errore. Riprova più tardi.')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostra messaggio di successo se registrazione completata
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Registrazione completata!
            </h2>
            <p className="text-gray-600">
              Ti abbiamo inviato un&apos;email di conferma. Clicca sul link per attivare il tuo account.
            </p>
            <Link href="/login">
              <Button className="mt-4">Vai al Login</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Crea un account</CardTitle>
        <CardDescription>
          Inserisci i tuoi dati per registrarti
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

          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Nome"
                className="pl-10"
                autoComplete="given-name"
                disabled={isLoading}
                error={errors.nome?.message}
                {...register('nome')}
              />
            </div>
            <Input
              type="text"
              placeholder="Cognome"
              autoComplete="family-name"
              disabled={isLoading}
              error={errors.cognome?.message}
              {...register('cognome')}
            />
          </div>

          {/* Campo Email */}
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

          {/* Campo Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="password"
              placeholder="Password (min. 8 caratteri)"
              className="pl-10"
              autoComplete="new-password"
              disabled={isLoading}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          {/* Conferma Password */}
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

          {/* Note sulla privacy */}
          <p className="text-xs text-gray-500 text-center">
            Registrandoti accetti i nostri{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Termini di Servizio
            </Link>{' '}
            e la{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            {!isLoading && <UserPlus className="h-4 w-4" />}
            Registrati
          </Button>

          <p className="text-sm text-center text-gray-600">
            Hai già un account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Accedi
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
