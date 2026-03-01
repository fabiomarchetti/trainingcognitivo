// Storage locale per dati di monitoraggio facciale
// Usa localStorage per semplicita' (senza dipendenza da localforage)

const STORAGE_PREFIX = "analisi_facciale_";

// Tipi per i dati salvati
export interface EmotionSnapshot {
  timestamp: number;
  emotions: Record<string, number>;
  dominantEmotion: string;
}

export interface EyeTrackingSnapshot {
  timestamp: number;
  blinkCount: number;
  blinkRate: number;
  attentionScore: number;
  gazeYaw: number;
  gazePitch: number;
  avgEAR: number;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  emotionSnapshots: EmotionSnapshot[];
  eyeTrackingSnapshots: EyeTrackingSnapshot[];
  summary?: SessionSummary;
}

export interface SessionSummary {
  duration: number; // ms
  avgEmotions: Record<string, number>;
  dominantEmotionOverall: string;
  totalBlinks: number;
  avgBlinkRate: number;
  avgAttention: number;
  alerts: AlertEvent[];
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  type: AlertType;
  severity: "low" | "medium" | "high";
  message: string;
  acknowledged: boolean;
}

export type AlertType =
  | "prolonged_sadness"
  | "low_attention"
  | "abnormal_blink_rate"
  | "prolonged_inactivity"
  | "pain_detected"
  | "low_engagement";

// Genera ID univoco per sessione
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper per leggere da localStorage
function getStorageItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

// Helper per scrivere su localStorage
function setStorageItem(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("Errore salvataggio localStorage:", e);
  }
}

// Salva sessione
export async function saveSession(session: SessionData): Promise<void> {
  setStorageItem(`session_${session.id}`, session);

  // Aggiorna indice sessioni
  const sessionIds = getStorageItem<string[]>("session_ids") || [];
  if (!sessionIds.includes(session.id)) {
    sessionIds.push(session.id);
    setStorageItem("session_ids", sessionIds);
  }
}

// Carica sessione
export async function loadSession(id: string): Promise<SessionData | null> {
  return getStorageItem<SessionData>(`session_${id}`);
}

// Carica tutte le sessioni
export async function loadAllSessions(): Promise<SessionData[]> {
  const sessionIds = getStorageItem<string[]>("session_ids") || [];
  const sessions: SessionData[] = [];

  for (const id of sessionIds) {
    const session = getStorageItem<SessionData>(`session_${id}`);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions.sort((a, b) => b.startTime - a.startTime);
}

// Elimina sessione
export async function deleteSession(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_PREFIX + `session_${id}`);

  const sessionIds = getStorageItem<string[]>("session_ids") || [];
  const updatedIds = sessionIds.filter((sid) => sid !== id);
  setStorageItem("session_ids", updatedIds);
}

// Calcola sommario sessione
export function calculateSessionSummary(session: SessionData): SessionSummary {
  const duration = (session.endTime || Date.now()) - session.startTime;

  // Media emozioni
  const emotionSums: Record<string, number> = {};
  let emotionCount = 0;

  for (const snapshot of session.emotionSnapshots) {
    for (const [emotion, value] of Object.entries(snapshot.emotions)) {
      emotionSums[emotion] = (emotionSums[emotion] || 0) + value;
    }
    emotionCount++;
  }

  const avgEmotions: Record<string, number> = {};
  for (const [emotion, sum] of Object.entries(emotionSums)) {
    avgEmotions[emotion] = sum / emotionCount;
  }

  // Trova emozione dominante
  const dominantEmotionOverall = Object.entries(avgEmotions).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "neutral";

  // Statistiche eye tracking
  const eyeSnapshots = session.eyeTrackingSnapshots;
  const totalBlinks = eyeSnapshots[eyeSnapshots.length - 1]?.blinkCount || 0;
  const avgBlinkRate =
    eyeSnapshots.reduce((sum, s) => sum + s.blinkRate, 0) / eyeSnapshots.length || 0;
  const avgAttention =
    eyeSnapshots.reduce((sum, s) => sum + s.attentionScore, 0) / eyeSnapshots.length || 0;

  return {
    duration,
    avgEmotions,
    dominantEmotionOverall,
    totalBlinks,
    avgBlinkRate,
    avgAttention,
    alerts: [],
  };
}

// Salva alert
export async function saveAlert(alert: AlertEvent): Promise<void> {
  const alerts = getStorageItem<AlertEvent[]>("alerts") || [];
  alerts.push(alert);
  setStorageItem("alerts", alerts);
}

// Carica alert
export async function loadAlerts(): Promise<AlertEvent[]> {
  return getStorageItem<AlertEvent[]>("alerts") || [];
}

// Riconosci alert
export async function acknowledgeAlert(alertId: string): Promise<void> {
  const alerts = getStorageItem<AlertEvent[]>("alerts") || [];
  const updatedAlerts = alerts.map((a) =>
    a.id === alertId ? { ...a, acknowledged: true } : a
  );
  setStorageItem("alerts", updatedAlerts);
}

// Esporta dati in JSON
export async function exportData(): Promise<string> {
  const sessions = await loadAllSessions();
  const alerts = await loadAlerts();

  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      sessions,
      alerts,
    },
    null,
    2
  );
}

// Pulisci tutti i dati
export async function clearAllData(): Promise<void> {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}
