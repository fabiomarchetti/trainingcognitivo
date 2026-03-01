import { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Indici dei landmark per gli occhi (MediaPipe Face Mesh)
export const EYE_LANDMARKS = {
  // Occhio sinistro (dal punto di vista dell'osservatore)
  leftEye: {
    upper: [159, 145], // Palpebra superiore
    lower: [144, 153], // Palpebra inferiore
    left: 33,          // Angolo esterno
    right: 133,        // Angolo interno
    center: 468,       // Centro iride
    iris: [468, 469, 470, 471, 472], // Punti iride
  },
  // Occhio destro (dal punto di vista dell'osservatore)
  rightEye: {
    upper: [386, 374], // Palpebra superiore
    lower: [373, 380], // Palpebra inferiore
    left: 362,         // Angolo interno
    right: 263,        // Angolo esterno
    center: 473,       // Centro iride
    iris: [473, 474, 475, 476, 477], // Punti iride
  },
};

// Punti specifici per EAR calculation (piu' precisi)
const LEFT_EYE_EAR_POINTS = {
  p1: 33,   // Angolo esterno
  p2: 160,  // Palpebra superiore esterna
  p3: 158,  // Palpebra superiore interna
  p4: 133,  // Angolo interno
  p5: 153,  // Palpebra inferiore interna
  p6: 144,  // Palpebra inferiore esterna
};

const RIGHT_EYE_EAR_POINTS = {
  p1: 362,  // Angolo interno
  p2: 385,  // Palpebra superiore interna
  p3: 387,  // Palpebra superiore esterna
  p4: 263,  // Angolo esterno
  p5: 373,  // Palpebra inferiore esterna
  p6: 380,  // Palpebra inferiore interna
};

export interface EyeMetrics {
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  isBlinking: boolean;
  gazeDirection: {
    horizontal: "left" | "center" | "right";
    vertical: "up" | "center" | "down";
    yaw: number;  // -1 to 1, negative = left
    pitch: number; // -1 to 1, negative = down
  };
  irisPosition: {
    left: { x: number; y: number };
    right: { x: number; y: number };
  };
  pupilDistance: number;
}

export interface BlinkStats {
  blinkCount: number;
  blinkRate: number; // blinks per minute
  avgBlinkDuration: number; // ms
  lastBlinkTime: number;
}

// Calcola la distanza euclidea tra due punti
function distance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow((p1.z || 0) - (p2.z || 0), 2)
  );
}

