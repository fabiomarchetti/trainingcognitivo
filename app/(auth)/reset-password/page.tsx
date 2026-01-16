/**
 * Pagina Reset Password
 */
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

function ResetPasswordFallback() {
  return (
    <div className="w-full max-w-md h-64 bg-white rounded-lg shadow animate-pulse" />
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
