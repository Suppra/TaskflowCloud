/* AlertsPanel — redesigned for TaskFlow Cloud design system */
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

const SEVERITY: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  low:      { label: 'Baja',    color: '#A1A1AA', bg: 'rgba(161,161,170,0.10)', dot: '#52525B' },
  medium:   { label: 'Media',   color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  dot: '#3B82F6' },
  high:     { label: 'Alta',    color: '#FB923C', bg: 'rgba(251,146,60,0.10)',  dot: '#F97316' },
  critical: { label: 'Critica', color: '#F87171', bg: 'rgba(248,113,113,0.10)', dot: '#EF4444' },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/* Shield icon (inline SVG to avoid hand-rolled path complexity) */
function ShieldOkIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M14 3L5 7v7c0 5 4 9.5 9 11 5-1.5 9-6 9-11V7L14 3z"
        stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M10 14l3 3 5-5" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertsPanel({ alerts }: Props) {
  const sorted = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{ background: '#111113', border: '1px solid #1C1C1F' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#52525B' }}>
          Alertas activas
        </h3>
        {alerts.length > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#F87171',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {alerts.length}
          </span>
        )}
      </div>

      {/* Content */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 flex-1">
          <ShieldOkIcon />
          <p className="text-xs mt-3 font-medium" style={{ color: '#3F3F46' }}>Sin alertas activas</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-0.5 flex-1">
          {sorted.map(alert => {
            const sev = SEVERITY[alert.severity] ?? SEVERITY.low;
            return (
              <li
                key={alert.alertId}
                className="flex gap-2.5 items-start p-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1C1C1F' }}
              >
                {/* Severity dot */}
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: sev.dot }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug mb-1.5" style={{ color: '#D4D4D8' }}>
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <span
                      className="text-[10px] ml-auto tabular-nums"
                      style={{ color: '#3F3F46', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {formatRelative(alert.createdAt)}
                    </span>
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