// Calcola l'Eye Aspect Ratio (EAR)
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
function calculateEAR(
  landmarks: NormalizedLandmark[],
  eyePoints: typeof LEFT_EYE_EAR_POINTS
): number {
  const p1 = landmarks[eyePoints.p1];
  const p2 = landmarks[eyePoints.p2];
  const p3 = landmarks[eyePoints.p3];
  const p4 = landmarks[eyePoints.p4];
  const p5 = landmarks[eyePoints.p5];
  const p6 = landmarks[eyePoints.p6];

  // Distanze verticali
  const vertical1 = distance(p2, p6);
  const vertical2 = distance(p3, p5);

  // Distanza orizzontale
  const horizontal = distance(p1, p4);

  // EAR
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

// Calcola la posizione relativa dell'iride nell'occhio
function calculateIrisPosition(
  landmarks: NormalizedLandmark[],
  eyeConfig: typeof EYE_LANDMARKS.leftEye
): { x: number; y: number } {
  const irisCenter = landmarks[eyeConfig.center];
  const eyeLeft = landmarks[eyeConfig.left];
  const eyeRight = landmarks[eyeConfig.right];
  const eyeUpper = landmarks[eyeConfig.upper[0]];
  const eyeLower = landmarks[eyeConfig.lower[0]];

  // Calcola posizione relativa dell'iride (0-1, dove 0.5 e' il centro)
  const eyeWidth = distance(eyeLeft, eyeRight);
  const eyeHeight = distance(eyeUpper, eyeLower);

  if (eyeWidth === 0 || eyeHeight === 0) {
    return { x: 0.5, y: 0.5 };
  }

  // Posizione orizzontale (0 = sinistra, 1 = destra)
  const horizontalPos = (irisCenter.x - eyeLeft.x) / (eyeRight.x - eyeLeft.x);

  // Posizione verticale (0 = alto, 1 = basso)
  const verticalPos = (irisCenter.y - eyeUpper.y) / (eyeLower.y - eyeUpper.y);

  return {
    x: Math.max(0, Math.min(1, horizontalPos)),
    y: Math.max(0, Math.min(1, verticalPos)),
  };
}

// Determina la direzione dello sguardo
function calculateGazeDirection(
  leftIrisPos: { x: number; y: number },
  rightIrisPos: { x: number; y: number }
): EyeMetrics["gazeDirection"] {
  // Media delle posizioni di entrambi gli occhi
  const avgX = (leftIrisPos.x + rightIrisPos.x) / 2;
  const avgY = (leftIrisPos.y + rightIrisPos.y) / 2;

  // Converti in range -1 to 1 (0.5 diventa 0)
  const yaw = (avgX - 0.5) * 2;
  const pitch = (avgY - 0.5) * 2;

  // Determina direzione categorica
  let horizontal: "left" | "center" | "right" = "center";
  let vertical: "up" | "center" | "down" = "center";

  const threshold = 0.15; // Soglia per considerare "centro"

  if (yaw < -threshold) horizontal = "left";
  else if (yaw > threshold) horizontal = "right";

  if (pitch < -threshold) vertical = "up";
  else if (pitch > threshold) vertical = "down";

  return { horizontal, vertical, yaw, pitch };
}

// Funzione principale per calcolare tutte le metriche oculari
export function calculateEyeMetrics(
  landmarks: NormalizedLandmark[]
): EyeMetrics {
  // Calcola EAR per entrambi gli occhi
  const leftEAR = calculateEAR(landmarks, LEFT_EYE_EAR_POINTS);
  const rightEAR = calculateEAR(landmarks, RIGHT_EYE_EAR_POINTS);
  const avgEAR = (leftEAR + rightEAR) / 2;

  // Soglia per il blink (tipicamente 0.2-0.25)
  const BLINK_THRESHOLD = 0.21;
  const isBlinking = avgEAR < BLINK_THRESHOLD;

  // Calcola posizione iride
  const leftIrisPos = calculateIrisPosition(landmarks, EYE_LANDMARKS.leftEye);
  const rightIrisPos = calculateIrisPosition(landmarks, EYE_LANDMARKS.rightEye);

  // Calcola direzione sguardo
  const gazeDirection = calculateGazeDirection(leftIrisPos, rightIrisPos);

  // Calcola distanza pupillare (puo' indicare la distanza dallo schermo)
  const leftIris = landmarks[EYE_LANDMARKS.leftEye.center];
  const rightIris = landmarks[EYE_LANDMARKS.rightEye.center];
  const pupilDistance = distance(leftIris, rightIris);

  return {
    leftEAR,
    rightEAR,
    avgEAR,
    isBlinking,
    gazeDirection,
    irisPosition: {
      left: leftIrisPos,
      right: rightIrisPos,
    },
    pupilDistance,
  };
}

// Classe per tracciare le statistiche dei blink nel tempo
export class BlinkTracker {
  private blinkCount = 0;
  private blinkTimes: number[] = [];
  private blinkDurations: number[] = [];
  private isCurrentlyBlinking = false;
  private blinkStartTime = 0;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  update(isBlinking: boolean): BlinkStats {
    const now = Date.now();

    if (isBlinking && !this.isCurrentlyBlinking) {
      // Inizio blink
      this.isCurrentlyBlinking = true;
      this.blinkStartTime = now;
    } else if (!isBlinking && this.isCurrentlyBlinking) {
      // Fine blink
      this.isCurrentlyBlinking = false;
      this.blinkCount++;
      this.blinkTimes.push(now);
      this.blinkDurations.push(now - this.blinkStartTime);

      // Mantieni solo gli ultimi 60 secondi di dati
      const oneMinuteAgo = now - 60000;
      while (this.blinkTimes.length > 0 && this.blinkTimes[0] < oneMinuteAgo) {
        this.blinkTimes.shift();
        this.blinkDurations.shift();
      }
    }

    // Calcola statistiche
    const recentBlinks = this.blinkTimes.filter((t) => t > now - 60000).length;
    const blinkRate = recentBlinks; // blinks nell'ultimo minuto

    const avgBlinkDuration =
      this.blinkDurations.length > 0
        ? this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length
        : 0;

    return {
      blinkCount: this.blinkCount,
      blinkRate,
      avgBlinkDuration,
      lastBlinkTime: this.blinkTimes[this.blinkTimes.length - 1] || 0,
    };
  }

  reset(): void {
    this.blinkCount = 0;
    this.blinkTimes = [];
    this.blinkDurations = [];
    this.isCurrentlyBlinking = false;
    this.startTime = Date.now();
  }
}

// Classe per tracciare l'attenzione basata sulla direzione dello sguardo
export class AttentionTracker {
  private gazeHistory: Array<{ yaw: number; pitch: number; time: number }> = [];
  private lookAwayCount = 0;
  private totalFrames = 0;

  update(gazeDirection: EyeMetrics["gazeDirection"]): {
    attentionScore: number;
    isLookingAway: boolean;
    lookAwayCount: number;
  } {
    const now = Date.now();
    this.totalFrames++;

    // Aggiungi alla cronologia
    this.gazeHistory.push({
      yaw: gazeDirection.yaw,
      pitch: gazeDirection.pitch,
      time: now,
    });

    // Mantieni solo gli ultimi 5 secondi
    const fiveSecondsAgo = now - 5000;
    this.gazeHistory = this.gazeHistory.filter((g) => g.time > fiveSecondsAgo);

    // Calcola se sta guardando altrove
    const isLookingAway =
      Math.abs(gazeDirection.yaw) > 0.3 || Math.abs(gazeDirection.pitch) > 0.3;

    if (isLookingAway) {
      this.lookAwayCount++;
    }

    // Calcola punteggio attenzione (0-1)
    // Basato su quanto lo sguardo e' centrato negli ultimi 5 secondi
    if (this.gazeHistory.length === 0) {
      return { attentionScore: 1, isLookingAway, lookAwayCount: this.lookAwayCount };
    }

    const avgDeviation =
      this.gazeHistory.reduce((sum, g) => {
        return sum + Math.sqrt(g.yaw * g.yaw + g.pitch * g.pitch);
      }, 0) / this.gazeHistory.length;

    // Converti deviazione in punteggio (0 deviazione = 1, alta deviazione = 0)
    const attentionScore = Math.max(0, Math.min(1, 1 - avgDeviation));

    return {
      attentionScore,
      isLookingAway,
      lookAwayCount: this.lookAwayCount,
    };
  }

  reset(): void {
    this.gazeHistory = [];
    this.lookAwayCount = 0;
    this.totalFrames = 0;
  }
}
