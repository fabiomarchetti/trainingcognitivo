/**
 * Utility per combinare classi CSS con supporto Tailwind
 * Usa clsx per la logica condizionale e tailwind-merge per evitare conflitti
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
