"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface EmotionThreshold {
  id: string;
  label: string;
  labelEn: string;
  value: number;
  color: string;
  description: string;
  enabled: boolean;
}

interface CalibrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onThresholdsChange: (thresholds: Record<string, number>) => void;
  onEnabledEmotionsChange: (enabled: Record<string, boolean>) => void;
  currentEmotions?: Record<string, number>;
}

const DEFAULT_THRESHOLDS: EmotionThreshold[] = [
  {
    id: "happy",
    label: "Felicita",
    labelEn: "Happy",
    value: 0.5,
    color: "bg-yellow-500",
    description: "Soglia minima per rilevare felicita",
    enabled: true,
  },
  {
    id: "sad",
    label: "Tristezza",
    labelEn: "Sad",
    value: 0.5,
    color: "bg-blue-500",
    description: "Soglia minima per rilevare tristezza",
    enabled: true,
  },
  {
    id: "angry",
    label: "Rabbia",
    labelEn: "Angry",
    value: 0.5,
    color: "bg-red-500",
    description: "Soglia minima per rilevare rabbia",
    enabled: true,
  },
  {
    id: "fearful",
    label: "Paura",
    labelEn: "Fearful",
    value: 0.5,
    color: "bg-purple-500",
    description: "Soglia minima per rilevare paura",
    enabled: true,
  },
  {
    id: "surprised",
    label: "Sorpresa",
    labelEn: "Surprised",
    value: 0.5,
    color: "bg-orange-500",
    description: "Soglia minima per rilevare sorpresa",
    enabled: true,
  },
  {
    id: "disgusted",
    label: "Disgusto",
    labelEn: "Disgusted",
    value: 0.5,
    color: "bg-green-500",
    description: "Soglia minima per rilevare disgusto",
    enabled: true,
  },
  {
    id: "neutral",
    label: "Neutrale",
    labelEn: "Neutral",
    value: 0.5,
    color: "bg-gray-500",
    description: "Soglia minima per rilevare stato neutrale",
    enabled: true,
  },
];

