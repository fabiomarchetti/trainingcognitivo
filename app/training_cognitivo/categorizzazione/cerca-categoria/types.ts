/**
 * Tipi TypeScript per l'esercizio Cerca Categoria
 */

export interface Pittogramma {
  id: number
  url: string
}

export interface EsercizioCategoria {
  id: number
  id_utente: string
  id_educatore: string
  frase_tts: string
  categoria_target: string
  immagini_target: Pittogramma[]
  immagini_distrattori: Pittogramma[]
  stato: 'attiva' | 'archiviata'
  data_creazione: string
}

export interface RisultatoClick {
  id_pittogramma: number
  url_pittogramma: string
  tipo_risposta: 'target' | 'distrattore'
  risultato: 'positivo' | 'negativo'
  tempo_risposta_ms: number
}
