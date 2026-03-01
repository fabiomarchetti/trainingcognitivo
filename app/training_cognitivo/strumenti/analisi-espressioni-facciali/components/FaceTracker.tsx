"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  calculateEyeMetrics,
  BlinkTracker,
  AttentionTracker,
  EyeMetrics,
  BlinkStats,
} from "../lib/eyeTracking";
import { getBlendshapeLabel } from "../lib/blendshapeLabels";
import { AlertSystem } from "../lib/alertSystem";
import { AlertEvent } from "../lib/storage";
import Dashboard from "./Dashboard";
import AlertPanel from "./AlertPanel";
import CalibrationPanel from "./CalibrationPanel";
import SessionTimer from "./SessionTimer";
import { Menu, Play, Square } from "lucide-react";

interface SessionData {
  startedAt: Date;
  emotionCounts: Record<string, number>;
  totalEmotionSamples: number;
  attentionSum: number;
  attentionSamples: number;
  blinkRateSum: number;
  blinkRateSamples: number;
  totalBlinks: number;
  frameCount: number;
  fpsSum: number;
}

interface BlendshapeData {
  categoryName: string;
  score: number;
}

interface EmotionData {
  emotion: string;
  probability: number;
}

interface EmotionDataPoint {
  time: string;
  timestamp: number;
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

interface EyeTrackingDataPoint {
  time: string;
  timestamp: number;
  blinkRate: number;
  attention: number;
  ear: number;
}

interface FaceTrackerProps {
  utenteNome?: string;
  utenteId?: string;
}

const EMOTION_LABELS: Record<string, string> = {
  neutral: "Neutrale",
  happy: "Felice",
  sad: "Triste",
  angry: "Arrabbiato",
  fearful: "Spaventato",
  disgusted: "Disgustato",
  surprised: "Sorpreso",
};

const EMOTION_COLORS: Record<string, string> = {
  neutral: "bg-gray-500",
  happy: "bg-yellow-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  fearful: "bg-purple-500",
  disgusted: "bg-green-500",
  surprised: "bg-orange-500",
};

const GAZE_LABELS: Record<string, string> = {
  left: "Sinistra",
  center: "Centro",
  right: "Destra",
  up: "Alto",
  down: "Basso",
};

type ViewMode = "monitor" | "dashboard";

export default function FaceTracker({ utenteNome, utenteId }: FaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const blinkTrackerRef = useRef<BlinkTracker>(new BlinkTracker());
  const attentionTrackerRef = useRef<AttentionTracker>(new AttentionTracker());
  const alertSystemRef = useRef<AlertSystem | null>(null);
  const sessionStartRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Inizializzazione...");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [blendshapes, setBlendshapes] = useState<BlendshapeData[]>([]);
  const [emotions, setEmotions] = useState<EmotionData[]>([]);
  const [dominantEmotion, setDominantEmotion] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceApiReady, setFaceApiReady] = useState(false);

  // Eye tracking states
  const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics | null>(null);
  const [blinkStats, setBlinkStats] = useState<BlinkStats | null>(null);
  const [attentionScore, setAttentionScore] = useState<number>(1);
  const [isLookingAway, setIsLookingAway] = useState(false);

  // Dashboard states
  const [viewMode, setViewMode] = useState<ViewMode>("monitor");
  const [emotionHistory, setEmotionHistory] = useState<EmotionDataPoint[]>([]);
  const [eyeTrackingHistory, setEyeTrackingHistory] = useState<EyeTrackingDataPoint[]>([]);
  const [currentEmotions, setCurrentEmotions] = useState<Record<string, number>>({});
  const [sessionDuration, setSessionDuration] = useState(0);

  // Alert states
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  // Calibration panel state
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [emotionThresholds, setEmotionThresholds] = useState<Record<string, number>>({});
  const [enabledEmotions, setEnabledEmotions] = useState<Record<string, boolean>>({
    happy: true,
    sad: true,
    angry: true,
    fearful: true,
    surprised: true,
    disgusted: true,
    neutral: true,
  });

