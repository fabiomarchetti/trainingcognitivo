import { AlertEvent, AlertType, saveAlert } from "./storage";

// Configurazione soglie per gli alert
export interface AlertThresholds {
  // Emozioni
  sadnessDuration: number; // ms di tristezza continua prima di alert
  sadnessThreshold: number; // soglia probabilita' tristezza (0-1)

  // Attenzione
  lowAttentionDuration: number; // ms di bassa attenzione
  lowAttentionThreshold: number; // soglia attenzione (0-1)

  // Blink
  minBlinkRate: number; // blink/min minimo (sotto = anomalo)
  maxBlinkRate: number; // blink/min massimo (sopra = anomalo)

  // Inattivita'
  inactivityDuration: number; // ms senza volto rilevato

  // Dolore (basato su blendshapes)
  painThreshold: number; // soglia combinata per indicatori dolore

  // Engagement
  lowEngagementDuration: number;
  lowEngagementThreshold: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  sadnessDuration: 120000, // 2 minuti
  sadnessThreshold: 0.4,

  lowAttentionDuration: 60000, // 1 minuto
  lowAttentionThreshold: 0.4,

  minBlinkRate: 8, // sotto 8/min e' anomalo
  maxBlinkRate: 30, // sopra 30/min e' anomalo

  inactivityDuration: 300000, // 5 minuti

  painThreshold: 0.5,

  lowEngagementDuration: 180000, // 3 minuti
  lowEngagementThreshold: 0.3,
};

// Stato interno del sistema di alert
interface AlertState {
  sadnessStartTime: number | null;
  lowAttentionStartTime: number | null;
  inactivityStartTime: number | null;
  lowEngagementStartTime: number | null;
  lastAlertTimes: Record<AlertType, number>;
}

// Cooldown tra alert dello stesso tipo (evita spam)
const ALERT_COOLDOWN = 300000; // 5 minuti

export class AlertSystem {
  private state: AlertState = {
    sadnessStartTime: null,
    lowAttentionStartTime: null,
    inactivityStartTime: null,
    lowEngagementStartTime: null,
    lastAlertTimes: {} as Record<AlertType, number>,
  };

  private thresholds: AlertThresholds;
  private onAlert: (alert: AlertEvent) => void;

  constructor(
    onAlert: (alert: AlertEvent) => void,
    thresholds: AlertThresholds = DEFAULT_THRESHOLDS
  ) {
    this.onAlert = onAlert;
    this.thresholds = thresholds;
  }

  // Aggiorna le soglie
  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // Controlla se un alert puo' essere emesso (rispetta il cooldown)
  private canEmitAlert(type: AlertType): boolean {
    const lastTime = this.state.lastAlertTimes[type] || 0;
    return Date.now() - lastTime > ALERT_COOLDOWN;
  }

  // Emetti un alert
  private emitAlert(
    type: AlertType,
    severity: "low" | "medium" | "high",
    message: string
  ): void {
    if (!this.canEmitAlert(type)) return;

    const alert: AlertEvent = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      severity,
      message,
      acknowledged: false,
    };

