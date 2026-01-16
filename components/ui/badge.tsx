/**
 * Componente Badge per stati e etichette
 */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-cyan-100 text-cyan-800',
        purple: 'bg-purple-100 text-purple-800',
        outline: 'border border-gray-300 bg-transparent text-gray-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

/**
 * Badge per stati account/sede/esercizio
 */
interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    attivo: 'success',
    attiva: 'success',
    sospeso: 'warning',
    sospesa: 'warning',
    in_formazione: 'info' as 'warning',
    eliminato: 'danger',
    chiusa: 'danger',
    archiviato: 'default',
  }

  const labels: Record<string, string> = {
    attivo: 'Attivo',
    attiva: 'Attiva',
    sospeso: 'Sospeso',
    sospesa: 'Sospesa',
    in_formazione: 'In formazione',
    eliminato: 'Eliminato',
    chiusa: 'Chiusa',
    archiviato: 'Archiviato',
  }

  return (
    <Badge variant={variants[status] || 'default'} className={className}>
      {labels[status] || status}
    </Badge>
  )
}

/**
 * Badge per ruoli utente
 */
interface RoleBadgeProps {
  role: string
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const variants: Record<string, 'primary' | 'purple' | 'success' | 'info' | 'warning' | 'default'> = {
    sviluppatore: 'purple',
    amministratore: 'danger' as 'primary',
    direttore: 'primary',
    casemanager: 'info',
    educatore: 'success',
    utente: 'default',
  }

  const labels: Record<string, string> = {
    sviluppatore: 'Sviluppatore',
    amministratore: 'Admin',
    direttore: 'Direttore',
    casemanager: 'Case Manager',
    educatore: 'Educatore',
    utente: 'Utente',
  }

  return (
    <Badge variant={variants[role] || 'default'} className={className}>
      {labels[role] || role}
    </Badge>
  )
}

export { Badge, badgeVariants }
