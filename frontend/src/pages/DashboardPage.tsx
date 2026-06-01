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

const COLOR_MAP: Record<StatCardProps['color'], {
  icon: string; accent: string; glow: string; text: string;
}> = {
  indigo:  { icon: '#6366F1', accent: 'rgba(99,102,241,0.12)',  glow: 'rgba(99,102,241,0.06)',  text: '#818CF8' },
  emerald: { icon: '#10B981', accent: 'rgba(16,185,129,0.12)',  glow: 'rgba(16,185,129,0.06)',  text: '#34D399' },
  zinc:    { icon: '#71717A', accent: 'rgba(113,113,122,0.12)', glow: 'rgba(113,113,122,0.06)', text: '#A1A1AA' },
  orange:  { icon: '#F97316', accent: 'rgba(249,115,22,0.12)',  glow: 'rgba(249,115,22,0.06)',  text: '#FB923C' },
  violet:  { icon: '#8B5CF6', accent: 'rgba(139,92,246,0.12)',  glow: 'rgba(139,92,246,0.06)',  text: '#A78BFA' },
  rose:    { icon: '#F43F5E', accent: 'rgba(244,63,94,0.12)',   glow: 'rgba(244,63,94,0.06)',   text: '#FB7185' },
};

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3.5 transition-all duration-200"
      style={{
        background: '#111113',
        border: '1px solid #1C1C1F',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#27272A'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1C1C1F'; }}
    >
      {/* Icon */}
      <div
        className="mt-0.5 p-2 rounded-lg shrink-0"
        style={{ background: c.accent }}
      >
        <Icon className="w-4 h-4" style={{ color: c.icon }} />
      </div>
      {/* Text */}
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
    <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#52525B' }}>
      {title}
    </h2>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { data: metrics, isLoading, isError, refetch, isFetching } = useDashboardMetrics();

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';
  const todayStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: '#FAFAFA', letterSpacing: '-0.02em' }}
          >
            Hola, {firstName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#52525B' }}>
            {todayCapitalized}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-all duration-150"
            style={{
              background: '#1C1C1F',
              border: '1px solid #27272A',
              color: '#71717A',
            }}
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
            <Plus className="w-3.5 h-3.5" />
            Nuevo proyecto
          </Link>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {isError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#FCA5A5',
          }}
        >
          Error al cargar las métricas. Verifica que el backend esté en línea.
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : metrics && (
        <>
          <SectionHeader title="Métricas globales" />
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
        </>
      )}

      {/* ── Row 1: Velocity + Alerts ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <VelocityChart data={metrics.velocity} />
          </div>
          <AlertsPanel alerts={metrics.alerts} />
        </div>
      )}

      {/* ── Row 2: Priority + Status ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TasksByPriorityChart data={metrics.tasks.byPriority} />
          <TasksByStatusChart data={metrics.tasks.byStatus} />
        </div>
      )}

      {/* ── Row 3: Progress ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : metrics && (
        <ProjectProgressCard projects={metrics.projectProgress} />
      )}

      {/* ── Quick access ────────────────────────────────────────────────────── */}
      <div className="pt-2 pb-4">
        <SectionHeader title="Acceso rápido" />
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/projects', label: 'Mis proyectos', icon: FolderKanban },
            { to: '/notifications', label: 'Notificaciones', icon: Clock },
            { to: '/reports', label: 'Reportes', icon: TrendingUp },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
              style={{
                background: '#1C1C1F',
                border: '1px solid #27272A',
                color: '#71717A',
              }}
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
    </div>
  );
}
