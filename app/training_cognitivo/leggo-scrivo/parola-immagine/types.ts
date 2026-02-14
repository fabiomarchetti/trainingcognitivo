/**
 * Tipi per esercizio Parola-Immagine
 */

export interface Coppia {
  id: number
  id_utente: string  // UUID
  parola_target: string
  id_pittogramma_target: number | null
  url_immagine_target: string
  parola_distrattore: string
  id_pittogramma_distrattore: number | null
  url_immagine_distrattore: string
  stato: 'attiva' | 'archiviata'
  data_creazione: string
}

export interface Risultato {
  parola: string
  esito: 'corretto' | 'errato'
  tempo: number
  posizione_target: 'top' | 'bottom'
  immagine_cliccata: 'target' | 'distrattore'
}

export interface Impostazioni {
  id_utente: string  // UUID
  numero_prove: number
}

export interface StatisticheParola {
  correct: number
  wrong: number
  total: number
}

export interface AppState {
  // Utente
  currentUserId: string | null  // UUID
  currentUserName: string

  // Esercizio
  pairs: Coppia[]
  usedPairsIndices: number[]
  currentPairIndex: number
  currentPair: Coppia | null
  targetPosition: 'top' | 'bottom' | null

  // Sessione
  sessionId: string
  totalTrials: number
  currentTrial: number
  results: Risultato[]

  // Stato
  isStarted: boolean
  isWaiting: boolean
  trialStartTime: number | null
}
