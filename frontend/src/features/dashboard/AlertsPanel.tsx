interface Alert {
  alertId: string;
  projectId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: string;
}

interface Props {
  alerts: Alert[];
}

const SEVERITY_STYLES: Record<string, { badge: string; dot: string }> = {
  low:      { badge: 'bg-slate-700 text-slate-300',   dot: 'bg-slate-400' },
  medium:   { badge: 'bg-blue-900/60 text-blue-300',  dot: 'bg-blue-400' },
  high:     { badge: 'bg-orange-900/60 text-orange-300', dot: 'bg-orange-400' },
  critical: { badge: 'bg-red-900/60 text-red-300',    dot: 'bg-red-500' },
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function AlertsPanel({ alerts }: Props) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Alertas activas
        </h3>
        {alerts.length > 0 && (
          <span className="text-xs bg-red-900/50 text-red-300 border border-red-700/50 px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-sm">Sin alertas activas</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {sorted.map(alert => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low;
            return (
              <li key={alert.alertId} className="flex gap-3 items-start p-3 rounded-lg bg-gray-700/40 border border-gray-700">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}>
                      {SEVERITY_LABELS[alert.severity]}
                    </span>
                    <span className="text-xs text-gray-500">{alert.type}</span>
                    <span className="text-xs text-gray-600 ml-auto">{formatRelative(alert.createdAt)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