export default function CalibrationPanel({
  isOpen,
  onClose,
  onThresholdsChange,
  onEnabledEmotionsChange,
  currentEmotions = {},
}: CalibrationPanelProps) {
  const [thresholds, setThresholds] = useState<EmotionThreshold[]>(DEFAULT_THRESHOLDS);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Carica thresholds e enabled da localStorage
  useEffect(() => {
    const savedThresholds = localStorage.getItem("emotionThresholds");
    const savedEnabled = localStorage.getItem("emotionEnabled");

    if (savedThresholds || savedEnabled) {
      try {
        const parsedThresholds = savedThresholds ? JSON.parse(savedThresholds) : {};
        const parsedEnabled = savedEnabled ? JSON.parse(savedEnabled) : {};

        setThresholds((prev) =>
          prev.map((t) => ({
            ...t,
            value: parsedThresholds[t.id] ?? t.value,
            enabled: parsedEnabled[t.id] ?? t.enabled,
          }))
        );
      } catch (e) {
        console.error("Errore caricamento configurazione:", e);
      }
    }
  }, []);

  // Notifica i cambiamenti delle soglie
  useEffect(() => {
    const thresholdMap: Record<string, number> = {};
    thresholds.forEach((t) => {
      thresholdMap[t.id] = t.value;
    });
    onThresholdsChange(thresholdMap);
  }, [thresholds, onThresholdsChange]);

  // Notifica i cambiamenti delle emozioni abilitate
  useEffect(() => {
    const enabledMap: Record<string, boolean> = {};
    thresholds.forEach((t) => {
      enabledMap[t.id] = t.enabled;
    });
    onEnabledEmotionsChange(enabledMap);
  }, [thresholds, onEnabledEmotionsChange]);

  const handleThresholdChange = (id: string, value: number) => {
    setThresholds((prev) =>
      prev.map((t) => (t.id === id ? { ...t, value } : t))
    );
  };

  const handleEnabledChange = (id: string, enabled: boolean) => {
    setThresholds((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled } : t))
    );
  };

  const handleSelectAll = () => {
    setThresholds((prev) => prev.map((t) => ({ ...t, enabled: true })));
  };

  const handleSelectNone = () => {
    setThresholds((prev) => prev.map((t) => ({ ...t, enabled: false })));
  };

  const handleSave = useCallback(() => {
    setSaveStatus("saving");

    const thresholdMap: Record<string, number> = {};
    const enabledMap: Record<string, boolean> = {};
    thresholds.forEach((t) => {
      thresholdMap[t.id] = t.value;
      enabledMap[t.id] = t.enabled;
    });

    try {
      localStorage.setItem("emotionThresholds", JSON.stringify(thresholdMap));
      localStorage.setItem("emotionEnabled", JSON.stringify(enabledMap));
      setSaveStatus("saved");

      // Chiudi il pannello dopo 800ms
      setTimeout(() => {
        setSaveStatus("idle");
        onClose();
      }, 800);
    } catch (e) {
      console.error("Errore salvataggio:", e);
      setSaveStatus("idle");
    }
  }, [thresholds, onClose]);

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    localStorage.removeItem("emotionThresholds");
    localStorage.removeItem("emotionEnabled");
  };

  const enabledCount = thresholds.filter((t) => t.enabled).length;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 border-r border-gray-700 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Calibrazione</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-140px)]">
          <p className="text-sm text-gray-400 mb-4">
            Seleziona le emozioni da monitorare e regola le soglie di sensibilita.
          </p>

          {/* Selezione rapida */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
            <span className="text-sm text-gray-300">
              {enabledCount} di {thresholds.length} attive
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                Tutte
              </button>
              <button
                onClick={handleSelectNone}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                Nessuna
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {thresholds.map((threshold) => {
              const currentValue = currentEmotions[threshold.id] || 0;
              const isAboveThreshold = currentValue >= threshold.value;

              return (
                <div
                  key={threshold.id}
                  className={`p-3 rounded-lg border transition-all ${
                    threshold.enabled
                      ? "border-gray-600 bg-gray-800/50"
                      : "border-gray-800 bg-gray-900/50 opacity-50"
                  }`}
                >
                  {/* Header con checkbox */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={threshold.enabled}
                        onChange={(e) =>
                          handleEnabledChange(threshold.id, e.target.checked)
                        }
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500
                          focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900
                          cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${threshold.color} ${
                            !threshold.enabled && "opacity-50"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            threshold.enabled ? "text-white" : "text-gray-500"
                          }`}
                        >
                          {threshold.label}
                        </span>
                      </div>
                    </label>
                    {threshold.enabled && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          isAboveThreshold
                            ? "bg-green-900 text-green-300"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {(currentValue * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Slider (solo se abilitato) */}
                  {threshold.enabled && (
                    <>
                      <div className="relative mt-3">
                        {/* Barra del valore corrente (sotto lo slider) */}
                        <div className="absolute top-1/2 left-0 h-1 bg-gray-700 rounded-full w-full -translate-y-1/2" />
                        <div
                          className={`absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 transition-all ${threshold.color} opacity-40`}
                          style={{ width: `${currentValue * 100}%` }}
                        />

                        {/* Slider input */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={threshold.value * 100}
                          onChange={(e) =>
                            handleThresholdChange(threshold.id, parseInt(e.target.value) / 100)
                          }
                          className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-10
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-white
                            [&::-webkit-slider-thumb]:shadow-lg
                            [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-webkit-slider-thumb]:border-2
                            [&::-webkit-slider-thumb]:border-gray-300
                            [&::-moz-range-thumb]:w-4
                            [&::-moz-range-thumb]:h-4
                            [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-white
                            [&::-moz-range-thumb]:shadow-lg
                            [&::-moz-range-thumb]:cursor-pointer
                            [&::-moz-range-thumb]:border-2
                            [&::-moz-range-thumb]:border-gray-300"
                        />
                      </div>

                      {/* Range labels */}
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>+ Sensibile</span>
                        <span className="text-gray-400">
                          Soglia: {(threshold.value * 100).toFixed(0)}%
                        </span>
                        <span>- Sensibile</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={saveStatus !== "idle"}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus !== "idle"}
              className={`flex-1 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                saveStatus === "saved"
                  ? "bg-green-600 text-white"
                  : saveStatus === "saving"
                  ? "bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {saveStatus === "saved" ? (
                <span className="flex items-center justify-center gap-2">
                  Salvato!
                </span>
              ) : saveStatus === "saving" ? (
                "Salvataggio..."
              ) : (
                "Salva"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