  // Session states
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [sessionDurationSetting, setSessionDurationSetting] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const sessionDataRef = useRef<SessionData | null>(null);

  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const emotionFrameCountRef = useRef<number>(0);
  const historyFrameCountRef = useRef<number>(0);

  // Callback per nuovi alert
  const handleNewAlert = useCallback((alert: AlertEvent) => {
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  // Inizializza sistema alert
  useEffect(() => {
    alertSystemRef.current = new AlertSystem(handleNewAlert);
    return () => {
      alertSystemRef.current = null;
    };
  }, [handleNewAlert]);

  // Riferimento a face-api (importato dinamicamente)
  const faceapiRef = useRef<typeof import("@vladmandic/face-api") | null>(null);

  // Inizializza face-api.js (import dinamico per evitare errori SSR)
  const initializeFaceApi = useCallback(async () => {
    try {
      setLoadingStatus("Caricamento modelli emozioni...");

      // Import dinamico di face-api (solo lato client)
      const faceapi = await import("@vladmandic/face-api");
      faceapiRef.current = faceapi;

      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);

      setFaceApiReady(true);
    } catch (err) {
      console.error("Errore inizializzazione face-api:", err);
    }
  }, []);

  // Inizializza MediaPipe
  const initializeFaceLandmarker = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingStatus("Caricamento MediaPipe...");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      setLoadingStatus("Caricamento modello landmark...");

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      faceLandmarkerRef.current = faceLandmarker;
      await initializeFaceApi();
      setIsLoading(false);
    } catch (err) {
      console.error("Errore inizializzazione:", err);
      setError("Errore nel caricamento. Riprova.");
      setIsLoading(false);
    }
  }, [initializeFaceApi]);

  // Avvia webcam
  const startWebcam = useCallback(async () => {
    try {
      // Reinizializza MediaPipe se necessario
      if (!faceLandmarkerRef.current) {
        await initializeFaceLandmarker();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsRunning(true);
        sessionStartRef.current = Date.now();
        blinkTrackerRef.current.reset();
        attentionTrackerRef.current.reset();
        alertSystemRef.current?.reset();
        setEmotionHistory([]);
        setEyeTrackingHistory([]);
        setAlerts([]);
      }
    } catch (err) {
      console.error("Errore webcam:", err);
      setError("Impossibile accedere alla webcam.");
    }
  }, [initializeFaceLandmarker]);

  // Riferimento per evitare resize continui del canvas
  const canvasInitializedRef = useRef(false);

  // Ferma webcam
  const stopWebcam = useCallback(async () => {
    // Prima ferma l'animation frame per evitare ulteriori accessi al video
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Chiudi MediaPipe FaceLandmarker per rilasciare il riferimento al video
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }

    // Ferma tutte le tracce dello stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.stop();
        stream.removeTrack(track);
      });
      videoRef.current.srcObject = null;

      // Forza il rilascio del video element
      videoRef.current.load();
    }

    // Reset references
    faceapiRef.current = null;
    canvasInitializedRef.current = false;

    setIsRunning(false);
    setFaceDetected(false);
    setFaceApiReady(false);
    setBlendshapes([]);
    setEmotions([]);
    setDominantEmotion(null);
    setEyeMetrics(null);
    setBlinkStats(null);
  }, []);

  // Analizza emozioni
  const analyzeEmotions = useCallback(async () => {
    const faceapi = faceapiRef.current;
    if (!faceApiReady || !videoRef.current || !faceapi) return;

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections?.expressions) {
        const emotionArray: EmotionData[] = Object.entries(detections.expressions)
          .map(([emotion, probability]) => ({
            emotion,
            probability: probability as number,
          }))
          .sort((a, b) => b.probability - a.probability);

        setEmotions(emotionArray);

        // Trova l'emozione dominante solo tra quelle abilitate
        const enabledEmotionArray = emotionArray.filter(
          ({ emotion }) => enabledEmotions[emotion] !== false
        );
        setDominantEmotion(enabledEmotionArray[0]?.emotion || null);

        // Aggiorna emozioni correnti per dashboard
        const emotionsRecord: Record<string, number> = {};
        emotionArray.forEach(({ emotion, probability }) => {
          emotionsRecord[emotion] = probability;
        });
        setCurrentEmotions(emotionsRecord);

        // Check alert per emozioni (solo quelle abilitate)
        const enabledEmotionsRecord: Record<string, number> = {};
        emotionArray
          .filter(({ emotion }) => enabledEmotions[emotion] !== false)
          .forEach(({ emotion, probability }) => {
            enabledEmotionsRecord[emotion] = probability;
          });
        alertSystemRef.current?.checkEmotions(enabledEmotionsRecord);
        alertSystemRef.current?.checkEngagement(enabledEmotionsRecord, attentionScore);
      }
    } catch (err) {
      console.error("Errore analisi emozioni:", err);
    }
  }, [faceApiReady, attentionScore, enabledEmotions]);

  // Aggiorna dati sessione (chiamata durante il loop)
  const updateSessionData = useCallback(
    (emotions: Record<string, number>, attention: number, blinkRate: number, blinks: number, currentFps: number) => {
      if (!sessionDataRef.current) return;

      // Trova l'emozione dominante e incrementa il contatore
      const dominantEmotion = Object.entries(emotions)
        .filter(([key]) => enabledEmotions[key])
        .sort(([, a], [, b]) => b - a)[0];

      if (dominantEmotion) {
        sessionDataRef.current.emotionCounts[dominantEmotion[0]]++;
        sessionDataRef.current.totalEmotionSamples++;
      }

      // Accumula metriche
      sessionDataRef.current.attentionSum += attention;
      sessionDataRef.current.attentionSamples++;
      sessionDataRef.current.blinkRateSum += blinkRate;
      sessionDataRef.current.blinkRateSamples++;
      sessionDataRef.current.totalBlinks = blinks;
      sessionDataRef.current.frameCount++;
      sessionDataRef.current.fpsSum += currentFps;
    },
    [enabledEmotions]
  );

  // Loop principale
  const detectFaces = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !canvas || !faceLandmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Imposta dimensioni canvas solo una volta
    if (!canvasInitializedRef.current || canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvasInitializedRef.current = true;
    }

    const now = performance.now();
    frameCountRef.current++;

    // Calcola FPS
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    // Aggiorna durata sessione
    setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000));

    // Analizza emozioni ogni 10 frame
    emotionFrameCountRef.current++;
    if (emotionFrameCountRef.current >= 10) {
      emotionFrameCountRef.current = 0;
      analyzeEmotions();
    }

    const results: FaceLandmarkerResult = faceLandmarker.detectForVideo(video, now);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Check alert per presenza volto
    alertSystemRef.current?.checkFacePresence(
      results.faceLandmarks && results.faceLandmarks.length > 0
    );

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      setFaceDetected(true);
      const landmarks = results.faceLandmarks[0];
      const drawingUtils = new DrawingUtils(ctx);

      // Disegna landmark
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: "#C0C0C030",
        lineWidth: 1,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
        color: "#30FF30",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
        color: "#30FF30",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {
        color: "#FF3030",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, {
        color: "#FF3030",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
        color: "#FF9090",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
        color: "#9090FF",
        lineWidth: 2,
      });
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
        color: "#9090FF",
        lineWidth: 2,
      });

      // Eye tracking
      const metrics = calculateEyeMetrics(landmarks);
      setEyeMetrics(metrics);

      const stats = blinkTrackerRef.current.update(metrics.isBlinking);
      setBlinkStats(stats);

      const attention = attentionTrackerRef.current.update(metrics.gazeDirection);
      setAttentionScore(attention.attentionScore);
      setIsLookingAway(attention.isLookingAway);

      // Check alert
      alertSystemRef.current?.checkAttention(attention.attentionScore);
      if (stats.blinkRate > 0) {
        alertSystemRef.current?.checkBlinkRate(stats.blinkRate);
      }

      // Indicatore sguardo su canvas
      if (!metrics.isBlinking) {
        const centerX = canvas.width / 2;
        const centerY = 50;
        const radius = 20;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff40";
        ctx.lineWidth = 2;
        ctx.stroke();

        const gazeX = centerX + metrics.gazeDirection.yaw * radius * 0.8;
        const gazeY = centerY + metrics.gazeDirection.pitch * radius * 0.8;

        ctx.beginPath();
        ctx.arc(gazeX, gazeY, 6, 0, Math.PI * 2);
        ctx.fillStyle = isLookingAway ? "#ef4444" : "#22c55e";
        ctx.fill();
      }

      // Blendshapes
      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const shapes = results.faceBlendshapes[0].categories
          .filter((b) => b.score > 0.01)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        setBlendshapes(shapes);

        // Check dolore
        const blendshapeRecord: Record<string, number> = {};
        results.faceBlendshapes[0].categories.forEach((b) => {
          blendshapeRecord[b.categoryName] = b.score;
        });
        alertSystemRef.current?.checkPainIndicators(blendshapeRecord);
      }

      // Aggiorna history per grafici (ogni 30 frame = ~1 secondo)
      historyFrameCountRef.current++;
      if (historyFrameCountRef.current >= 30) {
        historyFrameCountRef.current = 0;
        const timeStr = new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Emotion history
        if (Object.keys(currentEmotions).length > 0) {
          setEmotionHistory((prev) => {
            const newPoint: EmotionDataPoint = {
              time: timeStr,
              timestamp: Date.now(),
              neutral: currentEmotions.neutral || 0,
              happy: currentEmotions.happy || 0,
              sad: currentEmotions.sad || 0,
              angry: currentEmotions.angry || 0,
              fearful: currentEmotions.fearful || 0,
              disgusted: currentEmotions.disgusted || 0,
              surprised: currentEmotions.surprised || 0,
            };
            const updated = [...prev, newPoint];
            return updated.slice(-60); // Ultimi 60 punti (~1 minuto)
          });
        }

        // Eye tracking history
        setEyeTrackingHistory((prev) => {
          const newPoint: EyeTrackingDataPoint = {
            time: timeStr,
            timestamp: Date.now(),
            blinkRate: stats.blinkRate,
            attention: attention.attentionScore,
            ear: metrics.avgEAR,
          };
          const updated = [...prev, newPoint];
          return updated.slice(-60);
        });

        // Aggiorna dati sessione per registrazione
        if (Object.keys(currentEmotions).length > 0) {
          updateSessionData(currentEmotions, attention.attentionScore, stats.blinkRate, stats.blinkCount, fps);
        }
      }
    } else {
      setFaceDetected(false);
      setBlendshapes([]);
      setEyeMetrics(null);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaces);
  }, [analyzeEmotions, isLookingAway, currentEmotions, updateSessionData, fps]);

  // Effects
  useEffect(() => {
    if (isRunning && faceLandmarkerRef.current) {
      detectFaces();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, detectFaces]);

  useEffect(() => {
    initializeFaceLandmarker();
    return () => {
      stopWebcam();
      faceLandmarkerRef.current?.close();
    };
  }, [initializeFaceLandmarker, stopWebcam]);

  // Gestione alert
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  const handleDismissAllAlerts = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  };

  // Inizializza sessione di registrazione
  const initializeSession = useCallback(() => {
    sessionDataRef.current = {
      startedAt: new Date(),
      emotionCounts: {
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0,
        neutral: 0,
      },
      totalEmotionSamples: 0,
      attentionSum: 0,
      attentionSamples: 0,
      blinkRateSum: 0,
      blinkRateSamples: 0,
      totalBlinks: 0,
      frameCount: 0,
      fpsSum: 0,
    };
  }, []);

  // Salva sessione (locale per ora)
  const saveSession = useCallback(async () => {
    if (!sessionDataRef.current) return;

    const data = sessionDataRef.current;
    const now = new Date();

    // Calcola percentuali emozioni
    const total = data.totalEmotionSamples || 1;
    const sessionSummary = {
      utenteId,
      utenteNome,
      startedAt: data.startedAt.toISOString(),
      endedAt: now.toISOString(),
      durationSetting: sessionDurationSetting * 60,
      totalFrames: data.frameCount,
      avgFps: data.frameCount > 0 ? data.fpsSum / data.frameCount : null,
      pctHappy: (data.emotionCounts.happy / total) * 100,
      pctSad: (data.emotionCounts.sad / total) * 100,
      pctAngry: (data.emotionCounts.angry / total) * 100,
      pctFearful: (data.emotionCounts.fearful / total) * 100,
      pctDisgusted: (data.emotionCounts.disgusted / total) * 100,
      pctSurprised: (data.emotionCounts.surprised / total) * 100,
      pctNeutral: (data.emotionCounts.neutral / total) * 100,
      avgBlinkRate: data.blinkRateSamples > 0 ? data.blinkRateSum / data.blinkRateSamples : null,
      avgAttention: data.attentionSamples > 0 ? data.attentionSum / data.attentionSamples : null,
      totalBlinks: data.totalBlinks,
      enabledEmotions,
    };

    // Salva in localStorage per ora
    try {
      const sessions = JSON.parse(localStorage.getItem("analisi_facciale_sessions") || "[]");
      sessions.push(sessionSummary);
      localStorage.setItem("analisi_facciale_sessions", JSON.stringify(sessions));
      console.log("Sessione salvata localmente:", sessionSummary);
    } catch (err) {
      console.error("Errore salvataggio sessione:", err);
    }

    // Reinizializza per nuova sessione
    initializeSession();
  }, [utenteId, utenteNome, sessionDurationSetting, enabledEmotions, initializeSession]);

  // Handler fine sessione dal timer
  const handleSessionEnd = useCallback(() => {
    saveSession();
  }, [saveSession]);

  // Gestione avvio/stop registrazione
  useEffect(() => {
    if (isRunning && timerEnabled && utenteId) {
      setIsRecording(true);
      initializeSession();
    } else {
      if (isRecording && sessionDataRef.current && sessionDataRef.current.totalEmotionSamples > 0) {
        // Salva sessione parziale se si ferma prima del timer
        saveSession();
      }
      setIsRecording(false);
    }
  }, [isRunning, timerEnabled, utenteId, initializeSession, saveSession, isRecording]);

  return (
    <div className="space-y-6">
      {/* Calibration Panel */}
      <CalibrationPanel
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        onThresholdsChange={setEmotionThresholds}
        onEnabledEmotionsChange={setEnabledEmotions}
        currentEmotions={currentEmotions}
      />

      {/* Tab di navigazione */}
      <div className="flex items-center gap-2">
        {/* Hamburger button */}
        <button
          onClick={() => setIsCalibrationOpen(true)}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Calibrazione"
        >
          <Menu className="w-6 h-6" />
        </button>

        <button
          onClick={() => setViewMode("monitor")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "monitor"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Monitor
        </button>
        <button
          onClick={() => setViewMode("dashboard")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "dashboard"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Dashboard
        </button>
      </div>

      {/* Info utente e Timer */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Info utente */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Utente:</span>
            <span className="text-white font-medium">{utenteNome || "Non selezionato"}</span>
          </div>
          <SessionTimer
            isEnabled={timerEnabled}
            onToggle={setTimerEnabled}
            durationMinutes={sessionDurationSetting}
            onDurationChange={setSessionDurationSetting}
            isRecording={isRecording}
            onSessionEnd={handleSessionEnd}
            patientSelected={!!utenteId}
            disabled={isRunning}
          />
        </div>
      </div>

      {viewMode === "monitor" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isRunning ? (faceDetected ? "bg-green-500" : "bg-yellow-500") : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm text-gray-400">
                    {isLoading
                      ? loadingStatus
                      : isRunning
                      ? faceDetected
                        ? "Volto rilevato"
                        : "In attesa..."
                      : "Webcam spenta"}
                  </span>
                </div>
                {isRunning && <span className="text-sm text-gray-500">{fps} FPS</span>}
              </div>

              <div className="relative aspect-video bg-black overflow-hidden">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain scale-x-[-1]"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-contain scale-x-[-1]"
                />

                {isRunning && faceDetected && dominantEmotion && enabledEmotions[dominantEmotion] !== false && (
                  <div className="absolute top-4 left-4">
                    <div
                      className={`px-4 py-2 rounded-full ${
                        EMOTION_COLORS[dominantEmotion] || "bg-gray-500"
                      } text-white font-semibold text-lg shadow-lg`}
                    >
                      {EMOTION_LABELS[dominantEmotion] || dominantEmotion}
                    </div>
                  </div>
                )}

                {isRunning && faceDetected && eyeMetrics?.isBlinking && (
                  <div className="absolute top-4 right-4">
                    <div className="px-3 py-1 rounded-full bg-cyan-500 text-white text-sm font-medium animate-pulse">
                      Blink
                    </div>
                  </div>
                )}

                {!isRunning && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-500 text-lg">Premi &quot;Avvia&quot; per iniziare</p>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400">{loadingStatus}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-800">
                {error && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={isRunning ? stopWebcam : startWebcam}
                    disabled={isLoading}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      isLoading
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : isRunning
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Square className="w-4 h-4" /> Ferma
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Avvia
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Eye Tracking */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Eye Tracking</h2>
              {eyeMetrics ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Direzione sguardo</span>
                      <span className="text-white">
                        {GAZE_LABELS[eyeMetrics.gazeDirection.horizontal]},{" "}
                        {GAZE_LABELS[eyeMetrics.gazeDirection.vertical]}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <div className="relative w-20 h-20 rounded-full border-2 border-gray-700 bg-gray-800">
                        <div
                          className={`absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ${
                            isLookingAway ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{
                            left: `${50 + eyeMetrics.gazeDirection.yaw * 35}%`,
                            top: `${50 + eyeMetrics.gazeDirection.pitch * 35}%`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Apertura occhi</span>
                      <span className="text-gray-500">{(eyeMetrics.avgEAR * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-100 ${
                          eyeMetrics.isBlinking ? "bg-cyan-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(eyeMetrics.avgEAR * 300, 100)}%` }}
                      />
                    </div>
                  </div>

                  {blinkStats && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">{blinkStats.blinkCount}</div>
                        <div className="text-xs text-gray-500">Blink totali</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">{blinkStats.blinkRate}</div>
                        <div className="text-xs text-gray-500">Blink/min</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Attenzione</span>
                      <span
                        className={`font-medium ${
                          attentionScore > 0.7
                            ? "text-green-400"
                            : attentionScore > 0.4
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {(attentionScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          attentionScore > 0.7
                            ? "bg-green-500"
                            : attentionScore > 0.4
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${attentionScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {isRunning ? "Rilevo occhi..." : "Avvia la webcam"}
                </p>
              )}
            </div>

            {/* Emozioni */}
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Emozioni</h2>
                <span className="text-xs text-gray-500">
                  {Object.values(enabledEmotions).filter(Boolean).length} attive
                </span>
              </div>
              {emotions.length > 0 ? (
                <div className="space-y-2">
                  {emotions
                    .filter(({ emotion }) => enabledEmotions[emotion] !== false)
                    .slice(0, 7)
                    .map(({ emotion, probability }) => (
                      <div key={emotion}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{EMOTION_LABELS[emotion] || emotion}</span>
                          <span className="text-gray-500">{(probability * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              EMOTION_COLORS[emotion] || "bg-gray-500"
                            }`}
                            style={{ width: `${probability * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {isRunning ? (faceApiReady ? "Analisi..." : "Caricamento...") : "Avvia la webcam"}
                </p>
              )}
            </div>

            {/* Blendshapes */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Movimenti Facciali</h2>
              {blendshapes.length > 0 ? (
                <div className="space-y-2">
                  {blendshapes.map((shape) => (
                    <div key={shape.categoryName}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 truncate max-w-[140px]">
                          {getBlendshapeLabel(shape.categoryName)}
                        </span>
                        <span className="text-gray-500">{(shape.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-100"
                          style={{ width: `${shape.score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {isRunning ? "Nessun volto" : "Avvia la webcam"}
                </p>
              )}
            </div>

            {/* Alert */}
            <AlertPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onDismissAll={handleDismissAllAlerts}
            />
          </div>
        </div>
      ) : (
        <Dashboard
          emotionHistory={emotionHistory}
          eyeTrackingHistory={eyeTrackingHistory}
          currentEmotions={currentEmotions}
          sessionDuration={sessionDuration}
          enabledEmotions={enabledEmotions}
        />
      )}
    </div>
  );
}
