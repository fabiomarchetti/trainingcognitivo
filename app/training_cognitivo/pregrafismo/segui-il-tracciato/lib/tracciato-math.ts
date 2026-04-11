/**
 * Funzioni matematiche per il tracciato
 * Calcolo distanze, verifica precisione, conversioni percentuali/pixel
 */

import type { PuntoPercent, OggettoPercent, RisultatoSeguiTracciato, ConfigSeguiTracciato } from '../types'

export interface Punto {
  x: number
  y: number
}

export interface OggettoPx {
  x: number
  y: number
  size: number
  imageUrl: string
  keywords: string[]
  isTarget: boolean
  arasaac_id: number
}

/**
 * Converte coordinate percentuali in pixel assoluti
 */
export function percentToPixelOggetto(
  obj: OggettoPercent,
  canvasWidth: number,
  canvasHeight: number
): OggettoPx {
  return {
    arasaac_id: obj.arasaac_id,
    imageUrl: obj.imageUrl,
    keywords: obj.keywords,
    isTarget: obj.isTarget,
    x: (obj.xPercent / 100) * canvasWidth,
    y: (obj.yPercent / 100) * canvasHeight,
    size: (obj.sizePercent / 100) * canvasWidth
  }
}

/**
 * Converte un tracciato (array di punti) da percentuali a pixel
 */
export function percentToPixelTracciato(
  tracciato: PuntoPercent[],
  canvasWidth: number,
  canvasHeight: number
): Punto[] {
  return tracciato.map(p => ({
    x: (p.xPercent / 100) * canvasWidth,
    y: (p.yPercent / 100) * canvasHeight
  }))
}

/**
 * Calcola distanza di un punto da un segmento (lineStart-lineEnd)
 */
export function distanceFromLine(
  point: Punto,
  lineStart: Punto,
  lineEnd: Punto
): number {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx: number
  let yy: number

  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }

  const dx = point.x - xx
  const dy = point.y - yy
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Distanza minima di un punto dalla polyline (tracciato di riferimento).
 * Se il tracciato e' vuoto, calcola distanza dalla linea retta tra centri oggetto/target.
 */
export function distanceFromPolyline(
  point: Punto,
  tracciato: Punto[],
  fallbackStart: Punto,
  fallbackEnd: Punto
): number {
  if (!tracciato || tracciato.length < 2) {
    return distanceFromLine(point, fallbackStart, fallbackEnd)
  }

  let minDistance = Infinity
  for (let i = 0; i < tracciato.length - 1; i++) {
    const d = distanceFromLine(point, tracciato[i], tracciato[i + 1])
    if (d < minDistance) minDistance = d
  }
  return minDistance
}

/**
 * Calcola le metriche finali del tracciato disegnato dall'utente
 */
export function verificaTracciato(
  puntiUtente: Punto[],
  oggetto: OggettoPx,
  target: OggettoPx,
  tracciatoRiferimento: Punto[],
  tolleranza: number,
  startTime: number,
  endTime: number
): RisultatoSeguiTracciato {
  if (puntiUtente.length < 10) {
    return {
      tempo_impiegato_ms: 0,
      precisione_percentuale: 0,
      errori_fuori_traccia: 0,
      distanza_media: 0,
      lunghezza_percorso: 0,
      ha_raggiunto_target: false,
      completato: false
    }
  }

  const centroOggetto: Punto = {
    x: oggetto.x + oggetto.size / 2,
    y: oggetto.y + oggetto.size / 2
  }
  const centroTarget: Punto = {
    x: target.x + target.size / 2,
    y: target.y + target.size / 2
  }

  let totalDistance = 0
  let errori = 0
  let lunghezzaPercorso = 0

  for (let i = 0; i < puntiUtente.length; i++) {
    const p = puntiUtente[i]
    const dist = distanceFromPolyline(p, tracciatoRiferimento, centroOggetto, centroTarget)
    totalDistance += dist
    if (dist > tolleranza) errori++

    if (i > 0) {
      const prev = puntiUtente[i - 1]
      lunghezzaPercorso += Math.hypot(p.x - prev.x, p.y - prev.y)
    }
  }

  const distanzaMedia = totalDistance / puntiUtente.length
  const precisione = Math.max(0, 100 - (distanzaMedia / tolleranza) * 100)
  const tempoImpiegato = endTime - startTime

  // Verifica se ha raggiunto il target
  const lastPoint = puntiUtente[puntiUtente.length - 1]
  const distanzaDaTarget = Math.hypot(
    lastPoint.x - centroTarget.x,
    lastPoint.y - centroTarget.y
  )
  const haRaggiuntoTarget = distanzaDaTarget < target.size / 2

  const completato = haRaggiuntoTarget && precisione >= 50

  return {
    tempo_impiegato_ms: tempoImpiegato,
    precisione_percentuale: parseFloat(precisione.toFixed(2)),
    errori_fuori_traccia: errori,
    distanza_media: parseFloat(distanzaMedia.toFixed(2)),
    lunghezza_percorso: parseFloat(lunghezzaPercorso.toFixed(2)),
    ha_raggiunto_target: haRaggiuntoTarget,
    completato
  }
}

/**
 * Crea una configurazione di default quando tracciato non e' disegnato
 */
export function creaConfigurazioneDefault(
  oggetto: OggettoPercent,
  target: OggettoPercent,
  tracciato: PuntoPercent[],
  canvasWidth: number,
  canvasHeight: number,
  tolleranza: number,
  colore: string,
  spessore: number
): ConfigSeguiTracciato {
  return {
    oggetto,
    target,
    tracciato,
    tracciato_color: colore,
    tracciato_width: spessore,
    tolleranza,
    canvas_reference: {
      width: canvasWidth,
      height: canvasHeight
    },
    version: '1.0'
  }
}
