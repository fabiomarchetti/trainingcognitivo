/**
 * Pagina Forgot Password
 */
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

function ForgotPasswordFallback() {
  return (
    <div className="w-full max-w-md h-64 bg-white rounded-lg shadow animate-pulse" />
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
