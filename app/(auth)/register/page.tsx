/**
 * Pagina Registrazione
 * Nota: Registrazione disponibile solo per admin che creano nuovi utenti
 */
import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Registrazione',
  description: 'Registra un nuovo account TrainingCognitivo',
}

export default function RegisterPage() {
  return <RegisterForm />
}
