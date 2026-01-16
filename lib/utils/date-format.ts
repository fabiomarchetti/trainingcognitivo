/**
 * Utility per formattazione date in italiano
 * Mantiene compatibilità con il formato legacy (dd/mm/yyyy)
 */

/**
 * Formatta una data ISO in formato italiano dd/mm/yyyy
 */
export function formatDateIt(date: string | Date | null): string {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Formatta una data ISO in formato italiano con ora dd/mm/yyyy HH:mm
 */
export function formatDateTimeIt(date: string | Date | null): string {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Formatta una data ISO in formato italiano completo dd/mm/yyyy HH:mm:ss
 */
export function formatDateTimeFullIt(date: string | Date | null): string {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Converte data formato italiano dd/mm/yyyy a ISO
 */
export function parseItDate(dateStr: string): Date | null {
  if (!dateStr) return null

  const parts = dateStr.split('/')
  if (parts.length !== 3) return null

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)

  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) return null

  return date
}

/**
 * Formatta tempo relativo (es. "2 ore fa", "ieri")
 */
export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'adesso'
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minuto' : 'minuti'} fa`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`
  if (diffDays === 1) return 'ieri'
  if (diffDays < 7) return `${diffDays} giorni fa`

  return formatDateIt(d)
}

/**
 * Nomi mesi in italiano
 */
export const MESI_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

/**
 * Nomi giorni in italiano
 */
export const GIORNI_IT = [
  'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'
]
