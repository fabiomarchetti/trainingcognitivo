/**
 * Pagina Login
 */
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Accedi',
  description: 'Accedi al sistema TrainingCognitivo',
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-8" />
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  )
}
