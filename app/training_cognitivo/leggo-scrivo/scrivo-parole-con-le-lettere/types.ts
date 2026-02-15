/**
 * Tipi per l'esercizio "Scrivo Parole con le Lettere"
 */

// Singola configurazione parola
export interface ConfigurazioneParola {
  id: string
  parola_target: string
  lettere_disponibili: string[]
  tipo_immagine: 'nessuna' | 'arasaac' | 'upload'
  id_arasaac?: number | null
  url_immagine?: string | null
  created_at?: string
}

// Impostazioni esercizio per utente
export interface ImpostazioniEsercizio {
  numero_prove: number
  tasto_cancella_visibile: boolean
}

// Configurazione completa per un utente
export interface ConfigurazioneUtente {
  impostazioni: ImpostazioniEsercizio
  parole: ConfigurazioneParola[]
}

// Risultato singola prova
export interface RisultatoProva {
  parola: string
  risposta: string
  esito: 'positivo' | 'negativo'
  tempo: number
}

// Sessione esercizio
export interface SessioneEsercizio {
  id_sessione: string
  id_utente: string
  data_inizio: Date
  data_fine?: Date
  risultati: RisultatoProva[]
}

// Pittogramma ARASAAC
export interface PittogrammaArasaac {
  id: number
  name: string
  url: string
  thumbnail: string
}

// Utente
export interface Utente {
  id: string
  nome: string
  cognome: string
}

// Alfabeto italiano
export const ALFABETO_ITALIANO = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Z'
]

// Chiave localStorage per configurazione
export const getConfigKey = (userId: string) => `scrivo_lettere_config_${userId}`
export const getPrefsKey = (userId: string) => `scrivo_lettere_prefs_${userId}`
