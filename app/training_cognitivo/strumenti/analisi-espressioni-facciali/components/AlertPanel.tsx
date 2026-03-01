"use client";

import { AlertEvent } from "../lib/storage";
import { ALERT_MESSAGES, SEVERITY_COLORS } from "../lib/alertSystem";

interface AlertPanelProps {
  alerts: AlertEvent[];
  onAcknowledge: (alertId: string) => void;
  onDismissAll: () => void;
}

export default function AlertPanel({
  alerts,
  onAcknowledge,
  onDismissAll,
}: AlertPanelProps) {
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const recentAlerts = alerts.slice(0, 10);

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">Alert</h3>
        <p className="text-gray-500 text-sm">Nessun alert registrato</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">
          Alert{" "}
          {unacknowledgedAlerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unacknowledgedAlerts.length}
            </span>
          )}
        </h3>
        {unacknowledgedAlerts.length > 0 && (
          <button
            onClick={onDismissAll}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Leggi tutti
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {recentAlerts.map((alert) => {
          const alertInfo = ALERT_MESSAGES[alert.type];
          const severityColor = SEVERITY_COLORS[alert.severity];

          return (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border transition-all ${
                alert.acknowledged
                  ? "bg-gray-900/50 border-gray-700 opacity-60"
                  : "bg-gray-900 border-gray-600"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Indicatore severita' */}
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${severityColor}`}
                />

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono">{alertInfo?.icon || "[!]"}</span>
                    <span className="text-white text-sm font-medium">
                      {alertInfo?.title || alert.type}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{alert.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-500 text-xs">
                      {formatTime(alert.timestamp)}
                    </span>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Segna come letto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > 10 && (
        <p className="text-gray-500 text-xs mt-2 text-center">
          Mostrati ultimi 10 di {alerts.length} alert
        </p>
      )}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Adesso";
  if (diffMins < 60) return `${diffMins} min fa`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ore fa`;

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
