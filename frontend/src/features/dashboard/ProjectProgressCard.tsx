/* ProjectProgressCard — redesigned for TaskFlow Cloud design system */
interface ProjectProgress {
  projectId: string;
  name: string;
  total: number;
  completed: number;
  overdue: number;
  percentage: number;
}

interface Props {
  projects: ProjectProgress[];
}

export function ProjectProgressCard({ projects }: Props) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#111113', border: '1px solid #1C1C1F' }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#52525B' }}>
        Progreso por proyecto
      </h3>

      {projects.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#3F3F46' }}>
          Sin proyectos activos
        </div>
      ) : (
        <ul className="space-y-3.5">
          {projects.map(p => {
            const hasOverdue = p.overdue > 0;
            const barColor = hasOverdue ? '#F97316' : '#10B981';
            return (
              <li key={p.projectId}>
                <div className="flex items-baseline justify-between mb-1.5 gap-3">
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: '#E4E4E7', maxWidth: '55%' }}
                    title={p.name}
                  >
                    {p.name}
                  </span>
                  <div className="flex items-center gap-2.5 text-[11px] shrink-0">
                    {hasOverdue && (
                      <span style={{ color: '#FB923C' }}>
                        {p.overdue} vencida{p.overdue !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span style={{ color: '#52525B', fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.completed}/{p.total}
                    </span>
                    <span
                      className="font-bold tabular-nums"
                      style={{
                        color: hasOverdue ? '#FB923C' : '#34D399',
                        fontFamily: "'JetBrains Mono', monospace",
                        minWidth: '3ch',
                        textAlign: 'right',
                      }}
                    >
                      {p.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar — no filled background track (taste-skill compliant) */}
                <div className="relative h-1 rounded-full overflow-hidden" style={{ background: '#1C1C1F' }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.percentage}%`, background: barColor }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
