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

function ProgressBar({ value, overdue }: { value: number; overdue: number }) {
  const hasOverdue = overdue > 0;
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${hasOverdue ? 'bg-orange-500' : 'bg-emerald-500'}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function ProjectProgressCard({ projects }: Props) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
        Progreso por proyecto
      </h3>

      {projects.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
          Sin proyectos activos
        </div>
      ) : (
        <ul className="space-y-4">
          {projects.map(p => (
            <li key={p.projectId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-200 font-medium truncate max-w-[65%]" title={p.name}>
                  {p.name}
                </span>
                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                  {p.overdue > 0 && (
                    <span className="text-orange-400">
                      {p.overdue} vencida{p.overdue !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-gray-400">{p.completed}/{p.total}</span>
                  <span className={`font-semibold ${p.overdue > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {p.percentage}%
                  </span>
                </div>
              </div>
              <ProgressBar value={p.percentage} overdue={p.overdue} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
