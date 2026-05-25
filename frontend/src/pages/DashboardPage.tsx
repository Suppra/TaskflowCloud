import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { VelocityChart } from '@/features/dashboard/VelocityChart';
import { TasksByPriorityChart } from '@/features/dashboard/TasksByPriorityChart';
import { TasksByStatusChart } from '@/features/dashboard/TasksByStatusChart';
import { AlertsPanel } from '@/features/dashboard/AlertsPanel';
import { ProjectProgressCard } from '@/features/dashboard/ProjectProgressCard';
import {
  FolderKanban,
  CheckCircle2,
  Archive,
  Clock,
  TrendingUp,
  ListTodo,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';

// ── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-700/60 animate-pulse rounded-xl ${className}`} />;
}

// ── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: 'blue' | 'emerald' | 'slate' | 'orange' | 'violet' | 'rose';
}

const COLOR_MAP: Record<StatCardProps['color'], string> = {
  blue:   'bg-blue-600/10 border-blue-800/40 text-blue-400',
  emerald:'bg-emerald-600/10 border-emerald-800/40 text-emerald-400',
  slate:  'bg-slate-700/40 border-slate-600/40 text-slate-400',
  orange: 'bg-orange-600/10 border-orange-800/40 text-orange-400',
  violet: 'bg-violet-600/10 border-violet-800/40 text-violet-400',
  rose:   'bg-rose-600/10 border-rose-800/40 text-rose-400',
};

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 flex items-start gap-4 ${COLOR_MAP[color]}`}>
      <div className="mt-0.5 p-2 rounded-lg bg-black/20">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { data: metrics, isLoading, isError, refetch, isFetching } = useDashboardMetrics();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hola, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Panel de control · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <Link
            to="/projects"
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo proyecto
          </Link>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-rose-900/30 border border-rose-700/50 text-rose-300 rounded-xl px-5 py-4 text-sm">
          Error al cargar las métricas. Verifica que el backend esté en línea.
        </div>
      )}

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={FolderKanban}  label="Proyectos activos"   value={metrics.projects.active}              color="blue" />
          <StatCard icon={Archive}       label="Archivados"          value={metrics.projects.archived}            color="slate" />
          <StatCard icon={ListTodo}      label="Tareas totales"      value={metrics.tasks.total}                  color="violet" />
          <StatCard icon={CheckCircle2}  label="Completadas"         value={metrics.tasks.completed}             color="emerald" />
          <StatCard icon={AlertTriangle} label="Vencidas"            value={metrics.tasks.overdue}               color="rose" />
          <StatCard
            icon={TrendingUp}
            label="Tasa de compl."
            value={`${metrics.tasks.completionRate}%`}
            sub={`${metrics.tasks.completedThisWeek} esta semana`}
            color="emerald"
          />
        </div>
      )}

      {/* ── Row 1: Velocity + Alerts ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <VelocityChart data={metrics.velocity} />
          </div>
          <AlertsPanel alerts={metrics.alerts} />
        </div>
      )}

      {/* ── Row 2: Priority + Status ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TasksByPriorityChart data={metrics.tasks.byPriority} />
          <TasksByStatusChart data={metrics.tasks.byStatus} />
        </div>
      )}

      {/* ── Row 3: Project Progress ── */}
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : metrics && (
        <ProjectProgressCard projects={metrics.projectProgress} />
      )}

      {/* ── Quick Access ── */}
      <div className="border-t border-gray-700/60 pt-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Acceso rápido</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/projects" className="text-xs bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
            Mis proyectos
          </Link>
          <Link to="/notifications" className="text-xs bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <Clock className="w-3 h-3" /> Notificaciones
          </Link>
        </div>
      </div>

    </div>
  );
}
