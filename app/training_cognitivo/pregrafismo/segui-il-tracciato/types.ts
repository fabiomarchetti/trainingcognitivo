/**
 * Tipi TypeScript per l'esercizio Segui il Tracciato
 */

export interface PuntoPercent {
  xPercent: number
  yPercent: number
}

export interface Pittogramma {
  arasaac_id: number
  imageUrl: string
  keywords: string[]
}

export interface OggettoPercent extends Pittogramma {
  xPercent: number
  yPercent: number
  sizePercent: number
  isTarget: boolean
}

export interface ConfigSeguiTracciato {
  oggetto: OggettoPercent
  target: OggettoPercent
  tracciato: PuntoPercent[]
  tracciato_color: string
  tracciato_width: number
  tolleranza: number
  canvas_reference: {
    width: number
    height: number
  }
  version: string
}

export interface EsercizioSeguiTracciato {
  id: number
  id_utente: string
  id_educatore: string | null
  nome_esercizio: string
  oggetto_keyword: string | null
  target_keyword: string | null
  configurazione: ConfigSeguiTracciato
  stato: 'attivo' | 'archiviato'
  data_creazione: string
  data_modifica: string | null
}

export interface RisultatoSeguiTracciato {
  tempo_impiegato_ms: number
  precisione_percentuale: number
  errori_fuori_traccia: number
  distanza_media: number
  lunghezza_percorso: number
  ha_raggiunto_target: boolean
  completato: boolean
}
