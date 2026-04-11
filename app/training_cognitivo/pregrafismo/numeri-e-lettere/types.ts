/**
 * Tipi TypeScript per l'esercizio Numeri e Lettere
 */

export type TipoCarattere = 'numero' | 'lettera'

export interface Pittogramma {
  id: number
  url: string
  keyword: string
}

export interface ConfigNumeriLettere {
  tipo: TipoCarattere
  carattere: string
  nome_carattere: string
  pittogramma: Pittogramma | null
  colonne: number
  righe: number
  righe_guida: number
  mostra_pittogrammi: boolean
}

export interface EsercizioNumeriLettere {
  id: number
  id_utente: string
  id_educatore: string | null
  nome_esercizio: string
  tipo: TipoCarattere
  carattere: string
  nome_carattere: string | null
  pittogramma_id: number | null
  pittogramma_url: string | null
  pittogramma_keyword: string | null
  colonne: number
  righe: number
  righe_guida: number
  mostra_pittogrammi: boolean
  configurazione: ConfigNumeriLettere | null
  stato: 'attivo' | 'archiviato'
  data_creazione: string
  data_modifica: string | null
}
