/**
 * Tipi TypeScript per l'esercizio Tocca Oggetto
 */

export interface GameImage {
  id: number
  url: string
}

export interface GameConfig {
  num_target: number        // 1-10, quanti target colpire per completare
  num_distrattori: number   // 0-10, numero distrattori presenti
  dimensione: number        // 1=60px, 2=100px, 3=150px, 4=200px
  velocita: number          // 1=lenta, 2=media, 3=veloce
  background_color: string  // colore sfondo area di gioco
  target_images: GameImage[]      // immagini target (ARASAAC)
  distractor_images: GameImage[]  // immagini distrattori (ARASAAC)
}

export interface GameRisultato {
  tipo_risposta: 'target' | 'distrattore'
  esito: 'corretto' | 'errore'
  tempo_ms: number
}

// Mappa velocità → pixel per frame
export const SPEED_MAP: Record<number, number> = {
  1: 0.5,   // Lenta
  2: 1.5,   // Media
  3: 3.0,   // Veloce
}

// Mappa dimensione → pixel
export const SIZE_MAP: Record<number, number> = {
  1: 60,    // Piccola
  2: 100,   // Media
  3: 150,   // Grande
  4: 200,   // Extra Large
}

export const DEFAULT_CONFIG: GameConfig = {
  num_target: 5,
  num_distrattori: 3,
  dimensione: 2,
  velocita: 2,
  background_color: '#e0f2fe',
  target_images: [],
  distractor_images: [],
}
