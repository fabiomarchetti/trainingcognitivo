/**
 * Form per richiesta reset password - Stile colorato infanzia
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, AlertCircle, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setIsSuccess(true)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('Si è verificato un errore. Riprova più tardi.')
    } finally {
      setIsLoading(false)
    }
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
            Email inviata! 📧
          </CardTitle>
          <CardDescription className="text-lg font-semibold text-gray-600">
            Abbiamo inviato un link per reimpostare la password alla tua email.
            Controlla la tua casella di posta.
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full h-14 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
              <ArrowLeft className="h-5 w-5" />
              Torna al login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-4 border-white shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-2xl flex items-center justify-center mb-2 shadow-xl">
          <KeyRound className="h-8 w-8 text-white animate-pulse" />
        </div>
        <CardTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600">
          Password dimenticata? 🔑
        </CardTitle>
        <CardDescription className="text-lg font-semibold text-gray-600">
          Inserisci la tua email e ti invieremo un link per reimpostare la password
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
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full h-14 bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            size="lg"
            isLoading={isLoading}
          >
            {isLoading ? 'Invio...' : 'Invia link di reset 🚀'}
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 hover:underline font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna al login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
