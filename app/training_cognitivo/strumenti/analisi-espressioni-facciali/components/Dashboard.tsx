"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

interface DashboardProps {
  emotionHistory: EmotionDataPoint[];
  eyeTrackingHistory: EyeTrackingDataPoint[];
  currentEmotions: Record<string, number>;
  sessionDuration: number; // in seconds
  enabledEmotions?: Record<string, boolean>;
}

const EMOTION_COLORS: Record<string, string> = {
  neutral: "#6b7280",
  happy: "#eab308",
  sad: "#3b82f6",
  angry: "#ef4444",
  fearful: "#a855f7",
  disgusted: "#22c55e",
  surprised: "#f97316",
};

const EMOTION_LABELS: Record<string, string> = {
  neutral: "Neutrale",
  happy: "Felice",
  sad: "Triste",
  angry: "Arrabbiato",
  fearful: "Spaventato",
  disgusted: "Disgustato",
  surprised: "Sorpreso",
};

export default function Dashboard({
  emotionHistory,
  eyeTrackingHistory,
  currentEmotions,
  sessionDuration,
  enabledEmotions = {},
}: DashboardProps) {
  // Lista delle emozioni abilitate
  const activeEmotions = useMemo(() => {
    const allEmotions = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"];
    // Se enabledEmotions e' vuoto, mostra tutte
    if (Object.keys(enabledEmotions).length === 0) return allEmotions;
    return allEmotions.filter((e) => enabledEmotions[e] !== false);
  }, [enabledEmotions]);

  // Prepara dati per il grafico a torta delle emozioni medie
  const emotionPieData = useMemo(() => {
    if (emotionHistory.length === 0) return [];

    const avgEmotions: Record<string, number> = {};

    for (const emotion of activeEmotions) {
      const sum = emotionHistory.reduce(
        (acc, point) => acc + (point[emotion as keyof EmotionDataPoint] as number || 0),
        0
      );
      avgEmotions[emotion] = sum / emotionHistory.length;
    }

    return Object.entries(avgEmotions)
      .filter(([, value]) => value > 0.01)
      .map(([emotion, value]) => ({
        name: EMOTION_LABELS[emotion] || emotion,
        value: Math.round(value * 100),
        color: EMOTION_COLORS[emotion] || "#666",
        emotion,
      }))
      .sort((a, b) => b.value - a.value);
  }, [emotionHistory, activeEmotions]);

  // Statistiche sessione
  const stats = useMemo(() => {
    if (eyeTrackingHistory.length === 0) {
      return { avgBlinkRate: 0, avgAttention: 0, totalBlinks: 0 };
    }

    const avgBlinkRate =
      eyeTrackingHistory.reduce((acc, p) => acc + p.blinkRate, 0) /
      eyeTrackingHistory.length;

    const avgAttention =
      eyeTrackingHistory.reduce((acc, p) => acc + p.attention, 0) /
      eyeTrackingHistory.length;

    // Stima blink totali dalla durata e rate medio
    const totalBlinks = Math.round((avgBlinkRate * sessionDuration) / 60);

    return { avgBlinkRate, avgAttention, totalBlinks };
  }, [eyeTrackingHistory, sessionDuration]);

  // Formatta durata
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Statistiche rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Durata Sessione</div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(sessionDuration)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Blink Stimati</div>
          <div className="text-2xl font-bold text-cyan-400">{stats.totalBlinks}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Blink Rate Medio</div>
          <div className="text-2xl font-bold text-cyan-400">
            {stats.avgBlinkRate.toFixed(1)}/min
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Attenzione Media</div>
          <div
            className={`text-2xl font-bold ${
              stats.avgAttention > 0.7
                ? "text-green-400"
                : stats.avgAttention > 0.4
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {(stats.avgAttention * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico emozioni nel tempo */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Emozioni nel Tempo</h3>
          {emotionHistory.length > 1 && activeEmotions.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={emotionHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  formatter={(value, name) => [
                    `${((Number(value) || 0) * 100).toFixed(0)}%`,
                    EMOTION_LABELS[name as string] || name,
                  ]}
                />
                {activeEmotions.map((emotion) => (
                  <Area
                    key={emotion}
                    type="monotone"
                    dataKey={emotion}
                    stackId="1"
                    stroke={EMOTION_COLORS[emotion]}
                    fill={EMOTION_COLORS[emotion]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              {activeEmotions.length === 0 ? "Nessuna emozione selezionata" : "Dati insufficienti"}
            </div>
          )}
        </div>

        {/* Distribuzione emozioni */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Distribuzione Emozioni</h3>
          {emotionPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={emotionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {emotionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${Number(value) || 0}%`]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Dati insufficienti
            </div>
          )}
          {/* Legenda */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {emotionPieData.slice(0, 4).map((entry) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grafico attenzione e blink */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Attenzione e Blink Rate</h3>
          {eyeTrackingHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={eyeTrackingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                <YAxis yAxisId="left" stroke="#22c55e" fontSize={10} domain={[0, 1]} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#06b6d4"
                  fontSize={10}
                  domain={[0, 40]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="attention"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Attenzione"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="blinkRate"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name="Blink/min"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Dati insufficienti
            </div>
          )}
        </div>

        {/* Emozioni correnti */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Emozioni Correnti</h3>
          {Object.keys(currentEmotions).length > 0 && activeEmotions.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={Object.entries(currentEmotions)
                  .filter(([emotion]) => activeEmotions.includes(emotion))
                  .map(([emotion, value]) => ({
                    name: EMOTION_LABELS[emotion] || emotion,
                    value: Math.round(value * 100),
                    fill: EMOTION_COLORS[emotion] || "#666",
                    emotion,
                  }))
                  .sort((a, b) => b.value - a.value)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={10} domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={10}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${Number(value) || 0}%`]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {Object.entries(currentEmotions)
                    .filter(([emotion]) => activeEmotions.includes(emotion))
                    .sort(([, a], [, b]) => b - a)
                    .map(([emotion], index) => (
                      <Cell key={index} fill={EMOTION_COLORS[emotion] || "#666"} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              {activeEmotions.length === 0 ? "Nessuna emozione selezionata" : "Nessun dato"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
