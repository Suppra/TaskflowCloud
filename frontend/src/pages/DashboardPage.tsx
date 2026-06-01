import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { VelocityChart } from '@/features/dashboard/VelocityChart';
import { TasksByPriorityChart } from '@/features/dashboard/TasksByPriorityChart';
import { TasksByStatusChart } from '@/features/dashboard/TasksByStatusChart';
import { AlertsPanel } from '@/features/dashboard/AlertsPanel';
import { ProjectProgressCard } from '@/features/dashboard/ProjectProgressCard';
import {
  FolderKanban, CheckCircle2, Archive, Clock,
  TrendingUp, ListTodo, AlertTriangle, Plus, RefreshCw,
  LayoutGrid, ArrowRight,
} from 'lucide-react';

/* ── Skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    />
  );
}

/* ── KPI Card ───────────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: 'indigo' | 'emerald' | 'zinc' | 'orange' | 'violet' | 'rose';
}

const COLOR_MAP: Record<StatCardProps['color'], { icon: string; accent: string }> = {
  indigo:  { icon: '#6366F1', accent: 'rgba(99,102,241,0.12)'  },
  emerald: { icon: '#10B981', accent: 'rgba(16,185,129,0.12)'  },
  zinc:    { icon: '#71717A', accent: 'rgba(113,113,122,0.12)' },
  orange:  { icon: '#F97316', accent: 'rgba(249,115,22,0.12)'  },
  violet:  { icon: '#8B5CF6', accent: 'rgba(139,92,246,0.12)'  },
  rose:    { icon: '#F43F5E', accent: 'rgba(244,63,94,0.12)'   },
};

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3.5"
      style={{ background: '#111113', border: '1px solid #1C1C1F' }}
    >
      <div className="mt-0.5 p-2 rounded-lg shrink-0" style={{ background: c.accent }}>
        <Icon className="w-4 h-4" style={{ color: c.icon }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-2xl font-bold leading-none tabular-nums"
          style={{ color: '#FAFAFA', letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {value}
        </p>
        <p className="text-xs mt-1.5 font-medium" style={{ color: '#71717A' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: '#52525B' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#3F3F46' }}>
      {title}
    </h2>
  );
}

/* ── Empty / Onboarding state ────────────────────────────────────────────────── */
function EmptyDashboard({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {/* Logo mark */}
      <div
        className="p-5 rounded-2xl mb-6"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)' }}
      >
        <LayoutGrid className="w-10 h-10" style={{ color: '#6366F1' }} />
      </div>

      <h2
        className="text-lg font-bold mb-2"
        style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}
      >
        Bienvenido, {name}
      </h2>
      <p className="text-sm max-w-xs mb-8" style={{ color: '#52525B', lineHeight: 1.6 }}>
        Aun no tienes proyectos. Crea el primero para empezar a gestionar tareas con tu equipo.
      </p>

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          to="/projects"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
          style={{ background: '#6366F1', color: '#FAFAFA' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
        >
          <Plus className="w-4 h-4" />
          Crear proyecto
        </Link>
        <Link
          to="/projects"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#A1A1AA' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#FAFAFA';
            (e.currentTarget as HTMLElement).style.borderColor = '#3F3F46';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#A1A1AA';
            (e.currentTarget as HTMLElement).style.borderColor = '#27272A';
          }}
        >
          Ver proyectos
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Feature hints */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12 max-w-lg w-full">
        {[
          { icon: FolderKanban, label: 'Tableros Kanban', desc: 'Organiza tareas en columnas con drag & drop' },
          { icon: TrendingUp,   label: 'Metricas en tiempo real', desc: 'Velocidad, progreso y alertas automaticas' },
          { icon: CheckCircle2, label: 'Auto-asignacion', desc: 'El sistema balancea la carga de tu equipo' },
        ].map(item => (
          <div
            key={item.label}
            className="p-4 rounded-xl text-left"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1C1C1F' }}
          >
            <item.icon className="w-5 h-5 mb-2" style={{ color: '#6366F1' }} />
            <p className="text-xs font-semibold mb-1" style={{ color: '#A1A1AA' }}>{item.label}</p>
            <p className="text-[10px] leading-relaxed" style={{ color: '#52525B' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { data: metrics, isLoading, isError, refetch, isFetching } = useDashboardMetrics();

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';
  const todayStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const today = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  const noProjects = !isLoading && metrics && metrics.projects.active === 0 && metrics.projects.archived === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}>
            Hola, {firstName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#52525B' }}>{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-all duration-150"
            style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#71717A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FAFAFA'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <Link
            to="/projects"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ background: '#6366F1', color: '#FAFAFA' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo proyecto
          </Link>
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {isError && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center justify-between"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}
        >
          <span>No se pudieron cargar las metricas. Verifica que el backend este activo.</span>
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold underline cursor-pointer"
            style={{ color: '#F87171' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {isLoading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Skeleton className="lg:col-span-2 h-64" />
            <Skeleton className="h-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
          <Skeleton className="h-40" />
        </>
      )}

      {/* ── Empty / Onboarding ──────────────────────────────────────────────── */}
      {noProjects && <EmptyDashboard name={firstName} />}

      {/* ── Dashboard content (only when there are projects) ────────────────── */}
      {!isLoading && metrics && !noProjects && (
        <>
          {/* KPI Cards */}
          <SectionHeader title="Resumen global" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={FolderKanban}  label="Proyectos activos" value={metrics.projects.active}                          color="indigo" />
            <StatCard icon={Archive}       label="Archivados"        value={metrics.projects.archived}                        color="zinc" />
            <StatCard icon={ListTodo}      label="Tareas totales"    value={metrics.tasks.total}                              color="violet" />
            <StatCard icon={CheckCircle2}  label="Completadas"       value={metrics.tasks.completed}                         color="emerald" />
            <StatCard icon={AlertTriangle} label="Vencidas"          value={metrics.tasks.overdue}                           color="rose" />
            <StatCard
              icon={TrendingUp}
              label="Tasa de compl."
              value={`${metrics.tasks.completionRate}%`}
              sub={`${metrics.tasks.completedThisWeek} esta semana`}
              color="emerald"
            />
          </div>

          {/* Velocity + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <VelocityChart data={metrics.velocity} />
            </div>
            <AlertsPanel alerts={metrics.alerts} />
          </div>

          {/* Priority + Status charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TasksByPriorityChart data={metrics.tasks.byPriority} />
            <TasksByStatusChart data={metrics.tasks.byStatus} />
          </div>

          {/* Project progress */}
          <ProjectProgressCard projects={metrics.projectProgress} />

          {/* Quick access */}
          <div className="pt-1 pb-4">
            <SectionHeader title="Acceso rapido" />
            <div className="flex flex-wrap gap-2">
              {[
                { to: '/projects',      label: 'Mis proyectos',   icon: FolderKanban },
                { to: '/notifications', label: 'Notificaciones',  icon: Clock },
                { to: '/reports',       label: 'Reportes',        icon: TrendingUp },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                  style={{ background: '#1C1C1F', border: '1px solid #27272A', color: '#71717A' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#FAFAFA';
                    (e.currentTarget as HTMLElement).style.borderColor = '#3F3F46';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = '#71717A';
                    (e.currentTarget as HTMLElement).style.borderColor = '#27272A';
                  }}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
