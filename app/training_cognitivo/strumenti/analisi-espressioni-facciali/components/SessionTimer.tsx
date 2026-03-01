"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SessionTimerProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  isRecording: boolean;
  onSessionEnd: () => void;
  patientSelected: boolean;
  disabled?: boolean;
}

export default function SessionTimer({
  isEnabled,
  onToggle,
  durationMinutes,
  onDurationChange,
  isRecording,
  onSessionEnd,
  patientSelected,
  disabled = false,
}: SessionTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(0);

  // Reset timer quando cambia la durata
  useEffect(() => {
    if (!isRecording) {
      setRemainingSeconds(durationMinutes * 60);
    }
  }, [durationMinutes, isRecording]);

  // Timer countdown
  useEffect(() => {
    if (isRecording && isEnabled) {
      sessionStartRef.current = Date.now();
      setRemainingSeconds(durationMinutes * 60);

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const remaining = durationMinutes * 60 - elapsed;

        if (remaining <= 0) {
          setRemainingSeconds(0);
          onSessionEnd();
          // Reset per nuova sessione
          sessionStartRef.current = Date.now();
          setRemainingSeconds(durationMinutes * 60);
        } else {
          setRemainingSeconds(remaining);
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRecording, isEnabled, durationMinutes, onSessionEnd]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progressPercent = isRecording
    ? ((durationMinutes * 60 - remainingSeconds) / (durationMinutes * 60)) * 100
    : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Registrazione Sessione</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className={`text-sm ${isEnabled ? "text-green-400" : "text-gray-400"}`}>
            {isEnabled ? "Attiva" : "Disattiva"}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggle(e.target.checked)}
              disabled={disabled || !patientSelected}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                isEnabled ? "bg-green-600" : "bg-gray-600"
              } ${disabled || !patientSelected ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => {
                if (!disabled && patientSelected) {
                  onToggle(!isEnabled);
                }
              }}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  isEnabled ? "translate-x-5" : "translate-x-0.5"
                } mt-0.5`}
              />
            </div>
          </div>
        </label>
      </div>

      {!patientSelected && (
        <p className="text-yellow-400 text-sm">
          Seleziona un utente per abilitare la registrazione
        </p>
      )}

      {isEnabled && patientSelected && (
        <>
          {/* Durata */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Durata sessione: {durationMinutes} minuti
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={durationMinutes}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              disabled={isRecording}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 min</span>
              <span>15 min</span>
              <span>30 min</span>
            </div>
          </div>

          {/* Timer/Progress */}
          {isRecording && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Tempo rimanente</span>
                <span className="text-lg font-mono text-white">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-400">Registrazione in corso...</span>
              </div>
            </div>
          )}

          {!isRecording && (
            <p className="text-gray-500 text-sm">
              La registrazione inizia quando avvii la webcam
            </p>
          )}
        </>
      )}
    </div>
  );
}