    this.state.lastAlertTimes[type] = Date.now();
    this.onAlert(alert);
    saveAlert(alert);
  }

  // Analizza le emozioni per alert
  checkEmotions(emotions: Record<string, number>): void {
    const now = Date.now();
    const sadness = emotions.sad || 0;

    // Tristezza prolungata
    if (sadness >= this.thresholds.sadnessThreshold) {
      if (!this.state.sadnessStartTime) {
        this.state.sadnessStartTime = now;
      } else if (now - this.state.sadnessStartTime >= this.thresholds.sadnessDuration) {
        this.emitAlert(
          "prolonged_sadness",
          "medium",
          `Rilevata tristezza prolungata per oltre ${Math.round(
            this.thresholds.sadnessDuration / 60000
          )} minuti`
        );
        this.state.sadnessStartTime = now; // Reset per evitare alert continui
      }
    } else {
      this.state.sadnessStartTime = null;
    }
  }

  // Analizza attenzione per alert
  checkAttention(attentionScore: number): void {
    const now = Date.now();

    if (attentionScore < this.thresholds.lowAttentionThreshold) {
      if (!this.state.lowAttentionStartTime) {
        this.state.lowAttentionStartTime = now;
      } else if (
        now - this.state.lowAttentionStartTime >=
        this.thresholds.lowAttentionDuration
      ) {
        this.emitAlert(
          "low_attention",
          "low",
          `Attenzione bassa rilevata per oltre ${Math.round(
            this.thresholds.lowAttentionDuration / 60000
          )} minuti`
        );
        this.state.lowAttentionStartTime = now;
      }
    } else {
      this.state.lowAttentionStartTime = null;
    }
  }

  // Analizza blink rate per alert
  checkBlinkRate(blinkRate: number): void {
    if (blinkRate > 0) {
      // Solo se stiamo effettivamente monitorando
      if (blinkRate < this.thresholds.minBlinkRate) {
        this.emitAlert(
          "abnormal_blink_rate",
          "medium",
          `Frequenza ammiccamento bassa: ${blinkRate} blink/min (normale: 15-20)`
        );
      } else if (blinkRate > this.thresholds.maxBlinkRate) {
        this.emitAlert(
          "abnormal_blink_rate",
          "low",
          `Frequenza ammiccamento alta: ${blinkRate} blink/min (normale: 15-20)`
        );
      }
    }
  }

  // Analizza inattivita' (nessun volto rilevato)
  checkFacePresence(faceDetected: boolean): void {
    const now = Date.now();

    if (!faceDetected) {
      if (!this.state.inactivityStartTime) {
        this.state.inactivityStartTime = now;
      } else if (
        now - this.state.inactivityStartTime >=
        this.thresholds.inactivityDuration
      ) {
        this.emitAlert(
          "prolonged_inactivity",
          "high",
          `Nessun volto rilevato per oltre ${Math.round(
            this.thresholds.inactivityDuration / 60000
          )} minuti`
        );
        this.state.inactivityStartTime = now;
      }
    } else {
      this.state.inactivityStartTime = null;
    }
  }

  // Analizza blendshapes per indicatori di dolore
  checkPainIndicators(blendshapes: Record<string, number>): void {
    // Indicatori di dolore basati su FACS Action Units:
    // AU4: brow lowerer (browDownLeft/Right)
    // AU6: cheek raiser (cheekSquintLeft/Right)
    // AU7: lid tightener (eyeSquintLeft/Right)
    // AU9: nose wrinkler (noseSneerLeft/Right)
    // AU43: eyes closed (eyeBlinkLeft/Right prolungato)

    const painIndicators = [
      blendshapes.browDownLeft || 0,
      blendshapes.browDownRight || 0,
      blendshapes.cheekSquintLeft || 0,
      blendshapes.cheekSquintRight || 0,
      blendshapes.eyeSquintLeft || 0,
      blendshapes.eyeSquintRight || 0,
      blendshapes.noseSneerLeft || 0,
      blendshapes.noseSneerRight || 0,
    ];

    const avgPainScore =
      painIndicators.reduce((a, b) => a + b, 0) / painIndicators.length;

    if (avgPainScore >= this.thresholds.painThreshold) {
      this.emitAlert(
        "pain_detected",
        "high",
        `Possibili indicatori di dolore rilevati (score: ${(avgPainScore * 100).toFixed(0)}%)`
      );
    }
  }

  // Analizza engagement complessivo
  checkEngagement(
    emotions: Record<string, number>,
    attentionScore: number
  ): void {
    const now = Date.now();

    // Engagement basso = emozioni neutre + bassa attenzione + assenza di sorriso
    const neutral = emotions.neutral || 0;
    const happy = emotions.happy || 0;

    const engagementScore =
      (1 - neutral) * 0.3 + happy * 0.3 + attentionScore * 0.4;

    if (engagementScore < this.thresholds.lowEngagementThreshold) {
      if (!this.state.lowEngagementStartTime) {
        this.state.lowEngagementStartTime = now;
      } else if (
        now - this.state.lowEngagementStartTime >=
        this.thresholds.lowEngagementDuration
      ) {
        this.emitAlert(
          "low_engagement",
          "medium",
          `Basso coinvolgimento rilevato per oltre ${Math.round(
            this.thresholds.lowEngagementDuration / 60000
          )} minuti`
        );
        this.state.lowEngagementStartTime = now;
      }
    } else {
      this.state.lowEngagementStartTime = null;
    }
  }

  // Reset dello stato
  reset(): void {
    this.state = {
      sadnessStartTime: null,
      lowAttentionStartTime: null,
      inactivityStartTime: null,
      lowEngagementStartTime: null,
      lastAlertTimes: {} as Record<AlertType, number>,
    };
  }
}

// Messaggi per tipo di alert
export const ALERT_MESSAGES: Record<AlertType, { title: string; icon: string }> = {
  prolonged_sadness: {
    title: "Tristezza Prolungata",
    icon: ":(", // Evito emoji
  },
  low_attention: {
    title: "Attenzione Bassa",
    icon: "[!]",
  },
  abnormal_blink_rate: {
    title: "Frequenza Blink Anomala",
    icon: "o_o",
  },
  prolonged_inactivity: {
    title: "Inattivita' Prolungata",
    icon: "[X]",
  },
  pain_detected: {
    title: "Possibile Dolore",
    icon: "[+]",
  },
  low_engagement: {
    title: "Basso Coinvolgimento",
    icon: "[-]",
  },
};

// Colori per severita'
export const SEVERITY_COLORS = {
  low: "bg-yellow-500",
  medium: "bg-orange-500",
  high: "bg-red-500",
};
